const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Rent vs Buy Home Calculator is localized and discoverable in all supported locales', () => {
  const locales = ['hi', 'es', 'fr', 'pt', 'ar', 'id', 'bn', 'ta'];
  const sitemap = read('sitemap.xml');
  const english = read('calculators/rent-vs-buy-home-calculator.html');
  const js = read('assets/extra-calculators.js');
  assert.equal((english.match(/hreflang="/g) || []).length, 10);
  for (const locale of locales) {
    const html = read(locale + '/calculators/rent-vs-buy-home-calculator.html');
    const home = read(locale + '/index.html');
    assert.match(html, new RegExp('<html lang="' + locale + '"'));
    assert.ok(html.includes('data-calc="rent-vs-buy-home-calculator"'), locale + ' uses the shared calculator model');
    assert.ok(html.includes('id="formula"') && html.includes('id="worked-example"'), locale + ' includes method and example');
    assert.ok(html.includes('"@type":"SoftwareApplication"') && html.includes('"@type":"FAQPage"'), locale + ' includes structured data');
    assert.equal((html.match(/hreflang="/g) || []).length, 10, locale + ' has reciprocal hreflang declarations');
    assert.ok(home.includes('/' + locale + '/calculators/rent-vs-buy-home-calculator.html'), locale + ' homepage links to the calculator');
    assert.ok(sitemap.includes('https://friendlycalculator.in/' + locale + '/calculators/rent-vs-buy-home-calculator.html'), locale + ' URL is in sitemap');
  }
  assert.match(js, /const rentBuyI18n=/);
  assert.match(js, /rentbuy:\[\['Estimated rent paid over period'/);
  assert.match(js, /const remaining=/);
});
