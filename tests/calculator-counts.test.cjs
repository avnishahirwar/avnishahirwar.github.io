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

test('English and Hindi category totals match their actual unique calculator links', () => {
  for (const relative of ['calculator/site-directory.html', 'hi/calculator/site-directory.html']) {
    const html = fs.readFileSync(path.join(root, relative), 'utf8');
    const counts = sectionCardCounts(html);
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    assert.ok(counts.size >= 20, `${relative} should expose its category sections`);
    assert.ok(total > 3000, `${relative} should cover a broad linked catalog`);
    for (const [id, count] of counts) {
      const sectionStart = html.indexOf(`id="${id}"`);
      const end = html.indexOf('</section>', sectionStart);
      const section = html.slice(sectionStart, end < 0 ? undefined : end);
      const expectedLinks = new Set([...section.matchAll(/href="((?:\/[a-z]{2,3})?\/calculators\/[^\"]+)"/g)].map(match => match[1]));
      assert.equal(expectedLinks.size, count, `${relative} ${id} card count`);
      const plural = count === 1 ? 'calculator' : 'calculators';
      const quickLink = new RegExp(`<a\\b[^>]*href="#${id}"[^>]*>[\\s\\S]*?<span>${count.toLocaleString('en-US')} ${plural}<\\/span>`);
      assert.match(html, quickLink, `${relative} category shortcut ${id} count`);
    }
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
