const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
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
 const index=JSON.parse(fs.readFileSync('assets/calculator-search-index.json','utf8'));
 const directory=fs.readFileSync('calculator/site-directory.html','utf8');
 const about=fs.readFileSync('calculator/about.html','utf8');
 const finance=fs.readFileSync('calculator/finance-calculators.html','utf8');
 const home=fs.readFileSync('index.html','utf8');
 const slugs=['earnings-per-share-calculator','price-to-earnings-ratio-calculator','market-capitalization-calculator','enterprise-value-calculator','return-on-equity-calculator'];
 for(const slug of slugs){const url='/calculators/'+slug+'.html';const page=fs.readFileSync(url.slice(1),'utf8');assert.ok(index.some(item=>item.url===url));assert.ok(directory.includes('href="'+url+'"'));assert.ok(about.includes('href="'+url+'"'));assert.ok(finance.includes('href="'+url+'"'));assert.ok(page.includes('rel="canonical"'));assert.ok(page.includes('application/ld+json'));assert.ok(page.includes('finance-metrics.js'));}
 assert.equal(index.length,420);assert.equal(new Set(index.map(item=>item.url)).size,420);assert.match(home,/Search all 420 calculators/);assert.match(directory,/Browse all 419 calculator tools/);
});
