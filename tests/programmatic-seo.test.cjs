'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'seo/programmatic-pages.json'), 'utf8'));

test('curated EMI page data has unique slugs and sensible assumptions', () => {
  const slugs = data.pages.map(page => page.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const page of data.pages) {
    assert.match(page.slug, /^[a-z0-9-]+$/);
    assert.ok(Number(page.amount) > 0);
    assert.ok(Number(page.rate) >= 0 && Number(page.rate) <= 50);
    assert.ok(page.description.length >= 20);
  }
});

test('generated EMI pages are indexable, canonical and useful', () => {
  const canonicals = [];
  for (const page of data.pages) {
    const file = path.join(root, 'guides/emi', page.slug + '.html');
    assert.ok(fs.existsSync(file), 'missing ' + file);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /name="description"/);
    assert.match(html, /name="robots" content="index,follow/);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /How the EMI is estimated/);
    assert.match(html, /loan-emi-calculator\.html/);
    assert.ok(html.includes('/assets/site-shell.css'), 'generated page should use shared site styles');
    assert.ok(html.includes('/assets/site-shell.js'), 'generated page should use shared navigation and footer');
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    assert.ok(canonical, 'canonical missing for ' + page.slug);
    canonicals.push(canonical);
  }
  assert.equal(new Set(canonicals).size, canonicals.length, 'canonical URLs must be unique');
});

test('guide hub and supporting age/CGPA guides exist and are discoverable', () => {
  const checks = [
    ['guides/index.html', '/guides/emi/emi-for-5-lakh-loan-at-8-percent.html'],
    ['guides/age-in-months-between-two-dates.html', '/calculators/age-calculator.html'],
    ['guides/cgpa-to-percentage-india.html', '/calculators/cgpa-to-percentage-calculator.html']
  ];
  for (const [file, expectedLink] of checks) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /rel="canonical"/);
    assert.match(html, /name="description"/);
    assert.ok(html.includes(expectedLink), file + ' should link to its relevant calculator or example');
  }
});
