const test = require("node:test");
const assert = require("node:assert/strict");

test("Friendly Calculator Cloudflare preview hosts redirect to production", async () => {
  const source = require("node:fs").readFileSync(
    require("node:path").join(__dirname, "../functions/_middleware.js"),
    "utf8"
  );
  const encoded = Buffer.from(source).toString("base64");
  const { onRequest } = await import(`data:text/javascript;base64,${encoded}`);

  const preview = await onRequest({
    request: new Request(
      "https://seo-repair-public-social-met.friendly-calculator.pages.dev/calculators/loan-emi-calculator.html?amount=250000&term=20"
    ),
    next: () => new Response("next")
  });

  assert.equal(preview.status, 301);
  assert.equal(
    preview.headers.get("location"),
    "https://friendlycalculator.in/calculators/loan-emi-calculator.html?amount=250000&term=20"
  );
});

test("project root Pages domain redirects to the canonical hostname", async () => {
  const source = require("node:fs").readFileSync(
    require("node:path").join(__dirname, "../functions/_middleware.js"),
    "utf8"
  );
  const encoded = Buffer.from(source).toString("base64");
  const { onRequest } = await import(`data:text/javascript;base64,${encoded}`);

  const response = await onRequest({
    request: new Request("https://friendly-calculator.pages.dev/?preview=1"),
    next: () => new Response("next")
  });

  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://friendlycalculator.in/?preview=1");
});

test("production and unrelated hosts are not redirected", async () => {
  const source = require("node:fs").readFileSync(
    require("node:path").join(__dirname, "../functions/_middleware.js"),
    "utf8"
  );
  const encoded = Buffer.from(source).toString("base64");
  const { onRequest } = await import(`data:text/javascript;base64,${encoded}`);

  for (const url of [
    "https://friendlycalculator.in/calculators/basic-calculator.html",
    "https://another-project.pages.dev/"
  ]) {
    const response = await onRequest({
      request: new Request(url),
      next: () => new Response("next")
    });
    assert.equal(await response.text(), "next");
  }
});
