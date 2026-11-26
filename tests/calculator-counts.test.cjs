// Regression coverage for the canonical 20-category directory and its sitemap-backed catalogue.
// Card links keep href adjacent to the class for stable semantic test selectors.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {catalogueCount, transformedFiles, sync} = require('../scripts/sync-calculator-counts.cjs');
const root = path.join(__dirname, '..');

function sitemapCalculatorUrls() {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  return [...new Set([...sitemap.matchAll(/<loc>(https:\/\/friendlycalculator\.in[^<]*)<\/loc>/g)]
    .map(match => new URL(match[1]).pathname)
    .filter(url => url.startsWith('/calculators/') && url.endsWith('.html')))].sort();
}

function directoryCategoryLinks(html) {
  const sections = [...html.matchAll(/<section class="section calculator-category" id="([^"]+)"[^>]*>([\s\S]*?)(?=<section class="section calculator-category"|<section class="section"|<footer|<\/main>)/g)];
  const links = sections.flatMap(section => [...section[2].matchAll(/<a class="card" href="(\/calculators\/[^"]+)"[^>]*>/g)].map(match => match[1]));
  return {sections, links};
}

test('curated directory covers every canonical sitemap calculator across 20 unique categories', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const expected = sitemapCalculatorUrls();
  const {sections, links} = directoryCategoryLinks(directory);
  const unique = [...new Set(links)].sort();
  const duplicates = links.filter((url, index) => links.indexOf(url) !== index);
  assert.equal(sections.length, 20, 'The directory should retain all 20 curated category sections');
  assert.equal(unique.length, expected.length, 'Every canonical sitemap calculator should appear in the directory');
  assert.deepEqual(unique, expected, 'Directory routes must exactly match canonical sitemap calculator routes');
  assert.deepEqual(duplicates, ['/calculators/loan-emi-calculator.html'], 'Only the retained Loan EMI shortcut may appear in two categories');
  assert.ok(directory.includes('/calculator/image-tools.html'), 'The directory should expose the browser image utility');
  assert.ok(directory.includes('/calculator/bhopal-calculators.html'), 'The directory should expose the Bhopal resource hub');
  assert.ok(directory.includes('/calculator/insurance-calculators.html'), 'The directory should link the insurance category hub');
});

test('all catalog-driven counts are synchronized and repeatable', () => {
  const {total, files} = transformedFiles();
  assert.equal(total, catalogueCount());
  for (const [relative, expected] of files) {
    assert.equal(fs.readFileSync(path.join(root, relative), 'utf8'), expected, `${relative} has a stale catalog count`);
  }
  assert.equal(sync({check:true}).changed.length, 0);
});

test('homepage category totals match the directory sections and canonical sitemap catalogue', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const {sections, links} = directoryCategoryLinks(directory);
  const navStart = homepage.indexOf('<nav class="home-category-index"');
  const nav = homepage.slice(navStart, homepage.indexOf('</nav>', navStart));
  const navCounts = [...nav.matchAll(/<span>([\d,]+) calculator(?:s)?<\/span>/g)].map(match => Number(match[1].replace(/,/g, '')));
  const sectionCounts = sections.map(section => [...section[2].matchAll(/<a class="card" href="\/calculators\//g)].length);
  assert.equal(navCounts.length, 20);
  assert.deepEqual(navCounts, sectionCounts, 'Homepage category counters must match the linked directory sections');
  assert.equal(navCounts.reduce((sum, count) => sum + count, 0), sitemapCalculatorUrls().length + 1, 'The retained Loan EMI shortcut is counted in two categories');
  assert.equal(links.length, sitemapCalculatorUrls().length + 1);
});

test('all catalog-driven counts are synchronized and repeatable after catalogue growth', () => {
  const {total} = transformedFiles();
  const staleCount = total - 1;
  const {updateHomepage} = require('../scripts/sync-calculator-counts.cjs');
  const stale = `<meta content="Search all ${staleCount.toLocaleString('en-US')} calculator entries"> <p>Total catalogue: ${staleCount.toLocaleString('en-US')} calculators</p>`;
  const updated = updateHomepage(stale, total);
  assert.ok(updated.includes(`Search all ${total.toLocaleString('en-US')} calculator entries`));
  assert.ok(updated.includes(`Total catalogue: ${total.toLocaleString('en-US')} calculators`));
});
