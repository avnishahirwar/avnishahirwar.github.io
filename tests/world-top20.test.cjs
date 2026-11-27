'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require('../assets/world-top20.js');
const root = path.resolve(__dirname, '..');
const defaults = c => Object.fromEntries(c.fields.map(f => [f.key, f.value]));
test('world list has exactly 20 distinct calculators and all destination pages exist', () => {
  assert.equal(W.CALCS.length, 20);
  assert.equal(new Set(W.CALCS.map(c => c.id)).size, 20);
  for (const c of W.CALCS) assert.ok(fs.existsSync(path.join(root, c.url.slice(1))), c.url + ' must exist');
});
test('all world calculators return valid default results', () => {
  for (const c of W.CALCS) {
    const result = c.calc(defaults(c));
    assert.ok(!result.error, c.id + ': ' + result.error);
    assert.ok(result.rows.length > 0, c.id + ' must return at least one result');
    for (const row of result.rows) assert.ok(row[1] !== undefined && !/NaN|Infinity/.test(String(row[1])), c.id + ' returned an invalid value');
  }
});
test('homepage renders the world section directly after India Top 20 and loads its script', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const india = html.indexOf('id="top-20-calculators"');
  const world = html.indexOf('id="world-top-20-calculators"');
  const search = html.indexOf('id="home-tool-search-title"');
  assert.ok(india >= 0 && world > india && world < search);
  assert.ok(html.includes('data-world20'));
  assert.ok(html.includes('/assets/world-top20.js'));
  const section = html.slice(world, html.indexOf('</section>', world));
  for (const c of W.CALCS) assert.ok(section.includes('href="' + c.url + '"'), c.id + ' crawlable link missing');
});
