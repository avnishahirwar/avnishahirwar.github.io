(function(root){'use strict';
const BRACKETS=[
 {limit:2428.80,rate:0,deduction:0},
 {limit:2826.65,rate:0.075,deduction:182.16},
 {limit:3751.05,rate:0.15,deduction:394.16},
 {limit:4664.68,rate:0.225,deduction:675.49},
 {limit:Infinity,rate:0.275,deduction:908.73}
];
const SIMPLIFIED_MONTHLY_DEDUCTION=607.20;
function calculate(input){
 const income=Number(input?.monthlyTaxableIncome),actualDeductions=Number(input?.monthlyDeductions??0);
 if(!Number.isFinite(income)||income<0||income>1e10||!Number.isFinite(actualDeductions)||actualDeductions<0||actualDeductions>1e10)throw new RangeError('Informe valores mensais válidos.');
 const deductionUsed=Math.min(income,Math.max(actualDeductions,SIMPLIFIED_MONTHLY_DEDUCTION));
 const taxBase=Math.max(0,income-deductionUsed);
 const bracket=BRACKETS.find(item=>taxBase<=item.limit)||BRACKETS[BRACKETS.length-1];
 const taxBeforeRelief=Math.max(0,taxBase*bracket.rate-bracket.deduction);
 let relief=0;
 if(income<=5000)relief=Math.min(taxBeforeRelief,312.89);
 else if(income<=7350)relief=Math.min(taxBeforeRelief,Math.max(0,978.62-(0.133145*income)));
 const tax=Math.round(Math.max(0,taxBeforeRelief-relief)*100)/100;
 return Object.freeze({income,deductionUsed,taxBase,taxBeforeRelief,relief,tax,effectiveRate:income>0?tax/income*100:0});
}
root.FCBrazilIRPF2026=Object.freeze({calculate,monthlyBrackets:BRACKETS,simplifiedMonthlyDeduction:SIMPLIFIED_MONTHLY_DEDUCTION});
})(typeof window!=='undefined'?window:globalThis);
