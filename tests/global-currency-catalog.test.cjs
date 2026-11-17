const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../assets/currency-converter-live.js'),'utf8');

test('currency converter loads the provider supported currency catalogue',()=>{
 assert.match(source,/api\.frankfurter\.dev\/v2\/currencies/);
 assert.match(source,/loadSupportedCurrencies\(\);/);
 assert.match(source,/item\.iso_code/);
});

test('currency catalogue excludes non-currency precious metal and SDR codes',()=>{
 for(const code of ['XAG','XAU','XDR','XPD','XPT']){
  assert.ok(source.includes("'"+code+"'"), 'missing exclusion for '+code);
 }
});

test('currency names use the visitor locale with API-name fallback',()=>{
 assert.match(source,/new Intl\.DisplayNames\(/);
 assert.match(source,/item\.name\|\|code/);
});

test('currency catalogue failure leaves existing bundled options usable',()=>{
 assert.match(source,/Existing server-rendered or bundled options remain usable/);
 assert.match(source,/catch\(_\)\{/);
});
