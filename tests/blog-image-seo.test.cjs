'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const pages = ['blog', 'hi/blog'].flatMap((directory) =>
  fs.readdirSync(path.join(root, directory))
    .filter((name) => name.endsWith('.html') && name !== 'index.html' && !name.startsWith('category'))
    .map((name) => path.join(directory, name))
);

function getMeta(html, key, attribute = 'property') {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${escaped}["'])[^>]*>`, 'i'))?.[0];
  return tag?.match(/\bcontent=["']([^"']*)/i)?.[1] ?? '';
}

function getAttribute(tag, key) {
  return tag.match(new RegExp(`\\b${key}=["']([^"']*)["']`, 'i'))?.[1] ?? '';
}

test('all published English and Hindi blog articles have title-related local covers with descriptive alt text', () => {
  assert.equal(pages.length, 73, `expected all 73 published article pages, found ${pages.length}`);
  for (const relativePath of pages) {
    const page = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const heading = page.match(/<h1\b[^>]*>(.*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g, '').trim();
    assert.ok(heading, `${relativePath}: article heading is required`);
    const cover = page.match(/<img\b(?=[^>]*class=["']article-cover["'])[^>]*>/i)?.[0];
    assert.ok(cover, `${relativePath}: article cover is missing`);
    const src = getAttribute(cover, 'src');
    assert.ok(src.startsWith('/assets/blog-covers/'), `${relativePath}: cover should use the local blog-cover assets`);
    assert.ok(fs.existsSync(path.join(root, src.slice(1))), `${relativePath}: missing local cover ${src}`);
    assert.ok(getAttribute(cover, 'alt').trim().length >= 10, `${relativePath}: descriptive alt text is required`);
    assert.match(cover, /\bwidth=["']1200["']/i, `${relativePath}: width should be reserved to reduce layout shift`);
    assert.match(cover, /\bheight=["']420["']/i, `${relativePath}: height should be reserved to reduce layout shift`);
    assert.match(cover, /\bloading=["']lazy["']/i, `${relativePath}: cover should lazy-load`);
  }
});

test('article-specific Open Graph and Twitter previews are valid and their canonicals stay in the sitemap', () => {
  for (const relativePath of pages) {
    const page = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const slug = path.basename(relativePath, '.html');
    const ogImage = getMeta(page, 'og:image');
    const twitterImage = getMeta(page, 'twitter:image', 'name');
    const expectedImage = `https://friendlycalculator.in/assets/blog-covers/og/${slug}.png`;
    assert.equal(ogImage, expectedImage, `${relativePath}: Open Graph image should match its article`);
    assert.equal(twitterImage, expectedImage, `${relativePath}: Twitter image should match its article`);
    assert.equal(getMeta(page, 'twitter:card', 'name'), 'summary_large_image', `${relativePath}: large image card is required`);
    assert.equal(getMeta(page, 'og:image:alt'), getMeta(page, 'twitter:image:alt', 'name'), `${relativePath}: social image alt text should match`);
    const imagePath = path.join(root, 'assets/blog-covers/og', `${slug}.png`);
    assert.ok(fs.existsSync(imagePath), `${relativePath}: missing social image ${imagePath}`);
    const png = fs.readFileSync(imagePath);
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', `${relativePath}: social image must be PNG`);
    assert.equal(png.readUInt32BE(16), 1200, `${relativePath}: social preview width should be 1200px`);
    assert.equal(png.readUInt32BE(20), 630, `${relativePath}: social preview height should be 630px`);
    const canonical = page.match(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*href=["']([^"']+)/i)?.[1];
    assert.ok(canonical, `${relativePath}: canonical URL must be preserved`);
    assert.equal(getMeta(page, 'og:url'), canonical, `${relativePath}: og:url must match canonical`);
    assert.ok(sitemap.includes(canonical), `${relativePath}: canonical must remain listed in sitemap.xml`);
  }
});
