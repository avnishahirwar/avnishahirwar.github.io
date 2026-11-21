const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('additive locale sitemap generator validates all locale segments without writing files', () => {
  const output = execFileSync(process.execPath, ['scripts/generate-locale-sitemaps.cjs', '--check'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  assert.match(output, /Locale sitemap check passed:/);
  assert.match(output, /en=\d+/);
  assert.match(output, /hi=\d+/);
  assert.match(output, /ar=\d+/);
  assert.match(output, /ta=\d+/);
});

test('locale sitemap generator preserves the existing all-pages sitemap', () => {
  const fs = require('node:fs');
  const script = fs.readFileSync(path.join(root, 'scripts/generate-locale-sitemaps.cjs'), 'utf8');
  assert.match(script, /existing sitemap\.xml is intentionally/);
  assert.match(script, /sitemap-\x27 \+ locale \+ \x27\.xml/);
  assert.match(script, /existing sitemap\.xml was not modified/);
});
