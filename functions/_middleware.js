/**
 * Keep Cloudflare Pages project and preview URLs from serving duplicate pages.
 * Requests on pages.dev are redirected to the canonical production domain;
 * custom production hosts continue through the normal static asset pipeline.
 */
const PREVIEW_ROOT = 'friendly-calculator.pages.dev';
const PREVIEW_SUFFIX = '.friendly-calculator.pages.dev';
const PRODUCTION_ORIGIN = 'https://friendlycalculator.in';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();
  const isPagesHost = hostname === PREVIEW_ROOT || hostname.endsWith(PREVIEW_SUFFIX);

  if (!isPagesHost) {
    return context.next();
  }

  const destination = new URL(`${url.pathname}${url.search}`, PRODUCTION_ORIGIN);
  return Response.redirect(destination.toString(), 301);
}
