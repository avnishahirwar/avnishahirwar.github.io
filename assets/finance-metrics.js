(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.FriendlyFinanceMetrics=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
function finite(v){return Number.isFinite(Number(v));}
function positive(v,label){if(!finite(v)||Number(v)<=0)throw new Error(label+' must be greater than zero.');}
function nonNegative(v,label){if(!finite(v)||Number(v)<0)throw new Error(label+' cannot be negative.');}
const calculations={
eps:v=>{positive(v.weightedAverageShares,'Weighted-average shares');if(!finite(v.netIncome)||!finite(v.preferredDividends))throw new Error('Enter valid income and dividend values.');return (Number(v.netIncome)-Number(v.preferredDividends))/Number(v.weightedAverageShares);},
pe:v=>{nonNegative(v.sharePrice,'Share price');positive(v.eps,'Earnings per share');return Number(v.sharePrice)/Number(v.eps);},
marketcap:v=>{nonNegative(v.sharePrice,'Share price');nonNegative(v.shares,'Shares outstanding');return Number(v.sharePrice)*Number(v.shares);},
ev:v=>{for(const k of ['marketCap','debt','preferred','minority','cash'])nonNegative(v[k],k);return Number(v.marketCap)+Number(v.debt)+Number(v.preferred)+Number(v.minority)-Number(v.cash);},
roe:v=>{if(!finite(v.netIncome))throw new Error('Enter valid net income.');positive(v.averageEquity,'Average shareholders’ equity');return Number(v.netIncome)/Number(v.averageEquity)*100;}
};
const meta={
eps:{label:'Basic earnings per share (EPS)',unit:'₹ per share',currency:true},
pe:{label:'Price-to-earnings (P/E) ratio',unit:'times'},
marketcap:{label:'Market capitalization',unit:'₹',currency:true},
ev:{label:'Enterprise value',unit:'₹',currency:true},
roe:{label:'Return on equity (ROE)',unit:'%'}
};
function calculate(key,values){if(!calculations[key])throw new Error('Unknown finance calculator.');const value=calculations[key](values);if(!Number.isFinite(value))throw new Error('The result is outside the supported numeric range.');return value;}
function format(key,value){const m=meta[key];if(m.currency)return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(value)+(key==='eps'?' per share':'');if(m.unit==='%')return new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(value)+'%';return new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(value)+' '+m.unit;}
function mount(){const form=document.querySelector('[data-finance-metric]');if(!form)return;const key=form.dataset.financeMetric,result=document.getElementById('financeResult');form.addEventListener('submit',event=>{event.preventDefault();const values={};for(const [name,value] of new FormData(form).entries())values[name]=Number(value);try{const value=calculate(key,values);result.replaceChildren();const h=document.createElement('h3');h.textContent='Calculated result';const p=document.createElement('p');p.textContent=meta[key].label+': ';const strong=document.createElement('strong');strong.textContent=format(key,value);p.append(strong);result.append(h,p);result.hidden=false;}catch(error){result.textContent=error.message;result.hidden=false;}});}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();}
return {calculate,format,meta};});
