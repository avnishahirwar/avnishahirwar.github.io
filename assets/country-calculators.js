(function(root){'use strict';
function validNonNegative(value,name){const n=Number(value);if(!Number.isFinite(n)||n<0)throw new RangeError(name+' must be a non-negative number');return n;}
function calculateGSTHST(amount,gstHstRate,provincialRate=0,mode='add'){
 const value=validNonNegative(amount,'Amount'),base=validNonNegative(gstHstRate,'GST/HST rate'),extra=validNonNegative(provincialRate,'Provincial rate');
 if(base>100||extra>100)throw new RangeError('Tax rates must not exceed 100%');
 const rate=(base+extra)/100;
 if(mode==='remove'){const net=value/(1+rate);return {net,tax:value-net,gross:value,totalRate:(base+extra)};}
 if(mode!=='add')throw new RangeError('Unsupported tax mode');
 const tax=value*rate;return {net:value,tax,gross:value+tax,totalRate:base+extra};
}
function calculateSDLT(price,{additionalProperty=false,nonResident=false,firstTimeBuyer=false}={}){
 const value=validNonNegative(price,'Property price');
 const firstTimeApplied=Boolean(firstTimeBuyer&&!additionalProperty&&value<=500000);
 const surcharge=(additionalProperty?5:0)+(nonResident?2:0);
 const bands=firstTimeApplied?[[300000,0],[500000,5],[Infinity,0]]:[[125000,0],[250000,2],[925000,5],[1500000,10],[Infinity,12]];
 let previous=0,tax=0;const breakdown=[];
 for(const [limit,baseRate] of bands){if(value<=previous)break;const portion=Math.max(0,Math.min(value,limit)-previous);const rate=baseRate+surcharge;const due=portion*rate/100;tax+=due;if(portion>0)breakdown.push({from:previous,to:Math.min(value,limit),rate,amount:due});previous=limit;}
 return {tax,breakdown,firstTimeReliefApplied:firstTimeApplied,surcharge};
}
function project401k({currentBalance=0,annualSalary,employeeContributionPercent,employerMatchPercent,employerMatchCapPercent,annualReturnPercent,years,salaryGrowthPercent=0}){
 let balance=validNonNegative(currentBalance,'Current balance'),salary=validNonNegative(annualSalary,'Annual salary');
 const employeePct=validNonNegative(employeeContributionPercent,'Employee contribution'),matchPct=validNonNegative(employerMatchPercent,'Employer match'),capPct=validNonNegative(employerMatchCapPercent,'Employer match cap'),term=validNonNegative(years,'Years');
 const returnPct=Number(annualReturnPercent),growthPct=Number(salaryGrowthPercent);
 if(!Number.isFinite(returnPct)||returnPct < -100||returnPct>100)throw new RangeError('Annual return must be between -100% and 100%');
 if(!Number.isFinite(growthPct)||growthPct < -100||growthPct>100)throw new RangeError('Salary growth must be between -100% and 100%');
 if([employeePct,matchPct,capPct].some(x=>x>100)||term>80||!Number.isInteger(term)||term<1)throw new RangeError('Check contribution and match percentages, and enter a whole number of years from 1 to 80');
 let employeeTotal=0,employerTotal=0;
 for(let year=0;year<term;year++){
  const employee=salary*employeePct/100;
  const match=Math.min(employee,salary*capPct/100)*matchPct/100;
  balance=balance*(1+returnPct/100)+employee+match;
  employeeTotal+=employee;employerTotal+=match;salary*=1+growthPct/100;
 }
 return {endingBalance:balance,employeeContributions:employeeTotal,employerContributions:employerTotal,totalContributions:employeeTotal+employerTotal};
}
const api={calculateGSTHST,calculateSDLT,project401k};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FCCountryCalculators=api;
})(typeof window!=='undefined'?window:globalThis);
