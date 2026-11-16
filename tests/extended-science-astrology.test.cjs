const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'assets/extended-science-astrology.js'), 'utf8');

const pages = [
  ['chinese-zodiac-calculator', 'chinese-zodiac'],
  ['definite-integral-calculator', 'integral'],
  ['derivative-calculator', 'derivative'],
  ['life-path-number-calculator', 'life-path'],
  ['linear-equation-system-calculator', 'linear-system'],
  ['matrix-addition-calculator', 'matrix'],
  ['name-numerology-calculator', 'name-number'],
  ['permutation-combination-calculator', 'combinations'],
  ['personal-year-number-calculator', 'personal-year'],
  ['planetary-weight-calculator', 'planet-weight'],
  ['quadratic-formula-calculator', 'quadratic'],
  ['vector-calculator', 'vector'],
  ['zodiac-compatibility-calculator', 'compatibility'],
  ['zodiac-sign-calculator', 'sun-sign']
];

function runTool(tool, values) {
  const elements = new Map();
  let submit;
  const form = {
    addEventListener(event, callback) {
      if (event === 'submit') submit = callback;
    }
  };
  elements.set('tool-form', form);
  const get = id => {
    if (!elements.has(id)) elements.set(id, { value: '', textContent: '' });
    return elements.get(id);
  };
  for (const [id, value] of Object.entries(values)) get(id).value = value;
  const document = { body: { dataset: { tool } }, getElementById: get };
  vm.runInNewContext(runtime, { document }, { timeout: 1000 });
  assert.equal(typeof submit, 'function', 'Calculator form must register a submit handler');
  submit({ preventDefault() {} });
  return { result: get('result').textContent, status: get('status').textContent };
}

test('all 14 scientific, astronomy, astrology and numerology pages have indexable metadata and the shared runtime', () => {
  for (const [slug, tool] of pages) {
    const html = fs.readFileSync(path.join(root, 'calculators', slug + '.html'), 'utf8');
    assert.match(html, /<html lang="en">/, slug + ' must declare its page language');
    assert.ok(html.includes('data-tool="' + tool + '"'), slug + ' must use its expected calculation mode');
    assert.ok(html.includes('https://friendlycalculator.in/calculators/' + slug + '.html'), slug + ' must declare its canonical URL');
    assert.match(html, /name="robots" content="index,follow/, slug + ' must be indexable');
    assert.match(html, /\/assets\/extended-science-astrology\.js/, slug + ' must load the shared calculation runtime');
  }
});

test('quadratic formula returns both roots for a real-valued equation', () => {
  const out = runTool('quadratic', { a: 1, b: -5, c: 6 });
  assert.match(out.result, /Discriminant 1; roots 3 and 2/);
  assert.match(out.status, /Calculated in your browser/);
});

test('linear equation system solves a unique two-variable system and rejects a singular one', () => {
  const solved = runTool('linear-system', { a: 2, b: 1, c: 5, d: 1, e: -1, f: 1 });
  assert.match(solved.result, /x = 2; y = 1; determinant = -3/);
  const singular = runTool('linear-system', { a: 1, b: 2, c: 3, d: 2, e: 4, f: 6 });
  assert.equal(singular.result, '—');
  assert.match(singular.status, /determinant is zero/);
});

test('matrix addition and permutation/combination return correct results', () => {
  const matrix = runTool('matrix', { 'matrix-a': '1 2\n3 4', 'matrix-b': '5 6\n7 8' });
  assert.match(matrix.result, /6\s+8\s+10\s+12/);
  const count = runTool('combinations', { n: 5, r: 2 });
  assert.match(count.result, /nPr 20; nCr 10/);
});

test('numerical derivative and Simpson integration calculate polynomial examples', () => {
  const derivative = runTool('derivative', { expression: 'x^2', x: 3 });
  assert.match(derivative.result, /Numerical derivative at x = 3: 6/);
  const integral = runTool('integral', { expression: 'x^2', lower: 0, upper: 3, steps: 100 });
  assert.match(integral.result, /Approximate definite integral: 9/);
  const invalid = runTool('integral', { expression: 'x^2', lower: 0, upper: 3, steps: 9 });
  assert.match(invalid.status, /Use 2–20,000 integration steps/);
});

test('3D vector and planetary weight tools use the stated vector and gravity calculations', () => {
  const vector = runTool('vector', { 'vector-a': '1, 2, 3', 'vector-b': '4, 5, 6' });
  assert.match(vector.result, /Dot product: 32/);
  assert.match(vector.result, /cross product: \(-3, 6, -3\)/);
  const weight = runTool('planet-weight', { weight: 60 });
  assert.match(weight.result, /Earth: 60 kg-equivalent scale reading/);
  assert.match(weight.result, /Moon:/);
  assert.match(weight.result, /mass remains unchanged/);
});

test('numerology and zodiac tools return conventional labels with appropriate caveats', () => {
  assert.match(runTool('life-path', { 'birth-date': '1990-01-01' }).result, /Life Path number: 2/);
  assert.match(runTool('personal-year', { 'birth-date': '1990-01-01', year: 2026 }).result, /Personal Year number: 3/);
  assert.match(runTool('name-number', { 'full-name': 'AVNISH' }).result, /Pythagorean name number: 1/);
  assert.match(runTool('chinese-zodiac', { year: 2024 }).result, /Dragon/);
  assert.match(runTool('sun-sign', { 'birth-date': '2000-03-21' }).result, /Aries/);
  assert.match(runTool('compatibility', { 'sign-a': 'Aries', 'sign-b': 'Leo' }).result, /Same traditional element/);
});

test('shared expression parser does not evaluate arbitrary JavaScript', () => {
  assert.doesNotMatch(runtime, /\beval\s*\(/);
  assert.doesNotMatch(runtime, /\bnew\s+Function\s*\(/);
  assert.match(runtime, /Unsupported expression token/);
});
