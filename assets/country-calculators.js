(function(root){'use strict';
function cents(n){return Math.round((n+Number.EPSILON)*100)/100;}
function validNonNegative(value,name){const n=Number(value);if(!Number.isFinite(n)||n<0)throw new RangeError(name+' must be a non-negative number');return n;}
function calculateGSTHST(amount,gstHstRate,provincialRate=0,mode='add'){
 const value=validNonNegative(amount,'Amount'),base=validNonNegative(gstHstRate,'GST/HST rate'),extra=validNonNegative(provincialRate,'Provincial rate');
 if(base>100||extra>100)throw new RangeError('Tax rates must not exceed 100%');
 const rate=(base+extra)/100;
 if(mode==='remove'){const net=cents(value/(1+rate));return {net,tax:cents(value-net),gross:value,totalRate:(base+extra)};}
 if(mode!=='add')throw new RangeError('Unsupported tax mode');
 const tax=cents(value*rate);return {net:value,tax,gross:cents(value+tax),totalRate:base+extra};
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

function calculateUKTakeHome(grossAnnual,{region='england',studentLoanPlan='none',postgraduateLoan=false}={}){
 const gross=validNonNegative(grossAnnual,'Gross annual salary');
 const allowance=Math.max(0,12570-Math.max(0,gross-100000)/2);
 const taxable=Math.max(0,gross-allowance);
 const bands=region==='scotland'
  ?[[3967,0.19],[16956,0.20],[31092,0.21],[62430,0.42],[125140,0.45],[Infinity,0.48]]
  :[[37700,0.20],[125140,0.40],[Infinity,0.45]];
 if(!['england','wales','northern-ireland','scotland'].includes(region))throw new RangeError('Choose a valid UK tax region');
 let remaining=taxable,previous=0,incomeTax=0;
 for(const [limit,rate] of bands){const portion=Math.max(0,Math.min(remaining+previous,limit)-previous);incomeTax+=portion*rate;previous=limit;if(remaining<=0)break;remaining-=portion;}
 // Use HMRC's published annual thresholds. Multiplying rounded weekly thresholds by 52
 // produces different annual amounts (£12,584 / £50,284) from the official £12,570 / £50,270.
 const niPrimary=12570,niUpper=50270;
 const nationalInsurance=Math.max(0,Math.min(gross,niUpper)-niPrimary)*0.08+Math.max(0,gross-niUpper)*0.02;
 const studentThresholds={plan1:26900,plan2:29385,plan4:33795,plan5:25000};
 if(studentLoanPlan!=='none'&&!Object.hasOwn(studentThresholds,studentLoanPlan))throw new RangeError('Choose a valid student loan plan');
 const studentLoan=studentLoanPlan==='none'?0:Math.max(0,gross-studentThresholds[studentLoanPlan])*0.09;
 const postgraduate=postgraduateLoan?Math.max(0,gross-21000)*0.06:0;
 const tax$=cents(incomeTax),ni$=cents(nationalInsurance),sl$=cents(studentLoan),pg$=cents(postgraduate);
 const totalDeductions=cents(tax$+ni$+sl$+pg$),netAnnual=cents(gross-totalDeductions);
 return {gross,personalAllowance:allowance,taxableIncome:taxable,incomeTax:tax$,nationalInsurance:ni$,studentLoan:sl$,postgraduateLoan:pg$,totalDeductions,netAnnual,netMonthly:cents(netAnnual/12),region,taxYear:'2026-27'};
}
function calculateGermanIncomeTax(taxableIncome){
 const income=Math.floor(validNonNegative(taxableIncome,'Taxable income'));
 let raw=0;
 if(income<=12348)raw=0;
 else if(income<=17799){const y=(income-12348)/10000;raw=(914.51*y+1400)*y;}
 else if(income<=69878){const z=(income-17799)/10000;raw=(173.10*z+2397)*z+1034.87;}
 else if(income<=277825)raw=0.42*income-11135.63;
 else raw=0.45*income-19470.38;
 return {taxableIncome:income,incomeTax:Math.max(0,Math.floor(raw)),taxYear:2026,solidaritySurchargeIncluded:false,churchTaxIncluded:false};
}
function calculateCanadaCPP(annualPensionableEarnings,{selfEmployed=false}={}){
 const income=validNonNegative(annualPensionableEarnings,'Annual pensionable earnings');
 const first=Math.max(0,Math.min(income,74600)-3500)*0.0595;
 const second=Math.max(0,Math.min(income,85000)-74600)*0.04;
 const employee=first+second,multiplier=selfEmployed?2:1;
 return {pensionableEarnings:income,baseCPP:Math.min(first,4230.45),cpp2:Math.min(second,416),employeeContribution:employee,contribution:employee*multiplier,selfEmployed:Boolean(selfEmployed),maximumEmployeeContribution:4646.45,maximumSelfEmployedContribution:9292.90,taxYear:2026};
}
function calculateCanadaRRSP({priorYearEarnedIncome,pensionAdjustment=0,unusedContributionRoom=0}={}){
 const earned=validNonNegative(priorYearEarnedIncome,'Prior-year earned income');
 const adjustment=validNonNegative(pensionAdjustment,'Pension adjustment');
 const unused=validNonNegative(unusedContributionRoom,'Unused contribution room');
 const newRoom=Math.max(0,Math.min(earned*0.18,33810)-adjustment);
 return {earnedIncome:earned,annualDollarLimit:33810,newRoom,unusedContributionRoom:unused,estimatedAvailableRoom:newRoom+unused,taxYear:2026};
}


function calculateAustraliaIncomeTax(taxableIncome){
 const income=validNonNegative(taxableIncome,'Taxable income');
 let tax=0;
 tax+=Math.max(0,Math.min(income,45000)-18200)*0.15;
 tax+=Math.max(0,Math.min(income,135000)-45000)*0.30;
 tax+=Math.max(0,Math.min(income,190000)-135000)*0.37;
 tax+=Math.max(0,income-190000)*0.45;
 return {taxableIncome:income,incomeTax:Math.round(tax*100)/100,taxYear:'2026-27',medicareLevyIncluded:false};
}
function calculateAustraliaSuper(qualifyingEarnings){
 const earnings=validNonNegative(qualifyingEarnings,'Qualifying earnings');
 const capped=Math.min(earnings,270830);
 return {qualifyingEarnings:earnings,cappedEarnings:capped,superGuaranteeRate:12,employerSuper:capped*0.12,financialYear:'2026-27'};
}
function calculateSingaporeCPF(monthlyOrdinaryWages,{ageGroup='55-and-below'}={}){
 const wages=validNonNegative(monthlyOrdinaryWages,'Monthly ordinary wages');
 const rates={
  '55-and-below':[17,20],
  'above-55-to-60':[16,18],
  'above-60-to-65':[12.5,12.5],
  'above-65-to-70':[9,7.5],
  'above-70':[7.5,5]
 };
 if(!Object.hasOwn(rates,ageGroup))throw new RangeError('Choose a valid CPF age group');
 const [employerRate,employeeRate]=rates[ageGroup];
 if(wages<=750)throw new RangeError('This simplified calculator supports monthly ordinary wages above S$750; graduated rates apply below that threshold');
 const contributableWages=Math.min(wages,8000);
 const employer=Math.round(contributableWages*employerRate/100);
 const employee=Math.round(contributableWages*employeeRate/100);
 return {monthlyWages:wages,ordinaryWageCeiling:8000,contributableWages,employerRate,employeeRate,employerContribution:employer,employeeContribution:employee,totalContribution:employer+employee,year:2026,scope:'Singapore citizens and third-year-onwards permanent residents; ordinary wages above $750'};
}
function calculateUAEIndividualIncomeTax(annualIncome){
 const income=validNonNegative(annualIncome,'Annual income');
 return {annualIncome:income,personalIncomeTax:0,netAfterPersonalIncomeTax:income,scope:'UAE individual personal income tax only'};
}


function calculateCanadaFederalIncomeTax(taxableIncome,{employmentIncome=0}={}){
 const income=Math.floor(validNonNegative(taxableIncome,'Taxable income'));
 const employment=validNonNegative(employmentIncome,'Employment income');
 if(employment>income)throw new RangeError('Employment income cannot exceed taxable income in this simplified estimate');
 const bands=[[58523,.14],[117045,.205],[181440,.26],[258482,.29],[Infinity,.33]];
 let tax=0,lower=0;
 for(const [upper,rate] of bands){const slice=Math.max(0,Math.min(income,upper)-lower);tax+=slice*rate;if(income<=upper)break;lower=upper;}
 const basicPersonalAmount=income<=181440?16452:income>=258482?14829:16452-(income-181440)*(1623/77042);
 const basicPersonalCredit=basicPersonalAmount*.14;
 const employmentAmount=Math.min(1501,employment)*.14;
 const federalTax=Math.max(0,Math.round((tax-basicPersonalCredit-employmentAmount)*100)/100);
 return {taxableIncome:income,employmentIncome:employment,grossFederalTax:Math.round(tax*100)/100,basicPersonalAmount:Math.round(basicPersonalAmount*100)/100,basicPersonalCredit:Math.round(basicPersonalCredit*100)/100,employmentCredit:Math.round(employmentAmount*100)/100,federalIncomeTax:federalTax,taxYear:2026,scope:'Simplified federal income tax only; provincial/territorial tax, surtaxes, other credits, deductions and special rules excluded'};
}

const api={calculateCanadaFederalIncomeTax,calculateGSTHST,calculateSDLT,project401k,calculateUKTakeHome,calculateGermanIncomeTax,calculateCanadaCPP,calculateCanadaRRSP,calculateAustraliaIncomeTax,calculateAustraliaSuper,calculateSingaporeCPF,calculateUAEIndividualIncomeTax};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FCCountryCalculators=api;
})(typeof window!=='undefined'?window:globalThis);
