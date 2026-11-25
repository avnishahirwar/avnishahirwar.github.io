'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { auditHtmlDocument, parseSitemap, resolveLocalPath, markdownReport } = require('../scripts/production-optimization-audit.cjs');

test('valid page fixture passes core metadata and accessibility checks', () => {
  const html = '<!doctype html><html lang="en"><head><title>Friendly Calculator — Free Online Tools</title><meta name="description" content="Use practical free online calculators for finance, tax, salary and everyday planning. Review clear formulas, examples and assumptions before you decide."><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://friendlycalculator.in/"></head><body><a href="/about.html">About</a><button aria-label="Open settings"></button><img src="/logo.svg" alt="Friendly Calculator"></body></html>';
  assert.deepEqual(auditHtmlDocument('index.html', html).findings, []);
});
test('missing core metadata is reported', () => {
  const codes = auditHtmlDocument('sample.html', '<html><head><title>Short</title></head><body></body></html>').findings.map(x => x.code);
  for (const code of ['title-length', 'missing-description', 'missing-html-lang', 'missing-viewport', 'missing-canonical']) assert.ok(codes.includes(code));
});
test('hreflang duplicate, invalid tag and missing self-reference are detected', () => {
  const html = '<html lang="en"><head><title>Sample calculator page title</title><meta name="description" content="A useful description with enough context to explain this sample page and its purpose to visitors."><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://friendlycalculator.in/sample.html"><link rel="alternate" hreflang="en" href="https://friendlycalculator.in/en/sample.html"><link rel="alternate" hreflang="en" href="https://friendlycalculator.in/en/sample.html"><link rel="alternate" hreflang="not_a_locale" href="https://friendlycalculator.in/sample.html"></head></html>';
  const codes = auditHtmlDocument('sample.html', html).findings.map(x => x.code);
  for (const code of ['duplicate-hreflang', 'invalid-hreflang-code', 'hreflang-no-self']) assert.ok(codes.includes(code));
});
test('JSON-LD, alt text and accessible names are checked', () => {
  const html = '<html lang="en"><head><title>Sample calculator page title</title><meta name="description" content="A useful description with enough context to explain this sample page and its purpose to visitors."><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://friendlycalculator.in/sample.html"><script type="application/ld+json">{broken}</script></head><body><img src="/x.png"><a href="/x"></a><button></button><a href="https://example.com" target="_blank">External</a></body></html>';
  const codes = auditHtmlDocument('sample.html', html).findings.map(x => x.code);
  for (const code of ['invalid-json-ld', 'image-missing-alt', 'link-no-name', 'button-no-name', 'blank-link-noopener']) assert.ok(codes.includes(code));
});
test('sitemap parsing and local URL mapping are deterministic', () => {
  assert.deepEqual(parseSitemap('<?xml version="1.0"?><urlset><url><loc>https://friendlycalculator.in/</loc></url></urlset>'), ['https://friendlycalculator.in/']);
  assert.equal(resolveLocalPath('https://friendlycalculator.in/', 'sitemap.xml'), 'index.html');
  assert.equal(resolveLocalPath('/calculator/about.html?x=1', 'index.html'), 'calculator/about.html');
  assert.equal(resolveLocalPath('https://example.com/', 'index.html'), null);
});
test('report explains measurement boundaries', () => {
  const r = { generatedAt: '2026-11-25', counts: { htmlFiles: 1, indexablePages: 1, noindexPages: 0, sitemapUrls: 1, errors: 0, warnings: 0 }, securityHeaderSourceChecks: { hsts: false }, findings: [] };
  const md = markdownReport(r);
  assert.match(md, /do not prove what production serves/);
  assert.match(md, /LCP, INP and CLS require Lighthouse/);
});
