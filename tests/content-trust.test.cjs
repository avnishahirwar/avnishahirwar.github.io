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

test('Homepage totals match the public search index and separate category levels', () => {
  const homepage = read('index.html');
  const searchIndex = JSON.parse(read('assets/calculator-search-index.json'));
  const topicCount = new Set(searchIndex.map(item => (item.category || 'Other').trim().toLocaleLowerCase().replace(/\s+/g, ' '))).size;
  const directory = read('calculator/site-directory.html');
  const categorySections = [...directory.matchAll(/<section class="section calculator-category" id="([^"]+)"[^>]*>([\\s\\S]*?)(?=<section class="section calculator-category"|<section class="section"|<footer|<\\/main>)/g)];
  const directoryCounts = Object.fromEntries(categorySections.map(match => [match[1], (match[2].match(/<a class="card" href="\\/calculators\\//g) || []).length]));
  const homepageCards = [...homepage.matchAll(/href="\\/calculator\\/site-directory\\.html#([^"]+)"><strong>.*?<\\/strong><span>([\\d,]+) calculators<\\/span><\\/a>/g)];
  const homepageCounts = Object.fromEntries(homepageCards.map(match => [match[1], Number(match[2].replace(/,/g, ''))]));
  assert.equal(searchIndex.length, 3123);
  assert.match(homepage, /Search all 3123 calculators/);
  assert.match(homepage, /Browse 3123 calculators across 36 calculator topics/);
  assert.equal(topicCount, 36);
  assert.equal(categorySections.length, 20);
  assert.deepEqual(homepageCounts, directoryCounts);
  assert.equal(Object.values(homepageCounts).reduce((sum, value) => sum + value, 0), 3122);
  assert.doesNotMatch(homepage, /Billionaire Desk|Wealth Intelligence|Original Research/i);
});
