'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {catalogueCount, catalogueStats, sectionCardCounts, transformedFiles, sync, updateHomepage} = require('../scripts/sync-calculator-counts.cjs');
const root = path.join(__dirname, '..');

test('global calculator total matches unique catalog routes with existing pages', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const routes = new Set(index.map(item => item.url).filter(url => typeof url === 'string' && url.startsWith('/') && url.endsWith('.html') && !url.includes('?') && !url.includes('#') && !url.split('/').includes('..') && fs.existsSync(path.join(root, url.slice(1)))));
  assert.equal(catalogueCount(), routes.size);
});

test('English and Hindi categorized directories expose unique published calculator links', () => {
  const english = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const categorySections = english.split('<section class="section calculator-category"').slice(1);
  const englishLinks = categorySections.flatMap(section => [...section.matchAll(/href="([^"]+)"/g)].map(match => match[1]).filter(href => href.startsWith('/calculators/') && href.endsWith('.html')));
  const uniqueEnglishLinks = new Set(englishLinks);
  const expectedEnglishLinks = catalogueStats().entries.filter(item => item.url.startsWith('/calculators/')).map(item => item.url).sort();
  const duplicateEnglishLinks = englishLinks.filter((url, index) => englishLinks.indexOf(url) !== index);
  assert.match(english, /<section class="section calculator-category" id="[a-z0-9-]+">/, 'English directory should expose generated category sections');
  assert.ok(englishLinks.length > 3000, 'English directory should cover a broad calculator catalogue');
  assert.equal(uniqueEnglishLinks.size, expectedEnglishLinks.length, 'English directory should contain each canonical calculator route');
  assert.equal(englishLinks.length, expectedEnglishLinks.length + 1, 'Loan EMI is intentionally cross-listed in savings and loan categories');
  assert.deepEqual([...uniqueEnglishLinks].sort(), expectedEnglishLinks, 'English directory should list every canonical calculator route');
  assert.deepEqual(duplicateEnglishLinks, ['/calculators/loan-emi-calculator.html'], 'Only the Loan EMI shortcut should be cross-listed');

  const hindi = fs.readFileSync(path.join(root, 'hi/calculator/site-directory.html'), 'utf8');
  const counts = sectionCardCounts(hindi);
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  assert.ok(counts.size >= 20, 'Hindi directory should expose its category sections');
  assert.ok(total > 3000, 'Hindi directory should cover a broad linked catalog');
  for (const [id, count] of counts) {
    const sectionStart = hindi.indexOf('id="' + id + '"');
    const sectionEnd = hindi.indexOf('</section>', sectionStart);
    const section = hindi.slice(sectionStart, sectionEnd < 0 ? undefined : sectionEnd);
    const expectedLinks = new Set([...section.matchAll(/href="([^"]+)"/g)].map(match => match[1]).filter(href => href.includes('/calculators/')));
    assert.equal(expectedLinks.size, count, 'Hindi directory ' + id + ' card count');
    const plural = count === 1 ? 'calculator' : 'calculators';
    assert.ok(hindi.includes('href="#' + id + '"'), 'Hindi directory category shortcut ' + id + ' should exist');
    assert.ok(hindi.includes('<span>' + count.toLocaleString('en-US') + ' ' + plural + '</span>'), 'Hindi directory category shortcut ' + id + ' should show its count');
  }
});

test('all catalog-driven counts are synchronized and repeatable', () => {
  const {total, files} = transformedFiles();
  assert.equal(total, catalogueCount());
  for (const [relative, expected] of files) {
    assert.equal(fs.readFileSync(path.join(root, relative), 'utf8'), expected, `${relative} has a stale catalog count`);
  }
  assert.equal(sync({check:true}).changed.length, 0);
});

test('homepage count transformation updates stale totals when the catalog grows', () => {
  const total = catalogueCount();
  const staleCount = total - 1;
  const stale = `<meta content="Search all ${staleCount.toLocaleString('en-US')} calculator entries"> <p>Total catalogue: ${staleCount.toLocaleString('en-US')} calculators</p>`;
  const updated = updateHomepage(stale, total);
  assert.ok(updated.includes(`Search all ${total.toLocaleString('en-US')} calculator entries`));
  assert.ok(updated.includes(`Total catalogue: ${total.toLocaleString('en-US')} calculators`));
  const localized = updateHomepage(`items.length!==${staleCount}; status.textContent="Browse ${staleCount} calculators";`, total, true);
  assert.equal(localized, `items.length!==${total}; status.textContent="Browse ${total} calculators";`);
});
