'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {build, chemistryEntries} = require('../scripts/generate-chemistry-calculator-directory.cjs');
const {biologyEntries} = require('../scripts/generate-biology-calculator-directory.cjs');

const root = path.join(__dirname, '..');
const pagePath = path.join(root, 'calculator/chemistry-calculators.html');
const generated = build();

test('chemistry directory covers chemistry-tagged catalogue tools with unique existing destinations', () => {
  const entries = chemistryEntries();
  assert.ok(entries.length >= 100, `expected a broad chemistry directory, got ${entries.length}`);
  assert.equal(new Set(entries.map(entry => entry.url)).size, entries.length, 'directory URLs should be unique');
  for (const entry of entries) {
    assert.ok(fs.existsSync(path.join(root, entry.url.slice(1))), `missing destination: ${entry.url}`);
    assert.ok(generated.includes(`href="${entry.url}"`), `directory omitted ${entry.url}`);
  }
});

test('chemistry directory does not duplicate Biology-directory pages and rejects non-chemistry category matches', () => {
  const chemistryUrls = new Set(chemistryEntries().map(entry => entry.url));
  const biologyUrls = new Set(biologyEntries().map(entry => entry.url));
  for (const url of chemistryUrls) assert.ok(!biologyUrls.has(url), `directory overlaps Biology at ${url}`);
  for (const url of [
    '/calculators/allele-frequency-calculator.html',
    '/calculators/dna-concentration-calculator.html',
    '/calculators/cell-dilution-calculator.html',
    '/calculators/cow-gestation-calculator.html',
    '/calculators/acid-base-calculator.html',
    '/calculators/arterial-blood-ph-calculator.html',
    '/calculators/protein-molecular-weight-calculator.html'
  ]) assert.ok(!chemistryUrls.has(url), `unexpected Biology or clinical false positive ${url}`);
});

test('chemistry topic coverage includes core chemistry, process and analytical tools', () => {
  const urls = new Set(chemistryEntries().map(entry => entry.url));
  for (const url of [
    '/calculators/net-ionic-equation-calculator.html',
    '/calculators/electron-configuration-calculator.html',
    '/calculators/atom-economy-calculator.html',
    '/calculators/molarity-calculator.html',
    '/calculators/ph-calculator.html',
    '/calculators/nernst-equation-calculator.html',
    '/calculators/beer-lambert-law-calculator.html',
    '/calculators/chemical-oxygen-demand-calculator.html',
    '/calculators/water-hardness-calculator.html'
  ]) assert.ok(urls.has(url), `missing chemistry route ${url}`);
});

test('checked-in chemistry directory is reproducible and has labelled live search, subcategories and scope cautions', () => {
  assert.equal(fs.readFileSync(pagePath, 'utf8'), generated);
  assert.match(generated, /<link rel="canonical" href="https:\/\/friendlycalculator\.in\/calculator\/chemistry-calculators\.html">/);
  assert.match(generated, /<label id="chem-search-label" for="chem-search-input">Search chemistry calculators<\/label>/);
  assert.match(generated, /role="status" aria-live="polite"/);
  assert.match(generated, /Atoms, periodic trends &amp; chemical bonding/);
  assert.match(generated, /Solutions, concentration &amp; acid–base chemistry/);
  assert.match(generated, /Electrochemistry, materials &amp; crystallography/);
  assert.match(generated, /not a claim to include every chemistry calculator worldwide/);
  assert.match(generated, /No calculators match that search/);
});

test('all-calculator directory and both sitemap files link to the chemistry directory', () => {
  const siteDirectory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  assert.match(siteDirectory, /href="\/calculator\/chemistry-calculators\.html"/);
  for (const sitemapFile of ['sitemap.xml', 'sitemap-en.xml']) {
    const sitemap = fs.readFileSync(path.join(root, sitemapFile), 'utf8');
    assert.ok(sitemap.includes('https://friendlycalculator.in/calculator/chemistry-calculators.html'), `${sitemapFile} is missing the chemistry directory`);
  }
});
