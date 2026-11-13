const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Crop cost and profit calculator exposes validated farm inputs and result metrics', () => {
  const html = read('calculators/crop-cost-profit-calculator.html');
  for (const id of ['area','yield','price','seed','fertilizer','cropProtection','labour','machinery','irrigation','transport','other']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  for (const metric of ['totalCost','revenue','net','costAcre','netAcre','breakEven']) {
    assert.match(html, new RegExp('id="' + metric + '"'));
  }
  assert.match(html, /const quantity=v\.area\*v\.yield/);
  assert.match(html, /const revenue=quantity\*v\.price/);
  assert.match(html, /const net=revenue-totalCost/);
  assert.match(html, /const breakEven=quantity>0\?totalCost\/quantity/);
  assert.match(html, /Share result on WhatsApp/);
  assert.match(html, /window\.print\(\)/);
  assert.match(html, /no nationwide crop-price assumption/i);
});

test('Agriculture hub reuses existing regional land tools without duplicating them', () => {
  const html = read('calculator/agriculture-calculators.html');
  assert.match(html, /crop-cost-profit-calculator\.html/);
  assert.match(html, /land-unit-converter-calculator\.html/);
  assert.match(html, /bigha-to-sq-ft-calculator\.html/);
  assert.match(html, /official eligibility rules/i);
});

test('Homepage, directory, About catalogue and sitemap discover the crop calculator', () => {
  for (const file of ['index.html','calculator/site-directory.html','calculator/about.html','sitemap.xml']) {
    assert.match(read(file), /crop-cost-profit-calculator\.html/);
  }
  assert.match(read('calculator/about.html'), /189 public calculators/);
  assert.match(read('calculator/about.html'), /Available calculators \(189 tools\)/);
  assert.match(read('calculator/site-directory.html'), /12 categories/);
  assert.match(read('index.html'), /189 calculators across 12 categories/);
});
