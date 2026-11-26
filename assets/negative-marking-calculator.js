(function (root) {
  'use strict';
  function calculate(input) {
    const totalQuestions=Number(input.totalQuestions), correctAnswers=Number(input.correctAnswers), incorrectAnswers=Number(input.incorrectAnswers);
    const marksPerCorrect=Number(input.marksPerCorrect), negativeMarksPerWrong=Number(input.negativeMarksPerWrong);
    if(!Number.isInteger(totalQuestions)||totalQuestions<1)throw new Error('Enter a whole number of total questions greater than zero.');
    if(!Number.isInteger(correctAnswers)||correctAnswers<0)throw new Error('Correct answers must be a whole number of zero or more.');
    if(!Number.isInteger(incorrectAnswers)||incorrectAnswers<0)throw new Error('Incorrect answers must be a whole number of zero or more.');
    if(correctAnswers+incorrectAnswers>totalQuestions)throw new Error('Correct and incorrect answers cannot exceed total questions.');
    if(!Number.isFinite(marksPerCorrect)||marksPerCorrect<=0)throw new Error('Marks per correct answer must be greater than zero.');
    if(!Number.isFinite(negativeMarksPerWrong)||negativeMarksPerWrong<0)throw new Error('The penalty per incorrect answer cannot be negative.');
    const attempted=correctAnswers+incorrectAnswers, unattempted=totalQuestions-attempted;
    const marksEarned=correctAnswers*marksPerCorrect, marksDeducted=incorrectAnswers*negativeMarksPerWrong;
    const netScore=marksEarned-marksDeducted, maximumMarks=totalQuestions*marksPerCorrect;
    return {totalQuestions,correctAnswers,incorrectAnswers,attempted,unattempted,marksEarned,marksDeducted,netScore,maximumMarks,accuracyPercent:attempted===0?0:correctAnswers/attempted*100,attemptRatePercent:attempted/totalQuestions*100,scorePercent:Math.round(netScore/maximumMarks*10000)/100};
  }
  const api={calculate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.FriendlyNegativeMarkingCalculator=api;
  if(root&&root.document){
    const bind=()=>{
      const form=root.document.getElementById('negative-marking-form'), result=root.document.getElementById('calculator-result'), error=root.document.getElementById('calculator-error');
      if(!form||!result||form.dataset.fcNegativeMarkingBound==='true')return;
      form.dataset.fcNegativeMarkingBound='true';
      const number=id=>{const field=root.document.getElementById(id);return field?Number(field.value):NaN;};
      const format=value=>Number(value).toLocaleString('en-IN',{maximumFractionDigits:2});
      form.addEventListener('submit',event=>{
        event.preventDefault();if(error)error.textContent='';
        try{
          const v=calculate({totalQuestions:number('total-questions'),correctAnswers:number('correct-answers'),incorrectAnswers:number('incorrect-answers'),marksPerCorrect:number('marks-per-correct'),negativeMarksPerWrong:number('penalty-per-wrong')});
          result.innerHTML='<div class="result-grid"><div class="metric"><span>Net score</span><strong>'+format(v.netScore)+' / '+format(v.maximumMarks)+'</strong></div><div class="metric"><span>Accuracy</span><strong>'+format(v.accuracyPercent)+'%</strong></div><div class="metric"><span>Attempt rate</span><strong>'+format(v.attemptRatePercent)+'%</strong></div><div class="metric"><span>Unattempted</span><strong>'+format(v.unattempted)+'</strong></div><div class="metric"><span>Marks earned</span><strong>'+format(v.marksEarned)+'</strong></div><div class="metric"><span>Negative marks</span><strong>'+format(v.marksDeducted)+'</strong></div></div>';
        }catch(problem){if(error)error.textContent=problem.message;result.innerHTML='<p class="muted">Correct the inputs to calculate your score.</p>';}
      });
      form.addEventListener('reset',()=>{if(error)error.textContent='';result.innerHTML='<p class="muted">Your result will appear here after calculation.</p>';});
    };
    if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  }
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
