'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateLandedCost } = require('../assets/landed-cost-calculator.js');

test('calculates total shipment landed cost and unit cost', () => {
  const result = calculateLandedCost({
    quantity: 100, goodsValue: 50000, originFreight: 1000,
    internationalFreight: 5000, insurance: 2000, customsDuty: 5000,
    clearance: 1000, destinationFreight: 500, otherCharges: 500
  });
  assert.equal(result.logistics, 8500);
  assert.equal(result.importFees, 6500);
  assert.equal(result.total, 65000);
  assert.equal(result.perUnit, 650);
});

test('supports zero ancillary charges', () => {
  const result = calculateLandedCost({
    quantity: 2, goodsValue: 100, originFreight: 0,
    internationalFreight: 0, insurance: 0, customsDuty: 0,
    clearance: 0, destinationFreight: 0, otherCharges: 0
  });
  assert.equal(result.total, 100);
  assert.equal(result.perUnit, 50);
});

test('rejects zero quantity and negative charges', () => {
  const base = {
    quantity: 1, goodsValue: 100, originFreight: 0,
    internationalFreight: 0, insurance: 0, customsDuty: 0,
    clearance: 0, destinationFreight: 0, otherCharges: 0
  };
  assert.throws(() => calculateLandedCost({ ...base, quantity: 0 }), /Quantity/);
  assert.throws(() => calculateLandedCost({ ...base, customsDuty: -1 }), /non-negative/);
  assert.throws(() => calculateLandedCost({ ...base, goodsValue: NaN }), /non-negative/);
});
