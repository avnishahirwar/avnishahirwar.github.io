import type { AuthEnv } from "./auth";

type ContactEnv = AuthEnv & { CONTACT_NOTIFY_EMAIL?: string };
const allowedOrigins = new Set([
  "https://avnishahirwar.github.io",
  "https://avnishahirwar-az3akne5j-avnis.vercel.app"
]);
function response(data: unknown, status: number, origin: string) {
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin"
  }});
}
function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]!));
}
export async function handleContactRequest(request: Request, env: ContactEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/contact") return null;
  const origin = request.headers.get("Origin") || "";
  if (!allowedOrigins.has(origin) && origin !== (env.APP_ORIGIN || "").replace(/\/$/, "")) {
    return Response.json({ error: "Origin not allowed." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (request.method === "OPTIONS") return response({}, 204, origin);
  if (request.method !== "POST") return response({ error: "Method not allowed." }, 405, origin);
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = clean(body.name, 80);
    const email = clean(body.email, 254).toLowerCase();
    const topic = clean(body.topic, 40);
    const message = clean(body.message, 2000);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["Feedback","Report a problem","Business enquiry","Partnership"].includes(topic) || message.length < 5) {
      return response({ error: "Please enter a valid name, email, enquiry type and message (at least 5 characters)." }, 400, origin);
    }
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO enquiries (id, name, email, topic, message, status) VALUES (?, ?, ?, ?, ?, 'new')")
      .bind(id, name, email, topic, message).run();
    let emailNotified = false;
    if (env.RESEND_API_KEY && env.EMAIL_FROM) {
      try {
        const notifyTo = env.CONTACT_NOTIFY_EMAIL || "avnishahirwar415@gmail.com";
        const html = `<h2>New AVNISH AI enquiry</h2><p><b>Reference:</b> ${id}</p><p><b>Name:</b> ${escapeHtml(name)}</p><p><b>Email:</b> ${escapeHtml(email)}</p><p><b>Type:</b> ${escapeHtml(topic)}</p><p><b>Message:</b><br>${escapeHtml(message).replace(/\n/g,"<br>")}</p>`;
        const sent = await fetch("https://api.resend.com/emails", {
          method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: env.EMAIL_FROM, to: [notifyTo], reply_to: email, subject: `AVNISH AI enquiry: ${topic}`, html })
        });
        emailNotified = sent.ok;
      } catch { emailNotified = false; }
    }
    return response({ success: true, reference: id, emailNotified, message: "Your enquiry has been received." }, 201, origin);
  } catch {
    return response({ error: "We could not submit your enquiry. Please try again." }, 500, origin);
  }
}
