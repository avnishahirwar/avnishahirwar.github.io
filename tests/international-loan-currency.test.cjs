'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const locales = ['id', 'pt', 'bn', 'es', 'ar', 'fr', 'ta', 'hi'];

for (const locale of locales) {
  test(`/${locale}/ loan EMI calculator uses the visitor currency`, () => {
    const file = path.join(__dirname, '..', locale, 'calculators', 'loan-emi-calculator.html');
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /FCLocale\?\.formatCurrency/);
    assert.match(html, /updateCurrencyLabel/);
    assert.match(html, /fc:localechange/);
    assert.match(html, /countryDefaults/);
    assert.match(html, /Intl\.NumberFormat\(locale,\{style:["']currency["'],currency:code/);
    assert.doesNotMatch(html, /<label[^>]*>[^<]*\(₹\)/);
  });
}
