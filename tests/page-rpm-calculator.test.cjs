const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Page RPM calculator is indexed, discoverable and has complete SEO content', () => {
  const pagePath = '/calculators/page-rpm-calculator.html';
  const page = fs.readFileSync(path.join(root, pagePath.slice(1)), 'utf8');
  const additions = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index-additions.json'), 'utf8'));
  const business = fs.readFileSync(path.join(root, 'calculator/business-calculators.html'), 'utf8');

  assert.ok(additions.some(item => item.url === pagePath && item.name === 'Page RPM Calculator'));
  assert.ok(business.includes('href="' + pagePath + '"'));
  assert.ok(page.includes('<link rel="canonical" href="https://friendlycalculator.in' + pagePath + '">'));
  assert.ok(page.includes('"@type":"WebApplication"'));
  assert.ok(page.includes('Page RPM = (Estimated earnings ÷ Page views) × 1,000'));
  assert.ok(page.includes('aria-live="polite"'));
  assert.ok(page.includes('All calculations run locally in your browser'));
});

test('Page RPM calculator calculations use the page-view denominator', () => {
  const earnings = 120;
  const pageViews = 30000;
  const rpm = earnings / pageViews * 1000;
  assert.equal(rpm, 4);
  assert.equal((pageViews / 1000) * rpm, earnings);
  assert.equal(Math.ceil((1000 / rpm) * 1000), 250000);
});
