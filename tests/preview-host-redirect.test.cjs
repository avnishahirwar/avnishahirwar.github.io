const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

async function loadMiddleware() {
  const source = fs.readFileSync(path.join(__dirname, "../functions/_middleware.js"), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

test("branch preview host redirects to canonical production URL and preserves path/query", async () => {
  const { onRequest } = await loadMiddleware();
  const response = await onRequest({
    request: new Request("https://seo-repair-public-social-met.friendly-calculator.pages.dev/calculators/loan-emi-calculator.html?amount=250000&term=20"),
    next: () => new Response("next")
  });
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://friendlycalculator.in/calculators/loan-emi-calculator.html?amount=250000&term=20");
});

test("project root Pages hostname redirects to production", async () => {
  const { onRequest } = await loadMiddleware();
  const response = await onRequest({
    request: new Request("https://friendly-calculator.pages.dev/?preview=1"),
    next: () => new Response("next")
  });
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://friendlycalculator.in/?preview=1");
});

test("production and unrelated Pages hosts are not redirected", async () => {
  const { onRequest } = await loadMiddleware();
  for (const url of [
    "https://friendlycalculator.in/calculators/basic-calculator.html",
    "https://another-project.pages.dev/"
  ]) {
    const response = await onRequest({ request: new Request(url), next: () => new Response("next") });
    assert.equal(await response.text(), "next");
  }
});

test("Netlify deploy-preview host redirects to production and preserves path/query", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../netlify/edge-functions/preview-host-redirect.js"), "utf8");
  const encoded = Buffer.from(source).toString("base64");
  const { default: handler, config } = await import(`data:text/javascript;base64,${encoded}`);
  assert.equal(config.path, "/*");
  const response = await handler(
    new Request("https://deploy-preview-700--avnishahirwar.netlify.app/calculators/basic-calculator.html?value=9"),
    { next: () => new Response("next") }
  );
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://friendlycalculator.in/calculators/basic-calculator.html?value=9");
});

test("Netlify production alias is not redirected", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../netlify/edge-functions/preview-host-redirect.js"), "utf8");
  const encoded = Buffer.from(source).toString("base64");
  const { default: handler } = await import(`data:text/javascript;base64,${encoded}`);
  const response = await handler(
    new Request("https://avnishahirwar.netlify.app/"),
    { next: () => new Response("next") }
  );
  assert.equal(await response.text(), "next");
});
