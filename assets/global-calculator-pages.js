(()=>{'use strict';
const $=id=>document.getElementById(id);
const text={
 ja:{invalid:'入力値を確認してください。',monthly:'毎月の合計住宅費',principal:'借入元本',payment:'毎月の元利返済額',interest:'返済期間中の利息合計',tax:'月間固定資産税',insurance:'月間保険料',maintenance:'月間管理費',net:'税抜価格',vat:'VAT 額',gross:'税込価格'},
 ru:{invalid:'Проверьте введённые значения.',monthly:'Общие расходы на жильё в месяц',principal:'Сумма кредита',payment:'Ежемесячный платёж по кредиту',interest:'Проценты за весь срок',tax:'Налог в месяц',insurance:'Страхование в месяц',maintenance:'Обслуживание в месяц',net:'Цена без НДС',vat:'Сумма НДС',gross:'Цена с НДС'}
};
const lang=document.documentElement.lang==='ja'?'ja':'ru',t=text[lang];
const money=value=>window.FCLocale?.formatCurrency?window.FCLocale.formatCurrency(value,window.FCLocale.getCurrency(),{minimumFractionDigits:2,maximumFractionDigits:2}):new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(value);
const number=value=>window.FCLocale?.formatNumber?window.FCLocale.formatNumber(value,{maximumFractionDigits:2}):Number(value).toLocaleString('en-IN',{maximumFractionDigits:2});
const row=(list,label,value)=>{const li=document.createElement('li');li.textContent=label+': '+money(value);list.appendChild(li);};
const mortgage=$('fc-mortgage-form');
let lastMortgage=null,lastVat=null,refreshing=false;
if(mortgage){
 mortgage.addEventListener('submit',event=>{event.preventDefault();const v=id=>Number($(id).value);const price=v('fc-price'),down=v('fc-down'),annual=v('fc-rate'),years=v('fc-years'),tax=v('fc-tax'),insurance=v('fc-insurance'),maintenance=v('fc-maintenance');
 if(![price,down,annual,years,tax,insurance,maintenance].every(Number.isFinite)||price<=0||down<0||down>=price||annual<0||annual>100||years<=0||years>50||tax<0||insurance<0||maintenance<0){$('fc-mortgage-result').textContent=t.invalid;return;}
 const principal=price-down,n=Math.round(years*12),r=annual/1200;const payment=r===0?principal/n:principal*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);const interest=payment*n-principal;lastMortgage={principal,payment,interest,tax:tax/12,insurance:insurance/12,maintenance,total:payment+tax/12+insurance/12+maintenance};renderMortgage();if(!refreshing&&typeof window.gtag==='function')window.gtag('event','calculator_used',{calculator_page:location.pathname,calculator_action:'calculate'});
 });
 function renderMortgage(){if(!lastMortgage)return;const x=lastMortgage,out=$('fc-mortgage-result');out.replaceChildren();const strong=document.createElement('strong');strong.textContent=t.monthly+': '+money(x.total);const ul=document.createElement('ul');row(ul,t.principal,x.principal);row(ul,t.payment,x.payment);row(ul,t.interest,x.interest);row(ul,t.tax,x.tax);row(ul,t.insurance,x.insurance);row(ul,t.maintenance,x.maintenance);out.append(strong,ul);}
}
const vat=$('fc-vat-form');
if(vat){
 vat.addEventListener('submit',event=>{event.preventDefault();const amount=Number($('fc-vat-amount').value),rate=Number($('fc-vat-rate').value);if(!Number.isFinite(amount)||amount<0||!Number.isFinite(rate)||rate<0||rate>100||!$('fc-vat-amount').value.trim()||!$('fc-vat-rate').value.trim()){$('fc-vat-result').textContent=t.invalid;return;}
 const f=rate/100,net=$('fc-vat-mode').value==='add'?amount:amount/(1+f),vatAmount=$('fc-vat-mode').value==='add'?amount*f:amount-net,gross=$('fc-vat-mode').value==='add'?amount+vatAmount:amount;lastVat={net,vatAmount,gross};renderVat();if(!refreshing&&typeof window.gtag==='function')window.gtag('event','calculator_used',{calculator_page:location.pathname,calculator_action:'calculate'});
 });
 function renderVat(){if(!lastVat)return;const x=lastVat,out=$('fc-vat-result');out.replaceChildren();const strong=document.createElement('strong');strong.textContent=t.gross+': '+money(x.gross);const ul=document.createElement('ul');row(ul,t.net,x.net);row(ul,t.vat,x.vatAmount);row(ul,t.gross,x.gross);out.append(strong,ul);}
}
const refresh=()=>{refreshing=true;try{renderMortgage();renderVat();}finally{refreshing=false;}};
window.addEventListener('fc:localechange',refresh);window.addEventListener('fc:locale-ready',refresh);
})();