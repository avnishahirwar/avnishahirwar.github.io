const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const globalPage = fs.readFileSync(path.join(root, 'international', 'index.html'), 'utf8');

test('homepage presents Friendly Calculator as a global free calculator platform', () => {
  assert.match(home, /<h1>Free Online Calculators for Everyone<\/h1>/);
  assert.doesNotMatch(home, /<h1>Free Online Calculators for India<\/h1>/);
  assert.match(home, /Calculators for users worldwide/);
  assert.match(home, /\/international\//);
});

test('international directory links only to existing country-oriented and general-purpose tools', () => {
  for (const route of [
    '/calculators/mortgage-calculator.html',
    '/calculators/401k-calculator.html',
    '/international/vat-calculator.html',
    '/calculators/sales-tax-calculator.html',
    '/calculators/currency-converter-calculator.html',
    '/calculators/tip-calculator.html',
    '/calculator/tax-calculators.html',
    '/calculator/finance-calculators.html'
  ]) {
    assert.ok(fs.existsSync(path.join(root, route.replace(/^\//, ''))), 'Missing linked route: ' + route);
    assert.ok(globalPage.includes('href="' + route + '"'), 'International directory does not link to: ' + route);
  }
});

test('international directory has self-canonical, English language metadata and a clear estimate disclaimer', () => {
  assert.match(globalPage, /<html lang="en">/);
  assert.match(globalPage, /rel="canonical" href="https:\/\/friendlycalculator\.in\/international\//);
  assert.match(globalPage, /hreflang="x-default"/);
  assert.match(globalPage, /not tax, legal, financial or investment advice/i);
  assert.match(globalPage, /does not automatically determine US state, county or city rates/i);
});

test('global landing page is discoverable from homepage and uses the shared site shell', () => {
  assert.match(home, /href="\/international\/"/);
  assert.match(globalPage, /\/assets\/site-shell\.js/);
  assert.match(globalPage, /\/assets\/site-shell\.css/);
});
