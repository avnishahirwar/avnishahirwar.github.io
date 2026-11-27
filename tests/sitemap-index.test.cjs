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
  const pageShards = fs.readdirSync(root).filter(name => /^sitemap-pages-\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  const expectedFiles = ['sitemap.xml', ...pageShards, 'sitemap-locales.xml', 'sitemap-uk-us.xml'];
  assert.deepEqual(urls, expectedFiles.map(file => `${origin}/${file}`));
  for (const url of urls) {
    const filename = new URL(url).pathname.slice(1);
    assert.ok(fs.existsSync(path.join(root, filename)), `Missing referenced sitemap: ${filename}`);
    assert.ok(fs.statSync(path.join(root, filename)).size < 25 * 1024 * 1024, `Sitemap exceeds Cloudflare Pages 25 MiB limit: ${filename}`);
  }
});

test('robots declares the top-level sitemap index and keeps crawler policy public', () => {
  assert.match(robots, new RegExp(`Sitemap: ${origin.replace('.', '\\.')}/sitemap-index\\.xml`));
  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, /Allow:\s*\//i);
  assert.match(robots, /Disallow:\s*\/calculator\/admin\.html/i);
});

test('all page sitemap shards preserve unique canonical URLs and hreflang metadata', () => {
  const filenames = ['sitemap.xml', ...fs.readdirSync(root)
    .filter(name => name.startsWith('sitemap-pages-') && name.endsWith('.xml'))
    .sort((a, b) => Number(a.slice('sitemap-pages-'.length, -'.xml'.length)) - Number(b.slice('sitemap-pages-'.length, -'.xml'.length)))];
  const urls = filenames.flatMap(filename => {
    const xml = fs.readFileSync(path.join(root, filename), 'utf8');
    assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
    assert.ok(xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]).filter(url => url.startsWith(origin + '/'));
  });
  assert.ok(urls.length > 3000, 'Expected the complete public sitemap catalogue');
  assert.equal(new Set(urls).size, urls.length, 'Canonical URL entries must not be duplicated across shards');
  assert.ok(filenames.length >= 2, 'Oversized sitemap must be split into multiple page files');
});
