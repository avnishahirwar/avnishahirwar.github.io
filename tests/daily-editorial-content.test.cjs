'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dailyDir = path.join(root, 'blog', 'daily');
const expected = [
  '2026-11-28-simple-interest-months.html',
  '2026-11-28-bodmas-order-of-operations.html'
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function meta(html, key, attribute = 'name') {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${escaped}["'])[^>]*>`, 'i'))?.[0];
  return tag?.match(/\\bcontent=["']([^"']*)/i)?.[1] ?? '';
}

test('the 28 November editorial batch contains exactly two distinct daily posts', () => {
  const actual = fs.readdirSync(dailyDir).filter(name => name.startsWith('2026-11-28-') && name.endsWith('.html')).sort();
  assert.deepEqual(actual, expected.slice().sort());
});

test('both daily posts have complete metadata, one H1, editorial disclosure and a canonical calculator link', () => {
  const sitemap = read('sitemap.xml');
  const blogIndex = read('blog/index.html');
  for (const file of expected) {
    const relative = `blog/daily/${file}`;
    const html = read(relative);
    const canonical = html.match(/<link\\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0] ?? '';
    const canonicalUrl = canonical.match(/\\bhref=["']([^"']+)["']/i)?.[1] ?? '';
    const h1Count = (html.match(/<h1\\b/gi) ?? []).length;
    assert.ok(/<title>[^<]{20,80}<\\/title>/i.test(html), `${relative}: title is required`);
    assert.ok(meta(html, 'description').length >= 80, `${relative}: useful meta description is required`);
    assert.equal(meta(html, 'robots'), 'index,follow,max-image-preview:large', `${relative}: indexable robots directive is required`);
    assert.ok(canonicalUrl.startsWith('https://friendlycalculator.in/blog/daily/'), `${relative}: canonical must use the production host`);
    assert.equal(meta(html, 'og:url', 'property'), canonicalUrl, `${relative}: Open Graph URL must match canonical`);
    assert.equal(meta(html, 'og:description', 'property'), meta(html, 'description'), `${relative}: Open Graph description must match`);
    assert.equal(meta(html, 'twitter:description'), meta(html, 'description'), `${relative}: Twitter description must match`);
    assert.equal(h1Count, 1, `${relative}: exactly one H1 is required`);
    assert.match(html, /AI-assisted article; not independently reviewed by a human editor/i, `${relative}: editorial disclosure is required`);
    assert.match(html, /Worked example/i, `${relative}: a worked example is required`);
    assert.match(html, /href=["']\\/calculators\\/[a-z0-9-]+\\.html["']/i, `${relative}: a contextual calculator link is required`);
    assert.ok(sitemap.includes(canonicalUrl), `${relative}: canonical must be present in the generated sitemap`);
    assert.ok(blogIndex.includes(`/blog/daily/${file}`), `${relative}: blog index must link to the post`);
  }
});

test('the BODMAS guide preserves the left-to-right rule for equal-priority operations', () => {
  const html = read('blog/daily/2026-11-28-bodmas-order-of-operations.html');
  assert.match(html, /multiplication and division share one level of priority/i);
  assert.match(html, /addition and subtraction share another/i);
  assert.match(html, /18 ÷ 3 × 2[\s\S]*?12/);
  assert.match(html, /24 − 8 \+ 3[\s\S]*?19/);
});
