import { currentUser, type AuthEnv } from "./auth";

interface BillingEnv extends AuthEnv {
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
}
const PLANS = {
  monthly: { code: "pro_monthly", amount: 29900, period: "monthly", totalCount: 120, name: "AVNISH AI Pro Monthly" },
  annual: { code: "pro_annual", amount: 299900, period: "yearly", totalCount: 10, name: "AVNISH AI Pro Annual" }
} as const;
const enc = new TextEncoder();
function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });
}
function cors(request: Request, env: BillingEnv): HeadersInit {
  const origin = request.headers.get("Origin");
  const allowed = env.APP_ORIGIN?.replace(/\/$/, "");
  if (!origin || !allowed || origin !== allowed) return { Vary: "Origin" };
  return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Vary": "Origin" };
}
function withCors(response: Response, request: Request, env: BillingEnv) {
  const h = new Headers(response.headers); Object.entries(cors(request, env)).forEach(([k,v]) => h.set(k,v));
  return new Response(response.body, { status: response.status, headers: h });
}
async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
  return Array.from(sig, b => b.toString(16).padStart(2,"0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i=0;i<a.length;i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0;
}
async function razorpay(env: BillingEnv, path: string, body?: unknown) {
  if (!env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") || !env.RAZORPAY_KEY_SECRET) throw new Error("Razorpay Test Mode credentials are not configured.");
  const auth = btoa(env.RAZORPAY_KEY_ID + ":" + env.RAZORPAY_KEY_SECRET);
  const response = await fetch("https://api.razorpay.com/v1/" + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: "Basic " + auth, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12000)
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error("Razorpay rejected the test request (" + response.status + ").");
  return data;
}
async function getOrCreatePlan(env: BillingEnv, plan: typeof PLANS[keyof typeof PLANS]) {
  const cached = await env.DB.prepare("SELECT provider_plan_id FROM billing_plans WHERE plan_code=?").bind(plan.code).first<{provider_plan_id:string}>();
  if (cached) return cached.provider_plan_id;
  const created = await razorpay(env, "plans", { period: plan.period, interval: 1, item: { name: plan.name, amount: plan.amount, currency: "INR", description: "AVNISH AI Pro subscription (Test Mode)" }, notes: { app: "AVNISH AI", plan_code: plan.code, environment: "test" } });
  if (typeof created.id !== "string") throw new Error("Razorpay did not return a plan ID.");
  await env.DB.prepare("INSERT OR IGNORE INTO billing_plans(plan_code,provider_plan_id,amount_paise,currency) VALUES(?,?,?,'INR')").bind(plan.code, created.id, plan.amount).run();
  const saved = await env.DB.prepare("SELECT provider_plan_id FROM billing_plans WHERE plan_code=?").bind(plan.code).first<{provider_plan_id:string}>();
  if (!saved) throw new Error("Could not save the test plan.");
  return saved.provider_plan_id;
}
export async function handleBillingRequest(request: Request, env: BillingEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === "/api/billing/webhook") {
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
    if (!env.RAZORPAY_WEBHOOK_SECRET) return json({ error: "Webhook is not configured." }, 503);
    const raw = await request.text();
    const signature = request.headers.get("X-Razorpay-Signature") || "";
    const expected = await hmacHex(env.RAZORPAY_WEBHOOK_SECRET, raw);
    if (!safeEqual(signature, expected)) return json({ error: "Invalid webhook signature." }, 401);
    const eventId = request.headers.get("x-razorpay-event-id");
    if (!eventId) return json({ error: "Missing event ID." }, 400);
    const payload = JSON.parse(raw) as { event?: string; payload?: { subscription?: { entity?: { id?: string; status?: string; notes?: { user_id?: string; plan_code?: string } } } } };
    const type = payload.event || "unknown";
    const sub = payload.payload?.subscription?.entity;
    try {
      await env.DB.prepare("INSERT INTO billing_events(id,provider_event_id,event_type) VALUES(?,?,?)").bind(crypto.randomUUID(), eventId, type).run();
    } catch {
      return json({ received: true, duplicate: true });
    }
    if (sub?.id) {
      const status = type === "subscription.activated" || type === "subscription.charged" ? "active"
        : type === "subscription.halted" ? "past_due"
        : type === "subscription.cancelled" ? "cancelled"
        : type === "subscription.completed" ? "expired" : null;
      if (status) await env.DB.prepare("UPDATE subscriptions SET status=? WHERE provider='razorpay' AND provider_subscription_id=?").bind(status, sub.id).run();
    }
    await env.DB.prepare("UPDATE billing_events SET processed_at=? WHERE provider_event_id=?").bind(new Date().toISOString(), eventId).run();
    return json({ received: true });
  }
  if (!url.pathname.startsWith("/api/billing/")) return null;
  if (request.method === "OPTIONS") return withCors(new Response(null,{status:204}),request,env);
  if (request.method !== "POST") return withCors(json({error:"Method not allowed."},405,{Allow:"POST, OPTIONS"}),request,env);
  if (!env.APP_ORIGIN || request.headers.get("Origin") !== env.APP_ORIGIN.replace(/\/$/,"")) return withCors(json({error:"Origin not allowed."},403),request,env);
  try {
    const user = await currentUser(env, request);
    if (!user || !user.email_verified_at) return withCors(json({error:"Sign in with a verified account to continue."},401),request,env);
    if (url.pathname === "/api/billing/create-subscription") {
      const body = await request.json().catch(() => null) as { plan?: string } | null;
      if (!body || (body.plan !== "monthly" && body.plan !== "annual")) return withCors(json({error:"Choose a valid plan."},400),request,env);
      const plan = PLANS[body.plan];
      const planId = await getOrCreatePlan(env, plan);
      const created = await razorpay(env,"subscriptions",{plan_id:planId,total_count:plan.totalCount,quantity:1,customer_notify:1,notes:{user_id:user.id,plan_code:plan.code,environment:"test"}});
      if (typeof created.id !== "string") throw new Error("Razorpay did not return a subscription ID.");
      await env.DB.prepare("INSERT INTO subscriptions(id,owner_user_id,plan_code,provider,provider_subscription_id,status) VALUES(?,?,?,'razorpay',?,'pending')").bind(crypto.randomUUID(),user.id,plan.code,created.id).run();
      return withCors(json({subscriptionId:created.id,keyId:env.RAZORPAY_KEY_ID,plan:plan.code,amount:plan.amount,currency:"INR",mode:"test"}),request,env);
    }
    if (url.pathname === "/api/billing/verify-subscription") {
      const body = await request.json().catch(() => null) as {razorpay_payment_id?:string;razorpay_subscription_id?:string;razorpay_signature?:string}|null;
      if (!body?.razorpay_payment_id || !body.razorpay_subscription_id || !body.razorpay_signature) return withCors(json({error:"Payment verification details are incomplete."},400),request,env);
      const row = await env.DB.prepare("SELECT id FROM subscriptions WHERE owner_user_id=? AND provider='razorpay' AND provider_subscription_id=?").bind(user.id,body.razorpay_subscription_id).first<{id:string}>();
      if (!row) return withCors(json({error:"Subscription not found."},404),request,env);
      const expected = await hmacHex(env.RAZORPAY_KEY_SECRET || "",body.razorpay_payment_id+"|"+body.razorpay_subscription_id);
      if (!safeEqual(body.razorpay_signature,expected)) return withCors(json({error:"Payment signature verification failed."},400),request,env);
      return withCors(json({verified:true,message:"Checkout signature verified. Pro access activates only after Razorpay confirms subscription.activated/charged by webhook."}),request,env);
    }
    return withCors(json({error:"Not found."},404),request,env);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Billing request failed.";
    return withCors(json({error:message},503),request,env);
  }
}
