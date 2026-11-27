'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('calculator page layout uses one field per row with consistent controls', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'site-shell.css'), 'utf8');
  assert.match(css, /main #live-page-calculator form\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
  assert.match(css, /main \.fields,\s*main \.fc-fields,\s*main \.mc-fields,\s*main \.mortgage-tool-fields,\s*main #extraForm\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
  assert.match(css, /min-height:\s*46px/);
  assert.match(css, /border-bottom:\s*1px solid #e7ecf1/);
  assert.match(css, /@media\s*\(max-width:\s*620px\)[\s\S]*?main #live-page-calculator form > label\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /html\[data-fc-theme="dark"\] main #live-page-calculator/);
  assert.match(css, /html\[data-fc-theme="dark"\] main \.fields > \.field/);
});

test('calculator page layout preserves range sliders and result presentation', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'site-shell.css'), 'utf8');
  assert.match(css, /input\[type="range"\]/);
  assert.match(css, /\.fc-result-table/);
  assert.match(css, /\.fc-result-chart/);
  assert.match(css, /\.fc-amortization/);
  assert.match(css, /\.fc-calculation-solution/);
});
