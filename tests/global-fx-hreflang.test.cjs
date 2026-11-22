const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const origin='https://friendlycalculator.in';
const locales=['hi','es','fr','pt','ar','id','bn','ta'];
const headOf=html=>html.slice(0,html.toLowerCase().indexOf('</head>'));
const noindexOf=html=>/<meta\b(?=[^>]*\bname=["'](?:robots|googlebot)["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i.test(headOf(html));
const alternatesOf=html=>[...headOf(html).matchAll(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["']([^"']+)["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi)].map(m=>[m[1],m[2]]);
const pageFor=(locale,route)=>path.join(root,locale==='en'?'':locale,'calculators',route);
const indexableLocales=(candidates,route)=>candidates.filter(locale=>{
 const file=pageFor(locale,route);
 return fs.existsSync(file)&&!noindexOf(fs.readFileSync(file,'utf8'));
});
const expectedPairs=(locales,route)=>[
 ...locales.map(locale=>[locale,origin+'/'+(locale==='en'?'':locale+'/')+'calculators/'+route]),
 ['x-default',origin+'/calculators/'+route]
];
const sorted=items=>items.slice().sort(([a],[b])=>a.localeCompare(b));

test('all existing localized currency converters load the shared reference-rate client',()=>{
 for(const locale of locales){
  const html=fs.readFileSync(path.join(root,locale,'calculators/currency-converter-calculator.html'),'utf8');
  assert.match(html,/\/assets\/currency-converter-live\.js/,'missing shared FX client: '+locale);
  if(noindexOf(html)) assert.deepEqual(alternatesOf(html),[],locale+' noindex page must not carry hreflang');
  else assert.match(html,/hreflang="x-default"/,'missing x-default hreflang: '+locale);
 }
});

test('English currency converter does not target the noindex German page',()=>{
 const route='currency-converter-calculator.html';
 const english=fs.readFileSync(pageFor('en',route),'utf8');
 const german=fs.readFileSync(pageFor('de',route),'utf8');
 assert.ok(noindexOf(german),'German currency page keeps its explicit noindex policy');
 assert.deepEqual(alternatesOf(german),[],'German noindex page must not carry hreflang');
 assert.doesNotMatch(english,/hreflang="de"/,'indexable English page must not target a noindex German page');
 assert.match(english,/hreflang="x-default"/);
 for(const html of [english,german]) assert.match(html,/\/assets\/currency-converter-live\.js/);
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

test('percentage calculator hreflang cluster contains only indexable published language pages',()=>{
 const route='percentage-calculator.html';
 const candidates=['en','hi','de','es','fr','pt','ar','id','bn','ta','ja','ru'];
 const expected=expectedPairs(indexableLocales(candidates,route),route);
 for(const locale of candidates){
  const file=pageFor(locale,route);
  if(!fs.existsSync(file)) continue;
  const html=fs.readFileSync(file,'utf8');
  const actual=alternatesOf(html);
  if(noindexOf(html)) assert.deepEqual(actual,[],locale+' noindex page must not carry hreflang');
  else assert.deepEqual(sorted(actual),sorted(expected),locale+'/'+route);
 }
});

test('simple-interest English and Bengali hreflang alternates match indexable published translations',()=>{
 const route='simple-interest-calculator.html';
 const candidates=['en','bn','ar','es','fr','hi','id','pt','ta'];
 const expected=expectedPairs(indexableLocales(candidates,route),route);
 for(const locale of ['en','bn']){
  const file=pageFor(locale,route);
  const html=fs.readFileSync(file,'utf8');
  assert.deepEqual(sorted(alternatesOf(html)),sorted(expected),locale+'/'+route);
 }
});

test('priority calculator hreflang clusters are complete and reciprocal across indexable locales',()=>{
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
  const candidates=route==='basic-calculator.html'?expandedLocales:baseLocales;
  const expected=expectedPairs(indexableLocales(candidates,route),route);
  for(const locale of candidates){
   const file=pageFor(locale,route);
   if(!fs.existsSync(file)) continue;
   const html=fs.readFileSync(file,'utf8');
   const actual=alternatesOf(html);
   if(noindexOf(html)) assert.deepEqual(actual,[],locale+'/'+route+' noindex page must not carry hreflang');
   else assert.deepEqual(sorted(actual),sorted(expected),locale+'/'+route);
  }
 }
});
