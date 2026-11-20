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



const languageCatalogue=require('../config/language-catalogue.json');
const availableLocales=languageCatalogue.locales.filter(locale=>locale.status==='available').map(locale=>locale.code);
function expectedCluster(route){
 const expected=[];
 for(const locale of availableLocales){
  const relative=path.join(root,locale==='en'?'':locale,'calculators',route);
  if(!fs.existsSync(relative))continue;
  const html=fs.readFileSync(relative,'utf8');
  const canonical=html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/i)?.[0]?.match(/\bhref=["']([^"']+)["']/i)?.[1];
  assert.ok(canonical,'Missing canonical on '+relative);
  expected.push([locale,new URL(canonical,'https://friendlycalculator.in').href]);
 }
 if(expected.some(([locale])=>locale==='en'))expected.push(['x-default',expected.find(([locale])=>locale==='en')[1]]);
 return expected.sort((a,b)=>a[0].localeCompare(b[0]));
}
function actualCluster(relative){
 const html=fs.readFileSync(path.join(root,relative),'utf8');
 return [...html.matchAll(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["']([^"']+)["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi)]
  .map(match=>[match[1].toLowerCase(),new URL(match[2],'https://friendlycalculator.in').href])
  .sort((a,b)=>a[0].localeCompare(b[0]));
}
test('percentage calculator hreflang cluster matches every published translation',()=>{
 const route='percentage-calculator.html',expected=expectedCluster(route);
 for(const file of ['calculators/'+route,'hi/calculators/'+route])assert.deepEqual(actualCluster(file),expected,file);
});
test('simple-interest English and Bengali hreflang alternates match published translations',()=>{
 const route='simple-interest-calculator.html',expected=expectedCluster(route);
 for(const file of ['calculators/'+route,'bn/calculators/'+route])assert.deepEqual(actualCluster(file),expected,file);
});
test('priority calculator hreflang clusters are complete and reciprocal across published locales',()=>{
 const routes=['basic-calculator.html','bike-loan-calculator.html','business-loan-emi-calculator.html','car-loan-calculator.html','discount-calculator.html','ppf-calculator.html'];
 for(const route of routes){
  const expected=expectedCluster(route);
  for(const [locale] of expected){
   if(locale==='x-default')continue;
   const file=path.join(locale==='en'?'':locale,'calculators',route).split(path.sep).join('/');
   assert.deepEqual(actualCluster(file),expected,file);
  }
 }
});
