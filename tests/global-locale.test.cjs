const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(new URL('../assets/global-locale.js','file://'+__filename),'utf8');
const genericSource=fs.readFileSync(new URL('../assets/page-calculators.js','file://'+__filename),'utf8');
const vatPage=fs.readFileSync(new URL('../international/vat-calculator.html','file://'+__filename),'utf8');
const vatSource=fs.readFileSync(new URL('../assets/vat-calculator.js','file://'+__filename),'utf8');
function boot(initial={}) {
 const values=new Map(Object.entries(initial)),listeners={},events=[];
 const select=()=>({value:'',addEventListener(type,fn){listeners[type]=fn;}});
 const elements={'fc-currency-select':select(),'fc-locale-select':select()};
 const context={
  Intl,Number,Date,Object,
  localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},
  document:{documentElement:{dataset:{}},getElementById:id=>elements[id],querySelectorAll:()=>[]},
  window:{dispatchEvent:event=>events.push(event),addEventListener:(type,fn)=>{(listeners['window:'+type]??=[]).push(fn);}},
  CustomEvent:function(type,init){this.type=type;this.detail=init.detail;}
 };
 vm.runInNewContext(source,context);
 return {api:context.window.FCLocale,values,events,elements,listeners};
}
test('global locale defaults to Indian rupees and Indian number format',()=>{
 const x=boot();assert.equal(x.api.getCurrency(),'INR');assert.equal(x.api.getLocale(),'en-IN');
 assert.equal(x.api.formatNumber(1234567.89),'12,34,567.89');assert.ok(x.api.formatCurrency(1250).includes('₹'));
});
test('country format selection changes separators and date formatting',()=>{
 const x=boot();assert.equal(x.api.setLocale('en-US'),true);assert.equal(x.api.formatNumber(1234567.89),'1,234,567.89');
 assert.equal(x.api.getLocale(),'en-US');assert.equal(x.api.setLocale('xx-XX'),false);
});
test('currency selection persists without changing entered numeric values',()=>{
 const x=boot();assert.equal(x.api.setCurrency('USD'),true);assert.equal(x.api.getCurrency(),'USD');
 assert.equal(x.values.get('fc-preferred-currency'),'USD');assert.ok(x.api.formatCurrency(100).includes('$'));
 assert.equal(x.api.setCurrency('BAD'),false);
});
test('locale and currency changes dispatch a shared event',()=>{
 const x=boot();x.api.setCurrency('EUR');x.api.setLocale('de-DE');assert.equal(x.events.length,2);
 assert.equal(x.events[1].detail.locale,'de-DE');
});
test('generic calculator outputs use the shared currency and locale formatters',()=>{
 assert.ok(genericSource.includes('window.FCLocale.formatCurrency'));assert.ok(genericSource.includes('window.FCLocale.formatNumber'));
 assert.ok(genericSource.includes('data-fc-label-template'));assert.ok(genericSource.includes('fc:localechange'));
});
test('international VAT page is canonical, indexable and uses the shared locale helper',()=>{
 assert.ok(vatPage.includes('https://friendlycalculator.in/international/vat-calculator.html'));
 assert.ok(vatPage.includes('index,follow'));assert.ok(vatSource.includes('FCLocale'));
});

test('currency formatting follows the selected display currency without altering the calculation value',()=>{
 const x=boot();const inr=x.api.formatCurrency(1000);assert.ok(inr.includes('₹'));
 x.api.setCurrency('USD');assert.ok(x.api.formatCurrency(1000).includes('$'));
 assert.equal(x.api.getCurrency(),'USD');
});
test('global currency helper updates currency labels and explains display-only behavior',()=>{
 assert.match(source,/updateCurrencyLabels/);
 assert.match(source,/Display currency only\. Changing it does not convert existing numeric inputs/);
});
test('native financial calculators refresh displayed results after currency preference changes',()=>{
 const loan=fs.readFileSync(new URL('../assets/loan-emi-calculator.js','file://'+__filename),'utf8');
 const rd=fs.readFileSync(new URL('../calculators/rd-calculator.html','file://'+__filename),'utf8');
 const sip=fs.readFileSync(new URL('../calculators/sip-calculator.html','file://'+__filename),'utf8');
 const homeLoan=fs.readFileSync(new URL('../calculators/home-loan-emi-calculator.html','file://'+__filename),'utf8');
 const mortgage=fs.readFileSync(new URL('../calculators/mortgage-calculator.html','file://'+__filename),'utf8');
 for(const code of [loan,rd,sip,homeLoan,mortgage])assert.match(code,/FCLocale\.formatCurrency/);
 for(const code of [loan,rd,sip,homeLoan,mortgage])assert.match(code,/fc:localechange/);
});
test('generic finance calculator rerenders existing results when display currency changes',()=>{
 assert.match(genericSource,/refreshForLocale/);
 assert.match(genericSource,/localeRefresh/);
});
