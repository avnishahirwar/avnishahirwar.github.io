(function (root) {
  'use strict';

  function calculateStandardDeviation(raw) {
    const text = String(raw ?? '').trim();
    if (!text) throw new Error('Enter at least two numbers.');
    if (text.length > 12000) throw new Error('Keep the input under 12,000 characters.');
    const tokens = text.split(/[\\s,;]+/).filter(Boolean);
    if (tokens.length < 2) throw new Error('Enter at least two numbers.');
    if (tokens.length > 1000) throw new Error('Enter no more than 1,000 numbers.');
    const numericPattern = /^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?$/i;
    const values = tokens.map(token => {
      if (!numericPattern.test(token)) throw new Error('Use only finite numbers separated by commas, spaces or new lines.');
      const value = Number(token);
      if (!Number.isFinite(value)) throw new Error('Every value must be a finite number.');
      return value;
    });

    let count = 0;
    let mean = 0;
    let sumSquaredDeviations = 0;
    for (const value of values) {
      count += 1;
      const delta = value - mean;
      mean += delta / count;
      const deltaAfterUpdate = value - mean;
      sumSquaredDeviations += delta * deltaAfterUpdate;
      if (!Number.isFinite(mean) || !Number.isFinite(sumSquaredDeviations)) {
        throw new Error('The entered values exceed the supported numeric range.');
      }
    }
    const squared = Math.max(0, sumSquaredDeviations);
    const populationVariance = squared / count;
    const sampleVariance = squared / (count - 1);
    return {
      count,
      mean,
      populationVariance,
      populationStandardDeviation: Math.sqrt(populationVariance),
      sampleVariance,
      sampleStandardDeviation: Math.sqrt(sampleVariance)
    };
  }

  const api = { calculateStandardDeviation };
  root.FCPopularCalculatorMath = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
