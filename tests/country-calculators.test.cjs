const test=require('node:test');const assert=require('node:assert/strict');const {calculateGSTHST,calculateSDLT,project401k,calculateUKTakeHome,calculateGermanIncomeTax,calculateCanadaCPP,calculateCanadaRRSP}=require('../assets/country-calculators.js');
test('Canada GST/HST add and remove modes calculate tax consistently',()=>{const add=calculateGSTHST(100,13,0,'add');assert.equal(add.tax,13);assert.equal(add.gross,113);const remove=calculateGSTHST(113,13,0,'remove');assert.equal(remove.net,100);assert.equal(remove.tax,13);});
test('Canada calculator supports separate provincial tax input',()=>{const r=calculateGSTHST(100,5,7,'add');assert.equal(r.totalRate,12);assert.equal(r.tax,12);assert.equal(r.gross,112);});
test('UK SDLT standard bands use progressive portions',()=>{assert.equal(calculateSDLT(295000).tax,4750);});
test('UK first-time buyer relief applies up to £500,000 only',()=>{const eligible=calculateSDLT(500000,{firstTimeBuyer:true});assert.equal(eligible.tax,10000);assert.equal(eligible.firstTimeReliefApplied,true);const over=calculateSDLT(600000,{firstTimeBuyer:true});assert.equal(over.firstTimeReliefApplied,false);assert.equal(over.tax,20000);});
test('UK SDLT additional property and non-resident surcharges stack',()=>{assert.equal(calculateSDLT(300000,{additionalProperty:true}).tax,20000);assert.equal(calculateSDLT(300000,{nonResident:true}).tax,11000);assert.equal(calculateSDLT(300000,{additionalProperty:true,nonResident:true}).tax,26000);});
test('401(k) projection includes employee contributions and employer match',()=>{const r=project401k({currentBalance:0,annualSalary:100000,employeeContributionPercent:6,employerMatchPercent:50,employerMatchCapPercent:6,annualReturnPercent:7,years:10});assert.equal(r.employeeContributions,60000);assert.equal(r.employerContributions,30000);assert.ok(r.endingBalance>90000);});
test('401(k) rejects invalid percentage and term inputs',()=>{assert.throws(()=>project401k({annualSalary:100000,employeeContributionPercent:110,employerMatchPercent:50,employerMatchCapPercent:6,annualReturnPercent:7,years:10}),RangeError);assert.throws(()=>project401k({annualSalary:100000,employeeContributionPercent:6,employerMatchPercent:50,employerMatchCapPercent:6,annualReturnPercent:7,years:0}),RangeError);});

test('401(k) projection accepts negative market returns and rejects returns below -100%',()=>{const r=project401k({currentBalance:10000,annualSalary:0,employeeContributionPercent:0,employerMatchPercent:0,employerMatchCapPercent:0,annualReturnPercent:-20,years:1});assert.equal(r.endingBalance,8000);assert.throws(()=>project401k({annualSalary:100000,employeeContributionPercent:6,employerMatchPercent:50,employerMatchCapPercent:6,annualReturnPercent:-101,years:10}),RangeError);});
test('401(k) projection accepts a negative salary growth assumption',()=>{const r=project401k({currentBalance:0,annualSalary:100000,employeeContributionPercent:10,employerMatchPercent:0,employerMatchCapPercent:0,annualReturnPercent:0,salaryGrowthPercent:-10,years:2});assert.equal(r.employeeContributions,19000);});

test('UK 2026-27 take-home estimate applies personal allowance, income tax and annualized employee NI',()=>{
 const r=calculateUKTakeHome(50000);
 assert.equal(r.personalAllowance,12570);
 assert.equal(r.incomeTax,7486);
 assert.equal(r.nationalInsurance,2993.28);
 assert.equal(r.taxYear,'2026-27');
 assert.equal(r.netAnnual,39520.72);
});
test('UK Scotland uses Scottish bands and student loan plans use official 2026-27 thresholds',()=>{
 const scot=calculateUKTakeHome(50000,{region:'scotland'});
 assert.equal(scot.incomeTax,8982.05);
 const p2=calculateUKTakeHome(40000,{studentLoanPlan:'plan2',postgraduateLoan:true});
 assert.equal(p2.studentLoan,955.35);
 assert.equal(p2.postgraduateLoan,1140);
});
test('UK personal allowance tapers above £100,000 and invalid student plans are rejected',()=>{
 const r=calculateUKTakeHome(110000);
 assert.equal(r.personalAllowance,7570);
 assert.throws(()=>calculateUKTakeHome(50000,{studentLoanPlan:'plan3'}),RangeError);
});
test('Germany 2026 income tax follows §32a EStG progressive tariff',()=>{
 assert.equal(calculateGermanIncomeTax(12000).incomeTax,0);
 assert.equal(calculateGermanIncomeTax(30000).incomeTax,4217);
 assert.equal(calculateGermanIncomeTax(100000).incomeTax,30864);
 assert.equal(calculateGermanIncomeTax(300000).incomeTax,115529);
});
test('Canada 2026 CPP includes base CPP and CPP2 employee/self-employed maximums',()=>{
 const employee=calculateCanadaCPP(85000);
 assert.equal(employee.employeeContribution,4646.45);
 assert.equal(employee.contribution,4646.45);
 const self=calculateCanadaCPP(85000,{selfEmployed:true});
 assert.equal(self.contribution,9292.90);
});
test('Canada 2026 RRSP room applies 18 percent, dollar cap, pension adjustment and unused room',()=>{
 const r=calculateCanadaRRSP({priorYearEarnedIncome:100000,pensionAdjustment:5000,unusedContributionRoom:2000});
 assert.equal(r.newRoom,13000);
 assert.equal(r.estimatedAvailableRoom,15000);
 const cap=calculateCanadaRRSP({priorYearEarnedIncome:300000});
 assert.equal(cap.newRoom,33810);
});
