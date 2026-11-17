const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

const pages = [
  ['international/us-income-tax-calculator.html', 'en-US', 'us-income-tax-calculator.html'],
  ['international/uk-income-tax-calculator.html', 'en-GB', 'uk-income-tax-calculator.html'],
  ['international/australia-tax-super-calculator.html', 'en-AU', 'australia-tax-super-calculator.html']
];

test('country tax calculators declare matching regional document language and hreflang', () => {
  for (const [file, locale, slug] of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const url = 'https://friendlycalculator.in/international/' + slug;
    assert.match(html, new RegExp('<html lang="' + locale + '">'), file + ' document language');
    assert.ok(html.includes('<link rel="canonical" href="' + url + '">'), file + ' canonical');
    assert.ok(html.includes('<link rel="alternate" hreflang="' + locale + '" href="' + url + '">'), file + ' regional hreflang');
    assert.ok(html.includes('<link rel="alternate" hreflang="x-default" href="' + url + '">'), file + ' x-default');
  }
});
