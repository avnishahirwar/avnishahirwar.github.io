/**
 * Redirect only the stable Cloudflare Pages project hostname to production.
 * Branch-preview hosts must serve their own deployed content so pull requests
 * can be inspected without silently testing the production site.
 * Custom production hosts continue through the normal static asset pipeline.
 */
const CANONICAL_PAGES_HOST = 'friendly-calculator.pages.dev';
const PRODUCTION_ORIGIN = 'https://friendlycalculator.in';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();

  if (hostname !== CANONICAL_PAGES_HOST) {
    return context.next();
  }

  const destination = new URL(`${url.pathname}${url.search}`, PRODUCTION_ORIGIN);
  return Response.redirect(destination.toString(), 301);
}
