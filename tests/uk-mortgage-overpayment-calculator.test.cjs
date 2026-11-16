const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { amortize, compare } = require('../assets/uk-mortgage-overpayment-calculator.js');
const root = path.join(__dirname, '..');

test('UK mortgage overpayments reduce interest and shorten the repayment term', () => {
  const result = compare({ principal: 200000, annualRate: 4.5, termYears: 20, extraMonthly: 150 });
  assert.ok(result.interestSaved > 0);
  assert.ok(result.monthsSaved > 0);
  assert.ok(result.monthsWithOverpayment < result.monthsWithoutOverpayment);
});

test('UK mortgage overpayment calculation handles a zero interest rate', () => {
  const result = amortize(12000, 0, 1, 100);
  assert.equal(result.scheduledMonthlyPayment, 1000);
  assert.equal(result.months, 11);
  assert.equal(result.interestTotal, 0);
});

test('UK mortgage overpayment calculation rejects invalid values', () => {
  assert.throws(() => amortize(0, 4, 20, 100), /balance greater than zero/);
  assert.throws(() => amortize(100000, -1, 20, 100), /interest rate/);
  assert.throws(() => amortize(100000, 4, 60, 100), /term between/);
  assert.throws(() => amortize(100000, 4, 20, -1), /overpayment/);
});

test('UK mortgage overpayment page explains its term-reduction assumption', () => {
  const html = fs.readFileSync(path.join(root, 'international/uk-mortgage-overpayment-calculator.html'), 'utf8');
  assert.match(html, /rel="canonical"/);
  assert.match(html, /reduce the term rather than recalculate the regular payment/);
  assert.match(html, /early repayment charge/);
  assert.match(html, /uk-mortgage-overpayment-calculator\.js/);
});
