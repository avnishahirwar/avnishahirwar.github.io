'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(new URL('../assets/brazil-irpf-2026.js', 'file://' + __filename), 'utf8');
function calculator() {
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { timeout: 1000 });
  return sandbox.window.FCBrazilIRPF2026;
}

test('Brazil IRPF 2026 applies the official monthly simplified deduction and zeroes tax up to R$5,000', () => {
  const result = calculator().calculate({ monthlyTaxableIncome: 5000, monthlyDeductions: 0 });
  assert.equal(result.deductionUsed, 607.2);
  assert.ok(Math.abs(result.taxBase - 4392.8) < 0.001);
  assert.ok(Math.abs(result.taxBeforeRelief - 312.89) < 0.01);
  assert.equal(result.tax, 0);
});

test('Brazil IRPF 2026 applies the gradual monthly reduction between R$5,000 and R$7,350', () => {
  const result = calculator().calculate({ monthlyTaxableIncome: 6000, monthlyDeductions: 0 });
  assert.ok(Math.abs(result.relief - (978.62 - 0.133145 * 6000)) < 0.001);
  assert.ok(Math.abs(result.tax - 394.54) < 0.02);
});

test('Brazil IRPF 2026 stops the monthly reduction above R$7,350', () => {
  const result = calculator().calculate({ monthlyTaxableIncome: 8000, monthlyDeductions: 0 });
  assert.equal(result.relief, 0);
  assert.ok(Math.abs(result.tax - 1124.29) < 0.01);
});

test('Brazil IRPF 2026 uses the greater of entered eligible deductions and the simplified deduction', () => {
  const result = calculator().calculate({ monthlyTaxableIncome: 6000, monthlyDeductions: 1200 });
  assert.equal(result.deductionUsed, 1200);
  assert.equal(result.taxBase, 4800);
});

test('Brazil IRPF 2026 rejects negative or non-finite input', () => {
  assert.throws(() => calculator().calculate({ monthlyTaxableIncome: -1, monthlyDeductions: 0 }), RangeError);
  assert.throws(() => calculator().calculate({ monthlyTaxableIncome: 1000, monthlyDeductions: Infinity }), RangeError);
});
