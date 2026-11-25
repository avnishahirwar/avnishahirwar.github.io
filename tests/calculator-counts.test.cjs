'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {catalogueCount, sectionCardCounts, transformedFiles, sync, updateHomepage} = require('../scripts/sync-calculator-counts.cjs');
const root = path.join(__dirname, '..');

test('global calculator total matches unique catalog routes with existing pages', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const routes = new Set(index.map(item => item.url).filter(url => typeof url === 'string' && url.startsWith('/') && url.endsWith('.html') && !url.includes('?') && !url.includes('#') && !url.split('/').includes('..') && fs.existsSync(path.join(root, url.slice(1)))));
  assert.equal(catalogueCount(), routes.size);
});

test('English generated directory and Hindi category directory expose unique published calculator links', () => {
  const english = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const englishLinks = [...english.matchAll(/<a class="card" href="(\\/calculators\\/[^"]+\\.html)"/g)].map(match => match[1]);
  const uniqueEnglishLinks = new Set(englishLinks);
  const rootPages = fs.readdirSync(path.join(root, 'calculators')).filter(name => name.endsWith('.html')).map(name => '/calculators/' + name);
  assert.match(english, /<section class="group" id="group-[a-z0-9]+">/, 'English directory should expose generated alphabetical groups');
  assert.ok(englishLinks.length > 3000, 'English directory should cover a broad calculator catalogue');
  assert.equal(uniqueEnglishLinks.size, englishLinks.length, 'English directory must not duplicate calculator routes');
  assert.deepEqual([...uniqueEnglishLinks].sort(), rootPages.sort(), 'English directory should list every root calculator page exactly once');

  const hindi = fs.readFileSync(path.join(root, 'hi/calculator/site-directory.html'), 'utf8');
  const counts = sectionCardCounts(hindi);
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  assert.ok(counts.size >= 20, 'Hindi directory should expose its category sections');
  assert.ok(total > 3000, 'Hindi directory should cover a broad linked catalog');
  for (const [id, count] of counts) {
    const sectionStart = hindi.indexOf(`id="${id}"`);
    const end = hindi.indexOf('</section>', sectionStart);
    const section = hindi.slice(sectionStart, end < 0 ? undefined : end);
    const expectedLinks = new Set([...section.matchAll(/href="((?:\\/[a-z]{2,3})?\\/calculators\\/[^\\"]+)"/g)].map(match => match[1]));
    assert.equal(expectedLinks.size, count, `Hindi directory ${id} card count`);
    const plural = count === 1 ? 'calculator' : 'calculators';
    const quickLink = new RegExp(`<a\\\\b[^>]*href="#${id}"[^>]*>[\\\\s\\\\S]*?<span>${count.toLocaleString('en-US')} ${plural}<\\\\/span>`);
    assert.match(hindi, quickLink, `Hindi directory category shortcut ${id} count`);
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
