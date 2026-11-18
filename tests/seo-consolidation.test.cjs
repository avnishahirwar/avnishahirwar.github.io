const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('legacy overlapping category pages remain crawlable and point to retained categories', () => {
  const mappings = {
    'calculator/finance.html': '/calculator/finance-calculators.html',
    'calculator/business-tools.html': '/calculator/business-calculators.html',
    'calculator/tax-calculators.html': '/calculator/tax.html'
  };
  const sitemap = read('sitemap.xml');
  for (const [file, target] of Object.entries(mappings)) {
    const html = read(file);
    assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/i);
    assert.ok(html.includes('https://friendlycalculator.in' + target), file + ' must declare the retained canonical URL');
    assert.ok(html.includes('Open '), file + ' must provide a user-facing path to the retained category');
    assert.ok(!sitemap.includes('https://friendlycalculator.in/' + file), file + ' must not remain in the sitemap');
  }
});

test('tax category retains indexed legacy landing page and includes the consolidated tool list', () => {
  const tax = read('calculator/tax.html');
  const directory = read('calculator/site-directory.html');
  for (const slug of ['gst-calculator','income-tax-calculator','tds-calculator','hra-calculator','ctc-salary-calculator','salary-calculator','capital-gains-tax-calculator','professional-tax-calculator','advance-tax-calculator','leave-encashment-calculator','bonus-calculator','freelancer-tax-calculator','gst-late-fee-calculator','gst-interest-calculator','gst-input-tax-credit-calculator','reverse-charge-gst-calculator','gst-on-rent-calculator']) {
    assert.ok(tax.includes('/calculators/' + slug + '.html'), 'Missing tax tool: ' + slug);
  }
  assert.ok(directory.includes('/calculator/tax.html'));
  const directoryContent = directory.replace(/<header[\s\S]*?<\/header>/i, '');
  assert.ok(!directoryContent.includes('/calculator/tax-calculators.html'), 'Directory content must not promote the retired overlapping tax landing page');
  assert.match(tax, /<meta name="robots" content="index,follow/);
});

test('legacy everyday alias is crawlable and canonically consolidated', () => {
  const html = read('calculator/everyday.html');
  const sitemap = read('sitemap.xml');
  assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/i);
  assert.ok(html.includes('https://friendlycalculator.in/calculator/everyday-calculators.html'));
  assert.ok(!sitemap.includes('https://friendlycalculator.in/calculator/everyday.html'));
});

test('premium waitlist is indexable and included in the sitemap', () => {
  const html = read('calculator/premium-waitlist.html');
  assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/i);
  assert.match(html, /Register your interest/);
  assert.ok(html.includes('https://friendlycalculator.in/calculator/premium-waitlist.html'));
});

test('all 535 calculator pages remain in the sitemap after category cleanup', () => {
  const sitemap = read('sitemap.xml');
  const calculatorUrls = [...sitemap.matchAll(/<loc>(https:\/\/friendlycalculator\.in\/calculators\/[^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(new Set(calculatorUrls).size, 535);
});


test('income tax WebPage structured data matches the current salary-tax calculator inputs and scope', () => {
  const html = read('calculators/income-tax-calculator.html');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(([, json]) => JSON.parse(json));
  const webPage = blocks.find(item => item['@type'] === 'WebPage');
  assert.ok(webPage, 'Income Tax page must include WebPage structured data');
  assert.match(webPage.description, /gross salary/);
  assert.match(webPage.description, /standard deduction/);
  assert.match(webPage.description, /age, residential status and tax regime/);
  assert.match(webPage.description, /ordinary salary income only/);
  assert.doesNotMatch(webPage.description, /no separate deduction or personal-profile inputs/);
});


test('Income Tax calculator uses the current site catalogue count', () => {
  const html = read('calculators/income-tax-calculator.html');
  const sitemap = read('sitemap.xml');
  const calculatorUrls = [...sitemap.matchAll(/<loc>(https:\/\/friendlycalculator\.in\/calculators\/[^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(new Set(calculatorUrls).size, 535);
  assert.ok(html.includes('Explore all 535 calculators on Friendly Calculator.'));
  assert.ok(!html.includes('Explore all 186 calculators on Friendly Calculator.'));
});

test('seven small-savings calculators show the current review date and RBI rate cross-check', () => {
  const pages = [
    'kvp-calculator.html', 'nsc-calculator.html', 'post-office-mis-calculator.html',
    'ppf-calculator.html', 'rd-calculator.html', 'scss-calculator.html', 'ssy-calculator.html'
  ];
  for (const name of pages) {
    const html = fs.readFileSync(path.join(root, 'calculators', name), 'utf8');
    assert.match(html, /Updated: 16 November 2026/);
    assert.match(html, /rbi\.org\.in\/Scripts\/PublicationsView\.aspx\?id=24085/);
  }
});


test('business and API documentation snippets describe live capabilities and match social metadata', () => {
  const business = read('calculator/business.html');
  assert.match(business, /<title>Calculator Partnerships &amp; Business Opportunities \| Friendly Calculator<\/title>/);
  assert.match(business, /name="description" content="Explore Friendly Calculator advertising, affiliate partnerships, calculator embeds, API access and white-label options/);
  assert.match(business, /property="og:title" content="Calculator Partnerships &amp; Business Opportunities \| Friendly Calculator"/);
  assert.match(business, /name="twitter:title" content="Calculator Partnerships &amp; Business Opportunities \| Friendly Calculator"/);
  const api = read('calculator/api.html');
  assert.match(api, /<title>Calculator API &amp; Embed Documentation \| Friendly Calculator<\/title>/);
  assert.match(api, /name="description" content="Read the Friendly Calculator REST API and iframe embed docs/);
  assert.match(api, /name="twitter:title" content="Calculator API &amp; Embed Documentation \| Friendly Calculator"/);
});
