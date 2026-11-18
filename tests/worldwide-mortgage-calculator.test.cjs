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
 for(const code of ['IN','US','GB','CA','AU','DE','FR','BR','JP','CN','ZA','NG','AE','SA','AF','AL','XK']){
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
