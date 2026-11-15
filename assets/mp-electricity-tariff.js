(()=>{'use strict';
function calc(v){
 const units=Number(v.units),other=Number(v.other);
 if(!Number.isFinite(units)||units<0)throw Error('Enter non-negative monthly units.');
 if(!Number.isFinite(other)||other<0)throw Error('Enter non-negative other charges.');
 if(!['urban','rural'].includes(v.area))throw Error('Choose urban or rural area.');
 let energy=0,fixed=0,note=[];
 if(v.category==='low'){
  const load=Number(v.lowLoadWatts);
  if(units>30||!Number.isFinite(load)||load<=0||load>100)throw Error('LV-1.1 applies only up to 30 units/month and sanctioned load up to 100 W.');
  energy=units*3.72;note.push('LV-1.1: ₹3.72/unit; no fixed charge.');
 }else if(v.category==='standard'){
  let rem=units;for(const s of [{cap:50,rate:4.71},{cap:100,rate:5.67},{cap:150,rate:7.05},{cap:Infinity,rate:7.24}]){const q=Math.min(rem,s.cap);if(q>0){energy+=q*s.rate;rem-=q;}}
  if(units<=50)fixed=v.area==='urban'?81:67;
  else if(units<=150)fixed=v.area==='urban'?134:111;
  else{const blocks=Number(v.loadBlocks);if(!Number.isInteger(blocks)||blocks<1||blocks>10000)throw Error('Above 150 units, enter sanctioned load in 0.1 kW blocks from your bill.');fixed=blocks*(v.area==='urban'?30:28);note.push('Fixed charge uses '+blocks+' sanctioned-load blocks of 0.1 kW, not monthly units.');}
 }else throw Error('Choose a supported tariff category.');
 note.push('Excludes FPPAS/fuel adjustment, electricity duty, taxes, arrears, rebates and subsidy. Estimate only.');
 return {energy,fixed,other,total:energy+fixed+other,notes:note};
}
if(typeof window!=='undefined')window.FCMpDomesticTariff={calculate:calc};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>{
 const $=id=>document.getElementById(id);if(!$('mpCalculate'))return;
 const money=n=>new Intl.NumberFormat(document.documentElement.lang==='hi'?'hi-IN':'en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n);
 const run=()=>{try{const x=calc({units:$('mpUnits').value,other:$('mpOther').value,area:$('mpArea').value,category:$('mpCategory').value,lowLoadWatts:$('mpLoad').value,loadBlocks:$('mpLoadBlocks')?.value});$('mpError').textContent='';$('mpEnergy').textContent=money(x.energy);$('mpFixed').textContent=money(x.fixed);$('mpAdjust').textContent=money(x.other);$('mpTotal').textContent=money(x.total);$('mpBreakdown').textContent=x.notes.join(' ');if(typeof gtag==='function')gtag('event','calculator_used',{calculator_page:location.pathname,calculator_action:'mp_tariff_estimate'});}catch(e){$('mpError').textContent=e.message;['mpEnergy','mpFixed','mpAdjust','mpTotal'].forEach(k=>$(k).textContent='—');$('mpBreakdown').textContent='';}};
 const toggle=()=>{const low=$('mpCategory').value==='low';$('mpLowLoadField').hidden=!low;$('mpLoadBlocksField').hidden=low;run();};
 $('mpCalculate').addEventListener('click',run);$('mpReset').addEventListener('click',()=>{$('mpCategory').value='standard';$('mpArea').value='urban';$('mpLoad').value='100';$('mpLoadBlocks').value='11';$('mpUnits').value='155';$('mpOther').value='0';toggle();});$('mpCategory').addEventListener('change',toggle);['mpArea','mpLoad','mpLoadBlocks','mpUnits','mpOther'].forEach(k=>$(k)?.addEventListener('input',run));toggle();
});
})();