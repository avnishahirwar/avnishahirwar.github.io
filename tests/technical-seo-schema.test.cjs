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

test('priority calculator pages expose one accurate static WebApplication and preserve page schemas', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.match(shell, /function injectCalculatorApplicationSchema/);
  assert.match(shell, /hasApplicationSchema/);
  assert.match(shell, /function injectVisibleCalculatorFaqSchema/);

  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const canonicalTag = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0] || '';
    const canonical = canonicalTag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    assert.ok(canonical && canonical.startsWith('https://friendlycalculator.in/'), file + ' must have a canonical HTTPS URL');

    const h1 = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')
      .replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const metaDescription = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const blocks = parseJsonLd(html, file);
    const objects = blocks.flatMap(block => flattenTypes(block));
    const apps = objects.filter(item => item['@type'] === 'WebApplication' || item['@type'] === 'SoftwareApplication');

    assert.equal(apps.length, 1, file + ' must contain exactly one static application schema object');
    assert.equal(apps[0].url, canonical, file + ' application URL must match canonical');
    assert.equal(apps[0]['@id'], canonical + '#application', file + ' application @id must be unique to the canonical page');
    assert.equal(apps[0].name, h1, file + ' application name must match the visible H1');
    assert.equal(apps[0].description, metaDescription, file + ' application description must match visible page metadata');
    assert.equal(apps[0].isAccessibleForFree, true, file + ' must accurately identify the free public tool');
    assert.equal(apps[0].offers?.price, '0', file + ' must use the public zero-price offer');
    assert.equal(apps[0].offers?.priceCurrency, 'INR', file + ' must use the Indian display currency');
    assert.equal(apps[0].publisher?.name, 'Friendly Calculator', file + ' must identify the publisher');
    assert.ok(apps[0].applicationCategory, file + ' must declare an application category');
    assert.ok(!/\[[A-Z_]+\]/.test(apps[0].description), file + ' must not contain placeholder text');

    assert.ok(objects.some(item => item['@type'] === 'WebPage'), file + ' must retain WebPage schema');
    assert.ok(objects.some(item => item['@type'] === 'BreadcrumbList'), file + ' must retain BreadcrumbList');
    assert.match(html, /<details[\s\S]*?<summary/i, file + ' must retain visible FAQ content');
    assert.ok(objects.some(item => item['@type'] === 'FAQPage'), file + ' must retain matching FAQPage schema');

    // The shared runtime injector must detect the static object and avoid adding a duplicate.
    assert.match(shell, /types\.some\(type=>type==='WebApplication'\|\|type==='SoftwareApplication'\)/);
  }
});
