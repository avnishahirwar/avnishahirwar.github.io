'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = [
  'calculators/income-tax-calculator.html',
  'calculators/gst-calculator.html',
  'calculators/fd-calculator.html',
  'calculators/loan-emi-calculator.html',
  'calculators/swp-calculator.html'
];

function parseJsonLd(html, file) {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return scripts.map((match, index) => {
    try { return JSON.parse(match[1]); }
    catch (error) { assert.fail(file + ' JSON-LD block ' + (index + 1) + ' is invalid: ' + error.message); }
  });
}

function flattenTypes(value, output = []) {
  if (!value || typeof value !== 'object') return output;
  if (typeof value['@type'] === 'string') output.push(value);
  if (Array.isArray(value['@graph'])) value['@graph'].forEach(item => flattenTypes(item, output));
  return output;
}

test('shared site shell injects calculator WebApplication schema without duplicating page schema', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.match(shell, /function injectCalculatorApplicationSchema/);
  assert.match(shell, /hasApplicationSchema/);
  assert.match(shell, /'@type':'WebApplication'/);
  assert.match(shell, /applicationCategory/);
  assert.match(shell, /isAccessibleForFree:true/);
  assert.match(shell, /price:'0'/);
  assert.match(shell, /provider:\{'@type':'Organization'/);
  assert.match(shell, /function injectVisibleCalculatorFaqSchema/);

  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const canonicalTag = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0] || '';
    const canonical = canonicalTag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    assert.ok(canonical && canonical.startsWith('https://friendlycalculator.in/'), file + ' must have a canonical HTTPS URL');
    assert.match(html, /site-shell\.js/, file + ' must load the shared site shell');
    assert.match(html, /<h1\b[^>]*>[\s\S]*?<\/h1>/i, file + ' must have a visible H1');
    assert.match(html, /<meta\b[^>]*name=["']description["']/i, file + ' must have a meta description');

    const objects = parseJsonLd(html, file).flatMap(block => flattenTypes(block));
    assert.ok(objects.some(item => item['@type'] === 'WebPage'), file + ' must retain WebPage schema');
    assert.ok(objects.some(item => item['@type'] === 'BreadcrumbList'), file + ' must retain BreadcrumbList');
    assert.match(html, /<details[\s\S]*?<summary/i, file + ' must retain visible FAQ content');
    assert.ok(objects.some(item => item['@type'] === 'FAQPage'), file + ' must retain matching FAQPage schema');
    assert.ok(!objects.some(item => item['@type'] === 'WebApplication' || item['@type'] === 'SoftwareApplication'),
      file + ' must not duplicate the shared runtime application schema in static markup');
  }
});
