(function(){
  'use strict';
  const assetKeys=['cash','investments','property','vehicles','otherAssets'];
  const liabilityKeys=['homeLoan','vehicleLoan','personalLoan','creditCard','otherLiabilities'];

  function calculateNetWorth(values){
    values=values||{};
    const read=(key)=>{
      const raw=values[key]===undefined||values[key]===null||values[key]===''?0:Number(values[key]);
      if(!Number.isFinite(raw)||raw<0) throw new RangeError('Enter a valid non-negative amount for '+key+'.');
      return raw;
    };
    const totalAssets=assetKeys.reduce((sum,key)=>sum+read(key),0);
    const totalLiabilities=liabilityKeys.reduce((sum,key)=>sum+read(key),0);
    return {
      totalAssets,
      totalLiabilities,
      netWorth:totalAssets-totalLiabilities,
      liabilityToAssetPercent:totalAssets>0?(totalLiabilities/totalAssets)*100:null
    };
  }

  function formatCurrency(amount,currency){
    const code=currency||'INR';
    try{return new Intl.NumberFormat('en-IN',{style:'currency',currency:code,maximumFractionDigits:2}).format(amount);}
    catch(_){return new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(amount)+' '+code;}
  }

  const api={calculateNetWorth,formatCurrency};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(typeof window!=='undefined') window.FriendlyNetWorthCalculator=api;

  if(typeof document==='undefined') return;
  const form=document.getElementById('net-worth-form');
  if(!form) return;
  const currencySelect=document.getElementById('nw-currency');
  const error=document.getElementById('nw-error');
  const netWorth=document.getElementById('nw-net-worth');
  const totalAssets=document.getElementById('nw-total-assets');
  const totalLiabilities=document.getElementById('nw-total-liabilities');
  const debtRatio=document.getElementById('nw-debt-ratio');

  function valuesFromForm(){
    const values={};
    [...form.elements].forEach((field)=>{if(field.name&&field.name!=='currency') values[field.name]=field.value;});
    return values;
  }
  function render(){
    try{
      const result=calculateNetWorth(valuesFromForm());
      const currency=currencySelect.value||'INR';
      netWorth.textContent=formatCurrency(result.netWorth,currency);
      totalAssets.textContent=formatCurrency(result.totalAssets,currency);
      totalLiabilities.textContent=formatCurrency(result.totalLiabilities,currency);
      debtRatio.textContent=result.liabilityToAssetPercent===null?'—':result.liabilityToAssetPercent.toFixed(1)+'%';
      netWorth.classList.toggle('negative',result.netWorth<0);
      error.hidden=true;
    }catch(_){
      error.hidden=false;
      netWorth.textContent='—';
      totalAssets.textContent='—';
      totalLiabilities.textContent='—';
      debtRatio.textContent='—';
    }
  }
  form.addEventListener('input',render);
  form.addEventListener('change',render);
  form.addEventListener('submit',(event)=>{event.preventDefault();render();});
  form.addEventListener('reset',()=>{setTimeout(render,0);});
  render();
})();