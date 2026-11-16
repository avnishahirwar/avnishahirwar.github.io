(()=>{'use strict';
const STORAGE_KEY='fc-preferred-currency';
const CURRENCIES={
 INR:{label:'INR · Indian Rupee',locale:'en-IN',symbol:'₹'},
 USD:{label:'USD · US Dollar',locale:'en-US',symbol:'$'},
 EUR:{label:'EUR · Euro',locale:'en-IE',symbol:'€'},
 GBP:{label:'GBP · British Pound',locale:'en-GB',symbol:'£'},
 AED:{label:'AED · UAE Dirham',locale:'en-AE',symbol:'د.إ'},
 CAD:{label:'CAD · Canadian Dollar',locale:'en-CA',symbol:'$'},
 AUD:{label:'AUD · Australian Dollar',locale:'en-AU',symbol:'$'},
 JPY:{label:'JPY · Japanese Yen',locale:'ja-JP',symbol:'¥'},
 SGD:{label:'SGD · Singapore Dollar',locale:'en-SG',symbol:'$'},
 CHF:{label:'CHF · Swiss Franc',locale:'de-CH',symbol:'CHF'},
 CNY:{label:'CNY · Chinese Yuan',locale:'zh-CN',symbol:'¥'},
 NZD:{label:'NZD · New Zealand Dollar',locale:'en-NZ',symbol:'$'},
 SAR:{label:'SAR · Saudi Riyal',locale:'ar-SA',symbol:'ر.س'},
 BRL:{label:'BRL · Brazilian Real',locale:'pt-BR',symbol:'R$'},
 MXN:{label:'MXN · Mexican Peso',locale:'es-MX',symbol:'$'},
 ZAR:{label:'ZAR · South African Rand',locale:'en-ZA',symbol:'R'},
 BDT:{label:'BDT · Bangladeshi Taka',locale:'bn-BD',symbol:'৳'},
 PKR:{label:'PKR · Pakistani Rupee',locale:'en-PK',symbol:'Rs'},
 IDR:{label:'IDR · Indonesian Rupiah',locale:'id-ID',symbol:'Rp'},
 THB:{label:'THB · Thai Baht',locale:'th-TH',symbol:'฿'}
};
const safeRead=()=>{try{return localStorage.getItem(STORAGE_KEY)||'INR';}catch(_){return 'INR';}};
const safeWrite=value=>{try{localStorage.setItem(STORAGE_KEY,value);}catch(_){}};
let currency=CURRENCIES[safeRead()]?safeRead():'INR';
const locale=()=>CURRENCIES[currency].locale;
const formatNumber=(value,options={})=>new Intl.NumberFormat(locale(),options).format(Number(value));
const formatCurrency=(value,code=currency,options={})=>{
 const selected=CURRENCIES[code]?code:'INR';
 return new Intl.NumberFormat(CURRENCIES[selected].locale,{style:'currency',currency:selected,maximumFractionDigits:2,...options}).format(Number(value));
};
const formatDate=(value,options={})=>new Intl.DateTimeFormat(locale(),{year:'numeric',month:'short',day:'numeric',...options}).format(value instanceof Date?value:new Date(value));
const api=Object.freeze({
 currencies:Object.freeze(Object.keys(CURRENCIES)),
 getCurrency:()=>currency,
 getLocale:locale,
 formatNumber,
 formatCurrency,
 formatDate,
 setCurrency(value){
  if(!CURRENCIES[value])return false;
  currency=value;safeWrite(value);
  document.documentElement.dataset.fcCurrency=value;
  document.documentElement.lang=document.documentElement.lang||'en';
  window.dispatchEvent(new CustomEvent('fc:currencychange',{detail:{currency:value,locale:locale()}}));
  return true;
 }
});
window.FCLocale=api;
const select=document.getElementById('fc-currency-select');
if(select){
 select.value=currency;
 select.addEventListener('change',()=>api.setCurrency(select.value));
}
document.documentElement.dataset.fcCurrency=currency;
window.addEventListener('storage',event=>{
 if(event.key===STORAGE_KEY&&CURRENCIES[event.newValue]){
  currency=event.newValue;
  if(select)select.value=currency;
  document.documentElement.dataset.fcCurrency=currency;
  window.dispatchEvent(new CustomEvent('fc:currencychange',{detail:{currency,locale:locale()}}));
 }
});
})();