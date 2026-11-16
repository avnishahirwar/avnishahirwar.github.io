(function(root){'use strict';
function nonNegative(value,name){const n=Number(value);if(!Number.isFinite(n)||n<0)throw new RangeError(name+' must be a finite non-negative number');return n;}
function mortgagePayment(principal,annualRate,years){
 const p=nonNegative(principal,'Loan principal'),rate=nonNegative(annualRate,'Annual interest rate'),term=nonNegative(years,'Loan term');
 if(p===0||term===0||!Number.isInteger(term)||term>50)throw new RangeError('Enter a positive loan amount and a whole loan term from 1 to 50 years');
 if(rate>100)throw new RangeError('Annual interest rate must not exceed 100%');
 const months=term*12,monthlyRate=rate/1200;
 const payment=monthlyRate===0?p/months:p*monthlyRate/(1-Math.pow(1+monthlyRate,-months));
 return {principal:p,annualRate:rate,years:term,months,monthlyPrincipalAndInterest:payment,totalPayments:payment*months,totalInterest:payment*months-p};
}
function calculateUSMortgage({homePrice,downPayment,annualInterestRate,termYears,annualPropertyTaxRate=0,annualHomeInsurance=0,monthlyHOA=0}){
 const price=nonNegative(homePrice,'Home price'),down=nonNegative(downPayment,'Down payment');
 if(price<=0||down>=price)throw new RangeError('Down payment must be less than the positive home price');
 const taxRate=nonNegative(annualPropertyTaxRate,'Annual property-tax rate');
 if(taxRate>20)throw new RangeError('Annual property-tax rate must not exceed 20%');
 const insurance=nonNegative(annualHomeInsurance,'Annual home insurance'),hoa=nonNegative(monthlyHOA,'Monthly HOA');
 const core=mortgagePayment(price-down,annualInterestRate,termYears);
 const monthlyPropertyTax=price*taxRate/1200,monthlyInsurance=insurance/12;
 return {...core,homePrice:price,downPayment:down,loanToValue:(price-down)/price*100,monthlyPropertyTax,monthlyHomeInsurance:monthlyInsurance,monthlyHOA:hoa,estimatedMonthlyHousingCost:core.monthlyPrincipalAndInterest+monthlyPropertyTax+monthlyInsurance+hoa,scope:'Principal and interest plus user-entered property tax, homeowners insurance and HOA. Excludes PMI, utilities, closing costs and lender-specific fees.'};
}
function calculateUKMortgage({propertyPrice,deposit,annualInterestRate,termYears}){
 const price=nonNegative(propertyPrice,'Property price'),down=nonNegative(deposit,'Deposit');
 if(price<=0||down>=price)throw new RangeError('Deposit must be less than the positive property price');
 const core=mortgagePayment(price-down,annualInterestRate,termYears);
 return {...core,propertyPrice:price,deposit:down,loanToValue:(price-down)/price*100,scope:'Repayment mortgage estimate using monthly compounding. Excludes fees, product charges, insurance, council tax, maintenance and any lender-specific affordability assessment.'};
}
const api={mortgagePayment,calculateUSMortgage,calculateUKMortgage};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.FCMortgageCalculators=Object.freeze(api);
if(typeof document!=='undefined'){
 const $=id=>document.getElementById(id);
 const money=(n,locale,currency)=>new Intl.NumberFormat(locale,{style:'currency',currency,maximumFractionDigits:2}).format(n);
 const bind=(formId,run,errorId,resultId)=>{const form=$(formId);if(!form)return;form.addEventListener('submit',event=>{event.preventDefault();try{const result=run();$(errorId).textContent='';$(resultId).replaceChildren();const title=document.createElement('strong');title.textContent='Estimated monthly payment: '+money(result.monthlyPrincipalAndInterest,formId==='us-mortgage-form'?'en-US':'en-GB',formId==='us-mortgage-form'?'USD':'GBP');const list=document.createElement('ul');const currency=formId==='us-mortgage-form'?'USD':'GBP';const locale=formId==='us-mortgage-form'?'en-US':'en-GB';const rows=[['Loan amount',result.principal],['Monthly principal and interest',result.monthlyPrincipalAndInterest],['Total interest over the term',result.totalInterest],['Total of scheduled payments',result.totalPayments],['Loan-to-value',result.loanToValue]];if(formId==='us-mortgage-form')rows.push(['Monthly property tax',result.monthlyPropertyTax],['Monthly home insurance',result.monthlyHomeInsurance],['Monthly HOA',result.monthlyHOA],['Estimated monthly housing cost',result.estimatedMonthlyHousingCost]);for(const [label,value] of rows){const li=document.createElement('li');li.textContent=label+': '+(label==='Loan-to-value'?new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(value)+'%':money(value,locale,currency));list.appendChild(li);}$(resultId).append(title,list);}catch(error){$(errorId).textContent=error.message;$(resultId).textContent='Please check the entered values.';}});};
 bind('us-mortgage-form',()=>api.calculateUSMortgage({homePrice:$('us-price').value,downPayment:$('us-down').value,annualInterestRate:$('us-rate').value,termYears:$('us-term').value,annualPropertyTaxRate:$('us-tax-rate').value,annualHomeInsurance:$('us-insurance').value,monthlyHOA:$('us-hoa').value}),'us-mortgage-error','us-mortgage-result');
 bind('uk-mortgage-form',()=>api.calculateUKMortgage({propertyPrice:$('uk-price').value,deposit:$('uk-deposit').value,annualInterestRate:$('uk-rate').value,termYears:$('uk-term').value}),'uk-mortgage-error','uk-mortgage-result');
}
})(typeof window!=='undefined'?window:globalThis);
