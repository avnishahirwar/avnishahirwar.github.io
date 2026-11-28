'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { calculate } = require('../assets/lumpsum-calculator.js');

const page = fs.readFileSync(
  path.join(__dirname, '..', 'calculators', 'lumpsum-calculator.html'),
  'utf8'
);

test('₹1,00,000 at an assumed 12% for 10 years produces the documented projection', () => {
  const result = calculate({
    principal: 100000,
    annualRate: 12,
    years: 10,
    inflationRate: 0
  });
  assert.ok(Math.abs(result.futureValue - 310584.820) < 0.01);
  assert.ok(Math.abs(result.gain - 210584.820) < 0.01);
});

test('zero assumed return preserves principal and reports no gain', () => {
  const result = calculate({
    principal: 250000,
    annualRate: 0,
    years: 12,
    inflationRate: 0
  });
  assert.equal(result.futureValue, 250000);
  assert.equal(result.gain, 0);
  assert.equal(result.inflationAdjustedValue, 250000);
});

test('negative annualised return correctly models a loss scenario', () => {
  const result = calculate({
    principal: 100000,
    annualRate: -10,
    years: 2,
    inflationRate: 0
  });
  assert.ok(Math.abs(result.futureValue - 81000) < 0.000001);
  assert.equal(result.gain, -19000);
});

test('inflation-adjusted value discounts the projection by the selected inflation assumption', () => {
  const result = calculate({
    principal: 100000,
    annualRate: 12,
    years: 10,
    inflationRate: 6
  });
  const expected = result.futureValue / Math.pow(1.06, 10);
  assert.ok(Math.abs(result.inflationAdjustedValue - expected) < 0.000001);
  assert.ok(result.inflationAdjustedValue < result.futureValue);
});

test('fractional investment periods are supported', () => {
  const result = calculate({
    principal: 100000,
    annualRate: 8,
    years: 2.5,
    inflationRate: 0
  });
  assert.ok(Math.abs(result.futureValue - 100000 * Math.pow(1.08, 2.5)) < 0.000001);
});

test('invalid and out-of-range inputs are rejected', () => {
  const invalidCases = [
    { principal: 0, annualRate: 10, years: 5, inflationRate: 0 },
    { principal: 100000, annualRate: -100, years: 5, inflationRate: 0 },
    { principal: 100000, annualRate: 10, years: 0, inflationRate: 0 },
    { principal: 100000, annualRate: 10, years: 5, inflationRate: -1 },
    { principal: 100000, annualRate: 10, years: 61, inflationRate: 0 },
    { principal: Infinity, annualRate: 10, years: 5, inflationRate: 0 }
  ];
  for (const inputs of invalidCases) {
    assert.throws(() => calculate(inputs));
  }
});

test('page uses the purpose-built engine and retains its canonical URL and indexability', () => {
  assert.match(page, /<link rel="canonical" href="https:\/\/friendlycalculator\.in\/calculators\/lumpsum-calculator\.html">/);
  assert.match(page, /name="robots" content="index,follow,max-image-preview:large"/);
  assert.match(page, /<script src="\/assets\/lumpsum-calculator\.js"><\/script>/);
  assert.doesNotMatch(page, /generated-equation-calculator\.js|FC_EQUATION_CONFIG/);
  assert.match(page, /<h1>Lumpsum Calculator<\/h1>/);
  assert.match(page, /inflationAdjustedValue/);
});
