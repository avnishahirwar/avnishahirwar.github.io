import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../calculator/loan-calculators.html', import.meta.url), 'utf8');

test('loan hub links to the English mortgage calculator', () => {
  assert.match(html, /href="\/calculators\/mortgage-calculator\.html"/);
  assert.match(html, /<h2>Mortgage and Home Loan Payments<\/h2>/);
});
