const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('legacy all-calculators directory route forwards visitors to the searchable sitemap', () => {
  const html = fs.readFileSync(path.join(__dirname, '../calculator/site-directory.html'), 'utf8');
  assert.match(html, /rel="canonical" href="https:\/\/friendlycalculator\.in\/sitemap\.html"/);
  assert.match(html, /http-equiv="refresh" content="0;url=\/sitemap\.html"/);
  assert.match(html, /location\.replace\("\/sitemap\.html"\)/);
  assert.match(html, /href="\/sitemap\.html"/);
});
