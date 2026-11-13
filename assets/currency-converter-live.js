(()=>{'use strict';
const $=id=>document.getElementById(id);
const amount=$('amount'),rateInput=$('rate'),from=$('fromCurrency'),to=$('toCurrency'),status=$('rateStatus'),error=$('error'),result=$('converted');
if(!amount||!rateInput||!from||!to||!status||!error||!result)return;
const fmtNumber=new Intl.NumberFormat('en-IN',{maximumFractionDigits:6});
let rateDate='',requestId=0;
function showStatus(message){status.textContent=message;}
function setRate(value){rateInput.value=String(value);rateInput.readOnly=true;}
async function loadRate(){
 const id=++requestId,base=from.value,quote=to.value;
 error.textContent='';
 if(base===quote){rateDate='';setRate(1);showStatus('No conversion needed: both currency selections are '+base+'.');calculate();return;}
 rateInput.placeholder='Loading reference rate…';showStatus('Fetching the latest available reference rate…');
 try{
  const response=await fetch('https://api.frankfurter.dev/v2/rate/'+encodeURIComponent(base)+'/'+encodeURIComponent(quote),{headers:{Accept:'application/json'},cache:'no-cache'});
  if(!response.ok)throw new Error('Rate service returned '+response.status);
  const data=await response.json();
  if(id!==requestId)return;
  if(!Number.isFinite(Number(data.rate))||Number(data.rate)<=0||!data.date)throw new Error('Rate response was incomplete');
  rateDate=data.date;setRate(data.rate);
  showStatus('Reference rate date: '+rateDate+' · Source: Frankfurter · Reference rates are not live trading quotes.');
  calculate();
 }catch(e){
  if(id!==requestId)return;
  rateInput.readOnly=false;rateInput.value='';rateInput.placeholder='Enter rate manually';
  rateDate='';showStatus('Automatic rates are temporarily unavailable. Enter a rate manually, then calculate.');error.textContent='';
 }
}
function calculate(){
 error.textContent='';
 const value=Number(amount.value),rate=Number(rateInput.value);
 if(!Number.isFinite(value)||value<0||!Number.isFinite(rate)||rate<=0){result.textContent='—';if(rateInput.value)error.textContent='Enter a non-negative amount and a positive exchange rate.';return;}
 const converted=value*rate;
 if(!Number.isFinite(converted)){result.textContent='—';error.textContent='The result is outside the supported number range.';return;}
 try{result.textContent=new Intl.NumberFormat(undefined,{style:'currency',currency:to.value,maximumFractionDigits:2}).format(converted);}
 catch(_){result.textContent=fmtNumber.format(converted)+' '+to.value;}
 if(typeof gtag==='function')gtag('event','calculator_used',{calculator_page:location.pathname,calculator_action:'calculate'});
}
$('calculate').addEventListener('click',calculate);
$('refreshRate').addEventListener('click',loadRate);
from.addEventListener('change',loadRate);to.addEventListener('change',loadRate);
$('reset').addEventListener('click',()=>{amount.value='100';loadRate();});
amount.addEventListener('input',calculate);
rateInput.addEventListener('input',()=>{if(!rateInput.readOnly)calculate();});
loadRate();
})();
