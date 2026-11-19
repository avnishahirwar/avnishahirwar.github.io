import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigin = "https://friendlycalculator.in";
const headers = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function database() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const secretBundle = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const secret = secretBundle.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !secret) throw new Error("Daily visits service is not configured.");
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function indiaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (origin !== allowedOrigin) {
    return new Response(JSON.stringify({ error: "Origin not allowed." }), {
      status: 403,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== "POST") return response({ error: "Method not allowed." }, 405);

  try {
    const body = await request.json();
    const sessionId = typeof body?.session_id === "string" ? body.session_id : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
      return response({ error: "A valid session identifier is required." }, 400);
    }

    const visitDate = indiaDate();
    const client = database();
    const { error: insertError } = await client
      .from("daily_site_visits")
      .upsert(
        { visit_date: visitDate, session_id: sessionId },
        { onConflict: "visit_date,session_id", ignoreDuplicates: true }
      );
    if (insertError) throw insertError;

    const { count, error: countError } = await client
      .from("daily_site_visits")
      .select("session_id", { count: "exact", head: true })
      .eq("visit_date", visitDate);
    if (countError) throw countError;

    return response({
      ok: true,
      date: visitDate,
      total_visits: count ?? 0
    });
  } catch (error) {
    console.error("Daily visits counter failed:", error);
    return response({ error: "Daily visits are temporarily unavailable." }, 503);
  }
});
