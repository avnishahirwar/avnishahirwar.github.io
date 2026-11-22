const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'calculator/sector-calculators.html');
const html = fs.readFileSync(file, 'utf8');

test('global sector directory exposes 25 sector collections', () => {
  const cards = [...html.matchAll(/<a class="card" href="([^"]+)"><strong>(\d+)\./g)];
  assert.equal(cards.length, 25);
  assert.deepEqual(cards.map(match => Number(match[2])), Array.from({ length: 25 }, (_, index) => index + 1));
});

test('sector directory internal links resolve to existing pages', () => {
  const hrefs = [...html.matchAll(/href="(\/[^"#?]+)"/g)].map(match => match[1]);
  const missing = [...new Set(hrefs)].filter(href => {
    const target = path.join(root, href.replace(/^\/+/, ''));
    return !fs.existsSync(target) && !fs.existsSync(path.join(target, 'index.html'));
  });
  assert.deepEqual(missing, []);
});

test('sector directory has canonical metadata, structured data and safety context', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/friendlycalculator\.in\/calculator\/sector-calculators\.html">/);
  assert.match(html, /"@type":"CollectionPage"/);
  assert.match(html, /qualified professionals/);
  assert.match(html, /<header class="fc-global-header">/);
  assert.match(html, /<footer class="fc-global-footer">/);
  assert.match(html, /site-shell\.js/);
  assert.match(html, /site-chrome\.js/);
});
