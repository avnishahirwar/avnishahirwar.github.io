const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Compound Interest Calculator is localized and discoverable in all supported locales', () => {
  const locales = ['hi', 'es', 'fr', 'pt', 'ar', 'id', 'bn', 'ta'];
  const sitemap = read('sitemap.xml');
  const english = read('calculators/compound-interest-calculator.html');
  const script = read('assets/compound-interest-localized.js');
  assert.ok((english.match(/hreflang="/g') || []).length >= 9);
  const englishSchemas = [...english.matchAll(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/g)].map(m => JSON.parse(m[1]));
  assert.ok(englishSchemas.some(x => x['@type'] === 'SoftwareApplication'));
  assert.ok(englishSchemas.some(x => x['@type'] === 'FAQPage'));
  for (const locale of locales) {
    const html = read(locale + '/calculators/compound-interest-calculator.html');
    const home = read(locale + '/index.html');
    assert.match(html, new RegExp('<html lang="' + locale + '"'));
    assert.ok(html.includes('data-compound-calculator') && html.includes('compound-interest-localized.js'), locale + ' loads the localized calculator');
    assert.ok(html.includes('id="formula"') && html.includes('id="worked-example"'), locale + ' includes formula and worked example');
    assert.equal((html.match(/hreflang="/g') || []).length, 10, locale + ' has reciprocal hreflang declarations');
    if (locale === 'ar') assert.match(html, /dir="rtl"/, 'Arabic page uses right-to-left layout');
    const schemas = [...html.matchAll(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/g)].map(m => JSON.parse(m[1]));
    assert.ok(schemas.some(x => x['@type'] === 'SoftwareApplication'), locale + ' has valid SoftwareApplication JSON-LD');
    assert.ok(schemas.some(x => x['@type'] === 'FAQPage'), locale + ' has valid FAQPage JSON-LD');
    assert.ok(home.includes('/' + locale + '/calculators/compound-interest-calculator.html'), locale + ' homepage links to the calculator');
    assert.ok(sitemap.includes('https://friendlycalculator.in/' + locale + '/calculators/compound-interest-calculator.html'), locale + ' URL is in sitemap');
    assert.ok(script.includes(locale + ':{widget:'), locale + ' has localized form labels');
  }
  assert.match(script, /Math\.pow\(1\+\(rate\/100\)\/n,periods\)/);
  assert.match(script, /table\.setAttribute\("aria-label",t\.result\)/);
  assert.match(script, /365/);
});
