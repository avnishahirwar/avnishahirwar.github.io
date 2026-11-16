const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { calculate } = require('../assets/us-sales-tax-calculator.js');
const root = path.join(__dirname, '..');

test('US sales tax calculator computes tax and total from a combined entered rate', () => {
  const result = calculate({ amount: 100, rate: 8.25 });
  assert.equal(result.subtotal, 100);
  assert.equal(result.tax, 8.25);
  assert.equal(result.total, 108.25);
});

test('US sales tax calculator accepts zero rate and decimal purchase amounts', () => {
  const result = calculate({ amount: 19.99, rate: 0 });
  assert.equal(result.tax, 0);
  assert.equal(result.total, 19.99);
});

test('US sales tax calculator rejects negative and non-finite inputs', () => {
  assert.throws(() => calculate({ amount: -1, rate: 5 }), /purchase amount/);
  assert.throws(() => calculate({ amount: 10, rate: -1 }), /combined sales-tax rate/);
  assert.throws(() => calculate({ amount: 10, rate: 101 }), /combined sales-tax rate/);
  assert.throws(() => calculate({ amount: 'abc', rate: 5 }), /purchase amount/);
});

test('US sales tax page states jurisdiction limits and has canonical metadata', () => {
  const html = fs.readFileSync(path.join(root, 'international/us-sales-tax-calculator.html'), 'utf8');
  assert.match(html, /rel="canonical"/);
  assert.match(html, /state, county, city and special-district/);
  assert.match(html, /does not automatically detect a location/);
  assert.match(html, /us-sales-tax-calculator\.js/);
});
