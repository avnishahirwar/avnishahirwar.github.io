'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const heading = html => (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [,''])[1].replace(/<[^>]+>/g, '').trim();

test('SIP page presents one formula, one worked example and no stale tool total', () => {
  const sip = read('calculators/sip-calculator.html');
  assert.equal((sip.match(/<h2>Formula and calculation method<\/h2>/g) || []).length, 1);
  assert.equal((sip.match(/<h3>Worked example<\/h3>/g) || []).length, 1);
  assert.equal((sip.match(/₹2,000/g) || []).length, 1);
  assert.doesNotMatch(sip, /Explore all 201 calculator tools/);
  assert.match(sip, /<h3>Result breakdown<\/h3>/);
  assert.doesNotMatch(sip, /solution\.innerHTML=[^;]*FV = P/);
  assert.equal((sip.match(/mutual-fund returns are not guaranteed/gi) || []).length, 1);
});

test('About page does not publish conflicting hard-coded calculator totals', () => {
  const about = read('calculator/about.html');
  assert.doesNotMatch(about, /2481 public calculators|Available calculators \(3121 tools\)/i);
  assert.match(about, /<h2>Available calculators<\/h2>/);
});

test('each paired blog topic has a distinct search intent and heading', () => {
  const pairs = [
    ['blog/old-vs-new-tax-regime.html', 'blog/old-vs-new-tax-regime-india-comparison.html'],
    ['blog/sip-vs-fd.html', 'blog/sip-vs-fd-comparison-india.html'],
    ['blog/home-loan-prepayment.html', 'blog/home-loan-emi-tenure-prepayment-guide.html']
  ];
  for (const [left, right] of pairs) {
    assert.notEqual(heading(read(left)), heading(read(right)), left + ' and ' + right + ' should have distinct H1 headings');
  }
});

test('Privacy Policy retains Google advertising, cookie and third-party vendor disclosures', () => {
  const privacy = read('calculator/privacy.html');
  assert.match(privacy, /Google AdSense/i);
  assert.match(privacy, /DoubleClick cookies/i);
  assert.match(privacy, /third-party vendor/i);
  assert.match(privacy, /advertising partners/i);
  assert.match(privacy, /Cookies and consent choices/i);
});

test('catalogue distinguishes top-level categories from normalized calculator topics', () => {
  const directory = read('calculator/site-directory.html');
  const searchIndex = JSON.parse(read('assets/calculator-search-index.json'));
  const topLevelGroups = (directory.match(/<section class="section calculator-category"/g) || []).length;
  const topics = new Set(searchIndex.map(item => (item.category || 'Other').trim().toLocaleLowerCase().replace(/\s+/g, ' ')));
  const sitemapGroups = (read('sitemap.html').match(/<details class="sitemap-category"/g) || []).length;
  assert.equal(topLevelGroups, 20);
  assert.equal(topics.size, 36);
  assert.equal(sitemapGroups, 36);
});
