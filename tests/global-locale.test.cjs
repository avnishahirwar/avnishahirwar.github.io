const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(new URL('../assets/global-locale.js','file://'+__filename),'utf8');
const genericSource=fs.readFileSync(new URL('../assets/page-calculators.js','file://'+__filename),'utf8');
const vatPage=fs.readFileSync(new URL('../international/vat-calculator.html','file://'+__filename),'utf8');
const vatSource=fs.readFileSync(new URL('../assets/vat-calculator.js','file://'+__filename),'utf8');
function boot(initial={},browserLocale='') {
 const values=new Map(Object.entries(initial)),listeners={},events=[];
 const select=()=>({value:'',addEventListener(type,fn){listeners[type]=fn;}});
 const elements={'fc-currency-select':select(),'fc-locale-select':select()};
 const context={
  Intl,Number,Date,Object,navigator:browserLocale?{language:browserLocale,languages:[browserLocale]}:undefined,
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

test('VAT calculator offers sourced standard-rate presets and keeps manual rate as the default',()=>{
 const page=fs.readFileSync(new URL('../international/vat-calculator.html','file://'+__filename),'utf8');
 for(const code of ['GB','AU','SG','DE','FR','ES','IT','IE','NL','SE','DK','FI'])assert.ok(page.includes('value="'+code+'"'));
 for(const sourceUrl of ['https://www.gov.uk/vat-rates','https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/how-gst-works','https://www.iras.gov.sg/taxes/goods-services-tax-%28gst%29/basics-of-gst/current-gst-rates','https://europa.eu/youreurope/business/finance-and-tax/vat/vat-rules-rates/index_en.htm'])assert.ok(page.includes(sourceUrl));
 assert.match(page,/value="manual">Manual rate/);
 assert.match(page,/Standard-rate references checked 16 November 2026/);
});
test('VAT preset engine includes official rates and preserves manual override',()=>{
 for(const [code,rateValue] of [['GB',20],['AU',10],['SG',9],['DE',19],['FR',20],['ES',21],['IT',22],['IE',23],['NL',21],['SE',25],['DK',25],['FI',25.5]]){
  assert.match(vatSource,new RegExp(code+":\\{name:[^,]+,rate:"+rateValue));
 }
 assert.match(vatSource,/jurisdiction\.value!=='manual'/);
 assert.match(vatSource,/Manual rate selected/);
});

test('browser region auto-detects currency and number locale when no saved preference exists',()=>{
 const us=boot({},'en-US');assert.equal(us.api.getCurrency(),'USD');assert.equal(us.api.getLocale(),'en-US');
 const jp=boot({},'ja-JP');assert.equal(jp.api.getCurrency(),'JPY');assert.equal(jp.api.getLocale(),'ja-JP');
 const ru=boot({},'ru-RU');assert.equal(ru.api.getCurrency(),'RUB');assert.equal(ru.api.getLocale(),'ru-RU');
 const india=boot({},'en-IN');assert.equal(india.api.getCurrency(),'INR');assert.equal(india.api.getLocale(),'en-IN');
});
test('manual currency and format preferences override browser auto-detection',()=>{
 const x=boot({'fc-preferred-currency':'INR','fc-preferred-format-locale':'en-IN'},'en-US');
 assert.equal(x.api.getCurrency(),'INR');assert.equal(x.api.getLocale(),'en-IN');
});


test('global locale supports additional international currencies and regional number formats',()=>{
 const cases=[['tr-TR','TRY','tr-TR'],['ko-KR','KRW','ko-KR'],['vi-VN','VND','vi-VN'],['fil-PH','PHP','fil-PH'],['ms-MY','MYR','ms-MY'],['pl-PL','PLN','pl-PL'],['sv-SE','SEK','sv-SE'],['nb-NO','NOK','nb-NO'],['da-DK','DKK','da-DK'],['en-NG','NGN','en-NG'],['en-KE','KES','en-KE'],['ar-EG','EGP','ar-EG'],['ne-NP','NPR','ne-NP'],['es-CL','CLP','es-CL']];
 for(const [browser,currency,locale] of cases){const x=boot({},browser);assert.equal(x.api.getCurrency(),currency,browser);assert.equal(x.api.getLocale(),locale,browser);assert.ok(x.api.formatCurrency(1234).length>0);}
});
test('currency menu and share panel expose international currency and Pinterest/Reddit options',()=>{
 const shell=fs.readFileSync(new URL('../assets/site-shell.js','file://'+__filename),'utf8');
 for(const code of ['TRY','KRW','VND','PHP','MYR','PLN','SEK','NOK','DKK','CZK','HUF','ILS','NGN','KES','EGP','QAR','KWD','OMR','LKR','NPR','BHD','CLP','COP','ARS','UAH','MAD','RON','BGN'])assert.ok(shell.includes(code+":"),code);
 assert.match(shell,/pinterest\.com\/pin\/create\/button/);assert.match(shell,/reddit\.com\/submit/);
});

 
test('global unit converter distinguishes US and Imperial measures and supports area units',()=>{
 const page=fs.readFileSync(new URL('../calculators/unit-converter.html','file://'+__filename),'utf8');
 const localized=fs.readFileSync(new URL('../assets/unit-converter-localized.js','file://'+__filename),'utf8');
 for(const token of ['galUS','qtUS','ptUS','galImp','ptImp','acre','ha','area','st'])assert.ok(page.includes(token),token);
 for(const token of ['galUS','galImp','ptImp','acre','ha','area','st'])assert.ok(localized.includes(token),token);
 assert.match(page,/US customary and Imperial measures are separate options/);
});
