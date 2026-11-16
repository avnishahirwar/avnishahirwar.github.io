const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculate}=require('../assets/us-personal-loan-calculator.js');
const root=path.join(__dirname,'..');

test('US personal loan calculator returns payment, interest and withheld fee',()=>{
 const r=calculate({loanAmount:10000,apr:12,termMonths:36,originationFeeRate:3});
 assert.ok(r.monthlyPayment>0);
 assert.ok(r.totalInterest>0);
 assert.equal(r.originationFee,300);
 assert.equal(r.netProceedsIfWithheld,9700);
});

test('US personal loan calculator handles zero APR',()=>{
 const r=calculate({loanAmount:1200,apr:0,termMonths:12,originationFeeRate:0});
 assert.equal(r.monthlyPayment,100);
 assert.equal(r.totalInterest,0);
});

test('US personal loan calculator rejects invalid inputs',()=>{
 assert.throws(()=>calculate({loanAmount:0,apr:10,termMonths:24}),/greater than zero/);
 assert.throws(()=>calculate({loanAmount:1000,apr:-1,termMonths:24}),/APR/);
 assert.throws(()=>calculate({loanAmount:1000,apr:10,termMonths:121}),/1 to 120/);
 assert.throws(()=>calculate({loanAmount:1000,apr:10,termMonths:24,originationFeeRate:101}),/Origination fee/);
});

test('US personal loan page discloses that it is not a lender quote or credit decision',()=>{
 const html=fs.readFileSync(path.join(root,'international/us-personal-loan-calculator.html'),'utf8');
 assert.match(html,/rel="canonical"/);
 assert.match(html,/not a lender quote/);
 assert.match(html,/us-personal-loan-calculator\.js/);
});
