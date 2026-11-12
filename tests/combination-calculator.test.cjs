const test=require('node:test');const assert=require('node:assert/strict');const {combinationCount}=require('../assets/combination-calculator.js');
test('combination calculator returns known values',()=>{assert.equal(combinationCount(10,3),120n);assert.equal(combinationCount(5,0),1n);assert.equal(combinationCount(5,5),1n);assert.equal(combinationCount(52,5),2598960n);});
test('combination is symmetric',()=>{assert.equal(combinationCount(20,4),combinationCount(20,16));});
test('combination calculator rejects invalid domains',()=>{for(const args of [[-1,0],[4,-1],[4,5],[171,2],[3.5,2],[4,1.2]])assert.throws(()=>combinationCount(...args),RangeError);});
