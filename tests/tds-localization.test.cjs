const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Salary TDS Calculator is localized and discoverable in all supported locales', () => {
  const locales = ['hi', 'es', 'fr', 'pt', 'ar', 'id', 'bn', 'ta'];
  const sitemap = read('sitemap.xml');
  const english = read('calculators/tds-calculator.html');
  const widget = read('assets/tds-calculator-localized.js');
  assert.equal((english.match(/hreflang="/g) || []).length, 10);
  for (const locale of locales) {
    const html = read(locale + '/calculators/tds-calculator.html');
    const home = read(locale + '/index.html');
    assert.match(html, new RegExp('<html lang="' + locale + '"'));
    assert.ok(html.includes('data-tds-calculator'), locale + ' has the localized TDS widget');
    assert.ok(html.includes('tds-calculator-localized.js'), locale + ' loads the localized widget');
    assert.ok(html.includes('id="formula"') && html.includes('id="worked-example"'), locale + ' includes formula and worked example anchors');
    assert.ok(html.includes('"@type":"SoftwareApplication"') && html.includes('"@type":"FAQPage"'), locale + ' includes structured data');
    assert.equal((html.match(/hreflang="/g) || []).length, 10, locale + ' has reciprocal hreflang declarations');
    if (locale === 'ar') assert.match(html, /dir="rtl"/, 'Arabic page uses right-to-left layout');
    assert.ok(home.includes('/' + locale + '/calculators/tds-calculator.html'), locale + ' homepage links to TDS');
    assert.ok(sitemap.includes('https://friendlycalculator.in/' + locale + '/calculators/tds-calculator.html'), locale + ' URL is in sitemap');
    assert.ok(widget.includes(locale + ':{widget:'), locale + ' has localized calculator labels');
  }
  assert.match(widget, /\[400000,0\],\[800000,\.05\],\[1200000,\.10\]/);
  assert.match(widget, /afterRebate\*\.04/);
  assert.match(widget, /balance\/months/);
  assert.match(widget, /label\.htmlFor=field\.id/);
  assert.match(widget, /table\.setAttribute\("aria-label",t\.result\)/);
  assert.match(widget, /2026–27/);
});
