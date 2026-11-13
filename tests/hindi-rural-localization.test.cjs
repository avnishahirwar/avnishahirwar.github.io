const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const slugs = [
  'crop-cost-profit-calculator','kcc-interest-calculator','livestock-cost-profit-calculator',
  'crop-yield-sale-value-calculator','pm-kisan-eligibility-checker','ayushman-bharat-eligibility-checker',
  'apy-eligibility-pension-planner','pmay-eligibility-checker','mudra-loan-category-emi-calculator',
  'mp-ladli-behna-eligibility-checker','job-change-take-home-salary-calculator','first-job-salary-calculator'
];

test('all 12 new Hindi rural, scheme and career calculator pages exist and are localized', () => {
  for (const slug of slugs) {
    const file = path.join(root, 'hi', 'calculators', slug + '.html');
    assert.ok(fs.existsSync(file), 'missing Hindi page: ' + slug);
    const html = fs.readFileSync(file, 'utf8');
    assert.ok(html.includes('<html lang="hi">'));
    assert.ok(html.includes('https://friendlycalculator.in/hi/calculators/' + slug + '.html'));
    const title = html.split('<title>')[1]?.split('</title>')[0] || '';
    assert.ok(/[ऀ-ॿ]/.test(title), 'title is not Hindi: ' + slug);
    assert.ok(html.includes('/assets/rural-tools.js'));
  }
});

test('shared rural calculator runtime translates field and result labels for Hindi pages', () => {
  const runtime = fs.readFileSync(path.join(root, 'assets', 'rural-tools.js'), 'utf8');
  assert.ok(runtime.includes("document.documentElement.lang==='hi'"));
  for (const label of ['खेती का क्षेत्रफल (एकड़)', 'बकाया KCC राशि (₹)', 'अनुमानित मासिक EMI', 'अनुमानित मासिक इन-हैंड वेतन']) {
    assert.ok(runtime.includes(label), 'missing Hindi runtime label: ' + label);
  }
});

test('sitemap includes every newly localized Hindi calculator', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const slug of slugs) assert.ok(sitemap.includes('/hi/calculators/' + slug + '.html'));
});
