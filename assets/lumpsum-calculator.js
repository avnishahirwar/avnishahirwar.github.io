(function (root) {
  'use strict';

  function finiteNumber(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new TypeError(label + ' must be a finite number.');
    }
    return number;
  }

  function calculate(options) {
    if (!options || typeof options !== 'object') {
      throw new TypeError('Calculator inputs are required.');
    }

    const principal = finiteNumber(options.principal, 'Initial investment');
    const annualRate = finiteNumber(options.annualRate, 'Annualised return');
    const years = finiteNumber(options.years, 'Investment period');
    const inflationRate = options.inflationRate === undefined
      ? 0
      : finiteNumber(options.inflationRate, 'Inflation rate');

    if (principal <= 0 || principal > 1000000000000) {
      throw new RangeError('Enter an initial investment greater than ₹0 and no more than ₹1,00,00,00,00,000.');
    }
    if (annualRate <= -100 || annualRate > 100) {
      throw new RangeError('Enter an assumed annualised return above -100% and no more than 100%.');
    }
    if (years <= 0 || years > 60) {
      throw new RangeError('Enter an investment period greater than zero and no more than 60 years.');
    }
    if (inflationRate < 0 || inflationRate > 30) {
      throw new RangeError('Enter an inflation assumption from 0% to 30%.');
    }

    const futureValue = principal * Math.pow(1 + annualRate / 100, years);
    const inflationAdjustedValue = futureValue / Math.pow(1 + inflationRate / 100, years);
    if (!Number.isFinite(futureValue) || !Number.isFinite(inflationAdjustedValue)) {
      throw new RangeError('The result is outside the supported numeric range. Try smaller inputs.');
    }

    return {
      principal: principal,
      annualRate: annualRate,
      years: years,
      inflationRate: inflationRate,
      futureValue: futureValue,
      gain: futureValue - principal,
      inflationAdjustedValue: inflationAdjustedValue
    };
  }

  const api = Object.freeze({ calculate: calculate });
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.FCLumpsumCalculator = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
