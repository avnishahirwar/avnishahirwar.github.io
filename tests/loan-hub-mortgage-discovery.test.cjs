const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'../calculator/loan-calculators.html'),'utf8');

test('loan hub links to the English mortgage calculator', () => {
  assert.match(html, /href="\/calculators\/mortgage-calculator\.html"/);
  assert.match(html, /<h2>Mortgage and Home Loan Payments<\/h2>/);
});
