'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {build, economicEntries} = require('../scripts/generate-economic-calculator-directory.cjs');

const root = path.join(__dirname, '..');
const pagePath = path.join(root, 'calculator/economic-calculators.html');
const generated = build();

test('economics directory lists verified economics-focused catalog calculators with unique live destinations', () => {
  const entries = economicEntries();
  assert.ok(entries.length >= 20, `expected a broad economics directory, got ${entries.length}`);
  assert.equal(new Set(entries.map(entry => entry.url)).size, entries.length, 'directory URLs should be unique');
  for (const entry of entries) {
    assert.ok(fs.existsSync(path.join(root, entry.url.slice(1))), `missing destination: ${entry.url}`);
    assert.ok(generated.includes(`href="${entry.url}"`), `directory omitted ${entry.url}`);
  }
  for (const expected of [
    '/calculators/real-gdp-calculator.html',
    '/calculators/price-elasticity-of-demand-calculator.html',
    '/calculators/consumer-surplus-calculator.html',
    '/calculators/opportunity-cost-calculator.html',
    '/calculators/natural-rate-of-unemployment-calculator.html'
  ]) assert.ok(entries.some(entry => entry.url === expected), `missing economics topic: ${expected}`);
});

test('economics directory excludes misleading non-economics matches and unrelated personal finance tools', () => {
  const urls = economicEntries().map(entry => entry.url);
  for (const excluded of [
    '/calculators/atom-economy-calculator.html',
    '/calculators/plug-in-hybrid-economy-calculator.html',
    '/calculators/child-education-calculator.html',
    '/calculators/passive-income-calculator.html',
    '/calculators/wealth-goal-calculator.html'
  ]) assert.ok(!urls.includes(excluded), `misclassified as economics: ${excluded}`);
});

test('checked-in economics directory is reproducible and has labelled accessible search and context notes', () => {
  assert.equal(fs.readFileSync(pagePath, 'utf8'), generated);
  assert.match(generated, /<label id="econ-search-label" for="econ-search-input">Search economics calculators<\/label>/);
  assert.match(generated, /role="status" aria-live="polite"/);
  assert.match(generated, /not every calculator worldwide/);
});

test('economics directory is linked from site discovery and indexed in the sitemap', () => {
  const siteDirectory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const financePage = fs.readFileSync(path.join(root, 'calculator/finance-calculators.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.match(siteDirectory, /href="\/calculator\/economic-calculators\.html"/);
  assert.match(financePage, /href="\/calculator\/economic-calculators\.html"/);
  assert.match(sitemap, /<loc>https:\/\/friendlycalculator\.in\/calculator\/economic-calculators\.html<\/loc>/);
});
