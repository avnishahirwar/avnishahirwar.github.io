(()=>{'use strict';
const CURRENCY_KEY='fc-preferred-currency',LOCALE_KEY='fc-preferred-format-locale';
const CURRENCIES={INR:'INR · Indian Rupee',USD:'USD · US Dollar',EUR:'EUR · Euro',GBP:'GBP · British Pound',AED:'AED · UAE Dirham',CAD:'CAD · Canadian Dollar',AUD:'AUD · Australian Dollar',JPY:'JPY · Japanese Yen',SGD:'SGD · Singapore Dollar',CHF:'CHF · Swiss Franc',CNY:'CNY · Chinese Yuan',NZD:'NZD · New Zealand Dollar',SAR:'SAR · Saudi Riyal',BRL:'BRL · Brazilian Real',MXN:'MXN · Mexican Peso',ZAR:'ZAR · South African Rand',BDT:'BDT · Bangladeshi Taka',PKR:'PKR · Pakistani Rupee',IDR:'IDR · Indonesian Rupiah',THB:'THB · Thai Baht'};
const LOCALES={'en-IN':'India · English (IN)','hi-IN':'India · हिन्दी','en-US':'United States · English','en-GB':'United Kingdom · English','en-CA':'Canada · English','en-AU':'Australia · English','de-DE':'Germany · Deutsch','fr-FR':'France · Français','es-ES':'Spain · Español','pt-BR':'Brazil · Português','ar-AE':'UAE · العربية','ar-SA':'Saudi Arabia · العربية','ja-JP':'Japan · 日本語','id-ID':'Indonesia · Bahasa','bn-BD':'Bangladesh · বাংলা','ta-IN':'India · தமிழ்','zh-CN':'China · 中文','en-ZA':'South Africa · English'};
const read=(key,fallback,allowed)=>{try{const value=localStorage.getItem(key);return allowed(value)?value:fallback;}catch(_){return fallback;}};
let currency=read(CURRENCY_KEY,'INR',v=>Object.hasOwn(CURRENCIES,v));
let formatLocale=read(LOCALE_KEY,'en-IN',v=>Object.hasOwn(LOCALES,v));
const formatNumber=(value,options={})=>new Intl.NumberFormat(formatLocale,options).format(Number(value));
const formatCurrency=(value,code=currency,options={})=>{const selected=Object.hasOwn(CURRENCIES,code)?code:'INR';return new Intl.NumberFormat(formatLocale,{style:'currency',currency:selected,maximumFractionDigits:2,...options}).format(Number(value));};
const formatDate=(value,options={})=>new Intl.DateTimeFormat(formatLocale,{year:'numeric',month:'short',day:'numeric',...options}).format(value instanceof Date?value:new Date(value));
const emit=()=>window.dispatchEvent(new CustomEvent('fc:localechange',{detail:{currency,locale:formatLocale}}));
const api=Object.freeze({currencies:Object.freeze(Object.keys(CURRENCIES)),locales:Object.freeze(Object.keys(LOCALES)),getCurrency:()=>currency,getLocale:()=>formatLocale,formatNumber,formatCurrency,formatDate,
setCurrency(value){if(!Object.hasOwn(CURRENCIES,value))return false;currency=value;try{localStorage.setItem(CURRENCY_KEY,value);}catch(_){}document.documentElement.dataset.fcCurrency=value;emit();return true;},
setLocale(value){if(!Object.hasOwn(LOCALES,value))return false;formatLocale=value;try{localStorage.setItem(LOCALE_KEY,value);}catch(_){}document.documentElement.dataset.fcLocale=value;emit();return true;}
});
window.FCLocale=api;
const currencySelect=document.getElementById('fc-currency-select'),localeSelect=document.getElementById('fc-locale-select');
if(currencySelect){currencySelect.value=currency;currencySelect.addEventListener('change',()=>api.setCurrency(currencySelect.value));}
if(localeSelect){localeSelect.value=formatLocale;localeSelect.addEventListener('change',()=>api.setLocale(localeSelect.value));}
document.documentElement.dataset.fcCurrency=currency;document.documentElement.dataset.fcLocale=formatLocale;window.dispatchEvent(new CustomEvent('fc:locale-ready',{detail:{currency,locale:formatLocale}}));
window.addEventListener('storage',event=>{if(event.key===CURRENCY_KEY&&Object.hasOwn(CURRENCIES,event.newValue)){currency=event.newValue;if(currencySelect)currencySelect.value=currency;document.documentElement.dataset.fcCurrency=currency;emit();}if(event.key===LOCALE_KEY&&Object.hasOwn(LOCALES,event.newValue)){formatLocale=event.newValue;if(localeSelect)localeSelect.value=formatLocale;document.documentElement.dataset.fcLocale=formatLocale;emit();}});
})();