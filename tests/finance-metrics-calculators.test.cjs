const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const metrics=require('../assets/finance-metrics.js');

test('Earnings per share uses income less preferred dividends over weighted-average shares',()=>{
 assert.equal(metrics.calculate('eps',{netIncome:12000000,preferredDividends:500000,weightedAverageShares:1000000}),11.5);
 assert.throws(()=>metrics.calculate('eps',{netIncome:1,preferredDividends:0,weightedAverageShares:0}),/greater than zero/);
});
test('P/E ratio requires positive EPS and divides price by EPS',()=>{
 assert.equal(metrics.calculate('pe',{sharePrice:250,eps:12.5}),20);
 assert.throws(()=>metrics.calculate('pe',{sharePrice:250,eps:0}),/greater than zero/);
});
test('market capitalization multiplies share price by shares outstanding',()=>{
 assert.equal(metrics.calculate('marketcap',{sharePrice:250,shares:10000000}),2500000000);
 assert.throws(()=>metrics.calculate('marketcap',{sharePrice:-1,shares:100}),/cannot be negative/);
});
test('enterprise value adds debt and other claims then subtracts cash',()=>{
 assert.equal(metrics.calculate('ev',{marketCap:2500000000,debt:400000000,preferred:0,minority:0,cash:150000000}),2750000000);
});
test('ROE divides net income by average equity',()=>{
 assert.equal(metrics.calculate('roe',{netIncome:12000000,averageEquity:80000000}),15);
 assert.throws(()=>metrics.calculate('roe',{netIncome:100,averageEquity:0}),/greater than zero/);
});
test('five equity calculator pages are indexable and linked from the catalogue',()=>{
 const index=JSON.parse(fs.readFileSync(path.join(root,'assets/calculator-search-index.json'),'utf8'));
 const directory=fs.readFileSync(path.join(root,'calculator/site-directory.html'),'utf8');
 const about=fs.readFileSync(path.join(root,'calculator/about.html'),'utf8');
 const finance=fs.readFileSync(path.join(root,'calculator/finance-calculators.html'),'utf8');
 const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const slugs=['earnings-per-share-calculator','price-to-earnings-ratio-calculator','market-capitalization-calculator','enterprise-value-calculator','return-on-equity-calculator'];
 for(const slug of slugs){const url='/calculators/'+slug+'.html';const page=fs.readFileSync(path.join(root,url.slice(1)),'utf8');assert.ok(index.some(item=>item.url===url));assert.ok(directory.includes('href="'+url+'"'));assert.ok(about.includes('href="'+url+'"'));assert.ok(finance.includes('href="'+url+'"'));assert.ok(page.includes('rel="canonical"'));assert.ok(page.includes('application/ld+json'));assert.ok(page.includes('finance-metrics.js'));}
 assert.ok(index.length >= 420, "Catalogue should retain its tested minimum size");assert.equal(new Set(index.map(item=>item.url)).size,index.length);assert.match(home,/id="fc-home-tool-search"|id="siteSearch"|id="calculatorSearch"|id="fc-calculator-search"/);assert.ok(directory.includes('calculator-category-index') || directory.includes('finance-calculators.html'));
});
