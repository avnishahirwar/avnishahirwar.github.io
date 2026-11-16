const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {calculateGSTHST,calculateSDLT,project401k,calculateUKTakeHome,calculateGermanIncomeTax,calculateCanadaCPP,calculateCanadaRRSP,calculateAustraliaIncomeTax,calculateAustraliaSuper,calculateSingaporeCPF,calculateUAEIndividualIncomeTax}=require('../assets/country-calculators.js');
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

test('UK Germany and Canada 2026 country calculator pages are indexable and include official sources and FAQ schema',()=>{
 const root=path.join(__dirname,'..');
 const checks=[
  ['international/uk-income-tax-calculator.html','https://www.gov.uk/','FAQPage'],
  ['international/germany-income-tax-calculator.html','https://www.gesetze-im-internet.de/estg/__32a.html','ELSTER'],
  ['international/canada-tax-calculators.html','https://www.canada.ca/','FAQPage']
 ];
 for(const [file,source,marker] of checks){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(html,/name="robots" content="index,follow/);
  assert.match(html,/rel="canonical"/);
  assert.match(html,/"@type":"SoftwareApplication"/);
  assert.match(html,/"@type":"FAQPage"/);
  assert.ok(html.includes(source),'Official source missing from '+file);
  assert.ok(html.includes(marker),'Expected content missing from '+file);
 }
});
test('country tax landing pages link to the correct calculators',()=>{
 const root=path.join(__dirname,'..');
 for(const [file,link] of [
  ['international/uk/index.html','/international/uk-income-tax-calculator.html'],
  ['international/germany/index.html','/international/germany-income-tax-calculator.html'],
  ['international/canada/index.html','/international/canada-tax-calculators.html']
 ]){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.ok(html.includes(link));
  assert.match(html,/rel="canonical"/);
 }
});

test('Australia 2026-27 resident tax rates apply progressive bands excluding Medicare levy',()=>{
 const r=calculateAustraliaIncomeTax(100000);
 assert.equal(r.incomeTax,22492);
 assert.equal(r.taxYear,'2026-27');
 assert.equal(r.medicareLevyIncluded,false);
});
test('Australia 2026-27 super guarantee is 12% and capped at the maximum contribution base',()=>{
 assert.equal(calculateAustraliaSuper(100000).employerSuper,12000);
 assert.equal(calculateAustraliaSuper(300000).employerSuper,32499.6);
});
test('Singapore CPF 2026 age-based rates use the $8,000 ordinary wage ceiling',()=>{
 const a=calculateSingaporeCPF(9000,{ageGroup:'55-and-below'});
 assert.equal(a.contributableWages,8000);assert.equal(a.employerContribution,1360);assert.equal(a.employeeContribution,1600);assert.equal(a.totalContribution,2960);
 const senior=calculateSingaporeCPF(5000,{ageGroup:'above-60-to-65'});
 assert.equal(senior.employerContribution,625);assert.equal(senior.employeeContribution,625);
 const low=calculateSingaporeCPF(700,{ageGroup:'55-and-below'});assert.equal(low.totalContribution,0);
});
test('UAE individual personal income tax estimate is zero and does not claim other payroll deductions',()=>{
 const r=calculateUAEIndividualIncomeTax(120000);
 assert.equal(r.personalIncomeTax,0);assert.equal(r.netAfterPersonalIncomeTax,120000);
 assert.match(r.scope,/personal income tax only/);
});
