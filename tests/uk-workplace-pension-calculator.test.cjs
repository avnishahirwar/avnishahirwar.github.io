const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculate,LOWER,UPPER}=require('../assets/uk-workplace-pension-calculator.js');
const root=path.join(__dirname,'..');

test('UK workplace pension uses 2026-27 qualifying earnings band and 5%/3% defaults',()=>{
 const r=calculate({annualPay:30000});
 assert.equal(LOWER,6240);assert.equal(UPPER,50270);
 assert.equal(r.qualifyingEarnings,23760);
 assert.equal(r.employeeAnnual,1188);
 assert.equal(r.employerAnnual,712.8);
 assert.equal(r.totalAnnual,1900.8);
});

test('UK workplace pension caps qualifying earnings at upper limit and floors below lower limit',()=>{
 assert.equal(calculate({annualPay:100000}).qualifyingEarnings,44030);
 assert.equal(calculate({annualPay:5000}).qualifyingEarnings,0);
});

test('UK workplace pension supports custom rates and rejects invalid values',()=>{
 const r=calculate({annualPay:20000,employeeRate:6,employerRate:4});
 assert.equal(r.employeeAnnual,825.6);
 assert.equal(r.employerAnnual,550.4);
 assert.throws(()=>calculate({annualPay:-1}),/zero or more/);
 assert.throws(()=>calculate({annualPay:20000,employeeRate:101}),/between 0% and 100%/);
});

test('UK workplace pension page documents jurisdiction, year and official sources',()=>{
 const html=fs.readFileSync(path.join(root,'international/uk-workplace-pension-calculator.html'),'utf8');
 assert.match(html,/2026–27/);
 assert.match(html,/Northern Ireland has separate legislation/);
 assert.match(html,/thepensionsregulator\.gov\.uk/);
 assert.match(html,/uk-workplace-pension-calculator\.js/);
});
