const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const origin = 'https://friendlycalculator.in';
const index = fs.readFileSync(path.join(root, 'sitemap-index.xml'), 'utf8');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');

test('top-level sitemap index is valid and points to the canonical sitemap set', () => {
  assert.match(index, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(index, /<sitemapindex\s+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  const urls = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls, [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap-locales.xml`,
    `${origin}/sitemap-uk-us.xml`
  ]);
  for (const url of urls) {
    const filename = new URL(url).pathname.slice(1);
    assert.ok(fs.existsSync(path.join(root, filename)), `Missing referenced sitemap: ${filename}`);
  }
});

test('robots declares the top-level sitemap index and keeps crawler policy public', () => {
  assert.match(robots, new RegExp(`Sitemap: ${origin.replace('.', '\\.')}/sitemap-index\\.xml`));
  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, /Allow:\s*\//i);
  assert.match(robots, /Disallow:\s*\/calculator\/admin\.html/i);
});
