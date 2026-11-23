import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const ALLOWED_ORIGINS = new Set(["https://friendlycalculator.in", "https://www.friendlycalculator.in"]);
const MAX_BODY = 24_000;

type Quote = {
  id: string; status: string; customer_name: string; customer_email: string;
  project_scope: string; quoted_terms: string; amount_paise: number; currency: string;
  token_hash: string; expires_at: string; razorpay_receipt: string;
  razorpay_order_id: string | null; razorpay_payment_id: string | null;
};

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = !origin || ALLOWED_ORIGINS.has(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? (origin || "https://friendlycalculator.in") : "https://friendlycalculator.in",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-razorpay-signature, x-razorpay-event-id",
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
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function dbClient() {
  const secrets = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const key = secrets.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!SUPABASE_URL || !key) throw new Error("Backend configuration unavailable");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function razorpayConfig() {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID") || "";
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "";
  // Deliberate fail-closed guard: this endpoint never accepts live credentials.
  if (!keyId.startsWith("rzp_test_") || !keySecret) return null;
  return { keyId, keySecret, basic: "Basic " + btoa(keyId + ":" + keySecret) };
}
function businessCheckoutEnabled() {
  return Deno.env.get("BUSINESS_QUOTES_ENABLED") === "true" &&
    Boolean(razorpayConfig()) && Boolean(Deno.env.get("RAZORPAY_WEBHOOK_SECRET"));
}
async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let raw = "";
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function safeQuote(q: Quote) {
  return {
    id: q.id, customer_name: q.customer_name, customer_email: q.customer_email,
    project_scope: q.project_scope, quoted_terms: q.quoted_terms,
    amount_paise: q.amount_paise, currency: q.currency,
    status: q.status, expires_at: q.expires_at
  };
}
async function authenticateAdmin(req: Request) {
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!bearer) return null;
  const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
  const publishable = keys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!publishable || !SUPABASE_URL) return null;
  const client = createClient(SUPABASE_URL, publishable, {
    global: { headers: { Authorization: "Bearer " + bearer } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await client.auth.getUser(bearer);
  if (error || !data?.user || data.user.app_metadata?.role !== "admin") return null;
  return data.user;
}
async function razorpayRequest(path: string, init: RequestInit = {}) {
  const config = razorpayConfig();
  if (!config) throw new Error("Razorpay TEST credentials are not configured");
  const response = await fetch("https://api.razorpay.com/v1" + path, {
    ...init,
    headers: { "Authorization": config.basic, "Content-Type": "application/json", ...(init.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Razorpay request failed with status " + response.status);
  return data;
}
async function findOrderByReceipt(receipt: string, expectedAmount: number) {
  const data = await razorpayRequest("/orders?receipt=" + encodeURIComponent(receipt) + "&count=2");
  const items = Array.isArray(data?.items) ? data.items : [];
  const matching = items.filter((item: any) => item.receipt === receipt);
  if (matching.length > 1) throw new Error("Multiple provider orders found for one quote receipt");
  const found = matching[0];
  if (!found) return null;
  if (Number(found.amount) !== expectedAmount || found.currency !== "INR") throw new Error("Existing provider order does not match the server quote");
  return found;
}
async function getVerifiedCapturedPayment(paymentId: string, orderId: string, expectedAmount: number) {
  const payment = await razorpayRequest("/payments/" + encodeURIComponent(paymentId));
  if (payment.order_id !== orderId || payment.status !== "captured" ||
      Number(payment.amount) !== expectedAmount || payment.currency !== "INR") return null;
  return payment;
}
async function markQuotePaid(db: any, orderId: string, paymentId: string) {
  const { data: quote, error: lookupError } = await db.from("business_quotes")
    .select("id,status,amount_paise,currency,razorpay_payment_id")
    .eq("razorpay_order_id", orderId).maybeSingle();
  if (lookupError) throw lookupError;
  if (!quote) return false;
  if (quote.razorpay_payment_id && quote.razorpay_payment_id !== paymentId) return false;
  if (quote.status === "cancelled" || quote.status === "expired") return false;
  const { error } = await db.from("business_quotes").update({
    status: quote.status === "fulfilled" ? "fulfilled" : "paid",
    razorpay_payment_id: paymentId,
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", quote.id).is("razorpay_payment_id", null);
  if (error) throw error;
  return true;
}
async function handleWebhook(req: Request, rawBody: string) {
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || "";
  const signature = req.headers.get("x-razorpay-signature") || "";
  const eventId = req.headers.get("x-razorpay-event-id") || "";
  if (!secret || !signature || !eventId || eventId.length > 200) return reply(req, { error: "Webhook authentication is unavailable" }, 401);
  const expected = await hmacHex(secret, rawBody);
  if (!safeEqual(expected, signature)) return reply(req, { error: "Invalid webhook signature" }, 401);
  const event = JSON.parse(rawBody);
  const eventType = clean(event?.event, 100);
  const db = dbClient();
  const { error: insertError } = await db.from("webhook_events").insert({
    provider: "razorpay", event_id: eventId, event_type: eventType, payload: event
  });
  if (insertError) {
    // The unique (provider,event_id) index makes redelivery idempotent.
    const { data: prior, error: priorError } = await db.from("webhook_events")
      .select("id,processed_at,processing_error").eq("provider", "razorpay").eq("event_id", eventId).maybeSingle();
    if (priorError) throw priorError;
    if (!prior) throw insertError;
    if (prior.processed_at) return reply(req, { ok: true, duplicate: true });
  }
  const { data: storedEvent, error: storedError } = await db.from("webhook_events")
    .select("id").eq("provider", "razorpay").eq("event_id", eventId).single();
  if (storedError) throw storedError;
  try {
    if (["payment.captured", "order.paid"].includes(eventType)) {
      const payment = event?.payload?.payment?.entity;
      const order = event?.payload?.order?.entity;
      const orderId = clean(payment?.order_id || order?.id, 64);
      const paymentId = clean(payment?.id, 64);
      if (orderId && paymentId) {
        const { data: quote, error } = await db.from("business_quotes")
          .select("amount_paise").eq("razorpay_order_id", orderId).maybeSingle();
        if (error) throw error;
        if (quote) {
          const verified = await getVerifiedCapturedPayment(paymentId, orderId, Number(quote.amount_paise));
          if (verified) await markQuotePaid(db, orderId, paymentId);
        }
      } else if (eventType === "order.paid" && orderId && Number(order?.amount_paid) > 0) {
        const providerOrder = await razorpayRequest("/orders/" + encodeURIComponent(orderId));
        if (providerOrder.status === "paid" && Number(providerOrder.amount_paid) === Number(providerOrder.amount)) {
          const { data: quote, error } = await db.from("business_quotes").select("amount_paise")
            .eq("razorpay_order_id", orderId).maybeSingle();
          if (error) throw error;
          if (quote && Number(providerOrder.amount) === Number(quote.amount_paise) && providerOrder.currency === "INR") {
            const payments = await razorpayRequest("/orders/" + encodeURIComponent(orderId) + "/payments");
            const captured = (payments?.items || []).find((p: any) => p.status === "captured" &&
              Number(p.amount) === Number(quote.amount_paise) && p.currency === "INR");
            if (captured?.id) await markQuotePaid(db, orderId, captured.id);
          }
        }
      }
    }
    const { error: processedError } = await db.from("webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_error: null }).eq("id", storedEvent.id);
    if (processedError) throw processedError;
    return reply(req, { ok: true, received: true });
  } catch (error) {
    const { error: updateError } = await db.from("webhook_events")
      .update({ processing_error: String(error).slice(0, 1000) }).eq("id", storedEvent.id);
    if (updateError) console.error("Webhook event status update failed");
    return reply(req, { error: "Webhook processing failed; provider may retry" }, 500);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return reply(req, { error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(req, { error: "Origin not allowed" }, 403);
  if (Number(req.headers.get("content-length") || "0") > MAX_BODY) return reply(req, { error: "Request too large" }, 413);
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY) return reply(req, { error: "Request too large" }, 413);

  try {
    // Signature-verified server-to-server event. Raw bytes are validated before JSON parsing.
    if (req.headers.has("x-razorpay-signature")) return await handleWebhook(req, rawBody);
    const body = JSON.parse(rawBody);
    const action = clean(body.action, 40);
    const db = dbClient();

    if (action === "admin-list" || action === "admin-create" || action === "admin-fulfill" || action === "admin-cancel") {
      const user = await authenticateAdmin(req);
      if (!user) return reply(req, { error: "Admin access is required" }, 403);
      if (action === "admin-list") {
        const { data, error } = await db.from("business_quotes")
          .select("id,customer_name,customer_email,project_scope,quoted_terms,amount_paise,currency,status,expires_at,razorpay_order_id,razorpay_payment_id,paid_at,fulfilled_at,created_at")
          .order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return reply(req, { ok: true, quotes: data || [] });
      }
      const id = clean(body.id, 64);
      if (action === "admin-fulfill") {
        if (!/^[0-9a-f-]{36}$/i.test(id)) return reply(req, { error: "Invalid quote id" }, 400);
        const { data, error } = await db.from("business_quotes").update({ status: "fulfilled", fulfilled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", id).eq("status", "paid").select("id,status").maybeSingle();
        if (error) throw error;
        if (!data) return reply(req, { error: "Only a paid quote can be marked fulfilled" }, 409);
        return reply(req, { ok: true, quote: data });
      }
      if (action === "admin-cancel") {
        if (!/^[0-9a-f-]{36}$/i.test(id)) return reply(req, { error: "Invalid quote id" }, 400);
        const { data, error } = await db.from("business_quotes").update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", id).eq("status", "sent").is("razorpay_payment_id", null).select("id,status").maybeSingle();
        if (error) throw error;
        if (!data) return reply(req, { error: "This quote cannot be cancelled in its current state" }, 409);
        return reply(req, { ok: true, quote: data });
      }
      if (action === "admin-create" && !businessCheckoutEnabled()) {
        return reply(req, { error: "Quote issuance and checkout are not enabled until test credentials, webhook verification and end-to-end checks are complete." }, 503);
      }
      const name = clean(body.customer_name, 120);
      const email = clean(body.customer_email, 254).toLowerCase();
      const scope = clean(body.project_scope, 6000);
      const terms = clean(body.quoted_terms, 6000);
      const amount = Number(body.amount_paise);
      const expiry = new Date(clean(body.expires_at, 40));
      if (name.length < 2 || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email) ||
          scope.length < 10 || terms.length < 10 || !Number.isSafeInteger(amount) || amount < 100 ||
          !Number.isFinite(expiry.getTime()) || expiry <= new Date() || expiry > new Date(Date.now() + 366 * 86400000)) {
        return reply(req, { error: "Enter a valid customer, scope, written terms, INR quote and expiry date (within 366 days)" }, 400);
      }
      const rawToken = token();
      const tokenHash = await sha256(rawToken);
      const quoteId = crypto.randomUUID();
      const receipt = "fc_" + quoteId.replaceAll("-", "");
      const { data, error } = await db.from("business_quotes").insert({
        id: quoteId, service_type: "custom_calculator", customer_name: name,
        customer_email: email, project_scope: scope, quoted_terms: terms,
        amount_paise: amount, currency: "INR", status: "sent", token_hash: tokenHash,
        expires_at: expiry.toISOString(), razorpay_receipt: receipt, created_by: user.id
      }).select("id,customer_name,customer_email,project_scope,quoted_terms,amount_paise,currency,status,expires_at,created_at").single();
      if (error) throw error;
      const quoteUrl = "https://friendlycalculator.in/calculator/quote.html#token=" + encodeURIComponent(rawToken);
      return reply(req, { ok: true, quote: data, quote_url: quoteUrl, warning: "Copy and send this private URL through your chosen channel. The token is shown only once." }, 201);
    }

    if (action === "get-quote") {
      const rawToken = clean(body.token, 100);
      if (!/^[A-Za-z0-9_-]{40,60}$/.test(rawToken)) return reply(req, { error: "Quote link is invalid or unavailable" }, 404);
      const tokenHash = await sha256(rawToken);
      const { data, error } = await db.from("business_quotes").select("*").eq("token_hash", tokenHash).maybeSingle();
      if (error) throw error;
      if (!data || data.status === "cancelled" || new Date(data.expires_at).getTime() <= Date.now()) return reply(req, { error: "This quote link has expired or is unavailable" }, 404);
      return reply(req, { ok: true, quote: safeQuote(data as Quote), already_paid: ["paid", "fulfilled"].includes(data.status) });
    }

    if (action === "create-order") {
      const rawToken = clean(body.token, 100);
      if (!/^[A-Za-z0-9_-]{40,60}$/.test(rawToken)) return reply(req, { error: "Quote link is invalid or unavailable" }, 404);
      if (!businessCheckoutEnabled()) return reply(req, { error: "Test checkout is not enabled. Payment is unavailable." }, 503);
      const tokenHash = await sha256(rawToken);
      const { data: rows, error } = await db.rpc("claim_business_quote_order", { p_quote_id: clean(body.quote_id, 64), p_token_hash: tokenHash });
      if (error) throw error;
      const quote = Array.isArray(rows) ? rows[0] : rows;
      if (!quote || quote.claim_state === "unavailable") return reply(req, { error: "This quote is expired or unavailable" }, 404);
      if (quote.claim_state === "already_paid") return reply(req, { error: "This quote is already paid", already_paid: true }, 409);
      if (quote.claim_state === "in_progress") return reply(req, { error: "Order setup is in progress; retry shortly" }, 409);
      let order = quote.razorpay_order_id ? { id: quote.razorpay_order_id } : null;
      if (!order) {
        // Recovery after an uncertain network timeout: fetch/reuse the same unique receipt before creating.
        order = await findOrderByReceipt(quote.razorpay_receipt, Number(quote.amount_paise));
        if (!order) {
          order = await razorpayRequest("/orders", { method: "POST", body: JSON.stringify({
            amount: Number(quote.amount_paise), currency: "INR", receipt: quote.razorpay_receipt,
            notes: { purpose: "Friendly Calculator custom calculator quote", quote_id: quote.quote_id }
          }) });
        }
        if (!order?.id || Number(order.amount) !== Number(quote.amount_paise) || order.currency !== "INR") throw new Error("Provider order did not match the server quote");
        const { error: saveError } = await db.from("business_quotes").update({
          razorpay_order_id: order.id, order_create_started_at: null, updated_at: new Date().toISOString()
        }).eq("id", quote.quote_id).is("razorpay_order_id", null);
        if (saveError) throw saveError;
        const { data: saved, error: savedError } = await db.from("business_quotes").select("razorpay_order_id,status")
          .eq("id", quote.quote_id).single();
        if (savedError) throw savedError;
        if (saved.razorpay_order_id !== order.id) throw new Error("Provider order did not match the stored quote order");
      }
      const config = razorpayConfig()!;
      return reply(req, { ok: true, key_id: config.keyId, order_id: order.id, amount: Number(quote.amount_paise), currency: "INR", name: "Friendly Calculator", description: "Custom calculator project quote", prefill: { name: quote.customer_name, email: quote.customer_email } });
    }

    if (action === "verify-payment") {
      const rawToken = clean(body.token, 100);
      const orderId = clean(body.razorpay_order_id, 64);
      const paymentId = clean(body.razorpay_payment_id, 64);
      const signature = clean(body.razorpay_signature, 128);
      if (!/^[A-Za-z0-9_-]{40,60}$/.test(rawToken) || !/^order_[A-Za-z0-9]+$/.test(orderId) ||
          !/^pay_[A-Za-z0-9]+$/.test(paymentId) || !/^[a-f0-9]{64}$/i.test(signature)) {
        return reply(req, { error: "Payment verification could not be completed" }, 400);
      }
      const tokenHash = await sha256(rawToken);
      const { data: quote, error } = await db.from("business_quotes").select("id,status,amount_paise,currency,razorpay_order_id,razorpay_payment_id,expires_at")
        .eq("token_hash", tokenHash).maybeSingle();
      if (error) throw error;
      if (!quote || quote.razorpay_order_id !== orderId) return reply(req, { error: "Payment does not match this quote" }, 400);
      if (quote.razorpay_payment_id === paymentId && ["paid", "fulfilled"].includes(quote.status)) return reply(req, { ok: true, verified: true, already_paid: true });
      const config = razorpayConfig();
      if (!businessCheckoutEnabled() || !config) return reply(req, { error: "Test checkout is not enabled" }, 503);
      const expected = await hmacHex(config.keySecret, quote.razorpay_order_id + "|" + paymentId);
      if (!safeEqual(expected, signature)) return reply(req, { error: "Payment signature verification failed" }, 400);
      const captured = await getVerifiedCapturedPayment(paymentId, orderId, Number(quote.amount_paise));
      if (!captured) return reply(req, { error: "Payment is not captured or does not match this quote" }, 409);
      const paid = await markQuotePaid(db, orderId, paymentId);
      if (!paid) return reply(req, { error: "Payment confirmation is being reconciled; contact support if this persists" }, 409);
      return reply(req, { ok: true, verified: true, message: "Payment confirmed. Friendly Calculator will review the paid quote and follow the written terms." });
    }

    return reply(req, { error: "Unknown action" }, 400);
  } catch (error) {
    console.error("business-checkout request failed", String(error).slice(0, 300));
    return reply(req, { error: "This request could not be completed. Please try again or contact support." }, 500);
  }
});
