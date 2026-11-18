const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const routes = [
  'molality-calculator',
  'normality-calculator',
  'empirical-formula-calculator',
  'hydrogen-ion-concentration-calculator'
];
test('Chemistry batch pages are complete, canonical and discoverable', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
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
    assert.ok(about.includes('href="' + route + '"'), 'About catalogue missing route: ' + route);
    assert.ok(index.some(item => item.url === route), 'Search index missing route: ' + route);
  }
  assert.equal(index.length, 424, 'Search index should contain 423 core tools plus International VAT');
  assert.match(directory, /<strong>42 tools<\/strong>/);
  assert.match(about, /423 public calculators/);
});
