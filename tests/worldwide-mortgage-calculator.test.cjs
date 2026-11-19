'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const calc=require('../assets/worldwide-mortgage-calculator.js');
const root=path.join(__dirname,'..');

test('worldwide mortgage country catalogue provides ISO currency defaults for 248+ markets',()=>{
 const entries=Object.entries(calc.currencyByCountry);
 assert.ok(entries.length>=248,'expected worldwide ISO country and territory coverage');
 for(const code of ['IN','US','GB','CA','AU','DE','FR','BR','JP','CN','ZA','NG','AE','SA','ID','KR','TH','PH','AR','CL','CO','CN','EG','NG','AF','AL','DZ','XK']){
  assert.ok(calc.currencyByCountry[code], 'missing country currency for '+code);
 }
 for(const [country,currency] of entries){
  assert.match(country,/^[A-Z]{2}$/);
  assert.match(currency,/^[A-Z]{3}$/);
  assert.doesNotThrow(()=>new Intl.NumberFormat('en',{style:'currency',currency}));
 }
});

test('market currency defaults use domestic currencies and directory aliases preselect correctly',()=>{
 assert.equal(calc.currencyByCountry.BG,'EUR');
 assert.equal(calc.currencyByCountry.BT,'BTN');
 assert.equal(calc.currencyByCountry.LS,'LSL');
 assert.equal(calc.currencyByCountry.NA,'NAD');
 assert.equal(calc.currencyByCountry.ZW,'ZWG');
 const script=fs.readFileSync(path.join(root,'assets/worldwide-mortgage-calculator.js'),'utf8');
  for(const alias of ['cabo verde','republic of the congo','democratic republic of the congo','myanmar','turkey'])assert.ok(script.includes(alias),'missing country alias '+alias);
});

test('worldwide mortgage formula handles zero and positive interest rates',()=>{
 const zero=calc.calculateWorldwideMortgage({homePrice:120000,downPayment:20000,annualInterestRate:0,termYears:10});
 assert.equal(zero.principal,100000);
 assert.equal(zero.monthlyPrincipalAndInterest,100000/120);
 assert.equal(zero.totalInterest,0);
 const standard=calc.calculateWorldwideMortgage({homePrice:250000,downPayment:50000,annualInterestRate:5,termYears:25,annualPropertyTax:1200,annualHomeInsurance:600,monthlyMaintenance:50});
 assert.ok(Math.abs(standard.monthlyPrincipalAndInterest-1169.18)<0.02);
 assert.equal(standard.monthlyPropertyTax,100);
 assert.equal(standard.monthlyHomeInsurance,50);
 assert.equal(standard.monthlyMaintenance,50);
 assert.equal(standard.loanToValue,80);
 assert.ok(standard.monthlyHousingCost>standard.monthlyPrincipalAndInterest);
 assert.ok(standard.totalInterest>0);
});

test('worldwide mortgage calculator validates invalid property and loan assumptions',()=>{
 const base={homePrice:100000,downPayment:10000,annualInterestRate:5,termYears:20};
 assert.throws(()=>calc.calculateWorldwideMortgage({...base,homePrice:0}),/greater than zero/);
 assert.throws(()=>calc.calculateWorldwideMortgage({...base,downPayment:100000}),/less than the property price/);
 assert.throws(()=>calc.calculateWorldwideMortgage({...base,annualInterestRate:101}),/between 0% and 100%/);
 assert.throws(()=>calc.calculateWorldwideMortgage({...base,termYears:20.5}),/whole number/);
 assert.throws(()=>calc.calculateWorldwideMortgage({...base,annualPropertyTax:-1}),/cannot be negative/);
});

test('worldwide mortgage page explains local-rule limits and exposes the global calculator UI',()=>{
 const html=fs.readFileSync(path.join(root,'international/global-mortgage-calculator.html'),'utf8');
 assert.match(html,/world-mortgage-country/);
 assert.match(html,/world-mortgage-currency/);
 assert.match(html,/world-mortgage-form/);
 assert.match(html,/world-mortgage-schedule/);
 assert.match(html,/global-mortgage-calculator\.html/);
 assert.match(html,/local mortgage rules/i);
 assert.match(html,/does not provide live rates/i);
 assert.match(html,/worldwide-mortgage-calculator\.js/);
 assert.match(html,/rel="canonical"/);
});

test('all 195 country directory entries link to the worldwide mortgage calculator with a country preselection',()=>{
 const html=fs.readFileSync(path.join(root,'international/countries/index.html'),'utf8');
 const rows=html.match(/class="country"/g)||[];
 const links=html.match(/class="mortgage-link" href="\/international\/global-mortgage-calculator\.html#country=/g)||[];
 assert.equal(rows.length,195);
 assert.equal(links.length,195);
 const international=fs.readFileSync(path.join(root,'international/index.html'),'utf8');
 assert.match(international,/href="\/international\/global-mortgage-calculator\.html"/);
 const general=fs.readFileSync(path.join(root,'calculators/mortgage-calculator.html'),'utf8');
 assert.match(general,/href="\/international\/global-mortgage-calculator\.html"/);
});


test('worldwide mortgage converts nominal compounding to the selected payment interval',()=>{
 const canada=calc.calculateWorldwideMortgage({homePrice:250000,downPayment:50000,annualInterestRate:5,termYears:25,compoundingFrequency:'semi-annually',paymentFrequency:'monthly'});
 const rate=Math.pow(1+0.05/2,2/12)-1;
 const expected=200000*rate/(1-Math.pow(1+rate,-300));
 assert.ok(Math.abs(canada.paymentPerPeriod-expected)<1e-8);
 assert.equal(canada.compoundingFrequency,'semi-annually');
 assert.equal(canada.paymentFrequency,'monthly');
 assert.equal(canada.paymentsPerYear,12);
});
test('worldwide mortgage supports semi-monthly, biweekly and weekly repayment periods',()=>{
 const base={homePrice:180000,downPayment:30000,annualInterestRate:4.75,termYears:20,compoundingFrequency:'monthly'};
 for(const [frequency,count] of [['semi-monthly',24],['biweekly',26],['weekly',52]]){
  const result=calc.calculateWorldwideMortgage({...base,paymentFrequency:frequency});
  assert.equal(result.paymentsPerYear,count);
  assert.equal(result.periods,20*count);
  assert.ok(result.paymentPerPeriod>0);
  assert.ok(result.monthlyPrincipalAndInterest>0);
  assert.ok(result.totalInterest>0);
 }
});
test('worldwide mortgage rejects unsupported compounding and payment frequencies',()=>{
 const base={homePrice:100000,downPayment:10000,annualInterestRate:5,termYears:20};
 assert.throws(()=>calc.calculateWorldwideMortgage({...base,compoundingFrequency:'unknown'}),/compounding frequency/i);
 assert.throws(()=>calc.calculateWorldwideMortgage({...base,paymentFrequency:'daily'}),/payment frequency/i);
});
test('Canada country selection defaults to semi-annual compounding and the worldwide UI exposes global repayment options',()=>{
 const script=fs.readFileSync(path.join(root,'assets/worldwide-mortgage-calculator.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'international/global-mortgage-calculator.html'),'utf8');
 assert.match(script,/selectedCountry\(\)==='CA'\?'semi-annually':'monthly'/);
 for(const id of ['world-mortgage-compounding','world-mortgage-frequency'])assert.ok(html.includes('id="'+id+'"'));
 for(const value of ['semi-monthly','biweekly','weekly','semi-annually','quarterly','annually'])assert.ok(html.includes('value="'+value+'"'));
 assert.ok(html.includes('financial-consumer-agency/services/industry/bulletins/information-box-examples/credit-agreement-fixed-mortgage.html'));
});


test('country-specific mortgage guidance registry covers all 195 directory markets with explicit evidence status',()=>{
 const registry=JSON.parse(fs.readFileSync(path.join(root,'assets/mortgage-country-guidance.json'),'utf8'));
 const directory=fs.readFileSync(path.join(root,'international/countries/index.html'),'utf8');
 const names=[...directory.matchAll(/href="\/international\/global-mortgage-calculator\.html#country=([^"]+)"/g)].map(match=>decodeURIComponent(match[1]).toLowerCase());
 const entries=Object.values(registry.countries);
 assert.equal(entries.length,195);
 assert.equal(names.length,195);
 const registryNames=new Set(entries.map(entry=>entry.countryName.toLowerCase()));
 for(const name of names)assert.ok(registryNames.has(name),'missing country guidance record for '+name);
 assert.equal(entries.filter(entry=>entry.status==='verified').length,27);
 assert.equal(entries.filter(entry=>entry.status==='regional-framework').length,27);
 assert.equal(entries.filter(entry=>entry.status==='pending').length,141);
 for(const info of Object.values(registry.verified)){
  assert.ok(info.sources.length>0);
  for(const source of info.sources)assert.match(source[1],/^https:\/\//);
 }
 for(const source of registry.regionalFramework.sources)assert.match(source[1],/^https:\/\//);
});
test('mortgage country guidance panel loads safely and displays official sources for the selected country',()=>{
 const html=fs.readFileSync(path.join(root,'international/global-mortgage-calculator.html'),'utf8');
 const script=fs.readFileSync(path.join(root,'assets/worldwide-mortgage-calculator.js'),'utf8');
 assert.match(html,/id="world-mortgage-country-guidance"/);
 assert.match(html,/id="world-mortgage-guidance-status"/);
 assert.match(html,/id="world-mortgage-guidance-sources"/);
 assert.match(script,/mortgage-country-guidance\.json/);
 assert.match(script,/createElement\('a'\)/);
 assert.match(script,/noopener noreferrer/);
 assert.match(script,/regional-framework/);
 assert.match(script,/Country-specific verification pending/);
});
