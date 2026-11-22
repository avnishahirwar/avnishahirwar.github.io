'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {build, scienceEntries} = require('../scripts/generate-science-calculator-directory.cjs');
const {biologyEntries} = require('../scripts/generate-biology-calculator-directory.cjs');
const {chemistryEntries} = require('../scripts/generate-chemistry-calculator-directory.cjs');
const {physicsEntries} = require('../scripts/generate-physics-calculator-directory.cjs');

const root = path.join(__dirname, '..');
const pagePath = path.join(root, 'calculator/science-calculators.html');
const generated = build();
const entries = scienceEntries();
const urls = new Set(entries.map(entry => entry.url));

function expectedScienceUrls() {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const expected = new Set([...physicsEntries(), ...biologyEntries(), ...chemistryEntries()].map(entry => entry.url));
  for (const item of index) {
    if (!['ecology', 'astronomy & space'].includes(String(item.category || '').trim().toLowerCase())) continue;
    const url = String(item.url || '');
    if (url.startsWith('/calculators/') && url.endsWith('.html') && !url.includes('..') && !url.includes('?') && !url.includes('#') && fs.existsSync(path.join(root, url.slice(1)))) expected.add(url);
  }
  return expected;
}

test('Science directory includes the verified subject directories and separately tagged Ecology/Astronomy routes', () => {
  const expected = expectedScienceUrls();
  assert.equal(entries.length, 606, `expected 606 current science-tagged tools, got ${entries.length}`);
  assert.equal(urls.size, entries.length, 'Science directory URLs should be unique');
  assert.deepEqual(urls, expected, 'Science directory should exactly cover the verified current catalog set');
  for (const entry of entries) {
    assert.ok(fs.existsSync(path.join(root, entry.url.slice(1))), `missing destination: ${entry.url}`);
    assert.ok(generated.includes(`href="${entry.url}"`), `directory omitted ${entry.url}`);
  }
});

test('Science directory covers each major domain and excludes unrelated finance, general health and astrology tools', () => {
  const subjectCounts = Object.fromEntries([...new Set(entries.map(entry => entry.subject))].map(subject => [subject, entries.filter(entry => entry.subject === subject).length]));
  assert.deepEqual(subjectCounts, {physics:349, biology:116, chemistry:105, ecology:33, astronomy:3});
  for (const url of [
    '/calculators/compound-interest-calculator.html',
    '/calculators/bmi-calculator.html',
    '/calculators/zodiac-sign-calculator.html',
    '/calculators/home-loan-emi-calculator.html'
  ]) assert.ok(!urls.has(url), `unexpected non-science route ${url}`);
  for (const url of [
    '/calculators/dna-concentration-calculator.html',
    '/calculators/molarity-calculator.html',
    '/calculators/projectile-time-of-flight-calculator.html',
    '/calculators/carrying-capacity-calculator.html',
    '/calculators/astronomical-unit-calculator.html'
  ]) assert.ok(urls.has(url), `missing science route ${url}`);
});

test('Ecology and Astronomy routes use the expected subject topic groups', () => {
  const byUrl = new Map(entries.map(entry => [entry.url, entry]));
  assert.equal(byUrl.get('/calculators/shannon-diversity-index-calculator.html')?.subject, 'ecology');
  assert.equal(byUrl.get('/calculators/shannon-diversity-index-calculator.html')?.topic, 'environmental-science');
  assert.equal(byUrl.get('/calculators/astronomical-unit-calculator.html')?.subject, 'astronomy');
  assert.equal(byUrl.get('/calculators/astronomical-unit-calculator.html')?.topic, 'space-science');
});

test('checked-in Science page is reproducible and includes searchable, accessible SEO content and educational-use notes', () => {
  const checkedIn = fs.readFileSync(pagePath, 'utf8');
  const normalizeDate = html => html.replace(/("dateModified":")\d{4}-\d{2}-\d{2}("[,}])/g, '$1DATE$2');
  assert.equal(normalizeDate(checkedIn), normalizeDate(generated));
  assert.match(generated, /<link rel="canonical" href="https:\/\/friendlycalculator\.in\/calculator\/science-calculators\.html">/);
  assert.match(generated, /<meta property="og:url" content="https:\/\/friendlycalculator\.in\/calculator\/science-calculators\.html">/);
  assert.match(generated, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(generated, /"@type":"CollectionPage"/);
  assert.match(generated, /<label id="science-search-label" for="science-search-input">Search science calculators<\/label>/);
  assert.match(generated, /role="status" aria-live="polite"/);
  assert.match(generated, /Physics/);
  assert.match(generated, /Biology &amp; life sciences/);
  assert.match(generated, /Chemistry/);
  assert.match(generated, /Ecology, environment &amp; sustainability/);
  assert.match(generated, /Astronomy &amp; space/);
  assert.match(generated, /not a claim to include every science calculator worldwide/);
  assert.match(generated, /formula assumptions &amp; educational use/);
  assert.match(generated, /No calculators match that search/);
});

test('homepage, all-calculator directory and both sitemap files expose the Science directory', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const siteDirectory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  assert.match(homepage, /href="\/calculator\/science-calculators\.html"/);
  assert.match(siteDirectory, /href="\/calculator\/science-calculators\.html"/);
  for (const sitemapFile of ['sitemap.xml', 'sitemap-en.xml']) {
    const sitemap = fs.readFileSync(path.join(root, sitemapFile), 'utf8');
    assert.ok(sitemap.includes('https://friendlycalculator.in/calculator/science-calculators.html'), `${sitemapFile} is missing the Science directory`);
  }
});
