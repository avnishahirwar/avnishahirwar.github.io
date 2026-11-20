'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('homepage search accepts the generated calculator catalogue dynamically', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  assert.ok(Array.isArray(index) && index.length > 0);
  assert.equal(new Set(index.map(item => item.url)).size, index.length, 'search URLs must be unique');
  assert.ok(index.every(item => item && typeof item.name === 'string' && item.name.trim() && typeof item.url === 'string' && item.url.startsWith('/') && typeof item.category === 'string'));
  assert.match(homepage, /new Set\(items\.map\(item=>item\.url\)\)\.size!==items\.length/);
  assert.doesNotMatch(homepage, /items\.length!==\d+/);
  assert.doesNotMatch(homepage, /(?:Search all|Browse)\s+\d+ calculators/);
});

test('homepage global title and copy do not advertise stale calculator or category totals', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(homepage, /<h1>Make bigger decisions with better numbers\.<\/h1>/);
  assert.match(homepage, /Calculators for users worldwide/);
  assert.doesNotMatch(homepage, /Browse all \d+ calculator categories/);
});
