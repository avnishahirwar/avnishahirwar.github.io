const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const calc=require('../assets/global-mortgage-calculators.js');
test('mortgage payment handles zero interest and standard amortisation',()=>{
 const zero=calc.mortgagePayment(120000,0,10);
 assert.equal(zero.monthlyPrincipalAndInterest,1000);
 const normal=calc.mortgagePayment(200000,6,30);
 assert.ok(Math.abs(normal.monthlyPrincipalAndInterest-1199.101)<0.02);
 assert.ok(normal.totalInterest>0);
});
test('US mortgage includes user-entered escrow-style estimates without inventing live rates',()=>{
 const r=calc.calculateUSMortgage({homePrice:400000,downPayment:80000,annualInterestRate:6.5,termYears:30,annualPropertyTaxRate:1.1,annualHomeInsurance:1800,monthlyHOA:100});
 assert.equal(r.principal,320000);
 assert.equal(r.monthlyPropertyTax,366.6666666666667);
 assert.equal(r.monthlyHomeInsurance,150);
 assert.equal(r.monthlyHOA,100);
 assert.ok(r.estimatedMonthlyHousingCost>r.monthlyPrincipalAndInterest);
 assert.match(r.scope,/Excludes PMI/);
});
test('UK mortgage calculates GBP repayment and loan-to-value',()=>{
 const r=calc.calculateUKMortgage({propertyPrice:300000,deposit:60000,annualInterestRate:4.5,termYears:25});
 assert.equal(r.principal,240000);
 assert.equal(r.loanToValue,80);
 assert.ok(r.monthlyPrincipalAndInterest>0);
 assert.match(r.scope,/council tax/);
});
test('US and UK mortgage pages are country-scoped, self-canonical and cite consumer guidance',()=>{
 const root=path.join(__dirname,'..');
 const checks=[
  ['international/us-mortgage-calculator.html','en-US','/us/','consumerfinance.gov'],
  ['international/uk-mortgage-calculator.html','en-GB','/uk/','moneyhelper.org.uk']
 ];
 for(const [file,locale,hub,source] of checks){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(html,new RegExp('hreflang="'+locale+'"'));
  assert.match(html,/rel="canonical"/);
  assert.ok(html.includes(hub));
  assert.ok(html.includes(source));
  assert.match(html,/global-mortgage-calculators\.js/);
  assert.match(html,/aria-live="polite"/);
 }
});
