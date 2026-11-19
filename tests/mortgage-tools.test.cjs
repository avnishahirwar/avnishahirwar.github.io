'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { calculateMortgageTool } = require('../assets/mortgage-tools.js');

const base = { loanAmount: 300000, annualRate: 6.5, termYears: 30, compoundingFrequency: 'monthly', paymentFrequency: 'monthly' };
const value = (rows, label) => rows.find(row => row.label === label)?.value;

test('simple mortgage payment uses the amortization formula', () => {
  const rows = calculateMortgageTool('simple', base);
  assert.ok(Math.abs(value(rows, 'Payment per period') - 1896.2) < 1);
  assert.ok(value(rows, 'Total interest over the term') > 380000);
});

test('zero-interest loan divides principal evenly over the term', () => {
  const rows = calculateMortgageTool('simple', { ...base, loanAmount: 120000, annualRate: 0, termYears: 10 });
  assert.equal(value(rows, 'Payment per period'), 1000);
  assert.equal(value(rows, 'Total interest over the term'), 0);
});

test('biweekly accelerated schedule reduces estimated interest', () => {
  const rows = calculateMortgageTool('biweekly-payment', base);
  assert.ok(value(rows, 'Estimated interest saving vs regular biweekly') > 0);
  assert.ok(value(rows, 'Accelerated payoff time') < 30 * 26);
});

test('ARM scenario keeps the rate unchanged when the entered reset change is zero', () => {
  const rows = calculateMortgageTool('arm', { ...base, adjustmentPerReset: 0, resetCap: 2, lifetimeCap: 5, resetEveryYears: 1 });
  assert.equal(value(rows, 'Final modelled annual rate'), 6.5);
  assert.ok(value(rows, 'Total interest under entered reset scenario') > 0);
});

test('interest-only period reports the later amortizing payment', () => {
  const rows = calculateMortgageTool('interest-only', { ...base, interestOnlyYears: 5 });
  assert.ok(value(rows, 'Monthly payment after interest-only period') > value(rows, 'Monthly interest-only payment'));
});

test('full-term interest-only scenario reports the balloon principal', () => {
  const rows = calculateMortgageTool('interest-only', { ...base, interestOnlyYears: 30 });
  assert.equal(value(rows, 'Principal remaining at the end of the term'), 300000);
});

test('extra monthly principal payments reduce interest and payoff periods', () => {
  const rows = calculateMortgageTool('prepayment', { ...base, extraMonthlyPayment: 200 });
  assert.ok(value(rows, 'Payoff time with extra payments') < value(rows, 'Original payoff time'));
  assert.ok(value(rows, 'Estimated interest saved') > 0);
});

test('property tax and insurance are included as monthly cost components', () => {
  const rows = calculateMortgageTool('taxes-insurance', { ...base, annualPropertyTax: 2400, annualInsurance: 1200, monthlyMaintenance: 100 });
  assert.equal(value(rows, 'Monthly property tax'), 200);
  assert.equal(value(rows, 'Monthly home insurance'), 100);
  assert.equal(value(rows, 'Monthly maintenance'), 100);
});

test('mortgage penalty uses only the lender-entered method inputs', () => {
  const rows = calculateMortgageTool('penalty', { loanAmount: 200000, penaltyRate: 6, penaltyMonths: 3, fixedFee: 500 });
  assert.equal(value(rows, 'Estimated total penalty'), 3500);
});

test('discount points estimate a simple break-even period', () => {
  const rows = calculateMortgageTool('points', { ...base, pointsPercent: 1, rateReduction: 0.5 });
  assert.equal(value(rows, 'Up-front points cost'), 3000);
  assert.ok(value(rows, 'Break-even period') > 0);
});

test('mortgage rate solver recovers a known nominal annual rate', () => {
  const rows = calculateMortgageTool('rate', { loanAmount: 300000, termYears: 30, targetPayment: 1896.2 });
  assert.ok(Math.abs(value(rows, 'Estimated nominal annual rate') - 6.5) < 0.02);
});

test('rate solver rejects payments that cannot amortize within the supported range', () => {
  assert.throws(() => calculateMortgageTool('rate', { loanAmount: 300000, termYears: 30, targetPayment: 100 }), /too small/i);
});

test('refinance comparison calculates payment difference and break-even', () => {
  const rows = calculateMortgageTool('refinance', { loanAmount: 300000, annualRate: 6.5, termYears: 25, newRate: 5.5, newTermYears: 25, closingCosts: 5000 });
  assert.ok(value(rows, 'Monthly payment difference') > 0);
  assert.ok(value(rows, 'Simple break-even period') > 0);
});

test('mortgage comparison calculates both scenarios', () => {
  const rows = calculateMortgageTool('comparison', { ...base, secondRate: 5.5, secondTermYears: 30 });
  assert.ok(value(rows, 'Option B monthly payment') < value(rows, 'Option A monthly payment'));
});

test('invalid negative loan amounts and rates are rejected', () => {
  assert.throws(() => calculateMortgageTool('simple', { ...base, loanAmount: -1 }), /Loan amount/i);
  assert.throws(() => calculateMortgageTool('simple', { ...base, annualRate: -1 }), /Annual interest rate/i);
});

test('all 16 secondary mortgage pages use the shared locale-aware calculator UI', () => {
  const root = path.resolve(__dirname, '..');
  const pages = {
    'arm-mortgage-calculator.html': 'arm',
    'bi-weekly-mortgage-payment-calculator.html': 'biweekly-payment',
    'biweekly-mortgage-calculator.html': 'biweekly',
    'home-mortgage-calculator.html': 'home',
    'interest-only-mortgage-calculator.html': 'interest-only',
    'mortgage-acceleration-calculator.html': 'acceleration',
    'mortgage-calculator-with-taxes-and-insurance.html': 'taxes-insurance',
    'mortgage-comparison-calculator.html': 'comparison',
    'mortgage-interest-calculator.html': 'interest',
    'mortgage-payoff-calculator.html': 'payoff',
    'mortgage-penalty-calculator.html': 'penalty',
    'mortgage-points-calculator.html': 'points',
    'mortgage-prepayment-calculator.html': 'prepayment',
    'mortgage-rate-calculator.html': 'rate',
    'mortgage-refinance-calculator.html': 'refinance',
    'simple-mortgage-calculator.html': 'simple'
  };
  const css = fs.readFileSync(path.join(root, 'assets/mortgage-tools.css'), 'utf8');
  const engine = fs.readFileSync(path.join(root, 'assets/mortgage-tools.js'), 'utf8');
  assert.ok(css.includes('.out.mortgage-tool-result{display:block}'), 'The result panel must override the legacy hidden output style.');
  assert.ok(engine.includes("form.addEventListener('submit', event => { event.preventDefault(); calculate(); });"), 'Keyboard form submission must run the same validated calculation.');
  for (const [file, type] of Object.entries(pages)) {
    const html = fs.readFileSync(path.join(root, 'calculators', file), 'utf8');
    assert.ok(html.includes('data-mortgage-tool="' + type + '"'), 'Missing tool mapping: ' + file);
    assert.ok(html.includes('/assets/mortgage-tools.js'), 'Missing shared engine: ' + file);
    assert.ok(html.includes('/assets/mortgage-tools.css'), 'Missing shared styles: ' + file);
    assert.ok(html.includes('class="mortgage-methodology"'), 'Missing formula and assumptions content: ' + file);
    assert.ok(html.includes('Display currency settings'), 'Missing locale/currency guidance: ' + file);
  }
});
