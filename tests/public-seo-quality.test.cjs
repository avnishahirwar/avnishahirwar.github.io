'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const REPAIR_SCRIPT = path.join(ROOT, 'scripts', 'repair-public-social-metadata.cjs');

test('public static pages have route-specific Open Graph and Twitter metadata', () => {
  const result = spawnSync(process.execPath, [REPAIR_SCRIPT, '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60_000,
  });
  assert.equal(result.error, undefined, result.error && result.error.message);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /0 need repair/);
});

test('homepage has a readable search title, canonical URL, and social preview', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const title = html.match(/<title>(.*?)<\/title>/i);
  assert.ok(title, 'homepage has a title');
  assert.doesNotMatch(title[1], /&amp;amp;/i, 'title must not be double escaped');
  assert.ok(title[1].length >= 30 && title[1].length <= 60, 'title is within a useful display length');
  assert.match(html, /<link\s+rel="canonical"\s+href="https:\/\/friendlycalculator\.in\/"/i);
  assert.match(html, /<meta\\s+property="og:title"\\s+content="Free Online Calculators India &amp; Worldwide \\| EMI, GST &amp; Tax"/i);
  assert.match(html, /<meta\s+name="twitter:card"\s+content="summary_large_image"/i);
});

test('source code license is MIT and does not claim editorial content or brand assets', () => {
  const license = fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8');
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.match(license, /^MIT License/m);
  assert.match(license, /Copyright \(c\) 2026 Avnish Ahirwar/);
  assert.match(license, /original software source code/i);
  assert.match(license, /does not grant rights in the website's editorial articles/i);
  assert.match(readme, /CC BY 4\.0/i);
  assert.match(readme, /Logos, trademarks, brand illustrations, third-party assets/i);
});
