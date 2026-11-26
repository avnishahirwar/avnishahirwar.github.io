const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const origin = 'https://friendlycalculator.in';
const index = fs.readFileSync(path.join(root, 'sitemap-index.xml'), 'utf8');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');

test('top-level sitemap index is valid and points to the canonical sitemap set', () => {
  assert.match(index, /^<\\?xml version="1\\.0" encoding="UTF-8"\\?>/);
  assert.match(index, /<sitemapindex\\s+xmlns="http:\\/\\/www\\.sitemaps\\.org\\/schemas\\/sitemap\\/0\\.9">/);
  const urls = [...index.matchAll(/<loc>([^<]+)<\\/loc>/g)].map(match => match[1]);
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
  assert.match(robots, new RegExp(`Sitemap: ${origin.replace('.', '\\\\.')}/sitemap-index\\\\.xml`));
  assert.match(robots, /User-agent:\\s*\\*/i);
  assert.match(robots, /Allow:\\s*\\//i);
  assert.match(robots, /Disallow:\\s*\\/calculator\\/admin\\.html/i);
});

test('every XML sitemap URL uses the canonical production host, never a preview host', () => {
  const sitemapFiles = fs.readdirSync(root)
    .filter(name => /^sitemap.*\\.xml$/i.test(name));
  assert.ok(sitemapFiles.length >= 3, 'Expected the main, locale and regional sitemap files');

  const previewHost = /(?:pages\\.dev|manus\\.space|vercel\\.app|netlify\\.app|github\\.io|localhost|127\\.0\\.0\\.1)/i;
  for (const filename of sitemapFiles) {
    const xml = fs.readFileSync(path.join(root, filename), 'utf8');
    const urls = [
      ...[...xml.matchAll(/<loc>([^<]+)<\\/loc>/g)].map(match => match[1]),
      ...[...xml.matchAll(/(?:href|src)="(https?:\\/\\/[^"]+)"/g)].map(match => match[1])
    ];
    for (const value of urls) {
      const parsed = new URL(value);
      assert.equal(parsed.origin, origin, `${filename} contains a non-production URL: ${value}`);
      assert.doesNotMatch(parsed.hostname, previewHost, `${filename} contains a preview host: ${value}`);
    }
  }
});
