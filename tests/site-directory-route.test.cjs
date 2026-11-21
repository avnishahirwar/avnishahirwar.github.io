const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('All Calculators directory retains its searchable category index', () => {
  const html = fs.readFileSync(path.join(__dirname, '../calculator/site-directory.html'), 'utf8');
  assert.ok(html.length > 100000, 'directory HTML should not be empty or unexpectedly truncated');
  assert.match(html, /<title>All Calculators &amp; Website Directory \| Friendly Calculator<\/title>/);
  assert.match(html, /id="siteSearch"/);
  assert.match(html, /id="calculator-category-index"/);
  assert.match(html, /aria-label="Search all calculator categories and website sections"/);
});
