const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const locales = ['en','hi','es','fr','pt','ar','id','bn','ta'];
const slug = 'loan-comparison-calculator.html';

test('loan comparison calculator exists with reciprocal locale metadata', () => {
  for (const locale of locales) {
    const file = path.join(root, locale === 'en' ? 'calculators' : locale + '/calculators', slug);
    assert.ok(fs.existsSync(file), 'Missing localized loan comparison page: ' + locale);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, new RegExp('<html lang="' + locale + '"'));
    assert.ok(html.includes('hreflang="en"'));
    assert.ok(html.includes('hreflang="hi"'));
    assert.ok(html.includes('id="calc"'));
    assert.ok(html.includes('function emi(P,annual,months)'));
  }
});

test('loan comparison EMI formula handles zero interest and positive interest', () => {
  const html = fs.readFileSync(path.join(root, 'calculators', slug), 'utf8');
  const match = html.match(/function emi\(P,annual,months\)\{([^}]+)\}/);
  assert.ok(match, 'Production EMI function should be present');
  const emi = vm.runInNewContext('(function(P,annual,months){' + match[1] + '})');
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.02, actual + ' != ' + expected);
  close(emi(120000, 0, 12), 10000);
  close(emi(500000, 12, 60), 11122.22);
  assert.ok(Number.isFinite(emi(500000, 0, 60)));
});
