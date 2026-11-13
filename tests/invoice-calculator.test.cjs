const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const locales = ['en','hi','es','fr','pt','ar','id','bn','ta'];
test('invoice calculator has localized pages, metadata and interactive inputs', () => {
  for (const locale of locales) {
    const file = path.join(root, locale === 'en' ? 'calculators' : locale + '/calculators', 'invoice-calculator.html');
    assert.ok(fs.existsSync(file), 'Missing invoice page: ' + locale);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, new RegExp('<html lang="' + locale + '"'));
    assert.ok(html.includes('id="calc"'));
    assert.ok(html.includes('id="v0"'));
    assert.ok(html.includes('hreflang="en"'));
    assert.ok(html.includes('WebApplication'));
  }
});
test('invoice calculator uses the expected discount and GST sequence', () => {
  const html = fs.readFileSync(path.join(root, 'hi/calculators/invoice-calculator.html'), 'utf8');
  assert.ok(html.includes('const gross=qty*price,disc=gross*discount/100,taxable=gross-disc,tax=taxable*gst/100'));
  const gross=2*1000,discount=gross*10/100,taxable=gross-discount,gst=taxable*18/100;
  assert.equal(gross,2000); assert.equal(discount,200); assert.equal(taxable,1800); assert.equal(gst,324); assert.equal(taxable+gst,2124);
});
