(()=>{'use strict';
const $=id=>document.getElementById(id);
const amount=$('amount'),rateInput=$('rate'),error=$('error'),result=$('converted');
if(!amount||!rateInput||!error||!result)return;
const lang=(document.documentElement.lang||'en').split('-')[0];
const copy={
 en:{from:'From currency',to:'To currency',rate:'Reference rate (target units per source unit)',refresh:'Refresh reference rate',loading:'Fetching the latest available reference rate…',source:'Reference rate date: ',suffix:' · Source: Frankfurter · Reference rates are not live trading quotes.',same:'No conversion needed: both currency selections are ',manual:'Automatic rates are temporarily unavailable. Enter a rate manually, then calculate.',invalid:'Enter a non-negative amount and a positive exchange rate.',range:'The result is outside the supported number range.'},
 hi:{from:'मूल मुद्रा',to:'लक्ष्य मुद्रा',rate:'संदर्भ विनिमय दर (प्रति मूल इकाई लक्ष्य इकाइयाँ)',refresh:'विनिमय दर फिर से प्राप्त करें',loading:'नवीनतम उपलब्ध संदर्भ दर प्राप्त की जा रही है…',source:'संदर्भ दर की तारीख: ',suffix:' · स्रोत: Frankfurter · ये ट्रेडिंग की लाइव दरें नहीं हैं।',same:'दोनों मुद्राएँ समान हैं: ',manual:'स्वचालित दर उपलब्ध नहीं है। दर मैन्युअल दर्ज करके गणना करें।',invalid:'शून्य या अधिक राशि और शून्य से अधिक विनिमय दर दर्ज करें।',range:'परिणाम समर्थित संख्या सीमा से बाहर है।'},
 es:{from:'Moneda de origen',to:'Moneda de destino',rate:'Tipo de referencia (unidades destino por unidad origen)',refresh:'Actualizar tipo de cambio',loading:'Obteniendo el último tipo de referencia disponible…',source:'Fecha del tipo de referencia: ',suffix:' · Fuente: Frankfurter · No es una cotización de negociación en directo.',same:'No hace falta convertir: ambas monedas son ',manual:'El tipo automático no está disponible. Introduce un tipo manual y calcula.',invalid:'Introduce un importe no negativo y un tipo de cambio positivo.',range:'El resultado está fuera del rango numérico admitido.'},
 fr:{from:'Devise source',to:'Devise cible',rate:'Taux de référence (unités cibles par unité source)',refresh:'Actualiser le taux',loading:'Récupération du dernier taux de référence disponible…',source:'Date du taux de référence : ',suffix:' · Source : Frankfurter · Il ne s’agit pas d’un cours de négociation en direct.',same:'Aucune conversion nécessaire : les deux devises sont ',manual:'Le taux automatique est indisponible. Saisissez un taux manuel puis calculez.',invalid:'Saisissez un montant non négatif et un taux positif.',range:'Le résultat dépasse la plage numérique prise en charge.'},
 pt:{from:'Moeda de origem',to:'Moeda de destino',rate:'Taxa de referência (unidades de destino por unidade de origem)',refresh:'Atualizar taxa',loading:'Buscando a taxa de referência mais recente…',source:'Data da taxa de referência: ',suffix:' · Fonte: Frankfurter · Não é uma cotação de negociação em tempo real.',same:'Não é necessária conversão: as duas moedas são ',manual:'A taxa automática está indisponível. Informe uma taxa manual e calcule.',invalid:'Informe um valor não negativo e uma taxa positiva.',range:'O resultado está fora do intervalo numérico suportado.'},
 ar:{from:'عملة المصدر',to:'العملة المستهدفة',rate:'سعر مرجعي (وحدات مستهدفة لكل وحدة مصدر)',refresh:'تحديث سعر الصرف',loading:'جارٍ جلب أحدث سعر مرجعي متاح…',source:'تاريخ السعر المرجعي: ',suffix:' · المصدر: Frankfurter · هذه ليست أسعار تداول مباشرة.',same:'لا حاجة للتحويل؛ العملتان هما ',manual:'الأسعار التلقائية غير متاحة مؤقتًا. أدخل السعر يدويًا ثم احسب.',invalid:'أدخل مبلغًا غير سالب وسعر صرف موجبًا.',range:'النتيجة خارج نطاق الأرقام المدعوم.'},
 id:{from:'Mata uang asal',to:'Mata uang tujuan',rate:'Kurs referensi (unit tujuan per unit asal)',refresh:'Perbarui kurs',loading:'Mengambil kurs referensi terbaru yang tersedia…',source:'Tanggal kurs referensi: ',suffix:' · Sumber: Frankfurter · Bukan kuotasi perdagangan langsung.',same:'Tidak perlu konversi: kedua mata uang adalah ',manual:'Kurs otomatis sementara tidak tersedia. Masukkan kurs manual lalu hitung.',invalid:'Masukkan jumlah non-negatif dan kurs positif.',range:'Hasil berada di luar rentang angka yang didukung.'},
 bn:{from:'উৎস মুদ্রা',to:'লক্ষ্য মুদ্রা',rate:'রেফারেন্স হার (প্রতি উৎস এককে লক্ষ্য একক)',refresh:'বিনিময় হার রিফ্রেশ করুন',loading:'সর্বশেষ উপলভ্য রেফারেন্স হার আনা হচ্ছে…',source:'রেফারেন্স হারের তারিখ: ',suffix:' · উৎস: Frankfurter · এটি লাইভ ট্রেডিং কোট নয়।',same:'রূপান্তরের প্রয়োজন নেই; উভয় মুদ্রা হলো ',manual:'স্বয়ংক্রিয় হার সাময়িকভাবে পাওয়া যাচ্ছে না। হাতে হার লিখে গণনা করুন।',invalid:'ঋণাত্মক নয় এমন পরিমাণ এবং ধনাত্মক বিনিময় হার লিখুন।',range:'ফলাফল সমর্থিত সংখ্যার সীমার বাইরে।'},
 ta:{from:'மூல நாணயம்',to:'இலக்கு நாணயம்',rate:'குறிப்பு மாற்று விகிதம் (ஒரு மூல அலகிற்கான இலக்கு அலகுகள்)',refresh:'மாற்று விகிதத்தைப் புதுப்பிக்கவும்',loading:'சமீபத்திய குறிப்பு விகிதம் பெறப்படுகிறது…',source:'குறிப்பு விகிதத் தேதி: ',suffix:' · மூலம்: Frankfurter · இது நேரடி வர்த்தக விலை அல்ல.',same:'மாற்றம் தேவையில்லை; இரு நாணயங்களும் ',manual:'தானியங்கி விகிதம் தற்காலிகமாக கிடைக்கவில்லை. கைமுறையாக உள்ளிட்டு கணக்கிடவும்.',invalid:'எதிர்மறையல்லாத தொகையையும் நேர்மறை மாற்று விகிதத்தையும் உள்ளிடவும்.',range:'முடிவு ஆதரிக்கப்படும் எண் வரம்பிற்கு வெளியே உள்ளது.'},
 de:{from:'Ausgangswährung',to:'Zielwährung',rate:'Referenzkurs (Zieleinheiten je Quelleinheit)',refresh:'Referenzkurs aktualisieren',loading:'Der aktuelle verfügbare Referenzkurs wird abgerufen…',source:'Datum des Referenzkurses: ',suffix:' · Quelle: Frankfurter · Kein Live-Handelskurs.',same:'Keine Umrechnung nötig; beide Währungen sind ',manual:'Automatische Kurse sind vorübergehend nicht verfügbar. Kurs manuell eingeben und berechnen.',invalid:'Bitte einen nicht negativen Betrag und einen positiven Wechselkurs eingeben.',range:'Das Ergebnis liegt außerhalb des unterstützten Zahlenbereichs.'}
};
const text=copy[lang]||copy.en;
const currencies=[['INR','INR · Indian Rupee'],['USD','USD · US Dollar'],['EUR','EUR · Euro'],['GBP','GBP · British Pound'],['AED','AED · UAE Dirham'],['CAD','CAD · Canadian Dollar'],['AUD','AUD · Australian Dollar'],['JPY','JPY · Japanese Yen'],['SGD','SGD · Singapore Dollar'],['CHF','CHF · Swiss Franc'],['CNY','CNY · Chinese Yuan'],['NZD','NZD · New Zealand Dollar'],['SAR','SAR · Saudi Riyal'],['BRL','BRL · Brazilian Real'],['MXN','MXN · Mexican Peso'],['ZAR','ZAR · South African Rand'],['BDT','BDT · Bangladeshi Taka'],['PKR','PKR · Pakistani Rupee'],['IDR','IDR · Indonesian Rupiah'],['THB','THB · Thai Baht']];
function makeSelect(id,label,selected){const wrap=document.createElement('label');wrap.className='field';const span=document.createElement('span');span.textContent=label;const select=document.createElement('select');select.id=id;select.setAttribute('aria-label',label);for(const [code,name] of currencies){const option=document.createElement('option');option.value=code;option.textContent=name;if(code===selected)option.selected=true;select.appendChild(option);}wrap.append(span,select);return {wrap,select};}
let from=$('fromCurrency'),to=$('toCurrency'),status=$('rateStatus'),refresh=$('refreshRate');
const rateField=rateInput.closest('.field')||rateInput.parentElement;
const fields=rateField?.parentElement;
if(!from&&!to&&fields){const a=makeSelect('fromCurrency',text.from,'INR'),b=makeSelect('toCurrency',text.to,'USD');fields.insertBefore(a.wrap,rateField);fields.insertBefore(b.wrap,rateField);from=a.select;to=b.select;}
if(!from||!to)return;
if(rateField){const label=rateField.querySelector('span,label');if(label)label.textContent=text.rate;}
if(!status){status=document.createElement('p');status.id='rateStatus';status.className='small';status.setAttribute('role','status');status.setAttribute('aria-live','polite');rateField?.insertAdjacentElement('afterend',status);}
const actions=$('calculate')?.parentElement;
if(!refresh&&actions){refresh=document.createElement('button');refresh.id='refreshRate';refresh.type='button';refresh.className='btn alt';refresh.textContent=text.refresh;actions.insertBefore(refresh,$('reset'));}
const locale=window.FCLocale?.getLocale?.()||document.documentElement.lang||'en-IN';
const fmtNumber=new Intl.NumberFormat(locale,{maximumFractionDigits:6});
let requestId=0;
function showStatus(message){status.textContent=message;}
function setRate(value){rateInput.value=String(value);rateInput.readOnly=true;}
function calculate(){
 error.textContent='';
 const value=Number(amount.value),rate=Number(rateInput.value);
 if(!Number.isFinite(value)||value<0||!Number.isFinite(rate)||rate<=0){result.textContent='—';if(rateInput.value)error.textContent=text.invalid;return;}
 const converted=value*rate;
 if(!Number.isFinite(converted)){result.textContent='—';error.textContent=text.range;return;}
 try{result.textContent=window.FCLocale?.formatCurrency?window.FCLocale.formatCurrency(converted,to.value,{maximumFractionDigits:2}):new Intl.NumberFormat(locale,{style:'currency',currency:to.value,maximumFractionDigits:2}).format(converted);}
 catch(_){result.textContent=fmtNumber.format(converted)+' '+to.value;}
 if(typeof gtag==='function')gtag('event','calculator_used',{calculator_page:location.pathname,calculator_action:'calculate'});
}
async function loadRate(){
 const id=++requestId,base=from.value,quote=to.value;
 error.textContent='';
 if(base===quote){setRate(1);showStatus(text.same+base+'.');calculate();return;}
 rateInput.value='';rateInput.readOnly=true;rateInput.placeholder=text.loading;showStatus(text.loading);
 try{
  const response=await fetch('https://api.frankfurter.dev/v2/rate/'+encodeURIComponent(base)+'/'+encodeURIComponent(quote),{headers:{Accept:'application/json'},cache:'no-cache'});
  if(!response.ok)throw new Error('Rate service returned '+response.status);
  const data=await response.json();
  if(id!==requestId)return;
  if(!Number.isFinite(Number(data.rate))||Number(data.rate)<=0||!data.date)throw new Error('Rate response was incomplete');
  setRate(data.rate);
  const date=window.FCLocale?.formatDate?window.FCLocale.formatDate(data.date):data.date;
  showStatus(text.source+date+text.suffix);
  calculate();
 }catch(_){
  if(id!==requestId)return;
  rateInput.readOnly=false;rateInput.value='';rateInput.placeholder=text.rate;
  showStatus(text.manual);error.textContent='';
 }
}
$('calculate').addEventListener('click',calculate);
refresh?.addEventListener('click',loadRate);
from.addEventListener('change',loadRate);to.addEventListener('change',loadRate);
$('reset')?.addEventListener('click',()=>{amount.value='100';loadRate();});
amount.addEventListener('input',calculate);
rateInput.addEventListener('input',()=>{if(!rateInput.readOnly)calculate();});
loadRate();
})();