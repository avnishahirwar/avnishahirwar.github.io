const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const math = require('../assets/popular-calculator-math.js');
const root = path.resolve(__dirname, '..');

test('standard deviation calculator reports population and sample measures', () => {
  const result = math.calculateStandardDeviation('2, 4, 6');
  assert.equal(result.count, 3);
  assert.equal(result.mean, 4);
  assert.ok(Math.abs(result.populationVariance - 8 / 3) < 1e-12);
  assert.ok(Math.abs(result.populationStandardDeviation - Math.sqrt(8 / 3)) < 1e-12);
  assert.equal(result.sampleVariance, 4);
  assert.equal(result.sampleStandardDeviation, 2);
});

test('standard deviation handles constant values and decimal or negative observations', () => {
  const constant = math.calculateStandardDeviation('5 5 5');
  assert.equal(constant.populationStandardDeviation, 0);
  assert.equal(constant.sampleStandardDeviation, 0);
  const decimal = math.calculateStandardDeviation('-2.5, 0, 2.5');
  assert.equal(decimal.mean, 0);
  assert.ok(Math.abs(decimal.populationStandardDeviation - Math.sqrt(25 / 6)) < 1e-12);
});

test('standard deviation rejects invalid, undersized and oversized input', () => {
  assert.throws(() => math.calculateStandardDeviation(''), /at least two/);
  assert.throws(() => math.calculateStandardDeviation('7'), /at least two/);
  assert.throws(() => math.calculateStandardDeviation('1, two, 3'), /finite numbers/);
  assert.throws(() => math.calculateStandardDeviation('1, 2, 3'.repeat(120)), /under 800/);
  assert.throws(() => math.calculateStandardDeviation(Array(1001).fill('1').join(',')), /1,000/);
});

test('standard deviation page is indexed and discoverable', () => {
  const page = fs.readFileSync(path.join(root, 'calculators/standard-deviation-calculator.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  assert.match(page, /rel="canonical"[^>]+standard-deviation-calculator\.html/);
  assert.match(page, /"@type":"FAQPage"/);
  assert.match(page, /population standard deviation/i);
  assert.match(page, /sample standard deviation/i);
  assert.equal(index.filter(item => item.url === '/calculators/standard-deviation-calculator.html').length, 1);
  assert.match(directory, /href="\/calculators\/standard-deviation-calculator\.html"/);
  assert.match(about, /href="\/calculators\/standard-deviation-calculator\.html"/);
});
