const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'calculators/trig-calculator.html'), 'utf8');
const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
const searchIndex = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));

test('trigonometry calculator exposes six functions and angle-unit selection', () => {
  for (const id of ['angle', 'unit', 'precision', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc']) {
    assert.match(page, new RegExp('id="' + id + '"'));
  }
  assert.match(page, /Degrees \(°\)/);
  assert.match(page, /Radians/);
  assert.match(page, /180/);
  assert.match(page, /Math\.PI/);
});

test('trigonometry calculator handles undefined values and computes cotangent correctly', () => {
  assert.match(page, /cot:Math\.abs\(s\)<1e-12\?null:c\/s/);
  assert.match(page, /t= Math\.abs\(c\)<1e-12\?null:s\/c/);
  assert.match(page, /Undefined/);
});

test('right-triangle solver validates acute angles and calculates both legs', () => {
  assert.match(page, /id="hypotenuse"/);
  assert.match(page, /id="triangle-angle"/);
  assert.match(page, /h\*Math\.sin\(r\)/);
  assert.match(page, /h\*Math\.cos\(r\)/);
  assert.match(page, /a<=0\|\|a>=90/);
});

test('trigonometry calculator is discoverable in directory and search index', () => {
  assert.match(directory, /href="\/calculators\/trig-calculator\.html"[^>]*><strong>Trigonometry Calculator[^<]*<\/strong>/);
  const entry = searchIndex.find(item => item.url === '/calculators/trig-calculator.html');
  assert.ok(entry);
  assert.equal(entry.name, 'Trigonometry Calculator');
  assert.match(entry.keywords, /sine cosine tangent/);
});
