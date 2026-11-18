const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const math = require(path.join(root, 'assets/math-batch-calculators.js'));

const routes = [
  '/calculators/power-set-calculator.html',
  '/calculators/truth-table-generator.html',
  '/calculators/descartes-rule-of-signs-calculator.html',
  '/calculators/synthetic-division-calculator.html',
  '/calculators/consecutive-integers-calculator.html'
];

test('power set includes the empty set and deduplicates trimmed labels', () => {
  const result = math.powerSet('a, b, a\n c ');
  assert.deepEqual(result.elements, ['a', 'b', 'c']);
  assert.equal(result.count, '8');
  assert.deepEqual(result.subsets[0], []);
  assert.deepEqual(result.subsets.at(-1), ['a', 'b', 'c']);
  assert.equal(math.powerSet('').count, '1');
  assert.deepEqual(math.powerSet('').subsets, [[]]);
  assert.throws(() => math.powerSet('a,b,c,d,e,f,g,h,i,j,k'), /at most 10/);
});

test('truth table enumerates all assignments and safely evaluates implication', () => {
  const result = math.truthTable('p -> q');
  assert.deepEqual(result.variables, ['P', 'Q']);
  assert.deepEqual(result.rows.map(row => [row.assignment.P, row.assignment.Q, row.result]), [
    [false, false, true], [false, true, true], [true, false, false], [true, true, true]
  ]);
  assert.equal(result.classification, 'contingent');
  assert.equal(math.truthTable('p OR NOT p').classification, 'tautology');
  assert.equal(math.truthTable('p AND NOT p').classification, 'contradiction');
  assert.throws(() => math.truthTable('globalThis.process.exit()'), /Unsupported character|Unexpected token/);
  assert.throws(() => math.truthTable('p q'), /Unexpected token/);
  assert.throws(() => math.truthTable('p AND q AND r AND s AND t AND u AND v AND w AND x AND y AND z'), /10 distinct variables/);
});

test('Descartes rule counts signs and parity-compatible possibilities', () => {
  const result = math.descartes('1, 0, -2, 0, 1');
  assert.equal(result.degree, 4);
  assert.equal(result.positiveVariations, 2);
  assert.equal(result.negativeVariations, 2);
  assert.deepEqual(result.positiveCounts, [2, 0]);
  assert.deepEqual(result.negativeCounts, [2, 0]);
  assert.equal(result.zeroRoots, 0);
  const zero = math.descartes('1, 0, 0, 0');
  assert.equal(zero.zeroRoots, 3);
  assert.throws(() => math.descartes('0,0,0'), /zero polynomial/);
});

test('synthetic division returns corrected quotient, remainder and bottom row', () => {
  const result = math.syntheticDivision('2,-3,4,-5', 2);
  assert.deepEqual(result.quotient, [2, 1, 6]);
  assert.deepEqual(result.bottomRow, [2, 1, 6, 7]);
  assert.equal(result.remainder, 7);
  assert.equal(result.identity, '2x^3 − 3x^2 + 4x − 5 = (x − 2)(2x^2 + x + 6) + 7');
  const missingTerm = math.syntheticDivision('1,0,-1', 2);
  assert.deepEqual(missingTerm.quotient, [1, 2]);
  assert.equal(missingTerm.remainder, 3);
  const constant = math.syntheticDivision('7', 2);
  assert.deepEqual(constant.quotient, [0]);
  assert.deepEqual(constant.bottomRow, [7]);
  assert.equal(constant.remainder, 7);
  const zero = math.syntheticDivision('0', 2);
  assert.deepEqual(zero.bottomRow, [0]);
  assert.throws(() => math.syntheticDivision('1,2,3', 'not a number'), /finite numbers/);
});

test('consecutive-integer sums use exact positive-integer runs', () => {
  const result = math.consecutiveIntegers('15');
  assert.deepEqual(result.runs.map(run => run.expression), ['7 + 8', '4 + 5 + 6', '1 + 2 + 3 + 4 + 5']);
  assert.equal(math.consecutiveIntegers('3').runs[0].expression, '1 + 2');
  assert.deepEqual(math.consecutiveIntegers('4').runs, []);
  assert.throws(() => math.consecutiveIntegers('2'), /from 3/);
  assert.throws(() => math.consecutiveIntegers('3.5'), /whole-number/);
  assert.throws(() => math.consecutiveIntegers('1000000001'), /from 3/);
});

test('all new pages are substantive, source-linked, canonical and discoverable', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const engine = fs.readFileSync(path.join(root, 'assets/math-batch-calculators.js'), 'utf8');
  assert.doesNotMatch(engine, /\beval\s*\(/i);
  for (const route of routes) {
    const page = fs.readFileSync(path.join(root, route.slice(1)), 'utf8');
    assert.ok(page.includes('rel="canonical"'), route + ' canonical URL');
    assert.ok(page.includes('Worked example'), route + ' worked example');
    assert.ok(page.includes('Scope and limitations'), route + ' limitations');
    assert.ok(page.includes('References'), route + ' references');
    assert.ok(page.includes('/assets/math-batch-calculators.js'), route + ' functional calculator engine');
    assert.equal(index.filter(item => item.url === route).length, 1, route + ' search-index entry');
    assert.equal((directory.match(new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1, route + ' directory card');
    assert.equal((about.match(new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1, route + ' About catalogue link');
    assert.ok(sitemap.includes('https://friendlycalculator.in' + route), route + ' sitemap URL');
  }
});
