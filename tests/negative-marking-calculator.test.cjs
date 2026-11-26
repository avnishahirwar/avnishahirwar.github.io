const test=require('node:test');
const assert=require('node:assert/strict');
const calculator=require('../assets/negative-marking-calculator.js');
test('calculates net score, accuracy, attempt rate and unattempted questions',()=>{
 const r=calculator.calculate({totalQuestions:100,correctAnswers:62,incorrectAnswers:18,marksPerCorrect:4,negativeMarksPerWrong:1});
 assert.equal(r.marksEarned,248);assert.equal(r.marksDeducted,18);assert.equal(r.netScore,230);assert.equal(r.maximumMarks,400);
 assert.equal(r.attempted,80);assert.equal(r.unattempted,20);assert.equal(r.accuracyPercent,77.5);assert.equal(r.attemptRatePercent,80);assert.equal(r.scorePercent,57.5);
});
test('supports no penalty and no attempted answers',()=>{
 const r=calculator.calculate({totalQuestions:20,correctAnswers:0,incorrectAnswers:0,marksPerCorrect:2,negativeMarksPerWrong:0});
 assert.equal(r.netScore,0);assert.equal(r.accuracyPercent,0);assert.equal(r.attemptRatePercent,0);assert.equal(r.unattempted,20);
});
test('keeps negative net scores instead of flooring them',()=>{
 const r=calculator.calculate({totalQuestions:10,correctAnswers:1,incorrectAnswers:9,marksPerCorrect:1,negativeMarksPerWrong:2});
 assert.equal(r.netScore,-17);assert.equal(r.scorePercent,-170);
});
test('rejects invalid counts and marking values',()=>{
 const b={totalQuestions:10,correctAnswers:4,incorrectAnswers:3,marksPerCorrect:4,negativeMarksPerWrong:1};
 assert.throws(()=>calculator.calculate({...b,totalQuestions:0}),/greater than zero/);
 assert.throws(()=>calculator.calculate({...b,correctAnswers:4.5}),/whole number/);
 assert.throws(()=>calculator.calculate({...b,incorrectAnswers:-1}),/whole number/);
 assert.throws(()=>calculator.calculate({...b,correctAnswers:8,incorrectAnswers:3}),/cannot exceed total questions/);
 assert.throws(()=>calculator.calculate({...b,marksPerCorrect:0}),/greater than zero/);
 assert.throws(()=>calculator.calculate({...b,negativeMarksPerWrong:-0.25}),/cannot be negative/);
});
