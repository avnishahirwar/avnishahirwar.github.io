import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set(["https://friendlycalculator.in", "https://www.friendlycalculator.in"]);
function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const previewOrigin = /^https:\/\/deploy-preview-\d+--avnishahirwar\.netlify\.app$/.test(origin);
  const allowed = allowedOrigins.has(origin) || previewOrigin;
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://friendlycalculator.in",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };
}
function reply(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}
function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function dbClient() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const secrets = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const secret = secrets.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !secret) throw new Error("Backend configuration unavailable");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function authenticate(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!token) return { user: null, error: "Sign in to manage API access." };
  const url = Deno.env.get("SUPABASE_URL") || "";
  const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
  const publishable = keys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!url || !publishable) return { user: null, error: "Authentication service is unavailable." };
  const client = createClient(url, publishable, {
    global: { headers: { Authorization: "Bearer " + token } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return { user: null, error: "Your session is invalid or has expired. Please sign in again." };
  return { user: data.user, error: null };
}
function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function accessForUser(admin: any, userId: string) {
  const { data: override, error: overrideError } = await admin.from("api_customer_access")
    .select("plan_code,enabled,monthly_quota,rate_limit_per_minute,valid_until,updated_at")
    .eq("user_id", userId).maybeSingle();
  if (overrideError) throw overrideError;
  if (override) {
    const valid = !override.valid_until || new Date(override.valid_until).getTime() > Date.now();
    return {
      enabled: Boolean(override.enabled && valid && override.monthly_quota > 0),
      plan_code: override.plan_code,
      monthly_quota: override.monthly_quota,
      rate_limit_per_minute: override.rate_limit_per_minute,
      valid_until: override.valid_until,
      source: "admin-managed"
    };
  }
  const { data: subscriptions, error: subError } = await admin.from("user_subscriptions")
    .select("plan_code,status,current_start,current_end,created_at")
    .eq("user_id", userId).eq("status", "active")
    .order("created_at", { ascending: false }).limit(5);
  if (subError) throw subError;
  for (const sub of subscriptions || []) {
    if (sub.current_start && new Date(sub.current_start).getTime() > Date.now()) continue;
    if (sub.current_end && new Date(sub.current_end).getTime() <= Date.now()) continue;
    const { data: plan, error: planError } = await admin.from("subscription_plans")
      .select("code,name,billing_interval,api_credits_per_cycle,features,active")
      .eq("code", sub.plan_code).maybeSingle();
    if (planError) throw planError;
    if (!plan?.active || plan.features?.api_access !== true || Number(plan.api_credits_per_cycle) <= 0) continue;
    const quota = plan.billing_interval === "yearly"
      ? Math.max(1, Math.ceil(Number(plan.api_credits_per_cycle) / 12))
      : Number(plan.api_credits_per_cycle);
    return {
      enabled: true,
      plan_code: plan.code,
      plan_name: plan.name,
      monthly_quota: quota,
      rate_limit_per_minute: 60,
      valid_until: sub.current_end || null,
      source: "subscription"
    };
  }
  const { data: entitlement, error: entitlementError } = await admin.from("feature_entitlements")
    .select("enabled,quota,valid_until")
    .eq("user_id", userId).eq("feature_code", "api_access").maybeSingle();
  if (entitlementError) throw entitlementError;
  if (entitlement?.enabled && Number(entitlement.quota) > 0 &&
      (!entitlement.valid_until || new Date(entitlement.valid_until).getTime() > Date.now())) {
    return {
      enabled: true, plan_code: "custom", monthly_quota: Number(entitlement.quota),
      rate_limit_per_minute: 60, valid_until: entitlement.valid_until, source: "entitlement"
    };
  }
  return {
    enabled: false, plan_code: "free", monthly_quota: 0,
    rate_limit_per_minute: 60, valid_until: null, source: "none"
  };
}
async function dashboardData(admin: any, user: any) {
  const { data: keys, error: keysError } = await admin.from("api_keys")
    .select("id,name,key_prefix,scopes,rate_limit_per_minute,created_at,expires_at,revoked_at,last_used_at")
    .eq("owner_id", user.id).order("created_at", { ascending: false }).limit(100);
  if (keysError) throw keysError;
  const ids = (keys || []).map((key: any) => key.id);
  let rows: any[] = [];
  if (ids.length) {
    const { data, error } = await admin.from("api_usage")
      .select("id,api_key_id,endpoint,status_code,duration_ms,created_at")
      .in("api_key_id", ids)
      .gte("created_at", new Date(Date.now() - 31 * 86400000).toISOString())
      .order("created_at", { ascending: false }).limit(10000);
    if (error) throw error;
    rows = data || [];
  }
  const access = await accessForUser(admin, user.id);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const todayRows = rows.filter((row) => new Date(row.created_at).getTime() >= todayStart);
  const monthRows = rows.filter((row) => new Date(row.created_at).getTime() >= monthStart);
  const chargedRows = monthRows.filter((row) => ![403, 429].includes(Number(row.status_code)));
  const chart = [];
  for (let offset = 13; offset >= 0; offset--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const start = day.getTime();
    const end = start + 86400000;
    const count = rows.filter((row) => {
      const time = new Date(row.created_at).getTime();
      return time >= start && time < end;
    }).length;
    chart.push({ date: day.toISOString().slice(0, 10), requests: count });
  }
  const keyNames = new Map((keys || []).map((key: any) => [key.id, key.key_prefix + "…"]));
  return {
    user: { id: user.id, email: user.email || "" },
    access,
    keys: (keys || []).map((key: any) => ({
      ...key,
      masked_key: key.key_prefix + "••••••••"
    })),
    usage: {
      today: todayRows.length,
      month: monthRows.length,
      successful: monthRows.filter((row) => Number(row.status_code) >= 200 && Number(row.status_code) < 300).length,
      failed: monthRows.filter((row) => Number(row.status_code) < 200 || Number(row.status_code) >= 300).length,
      quota: access.monthly_quota,
      quota_used: chargedRows.length,
      quota_remaining: access.enabled ? Math.max(0, access.monthly_quota - chargedRows.length) : 0,
      active_keys: (keys || []).filter((key: any) => !key.revoked_at &&
        (!key.expires_at || new Date(key.expires_at).getTime() > Date.now())).length,
      chart,
      recent: rows.slice(0, 50).map((row) => ({
        ...row,
        key_label: keyNames.get(row.api_key_id) || "Unknown key"
      }))
    }
  };
}
async function adminDashboard(admin: any) {
  const [usersResult, keysResult, accessResult, subsResult, usageResult, plansResult] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("api_keys").select("id,owner_id,name,key_prefix,rate_limit_per_minute,created_at,expires_at,revoked_at,last_used_at").order("created_at", { ascending: false }).limit(1000),
    admin.from("api_customer_access").select("user_id,plan_code,enabled,monthly_quota,rate_limit_per_minute,valid_until,updated_at"),
    admin.from("user_subscriptions").select("user_id,plan_code,status,current_start,current_end,created_at").eq("status", "active"),
    admin.from("api_usage").select("id,api_key_id,endpoint,status_code,duration_ms,created_at").order("created_at", { ascending: false }).limit(100),
    admin.from("subscription_plans").select("code,name,billing_interval,api_credits_per_cycle,features,active")
  ]);
  if (usersResult.error || keysResult.error || accessResult.error || subsResult.error || usageResult.error || plansResult.error) {
    throw new Error("Could not load API administration data.");
  }
  const users = usersResult.data?.users || [];
  const userMap = new Map(users.map((u: any) => [u.id, u]));
  const accessMap = new Map((accessResult.data || []).map((a: any) => [a.user_id, a]));
  const subMap = new Map((subsResult.data || []).map((s: any) => [s.user_id, s]));
  const planMap = new Map((plansResult.data || []).map((p: any) => [p.code, p]));
  const keyMap = new Map<string, any[]>();
  for (const key of keysResult.data || []) {
    const arr = keyMap.get(key.owner_id) || [];
    arr.push(key);
    keyMap.set(key.owner_id, arr);
  }
  const customerIds = new Set<string>([
    ...keyMap.keys(),
    ...accessMap.keys(),
    ...subMap.keys()
  ]);
  const customers = [...customerIds].map((id) => {
    const u: any = userMap.get(id);
    const access: any = accessMap.get(id);
    const sub: any = subMap.get(id);
    const plan: any = sub ? planMap.get(sub.plan_code) : null;
    const subActive = Boolean(sub && plan?.active && plan.features?.api_access === true &&
      Number(plan.api_credits_per_cycle) > 0 &&
      (!sub.current_start || new Date(sub.current_start).getTime() <= Date.now()) &&
      (!sub.current_end || new Date(sub.current_end).getTime() > Date.now()));
    const subQuota = subActive
      ? (plan.billing_interval === "yearly" ? Math.max(1, Math.ceil(Number(plan.api_credits_per_cycle) / 12)) : Number(plan.api_credits_per_cycle))
      : 0;
    return {
      user_id: id,
      email: u?.email || "(email unavailable)",
      created_at: u?.created_at || null,
      plan_code: access?.plan_code || (subActive ? sub.plan_code : "free"),
      enabled: access ? Boolean(access.enabled && access.monthly_quota > 0 &&
        (!access.valid_until || new Date(access.valid_until).getTime() > Date.now())) : subActive,
      monthly_quota: access?.monthly_quota ?? subQuota,
      rate_limit_per_minute: access?.rate_limit_per_minute ?? 60,
      valid_until: access?.valid_until || sub?.current_end || null,
      keys: (keyMap.get(id) || []).length
    };
  }).sort((a, b) => String(a.email).localeCompare(String(b.email)));
  const recent = (usageResult.data || []).map((row: any) => {
    const key: any = (keysResult.data || []).find((item: any) => item.id === row.api_key_id);
    const owner: any = key ? userMap.get(key.owner_id) : null;
    return {
      ...row,
      customer_email: owner?.email || "Unknown customer",
      key_prefix: key?.key_prefix || ""
    };
  });
  return { customers, keys: keysResult.data || [], recent };
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return reply(req, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  if (Number(req.headers.get("content-length") || "0") > 20000) return reply(req, { error: "Request too large." }, 413);
  try {
    const auth = await authenticate(req);
    if (!auth.user) return reply(req, { error: auth.error || "Unauthorized", code: "UNAUTHORIZED" }, 401);
    const body = await req.json();
    const action = clean(body.action, 40);
    const admin = dbClient();
    const isAdmin = auth.user.app_metadata?.role === "admin";

    if (action === "dashboard") {
      const data = await dashboardData(admin, auth.user);
      return reply(req, data);
    }
    if (action === "create-key") {
      const name = clean(body.name, 100);
      if (name.length < 2) return reply(req, { error: "Give this API key a name of at least 2 characters.", code: "INVALID_NAME" }, 400);
      const { count, error: countError } = await admin.from("api_keys").select("id", { count: "exact", head: true })
        .eq("owner_id", auth.user.id).is("revoked_at", null);
      if (countError) throw countError;
      if ((count || 0) >= 10) return reply(req, { error: "You can have up to 10 API keys. Revoke an unused key before creating another.", code: "KEY_LIMIT" }, 409);
      let rawKey = "";
      let inserted: any = null;
      for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
        rawKey = "avsk_live_" + base64url(crypto.getRandomValues(new Uint8Array(32)));
        const { data, error } = await admin.from("api_keys").insert({
          owner_id: auth.user.id,
          name,
          key_prefix: rawKey.slice(0, 18),
          key_hash: await sha256(rawKey),
          scopes: ["calculators:read"],
          rate_limit_per_minute: 60
        }).select("id,name,key_prefix,rate_limit_per_minute,created_at").single();
        if (!error) inserted = data;
        else if (attempt === 2) throw error;
      }
      return reply(req, { ok: true, key: rawKey, key_record: inserted, warning: "Copy this key now. It cannot be retrieved again." }, 201);
    }
    if (action === "revoke-key") {
      const id = clean(body.key_id, 64);
      if (!isUuid(id)) return reply(req, { error: "Invalid API key identifier.", code: "INVALID_KEY_ID" }, 400);
      const { data, error } = await admin.from("api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id).eq("owner_id", auth.user.id).is("revoked_at", null)
        .select("id").maybeSingle();
      if (error) throw error;
      if (!data) return reply(req, { error: "API key was not found or is already revoked.", code: "KEY_NOT_FOUND" }, 404);
      return reply(req, { ok: true, revoked: true });
    }
    if (action === "admin-dashboard") {
      if (!isAdmin) return reply(req, { error: "Admin access is required.", code: "FORBIDDEN" }, 403);
      return reply(req, await adminDashboard(admin));
    }
    if (action === "admin-set-access") {
      if (!isAdmin) return reply(req, { error: "Admin access is required.", code: "FORBIDDEN" }, 403);
      const userId = clean(body.user_id, 64);
      const planCode = clean(body.plan_code, 64);
      const enabled = body.enabled === true;
      const quota = Number(body.monthly_quota);
      const rpm = Number(body.rate_limit_per_minute);
      if (!isUuid(userId) || !Number.isInteger(quota) || quota < 0 || quota > 10000000 ||
          !Number.isInteger(rpm) || rpm < 1 || rpm > 600 || (enabled && quota < 1)) {
        return reply(req, { error: "Check the customer, quota (0–10,000,000) and rate limit (1–600). Enabled access needs a quota above zero.", code: "INVALID_ACCESS_SETTINGS" }, 400);
      }
      const { data: plan, error: planError } = await admin.from("subscription_plans").select("code").eq("code", planCode).maybeSingle();
      if (planError) throw planError;
      if (!plan) return reply(req, { error: "Choose an existing API plan.", code: "INVALID_PLAN" }, 400);
      const { data: target, error: targetError } = await admin.auth.admin.getUserById(userId);
      if (targetError || !target?.user) return reply(req, { error: "Customer account was not found.", code: "USER_NOT_FOUND" }, 404);
      const validUntil = clean(body.valid_until, 40);
      const validDate = validUntil ? new Date(validUntil) : null;
      if (validDate && !Number.isFinite(validDate.getTime())) {
        return reply(req, { error: "Access expiry must be a valid date and time.", code: "INVALID_EXPIRY" }, 400);
      }
      const payload = {
        user_id: userId, plan_code: planCode, enabled, monthly_quota: quota,
        rate_limit_per_minute: rpm,
        valid_until: validDate ? validDate.toISOString() : null,
        updated_by: auth.user.id, updated_at: new Date().toISOString()
      };
      const { error } = await admin.from("api_customer_access").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      return reply(req, { ok: true, access: payload });
    }
    if (action === "admin-set-key-limit") {
      if (!isAdmin) return reply(req, { error: "Admin access is required.", code: "FORBIDDEN" }, 403);
      const id = clean(body.key_id, 64);
      const rpm = Number(body.rate_limit_per_minute);
      if (!isUuid(id) || !Number.isInteger(rpm) || rpm < 1 || rpm > 600) {
        return reply(req, { error: "Rate limit must be an integer from 1 to 600.", code: "INVALID_RATE_LIMIT" }, 400);
      }
      const { data, error } = await admin.from("api_keys").update({ rate_limit_per_minute: rpm })
        .eq("id", id).is("revoked_at", null).select("id,rate_limit_per_minute").maybeSingle();
      if (error) throw error;
      if (!data) return reply(req, { error: "Active API key was not found.", code: "KEY_NOT_FOUND" }, 404);
      return reply(req, { ok: true, key: data });
    }
    if (action === "admin-revoke-key") {
      if (!isAdmin) return reply(req, { error: "Admin access is required.", code: "FORBIDDEN" }, 403);
      const id = clean(body.key_id, 64);
      if (!isUuid(id)) return reply(req, { error: "Invalid API key identifier.", code: "INVALID_KEY_ID" }, 400);
      const { data, error } = await admin.from("api_keys").update({ revoked_at: new Date().toISOString() })
        .eq("id", id).is("revoked_at", null).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return reply(req, { error: "Active API key was not found.", code: "KEY_NOT_FOUND" }, 404);
      return reply(req, { ok: true, revoked: true });
    }
    return reply(req, { error: "Unknown API management action.", code: "UNKNOWN_ACTION" }, 400);
  } catch (_error) {
    return reply(req, { error: "The API management request could not be completed. Please try again.", code: "INTERNAL_ERROR" }, 500);
  }
});
