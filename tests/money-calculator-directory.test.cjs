'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {build, financeEntries} = require('../scripts/generate-money-calculator-directory.cjs');

const root = path.join(__dirname, '..');
const pagePath = path.join(root, 'calculator/money-calculators.html');
const generated = build();

test('money directory includes the complete current finance-tagged catalogue with unique live destinations', () => {
  const entries = financeEntries();
  assert.ok(entries.length >= 400, `expected a broad finance directory, got ${entries.length}`);
  assert.equal(new Set(entries.map(entry => entry.url)).size, entries.length, 'directory URLs should be unique');
  for (const entry of entries) {
    assert.ok(fs.existsSync(path.join(root, entry.url.slice(1))), `missing destination: ${entry.url}`);
    assert.ok(generated.includes(`href="${entry.url}"`), `directory omitted ${entry.url}`);
  }
});

test('checked-in money directory stays reproducible from the calculator catalogue', () => {
  assert.equal(fs.readFileSync(pagePath, 'utf8'), generated);
});

test('money directory provides a labelled accessible search and visible finance cautions', () => {
  assert.match(generated, /<label id="money-search-label" for="money-search-input">Search money calculators<\/label>/);
  assert.match(generated, /role="status" aria-live="polite"/);
  assert.match(generated, /Use results as estimates/);
  assert.match(generated, /country-specific tax or statutory calculations/);
  assert.match(generated, /assumed returns are not guaranteed/);
});
