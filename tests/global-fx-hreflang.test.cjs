const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const locales=['hi','es','fr','pt','ar','id','bn','ta'];
test('all existing localized currency converters load the shared reference-rate client',()=>{
 for(const locale of locales){
  const html=fs.readFileSync(path.join(root,locale,'calculators/currency-converter-calculator.html'),'utf8');
  assert.match(html,/\/assets\/currency-converter-live\.js/,'missing shared FX client: '+locale);
  assert.match(html,/hreflang="de"/,'missing reciprocal German hreflang: '+locale);
 }
});
test('English and German currency converters share the reciprocal language cluster',()=>{
 for(const file of ['calculators/currency-converter-calculator.html','de/calculators/currency-converter-calculator.html']){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(html,/hreflang="de"/);
  assert.match(html,/hreflang="x-default"/);
  assert.match(html,/\/assets\/currency-converter-live\.js/);
 }
});
test('shared FX client uses free reference rates and preserves a manual fallback',()=>{
 const js=fs.readFileSync(path.join(root,'assets/currency-converter-live.js'),'utf8');
 assert.match(js,/api\.frankfurter\.dev\/v2\/rate/);
 assert.match(js,/rateInput\.readOnly=false/);
 assert.match(js,/text\.manual/);
 assert.match(js,/new Intl\.NumberFormat/);
});
test('generated sitemap check includes hreflang clusters',()=>{
 const output=execFileSync(process.execPath,['scripts/generate-sitemaps.cjs','--check'],{cwd:root,encoding:'utf8'});
 assert.match(output,/language clusters/);
});


test('percentage calculator hreflang cluster includes all nine published language pages',()=>{
 const route='percentage-calculator.html';
 const locales=['en','hi','x-default','ar','bn','es','fr','id','pt','ta'];
 const expected=locales.map(locale=>[locale,locale==='x-default'?'https://friendlycalculator.in/calculators/'+route:'https://friendlycalculator.in/'+(locale==='en'?'':locale+'/')+'calculators/'+route]);
 for(const file of ['calculators/'+route,'hi/calculators/'+route]){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  const actual=[...html.matchAll(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["']([^"']+)["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi)].map(m=>[m[1],m[2]]);
  assert.deepEqual(actual.slice().sort((a,b)=>a[0].localeCompare(b[0])),expected.slice().sort((a,b)=>a[0].localeCompare(b[0])),file);
 }
});

test('simple-interest English and Bengali hreflang alternates match published translations',()=>{
 const route='simple-interest-calculator.html';
 const englishLocales=['en','bn','x-default','ar','es','fr','hi','id','pt','ta'];
 const bengaliLocales=['en','bn','x-default','ar','es','fr','hi','id','pt'];
 const expectedFor=locales=>locales.map(locale=>[locale,locale==='x-default'?'https://friendlycalculator.in/calculators/'+route:'https://friendlycalculator.in/'+(locale==='en'?'':locale+'/')+'calculators/'+route]);
 for(const [file,expected] of [['calculators/'+route,expectedFor(englishLocales)],['bn/calculators/'+route,expectedFor(bengaliLocales)]]){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  const actual=[...html.matchAll(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["']([^"']+)["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi)].map(m=>[m[1],m[2]]);
  assert.deepEqual(actual.slice().sort((a,b)=>a[0].localeCompare(b[0])),expected.slice().sort((a,b)=>a[0].localeCompare(b[0])),file);
 }
});

test('priority calculator hreflang clusters are complete and reciprocal across supported locales',()=>{
 const routes=[
  'basic-calculator.html',
  'bike-loan-calculator.html',
  'business-loan-emi-calculator.html',
  'car-loan-calculator.html',
  'discount-calculator.html',
  'ppf-calculator.html'
 ];
 const baseLocales=['en','hi','es','fr','pt','ar','id','bn','ta'];
 const expandedLocales=[...baseLocales,'de','ja','ru','vi','te','gu','kn'];
 for(const route of routes){
  const locales=route==='basic-calculator.html'?expandedLocales:baseLocales;
  const expected=locales.map(locale=>[locale,'https://friendlycalculator.in/'+(locale==='en'?'':locale+'/')+'calculators/'+route]);
  expected.push(['x-default','https://friendlycalculator.in/calculators/'+route]);
  for(const locale of locales){
   const file=path.join(root,locale==='en'?'':locale,'calculators',route);
   const html=fs.readFileSync(file,'utf8');
   const head=html.slice(0,html.toLowerCase().indexOf('</head>'));
   const actual=[...head.matchAll(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["']([^"']+)["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi)].map(m=>[m[1],m[2]]);
   assert.deepEqual(actual.slice().sort((a,b)=>a[0].localeCompare(b[0])),expected.slice().sort((a,b)=>a[0].localeCompare(b[0])),locale+'/'+route);
  }
 }
});
