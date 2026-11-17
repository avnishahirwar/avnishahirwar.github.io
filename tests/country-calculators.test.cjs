const {calculateUSFederalTakeHome,calculateUKEmployerNIC,calculateCanadaPayroll}=require('../assets/international-payroll.js');
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
 assert.equal(r.incomeTax,20520);
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
 assert.throws(()=>calculateSingaporeCPF(700,{ageGroup:'55-and-below'}),RangeError);
});
test('UAE individual personal income tax estimate is zero and does not claim other payroll deductions',()=>{
 const r=calculateUAEIndividualIncomeTax(120000);
 assert.equal(r.personalIncomeTax,0);assert.equal(r.netAfterPersonalIncomeTax,120000);
 assert.match(r.scope,/personal income tax only/);
});

test('Australia, Singapore and UAE calculator pages include official-source links and FAQ schema',()=>{
 const root=path.join(__dirname,'..');
 for(const [file,source] of [
  ['international/australia-tax-super-calculator.html','ato.gov.au'],
  ['international/singapore-cpf-calculator.html','cpf.gov.sg'],
  ['international/uae-personal-income-tax-calculator.html','u.ae'],
  ['international/saudi-vat-calculator.html','zatca.gov.sa']
 ]){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(html,/rel="canonical"/);
  assert.match(html,/"@type":"SoftwareApplication"/);
  assert.match(html,/"@type":"FAQPage"/);
  assert.ok(html.includes(source),'Missing official source in '+file);
 }
});
test('UAE, Saudi and Australia standard tax presets are present in international VAT calculator',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','international/vat-calculator.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'..','assets/vat-calculator.js'),'utf8');
 for(const [code,rate] of [['AE',5],['SA',15],['AU',10]]){assert.ok(html.includes('value="'+code+'"'));assert.match(js,new RegExp(code+":\\{name:[^,]+,rate:"+rate));}
});
test('Asia-Pacific country landing pages link to their published calculators',()=>{
 const root=path.join(__dirname,'..');
 for(const [file,link] of [
  ['international/australia/index.html','/international/australia-tax-super-calculator.html'],
  ['international/singapore/index.html','/international/singapore-cpf-calculator.html'],
  ['international/uae/index.html','/international/uae-personal-income-tax-calculator.html'],
  ['international/saudi-arabia/index.html','/international/saudi-vat-calculator.html']
 ]){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.ok(html.includes(link));assert.match(html,/rel="canonical"/);
 }
});

test('US 2026 federal income tax and employee FICA use IRS and SSA standard values',()=>{
 const r=calculateUSFederalTakeHome(85000,{filingStatus:'single'});
 assert.equal(r.standardDeduction,16100);
 assert.equal(r.taxableIncome,68900);
 assert.equal(r.federalIncomeTax,9870);
 assert.equal(r.socialSecurity,5270);
 assert.equal(r.medicare,1232.5);
 assert.equal(r.estimatedNet,68627.5);
 assert.equal(r.taxYear,2026);
});
test('US filing statuses apply the correct 2026 standard deduction and reject invalid status',()=>{
 assert.equal(calculateUSFederalTakeHome(50000,{filingStatus:'marriedJoint'}).standardDeduction,32200);
 assert.equal(calculateUSFederalTakeHome(50000,{filingStatus:'headOfHousehold'}).standardDeduction,24150);
 assert.equal(calculateUSFederalTakeHome(50000,{filingStatus:'marriedSeparate'}).standardDeduction,16100);
 assert.throws(()=>calculateUSFederalTakeHome(50000,{filingStatus:'invalid'}),RangeError);
});
test('UK employer NIC estimate applies the 2026-27 £5,000 secondary threshold and 15% rate',()=>{
 const r=calculateUKEmployerNIC(40000);
 assert.equal(r.employerNIC,5250);
 assert.equal(r.totalEmployerCost,45250);
 assert.equal(r.taxYear,'2026-27');
 assert.equal(r.employmentAllowanceApplied,false);
});
test('Canada 2026 payroll estimates CPP, CPP2 and separate EI rates for Quebec',()=>{
 const outside=calculateCanadaPayroll(85000);
 assert.equal(outside.employeeCPP,4646.45);
 assert.equal(outside.employeeEI,1123.07);
 assert.equal(outside.employerEI,1572.3);
 assert.equal(outside.employeePayrollContributions,5769.52);
 const qc=calculateCanadaPayroll(85000,{province:'quebec'});
 assert.equal(qc.employeeEI,895.7);
 assert.equal(qc.employerEI,1253.98);
});
test('new US UK and Canada payroll pages are indexable, locale-aware and link official sources',()=>{
 const root=path.join(__dirname,'..');
 const shell=fs.readFileSync(path.join(root,'assets/site-shell.js'),'utf8');
 assert.match(shell,/global-locale\.js/);
 for(const [file,source] of [
  ['international/us-income-tax-calculator.html','irs.gov'],
  ['international/uk-payroll-calculator.html','gov.uk'],
  ['international/canada-payroll-calculator.html','canada.ca']
 ]){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(html,/name="robots" content="index,follow/);
  assert.match(html,/rel="canonical"/);
  assert.match(html,/"@type":"SoftwareApplication"/);
  assert.match(html,/"@type":"FAQPage"/);
  assert.match(html,new RegExp(source));
 }
});
test('international country hubs and directory link to new tax and payroll calculators',()=>{
 const root=path.join(__dirname,'..');
 assert.match(fs.readFileSync(path.join(root,'international/index.html'),'utf8'),/us-income-tax-calculator\.html/);
 assert.match(fs.readFileSync(path.join(root,'international/uk/index.html'),'utf8'),/uk-payroll-calculator\.html/);
 assert.match(fs.readFileSync(path.join(root,'international/canada/index.html'),'utf8'),/canada-payroll-calculator\.html/);
});


test('Canada 2026 federal income tax applies progressive brackets and tapered basic personal credit',()=>{
 const r=calculateCanadaFederalIncomeTax(85000,{employmentIncome:85000});
 assert.equal(r.grossFederalTax,13621.01);
 assert.equal(r.basicPersonalAmount,16452);
 assert.equal(r.basicPersonalCredit,2303.28);
 assert.equal(r.employmentCredit,210.14);
 assert.equal(r.federalIncomeTax,11107.59);
 assert.equal(r.taxYear,2026);
 const high=calculateCanadaFederalIncomeTax(300000);
 assert.equal(high.basicPersonalAmount,14829);
 assert.equal(high.employmentCredit,0);
});
test('Canada federal income tax rejects invalid inputs and is linked from Canada hub',()=>{
 assert.throws(()=>calculateCanadaFederalIncomeTax(-1),RangeError);
 assert.throws(()=>calculateCanadaFederalIncomeTax(1000,{employmentIncome:2000}),RangeError);
 const root=path.join(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'international/canada-income-tax-calculator.html'),'utf8');
 assert.match(html,/canada\.ca/);assert.match(html,/"@type":"FAQPage"/);assert.match(html,/rel="canonical"/);
 assert.match(fs.readFileSync(path.join(root,'ca/index.html'),'utf8'),/canada-income-tax-calculator\.html/);
});
