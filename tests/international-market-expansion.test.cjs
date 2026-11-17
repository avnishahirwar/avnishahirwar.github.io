const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

const hubs=[
 ['international/brazil/index.html','pt-BR','gov.br/receitafederal','/pt/calculators/loan-emi-calculator.html','/pt/calculators/mortgage-calculator.html','/pt/calculators/currency-converter-calculator.html'],
 ['international/indonesia/index.html','id-ID','pajak.go.id','/id/calculators/loan-emi-calculator.html','/id/calculators/mortgage-calculator.html','/id/calculators/currency-converter-calculator.html'],
 ['international/bangladesh/index.html','bn-BD','nbr.gov.bd','/bn/calculators/loan-emi-calculator.html','/bn/calculators/mortgage-calculator.html','/bn/calculators/currency-converter-calculator.html'],
 ['international/spain/index.html','es-ES','sede.agenciatributaria.gob.es','/es/calculators/loan-emi-calculator.html','/es/calculators/mortgage-calculator.html','/es/calculators/currency-converter-calculator.html'],
 ['international/mexico/index.html','es-MX','sat.gob.mx','/es/calculators/loan-emi-calculator.html','/es/calculators/mortgage-calculator.html','/es/calculators/currency-converter-calculator.html']
];

test('new country hubs use localized language, canonical URLs, local official references and relevant calculators',()=>{
 for(const [file,lang,authority,loan,mortgage,currency] of hubs){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(html,new RegExp('<html lang="'+lang+'">'),file+' language');
  assert.match(html,/rel="canonical"/,file+' canonical');
  assert.match(html,new RegExp(authority.replaceAll('.','\\.')),file+' official source');
  for(const route of [loan,mortgage,currency,'/international/vat-calculator.html']){
   assert.ok(html.includes('href="'+route+'"'),file+' missing '+route);
  }
  assert.match(html,/"@type":"CollectionPage"/,file+' CollectionPage schema');
  assert.match(html,/"@type":"FAQPage"/,file+' FAQ schema');
  assert.match(html,/not|no|não|না|tidak/i,file+' scope disclosure');
 }
});

test('international directory and homepage expose the new country hubs and 195-market directory',()=>{
 const directory=fs.readFileSync(path.join(root,'international/countries/index.html'),'utf8');
 const international=fs.readFileSync(path.join(root,'international/index.html'),'utf8');
 const homepage=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.equal((directory.match(/class="country"/g)||[]).length,195);
 for(const name of ['Brazil','Indonesia','Bangladesh','Spain','Mexico']) assert.ok(directory.includes(name));
 for(const route of ['/international/brazil/','/international/indonesia/','/international/bangladesh/','/international/spain/','/international/mexico/','/international/countries/']){
  assert.ok(international.includes(route),'International directory missing '+route);
  assert.ok(homepage.includes('/international/countries/'),'Homepage must link to country directory');
 }
 assert.match(directory,/do not publish 195 near-identical pages/i);
});

test('translated loan calculators format every result in the selected display currency',()=>{
 for(const locale of ['id','pt','bn','es']){
  const html=fs.readFileSync(path.join(root,locale,'calculators/loan-emi-calculator.html'),'utf8');
  assert.match(html,/FCLocale\.formatCurrency/);
  assert.match(html,/countryDefaults/);
  assert.doesNotMatch(html,/fmt\.format\(x\)\+\s*["']\s*₹/);
 }
});

test('translated mortgage calculators use selected currency and neutral country guidance',()=>{
 for(const locale of ['id','pt','bn','es']){
  const html=fs.readFileSync(path.join(root,locale,'calculators/mortgage-calculator.html'),'utf8');
  assert.match(html,/FCLocale\.formatCurrency/);
  assert.match(html,/applyMarketDefaults/);
  assert.doesNotMatch(html,/India|India's|na Índia|em India|ভারতের হোম লোন/);
  assert.doesNotMatch(html,/₹80,00,000|₹64,00,000|₹55\.541/);
 }
});
