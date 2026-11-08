type D1Result<T = Record<string, unknown>> = { results?: T[]; success: boolean; meta?: { changes?: number } };
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}
interface D1Database { prepare(sql: string): D1Statement; }
export interface AuthEnv {
  DB: D1Database;
  APP_ORIGIN?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}

const SESSION_DAYS = 14;
const TOKEN_MINUTES = 30;
const PBKDF2_ITERATIONS = 310_000;
const encoder = new TextEncoder();

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers }
  });
}
function getOrigin(env: AuthEnv) { return env.APP_ORIGIN?.replace(/\/$/, "") || ""; }
function corsHeaders(request: Request, env: AuthEnv): HeadersInit {
  const origin = request.headers.get("Origin");
  const allowed = getOrigin(env);
  if (!origin || !allowed || origin !== allowed) return { "Vary": "Origin" };
  return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Vary": "Origin" };
}
function withCors(response: Response, request: Request, env: AuthEnv) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(request, env))) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}
function validOrigin(request: Request, env: AuthEnv) {
  const origin = request.headers.get("Origin");
  return !!origin && !!getOrigin(env) && origin === getOrigin(env);
}
function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}
function sessionCookie(value: string, maxAge: number) {
  return `av_session=${value}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`;
}
function uuid() { return crypto.randomUUID(); }
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
async function passwordHash(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(new Uint8Array(bits))}`;
}
async function verifyPassword(password: string, stored: string) {
  const [algorithm, count, saltText, hashText] = stored.split("$");
  if (algorithm !== "pbkdf2_sha256" || Number(count) !== PBKDF2_ITERATIONS || !saltText || !hashText) return false;
  const fromB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const salt = fromB64(saltText);
  const expected = fromB64(hashText);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS }, key, expected.length * 8));
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
function parseBody(request: Request) {
  return request.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}
function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}
async function rateLimit(env: AuthEnv, request: Request, action: string, limit = 8) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = await sha256(`${action}:${ip}`);
  const now = new Date();
  const cutoff = new Date(now.getTime() - 15 * 60_000).toISOString();
  const row = await env.DB.prepare("SELECT attempts, window_started_at FROM auth_rate_limits WHERE bucket_key = ?").bind(key).first<{attempts:number;window_started_at:string}>();
  if (!row || row.window_started_at < cutoff) {
    await env.DB.prepare("INSERT INTO auth_rate_limits(bucket_key,window_started_at,attempts) VALUES(?,?,1) ON CONFLICT(bucket_key) DO UPDATE SET window_started_at=excluded.window_started_at,attempts=1").bind(key, now.toISOString()).run();
    return true;
  }
  if (row.attempts >= limit) return false;
  await env.DB.prepare("UPDATE auth_rate_limits SET attempts=attempts+1 WHERE bucket_key=?").bind(key).run();
  return true;
}
async function sendEmail(env: AuthEnv, to: string, subject: string, html: string) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error("Email delivery is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html })
  });
  if (!response.ok) throw new Error("Email provider rejected the message.");
}
async function issueToken(env: AuthEnv, userId: string, purpose: "verify_email" | "reset_password", path: string, subject: string, intro: string) {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const id = uuid();
  const expires = new Date(Date.now() + TOKEN_MINUTES * 60_000).toISOString();
  await env.DB.prepare("INSERT INTO auth_tokens(id,user_id,token_hash,purpose,expires_at) VALUES(?,?,?,?,?)").bind(id, userId, tokenHash, purpose, expires).run();
  const base = getOrigin(env);
  const link = `${base}${path}?token=${encodeURIComponent(token)}`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>AVNISH AI</h2><p>${intro}</p><p><a href="${link}">Continue to AVNISH AI</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p></div>`;
  await sendEmail(env, "", subject, html).catch(async error => { throw error; });
}
async function createSession(env: AuthEnv, userId: string) {
  const raw = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000).toISOString();
  await env.DB.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)").bind(uuid(), userId, await sha256(raw), expires).run();
  return { raw, expires };
}
async function currentUser(env: AuthEnv, request: Request) {
  const raw = cookieValue(request, "av_session");
  if (!raw) return null;
  const now = new Date().toISOString();
  const row = await env.DB.prepare("SELECT u.id,u.email,u.display_name,u.email_verified_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.disabled_at IS NULL").bind(await sha256(raw), now).first<{id:string;email:string;display_name:string|null;email_verified_at:string|null}>();
  if (row) await env.DB.prepare("UPDATE sessions SET last_seen_at=? WHERE token_hash=?").bind(now, await sha256(raw)).run();
  return row;
}

export async function handleAuthRequest(request: Request, env: AuthEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/auth/")) return null;
  if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }), request, env);
  if (!["GET", "POST"].includes(request.method)) return withCors(json({ error: "Method not allowed." }, 405, { Allow: "GET, POST, OPTIONS" }), request, env);
  const path = url.pathname;
  const mutating = request.method === "POST";
  if (mutating && !validOrigin(request, env)) return withCors(json({ error: "Origin not allowed." }, 403), request, env);

  try {
    if (path === "/api/auth/register" && mutating) {
      if (!(await rateLimit(env, request, "register", 5))) return withCors(json({ error: "Too many attempts. Try again later." }, 429), request, env);
      const body = await parseBody(request);
      if (!body || !validEmail(body.email) || !validPassword(body.password)) return withCors(json({ error: "Enter a valid email and a password of 12–128 characters." }, 400), request, env);
      if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !getOrigin(env)) return withCors(json({ error: "Registration email service is not configured yet." }, 503), request, env);
      const email = body.email.trim().toLowerCase();
      const existing = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first<{id:string}>();
      if (existing) return withCors(json({ message: "If registration can proceed, a verification email will be sent." }), request, env);
      const id = uuid();
      const hash = await passwordHash(body.password);
      await env.DB.prepare("INSERT INTO users(id,email,password_hash,display_name) VALUES(?,?,?,?)").bind(id, email, hash, typeof body.displayName === "string" ? body.displayName.trim().slice(0,80) : null).run();
      try {
        const token = randomToken();
        await env.DB.prepare("INSERT INTO auth_tokens(id,user_id,token_hash,purpose,expires_at) VALUES(?,?,?,?,?)").bind(uuid(), id, await sha256(token), "verify_email", new Date(Date.now()+TOKEN_MINUTES*60_000).toISOString()).run();
        const link = `${getOrigin(env)}?auth=verify&token=${encodeURIComponent(token)}`;
        await sendEmail(env, email, "Verify your AVNISH AI email", `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>AVNISH AI</h2><p>Verify your email address to finish registration.</p><p><a href="${link}">Verify email</a></p><p>This link expires in 30 minutes. Ignore this message if you did not create the account.</p></div>`);
      } catch {
        await env.DB.prepare("DELETE FROM users WHERE id=?").bind(id).run();
        return withCors(json({ error: "We could not send the verification email. Please try again later." }, 503), request, env);
      }
      return withCors(json({ message: "Registration started. Check your email for the verification link." }, 201), request, env);
    }

    if (path === "/api/auth/verify-email" && mutating) {
      const body = await parseBody(request);
      if (!body || typeof body.token !== "string" || body.token.length !== 64) return withCors(json({ error: "Invalid or expired verification link." }, 400), request, env);
      const tokenHash = await sha256(body.token);
      const row = await env.DB.prepare("SELECT id,user_id FROM auth_tokens WHERE token_hash=? AND purpose='verify_email' AND consumed_at IS NULL AND expires_at>?").bind(tokenHash, new Date().toISOString()).first<{id:string;user_id:string}>();
      if (!row) return withCors(json({ error: "Invalid or expired verification link." }, 400), request, env);
      await env.DB.prepare("UPDATE users SET email_verified_at=? WHERE id=?").bind(new Date().toISOString(), row.user_id).run();
      await env.DB.prepare("UPDATE auth_tokens SET consumed_at=? WHERE id=?").bind(new Date().toISOString(), row.id).run();
      return withCors(json({ message: "Email verified. You can now sign in." }), request, env);
    }

    if (path === "/api/auth/login" && mutating) {
      if (!(await rateLimit(env, request, "login", 10))) return withCors(json({ error: "Too many attempts. Try again later." }, 429), request, env);
      const body = await parseBody(request);
      if (!body || !validEmail(body.email) || typeof body.password !== "string") return withCors(json({ error: "Invalid email or password." }, 400), request, env);
      const user = await env.DB.prepare("SELECT id,email,password_hash,email_verified_at FROM users WHERE email=? AND disabled_at IS NULL").bind(body.email.trim().toLowerCase()).first<{id:string;email:string;password_hash:string|null;email_verified_at:string|null}>();
      const valid = user?.password_hash ? await verifyPassword(body.password, user.password_hash) : false;
      if (!user || !valid) return withCors(json({ error: "Invalid email or password." }, 401), request, env);
      if (!user.email_verified_at) return withCors(json({ error: "Please verify your email before signing in." }, 403), request, env);
      const session = await createSession(env, user.id);
      return withCors(json({ user: { id: user.id, email: user.email }, message: "Signed in." }, 200, { "Set-Cookie": sessionCookie(session.raw, SESSION_DAYS*86400) }), request, env);
    }

    if (path === "/api/auth/logout" && mutating) {
      const raw = cookieValue(request, "av_session");
      if (raw) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(raw)).run();
      return withCors(json({ message: "Signed out." }, 200, { "Set-Cookie": sessionCookie("", 0) }), request, env);
    }

    if (path === "/api/auth/me" && request.method === "GET") {
      const user = await currentUser(env, request);
      if (!user) return withCors(json({ error: "Not signed in." }, 401), request, env);
      return withCors(json({ user }), request, env);
    }

    if (path === "/api/auth/forgot-password" && mutating) {
      if (!(await rateLimit(env, request, "forgot-password", 5))) return withCors(json({ message: "If the account exists, reset instructions will be sent." }), request, env);
      const body = await parseBody(request);
      if (!body || !validEmail(body.email)) return withCors(json({ message: "If the account exists, reset instructions will be sent." }), request, env);
      const email = body.email.trim().toLowerCase();
      const user = await env.DB.prepare("SELECT id FROM users WHERE email=? AND disabled_at IS NULL").bind(email).first<{id:string}>();
      if (user && env.RESEND_API_KEY && env.EMAIL_FROM && getOrigin(env)) {
        const token = randomToken();
        await env.DB.prepare("INSERT INTO auth_tokens(id,user_id,token_hash,purpose,expires_at) VALUES(?,?,?,?,?)").bind(uuid(), user.id, await sha256(token), "reset_password", new Date(Date.now()+TOKEN_MINUTES*60_000).toISOString()).run();
        const link = `${getOrigin(env)}?auth=reset&token=${encodeURIComponent(token)}`;
        await sendEmail(env, email, "Reset your AVNISH AI password", `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>AVNISH AI</h2><p>Use this link to reset your password.</p><p><a href="${link}">Reset password</a></p><p>This link expires in 30 minutes. Ignore this message if you did not request it.</p></div>`);
      }
      return withCors(json({ message: "If the account exists, reset instructions will be sent." }), request, env);
    }

    if (path === "/api/auth/reset-password" && mutating) {
      const body = await parseBody(request);
      if (!body || typeof body.token !== "string" || body.token.length !== 64 || !validPassword(body.password)) return withCors(json({ error: "Invalid or expired reset link, or password does not meet requirements." }, 400), request, env);
      const tokenHash = await sha256(body.token);
      const row = await env.DB.prepare("SELECT id,user_id FROM auth_tokens WHERE token_hash=? AND purpose='reset_password' AND consumed_at IS NULL AND expires_at>?").bind(tokenHash, new Date().toISOString()).first<{id:string;user_id:string}>();
      if (!row) return withCors(json({ error: "Invalid or expired reset link." }, 400), request, env);
      await env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?").bind(await passwordHash(body.password), row.user_id).run();
      await env.DB.prepare("UPDATE auth_tokens SET consumed_at=? WHERE user_id=? AND purpose='reset_password' AND consumed_at IS NULL").bind(new Date().toISOString(), row.user_id).run();
      await env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(row.user_id).run();
      return withCors(json({ message: "Password reset. Please sign in again." }), request, env);
    }
    return withCors(json({ error: "Not found." }, 404), request, env);
  } catch {
    return withCors(json({ error: "The request could not be completed. Check service configuration and try again." }, 500), request, env);
  }
}
