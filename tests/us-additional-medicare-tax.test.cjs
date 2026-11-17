const test=require('node:test');
const assert=require('node:assert/strict');
const {calculateUSFederalTakeHome}=require('../assets/international-payroll.js');

test('US 2026 Additional Medicare Tax applies above filing-status thresholds',()=>{
 assert.equal(calculateUSFederalTakeHome(200000,{filingStatus:'single'}).additionalMedicareTax,0);
 assert.equal(calculateUSFederalTakeHome(200001,{filingStatus:'single'}).additionalMedicareTax,0.01);
 assert.equal(calculateUSFederalTakeHome(250000,{filingStatus:'marriedJoint'}).additionalMedicareTax,0);
 assert.equal(calculateUSFederalTakeHome(250001,{filingStatus:'marriedJoint'}).additionalMedicareTax,0.01);
 assert.equal(calculateUSFederalTakeHome(125000,{filingStatus:'marriedSeparate'}).additionalMedicareTax,0);
 assert.equal(calculateUSFederalTakeHome(125001,{filingStatus:'marriedSeparate'}).additionalMedicareTax,0.01);
 assert.equal(calculateUSFederalTakeHome(200001,{filingStatus:'headOfHousehold'}).additionalMedicareTax,0.01);
});

test('US 2026 Additional Medicare Tax is included in total federal/FICA deductions and net pay',()=>{
 const r=calculateUSFederalTakeHome(250001,{filingStatus:'marriedJoint'});
 assert.equal(r.additionalMedicareThreshold,250000);
 assert.equal(r.totalFederalAndFICA,r.federalIncomeTax+r.socialSecurity+r.medicare+r.additionalMedicareTax);
 assert.equal(r.estimatedNet,r.gross-r.totalFederalAndFICA);
});
