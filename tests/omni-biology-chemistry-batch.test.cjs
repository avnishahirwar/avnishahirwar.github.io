const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const routes = [
  'annealing-temperature-calculator',
  'cell-dilution-calculator',
  'cell-doubling-time-calculator',
  'dna-concentration-calculator',
  'allele-frequency-calculator',
  'molarity-calculator',
  'buffer-ph-calculator',
  'serial-dilution-calculator'
];
test('Biology and chemistry batch pages are complete, canonical and discoverable', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  for (const slug of routes) {
    const route = '/calculators/' + slug + '.html';
    const file = path.join(root, route.slice(1));
    assert.ok(fs.existsSync(file), 'Missing calculator page: ' + route);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.ok(html.includes('rel="canonical" href="https://friendlycalculator.in' + route + '"'));
    assert.match(html, /"@type":"SoftwareApplication"/);
    assert.match(html, /<form id="calcForm"/);
    assert.match(html, /<h2>Formula<\/h2>/);
    assert.match(html, /Assumptions and limitations/);
    assert.match(html, /aria-live="polite"/);
    assert.ok(directory.includes('href="' + route + '"'), 'Directory missing route: ' + route);
  }
});
test('Biology and chemistry batch uses unique calculator routes', () => {
  assert.equal(new Set(routes).size, routes.length);
});
