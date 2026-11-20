/**
 * Redirect Friendly Calculator Cloudflare Pages preview hosts to production.
 * GitHub Pages production is unaffected because it does not execute Pages Functions.
 */
const PREVIEW_SUFFIX = ".friendly-calculator.pages.dev";
const PREVIEW_ROOT = "friendly-calculator.pages.dev";
const PRODUCTION_ORIGIN = "https://friendlycalculator.in";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();

  if (hostname !== PREVIEW_ROOT && !hostname.endsWith(PREVIEW_SUFFIX)) {
    return context.next();
  }

  const destination = new URL(url.pathname + url.search, PRODUCTION_ORIGIN);
  return Response.redirect(destination.toString(), 301);
}
