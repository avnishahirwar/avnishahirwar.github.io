const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('legacy overlapping category pages are excluded from indexing and point to retained categories', () => {
  const mappings = {
    'calculator/finance.html': '/calculator/finance-calculators.html',
    'calculator/everyday.html': '/calculator/everyday-calculators.html',
    'calculator/business-tools.html': '/calculator/business-calculators.html',
    'calculator/tax-calculators.html': '/calculator/tax.html'
  };
  const sitemap = read('sitemap.xml');
  for (const [file, target] of Object.entries(mappings)) {
    const html = read(file);
    assert.match(html, /<meta name="robots" content="noindex,follow">/);
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
  assert.ok(!directory.includes('/calculator/tax-calculators.html'));
  assert.match(tax, /<meta name="robots" content="index,follow/);
});

test('premium waitlist remains accessible but is not offered as an indexable search landing page', () => {
  const html = read('calculator/premium-waitlist.html');
  const sitemap = read('sitemap.xml');
  assert.match(html, /<meta name="robots" content="noindex,follow">/);
  assert.match(html, /Register your interest/);
  assert.ok(!sitemap.includes('https://friendlycalculator.in/calculator/premium-waitlist.html'));
});

test('all 275 calculator pages remain in the sitemap after category cleanup', () => {
  const sitemap = read('sitemap.xml');
  const calculatorUrls = [...sitemap.matchAll(/<loc>(https:\/\/friendlycalculator\.in\/calculators\/[^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(new Set(calculatorUrls).size, 275);
});
