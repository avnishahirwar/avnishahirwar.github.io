'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pages = [
  ['id', 'id-ID', 'IDR'],
  ['pt', 'pt-BR', 'BRL'],
  ['bn', 'bn-BD', 'BDT'],
  ['es', 'es-ES', 'EUR']
];

for (const [locale, language, currency] of pages) {
  test(`/${locale}/ loan EMI calculator uses the visitor currency`, () => {
    const file = path.join(__dirname, '..', locale, 'calculators', 'loan-emi-calculator.html');
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /FCLocale\?\.formatCurrency\(value,code/);
    assert.match(html, /updateCurrencyLabels/);
    assert.match(html, /fc:localechange/);
    assert.match(html, /countryDefaults/);
    assert.match(html, new RegExp(`Intl\\.NumberFormat\\(locale,\\{style:'currency',currency:code`));
    assert.doesNotMatch(html, /<label>[^<]*\\(₹\\)/);
  });
}
