(function(root){'use strict';
function amount(v,name){const n=Number(v);if(!Number.isFinite(n)||n<0)throw new RangeError(name+' must be a non-negative number');return n;}
function progressive(taxable,bands){let tax=0,lower=0;for(const [upper,rate] of bands){const slice=Math.max(0,Math.min(taxable,upper)-lower);tax+=slice*rate;if(taxable<=upper)break;lower=upper;}return Math.round(tax*100)/100;}
const US={
 single:{deduction:16100,bands:[[12400,.10],[50400,.12],[105700,.22],[201775,.24],[256225,.32],[640600,.35],[Infinity,.37]]},
 marriedJoint:{deduction:32200,bands:[[24800,.10],[100800,.12],[211400,.22],[403550,.24],[512450,.32],[768700,.35],[Infinity,.37]]},
 headOfHousehold:{deduction:24150,bands:[[17700,.10],[67450,.12],[105700,.22],[201750,.24],[256200,.32],[640600,.35],[Infinity,.37]]},
 marriedSeparate:{deduction:16100,bands:[[12400,.10],[50400,.12],[105700,.22],[201775,.24],[256225,.32],[384350,.35],[Infinity,.37]]}
};
function calculateUSFederalTakeHome(annualWages,{filingStatus='single'}={}){
 const gross=amount(annualWages,'Annual wages'),rule=US[filingStatus];if(!rule)throw new RangeError('Choose a valid US filing status');
 const taxable=Math.max(0,gross-rule.deduction),incomeTax=progressive(taxable,rule.bands);
 const socialSecurity=Math.round(Math.min(gross,184500)*.062*100)/100;
 const medicare=Math.round(gross*.0145*100)/100;
 const additionalMedicareThreshold={single:200000,marriedJoint:250000,headOfHousehold:200000,marriedSeparate:125000}[filingStatus];
 const additionalMedicareTax=Math.round(Math.max(0,gross-additionalMedicareThreshold)*.009*100)/100;
 const totalFederalAndFICA=incomeTax+socialSecurity+medicare+additionalMedicareTax;
 return {gross,filingStatus,standardDeduction:rule.deduction,taxableIncome:taxable,federalIncomeTax:incomeTax,socialSecurity,medicare,additionalMedicareTax,additionalMedicareThreshold,totalFederalAndFICA,estimatedNet:gross-totalFederalAndFICA,taxYear:2026,effectiveFrom:'2026-01-01',effectiveTo:'2026-12-31',scope:'Simplified US federal income tax and employee FICA estimate, including Additional Medicare Tax on the single wages input; state/local tax, self-employment income and spouse wages are excluded'};
}
function calculateUKEmployerNIC(annualGrossPay){
 const gross=amount(annualGrossPay,'Annual gross pay'),threshold=5000,rate=.15;
 const due=Math.round(Math.max(0,gross-threshold)*rate*100)/100;
 return {annualGrossPay:gross,secondaryThreshold:threshold,employerNICRate:15,employerNIC:due,totalEmployerCost:gross+due,taxYear:'2026-27',effectiveFrom:'2026-04-06',effectiveTo:'2027-04-05',employmentAllowanceApplied:false};
}
function calculateCanadaPayroll(annualPensionableEarnings,{province='outside-quebec'}={}){
 const gross=amount(annualPensionableEarnings,'Annual pensionable earnings');
 if(!['outside-quebec','quebec'].includes(province))throw new RangeError('Choose Quebec or another province/territory');
 const cppBase=Math.min(Math.max(0,gross-3500),74600-3500)*.0595;
 const cpp2=Math.min(Math.max(0,gross-74600),85000-74600)*.04;
 const eiMax=68900,eiEmployeeRate=province==='quebec'?.013:.0163,eiEmployerRate=province==='quebec'?.0182:.02282;
 const eiEmployee=Math.min(gross,eiMax)*eiEmployeeRate,eiEmployer=Math.min(gross,eiMax)*eiEmployerRate;
 const round=n=>Math.round(n*100)/100;
 return {gross,province,cpp:round(cppBase),cpp2:round(cpp2),employeeEI:round(eiEmployee),employerEI:round(eiEmployer),employeeCPP:round(cppBase+cpp2),employerCPP:round(cppBase+cpp2),employeePayrollContributions:round(cppBase+cpp2+eiEmployee),employerPayrollContributions:round(cppBase+cpp2+eiEmployer),taxYear:2026,effectiveFrom:'2026-01-01',effectiveTo:'2026-12-31',scope:'Employee and employer CPP/CPP2 and EI contributions; income-tax withholding, Quebec QPP/QPIP, exemptions and pay-period rounding are excluded'};
}
const api={calculateUSFederalTakeHome,calculateUKEmployerNIC,calculateCanadaPayroll};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FCInternationalPayroll=Object.freeze(api);
if(typeof document!=='undefined'){
 const $=id=>document.getElementById(id);
 const money=(n,c)=>window.FCLocale?.formatCurrency?window.FCLocale.formatCurrency(n,c,{minimumFractionDigits:2,maximumFractionDigits:2}):new Intl.NumberFormat(c==='GBP'?'en-GB':c==='USD'?'en-US':'en-CA',{style:'currency',currency:c,minimumFractionDigits:2}).format(n);
 const number=n=>window.FCLocale?.formatNumber?window.FCLocale.formatNumber(n,{maximumFractionDigits:2}):Number(n).toLocaleString();
 function show(id,title,rows,c){const out=$(id);if(!out)return;out.replaceChildren();const h=document.createElement('strong');h.textContent=title;const ul=document.createElement('ul');rows.forEach(([label,value])=>{const li=document.createElement('li');li.textContent=label+': '+money(value,c);ul.appendChild(li);});out.append(h,ul);}
 const refreshers=[];const bind=(id,run,errorId)=>{const form=$(id);if(!form)return;const execute=()=>{try{run();$(errorId).textContent='';}catch(err){$(errorId).textContent=err.message;}};form.addEventListener('submit',e=>{e.preventDefault();execute();});refreshers.push(execute);};
 bind('us-tax-form',()=>{const r=calculateUSFederalTakeHome($('us-wages').value,{filingStatus:$('us-status').value});show('us-tax-result','Estimated federal take-home: '+money(r.estimatedNet,'USD'),[['Federal income tax',r.federalIncomeTax],['Social Security',r.socialSecurity],['Medicare',r.medicare],['Additional Medicare Tax',r.additionalMedicareTax],['Total federal tax and FICA',r.totalFederalAndFICA],['Standard deduction',r.standardDeduction],['Taxable income',r.taxableIncome]],'USD');},'us-tax-error');
 bind('uk-employer-form',()=>{const r=calculateUKEmployerNIC($('uk-pay').value);show('uk-employer-result','Estimated employer cost: '+money(r.totalEmployerCost,'GBP'),[['Gross annual pay',r.annualGrossPay],['Employer National Insurance',r.employerNIC],['Secondary threshold',r.secondaryThreshold]],'GBP');},'uk-employer-error');
 bind('ca-payroll-form',()=>{const r=calculateCanadaPayroll($('ca-payroll-wages').value,{province:$('ca-payroll-province').value});show('ca-payroll-result','Employee payroll deductions: '+money(r.employeePayrollContributions,'CAD'),[['Employee CPP and CPP2',r.employeeCPP],['Employee EI',r.employeeEI],['Employer CPP and CPP2',r.employerCPP],['Employer EI',r.employerEI],['Total employer contributions',r.employerPayrollContributions]],'CAD');},'ca-payroll-error');
 window.addEventListener('fc:localechange',()=>refreshers.forEach(refresh=>refresh()));
}
})(typeof window!=='undefined'?window:globalThis);
