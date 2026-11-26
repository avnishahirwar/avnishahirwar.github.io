const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('investment directory exposes at least 100 unique existing calculator routes', () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'calculator/investment-calculators.html'), 'utf8');
  const links = [...html.matchAll(/href="(\/calculators\/[^\"]+\.html)"/g)].map(match => match[1]);
  assert.ok(links.length >= 100, 'expected at least 100 calculator links');
  assert.equal(new Set(links).size, links.length, 'calculator routes must be unique');
  for (const url of links) {
    assert.ok(fs.existsSync(path.join(root, url.slice(1))), 'missing calculator page: ' + url);
  }
  const finance = fs.readFileSync(path.join(root, 'calculator/finance-calculators.html'), 'utf8');
  assert.match(finance, /href="\/calculator\/investment-calculators\.html"/);
});
