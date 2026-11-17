(function(root){'use strict';
const THRESHOLDS=Object.freeze({general:375000,womenSenior:425000,disabilityThirdGender:500000,freedomFighter:525000});
const SLABS=Object.freeze([{width:300000,rate:0.10},{width:400000,rate:0.15},{width:500000,rate:0.20},{width:2000000,rate:0.25},{width:Infinity,rate:0.30}]);
function calculate(input){
 const income=Number(input?.annualTaxableIncome),category=String(input?.category||'general'),dependents=Number(input?.disabledDependents??0);
 if(!Number.isFinite(income)||income<0||income>1e12||!Object.hasOwn(THRESHOLDS,category)||!Number.isInteger(dependents)||dependents<0||dependents>20)throw new RangeError('সঠিক বার্ষিক আয়, করদাতার শ্রেণি এবং নির্ভরশীলের সংখ্যা লিখুন।');
 const threshold=THRESHOLDS[category]+dependents*50000;
 let remaining=Math.max(0,income-threshold),tax=0;
 const breakdown=[];
 for(const slab of SLABS){if(remaining<=0)break;const amount=Math.min(remaining,slab.width),due=amount*slab.rate;tax+=due;breakdown.push(Object.freeze({amount,rate:slab.rate,tax:due}));remaining-=amount;}
 return Object.freeze({income,category,threshold,taxableAboveThreshold:Math.max(0,income-threshold),basicTax:tax,breakdown:Object.freeze(breakdown)});
}
root.FCBangladeshIncomeTax2026=Object.freeze({calculate,thresholds:THRESHOLDS,slabs:SLABS});
})(typeof window!=='undefined'?window:globalThis);
