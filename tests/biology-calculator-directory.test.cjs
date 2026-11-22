'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {build, biologyEntries} = require('../scripts/generate-biology-calculator-directory.cjs');

const root = path.join(__dirname, '..');
const pagePath = path.join(root, 'calculator/biology-calculators.html');
const generated = build();

test('biology directory covers the current biology-tagged catalogue with unique existing destinations', () => {
  const entries = biologyEntries();
  assert.ok(entries.length >= 100, `expected a broad biology directory, got ${entries.length}`);
  assert.equal(new Set(entries.map(entry => entry.url)).size, entries.length, 'directory URLs should be unique');
  for (const entry of entries) {
    assert.ok(fs.existsSync(path.join(root, entry.url.slice(1))), `missing destination: ${entry.url}`);
    assert.ok(generated.includes(`href="${entry.url}"`), `directory omitted ${entry.url}`);
  }
});

test('directory excludes chemistry-only and crystallography false positives from the mixed catalogue', () => {
  for (const url of [
    '/calculators/ionic-strength-calculator.html',
    '/calculators/nernst-equation-calculator.html',
    '/calculators/cell-emf-calculator-electromotive-force-of-a-cell.html',
    '/calculators/cubic-cell-calculator.html',
    '/calculators/molarity-calculator.html'
  ]) assert.ok(!biologyEntries().some(entry => entry.url === url), `unexpected chemistry-only route ${url}`);
  for (const url of [
    '/calculators/allele-frequency-calculator.html',
    '/calculators/dna-concentration-calculator.html',
    '/calculators/cell-dilution-calculator.html',
    '/calculators/cow-gestation-calculator.html'
  ]) assert.ok(biologyEntries().some(entry => entry.url === url), `missing biology route ${url}`);
});

test('checked-in directory is reproducible and offers labelled search, subcategories and scope cautions', () => {
  assert.equal(fs.readFileSync(pagePath, 'utf8'), generated);
  assert.match(generated, /<label id="bio-search-label" for="bio-search-input">Search biology calculators<\/label>/);
  assert.match(generated, /role="status" aria-live="polite"/);
  assert.match(generated, /Pets, companion animals &amp; veterinary tools/);
  assert.match(generated, /Livestock, breeding &amp; animal production/);
  assert.match(generated, /Genetics, heredity &amp; molecular biology/);
  assert.match(generated, /Plants, crops, gardens &amp; forestry/);
  assert.match(generated, /not a claim to list every biology calculator worldwide/);
  assert.match(generated, /qualified veterinarian/);
});

test('all-calculator directory links to the searchable biology directory', () => {
  const siteDirectory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  assert.match(siteDirectory, /href="\/calculator\/biology-calculators\.html"/);
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.includes('https://friendlycalculator.in/calculator/biology-calculators.html'));
});
