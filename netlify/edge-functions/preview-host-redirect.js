/**
 * Redirect public Netlify deploy-preview and branch-deploy hostnames
 * to the canonical Friendly Calculator production domain.
 */
const PREVIEW_SUFFIX = "--avnishahirwar.netlify.app";
const PRODUCTION_ORIGIN = "https://friendlycalculator.in";

export default async function handler(request, context) {
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();

  if (!hostname.endsWith(PREVIEW_SUFFIX)) {
    return context.next();
  }

  const destination = new URL(url.pathname + url.search, PRODUCTION_ORIGIN);
  return Response.redirect(destination.toString(), 301);
}

export const config = { path: "/*" };
