'use strict';
function combinationCount(n,r){
  if(!Number.isInteger(n)||!Number.isInteger(r)||n<0||r<0||r>n||n>170)throw new RangeError('Inputs must be integers with 0 <= r <= n and n <= 170.');
  r=Math.min(r,n-r);let value=1n;
  for(let i=1;i<=r;i++)value=value*BigInt(n-r+i)/BigInt(i);
  return value;
}
if(typeof module!=='undefined'&&module.exports)module.exports={combinationCount};
if(typeof document!=='undefined'){
 document.addEventListener('DOMContentLoaded',()=>{
  const form=document.getElementById('combination-form');if(!form)return;
  const output=document.getElementById('combination-result');
  form.addEventListener('submit',event=>{event.preventDefault();const n=Number(form.elements.n.value),r=Number(form.elements.r.value);
   try{const value=combinationCount(n,r);output.textContent=form.dataset.result+': '+value;}
   catch(_){output.textContent=form.dataset.error;}
  });
 });
}