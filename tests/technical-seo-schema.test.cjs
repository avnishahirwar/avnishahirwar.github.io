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

test('priority calculator pages expose valid WebApplication and preserve existing SEO schema', () => {
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const canonicalTag = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0] || '';
    const canonical = canonicalTag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    assert.ok(canonical, file + ' must have a canonical URL');

    const h1 = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')
      .replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const blocks = parseJsonLd(html, file);
    const objects = blocks.flatMap(block => flattenTypes(block));
    const apps = objects.filter(item => item['@type'] === 'WebApplication' || item['@type'] === 'SoftwareApplication');
    assert.equal(apps.length, 1, file + ' must have exactly one application schema object');
    assert.equal(apps[0].url, canonical, file + ' application URL must match canonical');
    assert.equal(apps[0].name, h1, file + ' application name must match visible H1');
    assert.equal(apps[0].isAccessibleForFree, true, file + ' must accurately identify the free public tool');
    assert.equal(apps[0].publisher?.name, 'Friendly Calculator', file + ' must identify the publisher');
    assert.ok(apps[0].description && !/\[[A-Z_]+\]/.test(apps[0].description), file + ' must have a real description, not placeholders');
    assert.ok(objects.some(item => item['@type'] === 'BreadcrumbList'), file + ' must retain BreadcrumbList');
    assert.ok(objects.some(item => item['@type'] === 'WebPage'), file + ' must retain WebPage');
    assert.match(html, /<details[\s\S]*?<summary/i, file + ' must retain visible FAQ content');
    assert.ok(objects.some(item => item['@type'] === 'FAQPage'), file + ' must retain FAQPage schema');
  }
});
