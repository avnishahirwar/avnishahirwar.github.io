const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { calculate } = require('../assets/us-auto-loan-calculator.js');
const root = path.join(__dirname, '..');

test('US auto loan calculator calculates sales tax, financed amount and payment', () => {
  const r = calculate({vehiclePrice:30000,taxableAmount:30000,salesTaxRate:7,fees:500,downPayment:5000,tradeInEquity:2000,apr:6.5,termMonths:60});
  assert.equal(r.salesTax,2100);
  assert.equal(r.outTheDoor,32600);
  assert.equal(r.amountFinanced,25600);
  assert.ok(r.monthlyPayment > 0);
  assert.ok(r.totalInterest > 0);
});

test('US auto loan calculator supports zero APR', () => {
  const r = calculate({vehiclePrice:12000,taxableAmount:12000,salesTaxRate:0,fees:0,downPayment:0,tradeInEquity:0,apr:0,termMonths:12});
  assert.equal(r.monthlyPayment,1000);
  assert.equal(r.totalInterest,0);
});

test('US auto loan calculator rejects invalid tax, negative costs and excessive term', () => {
  const base={vehiclePrice:30000,taxableAmount:30000,salesTaxRate:7,fees:500,downPayment:5000,tradeInEquity:2000,apr:6.5,termMonths:60};
  assert.throws(()=>calculate({...base,salesTaxRate:101}),/Sales-tax rate/);
  assert.throws(()=>calculate({...base,fees:-1}),/cannot be negative/);
  assert.throws(()=>calculate({...base,termMonths:121}),/1 to 120/);
  assert.throws(()=>calculate({...base,downPayment:50000}),/must be less than/);
});

test('US auto loan page discloses user-entered tax treatment and financing exclusions', () => {
  const html=fs.readFileSync(path.join(root,'international/us-auto-loan-calculator.html'),'utf8');
  assert.match(html,/rel="canonical"/);
  assert.match(html,/does not determine local tax law/);
  assert.match(html,/us-auto-loan-calculator\.js/);
});
