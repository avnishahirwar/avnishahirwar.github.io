(()=>{'use strict';
function tokenize(input){
 const tokens=[];let i=0;const s=input.replace(/π/gi,'pi');
 while(i<s.length){if(/\s/.test(s[i])){i++;continue}
  const number=s.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
  if(number){tokens.push({type:'number',value:Number(number[0])});i+=number[0].length;continue}
  const word=s.slice(i).match(/^[a-z]+/i);if(word){tokens.push({type:'word',value:word[0].toLowerCase()});i+=word[0].length;continue}
  if('+-*/^(),'.includes(s[i])){tokens.push({type:s[i],value:s[i]});i++;continue}
  throw new Error('Unsupported character: '+s[i]);
 }
 return tokens;
}
function evaluateScientificExpression(input,mode='deg'){
 const t=tokenize(input);let p=0;const peek=()=>t[p];const take=()=>t[p++];
 const expect=x=>{if(!peek()||peek().type!==x)throw new Error('Expected '+x);return take()};
 const funcs={sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,sqrt:Math.sqrt,log:Math.log10,ln:Math.log,abs:Math.abs,exp:Math.exp};
 const angleIn=x=>mode==='deg'?x*Math.PI/180:x;const angleOut=x=>mode==='deg'?x*180/Math.PI:x;
 function primary(){
  const token=peek();if(!token)throw new Error('Enter an expression');
  if(token.type==='number'){take();return token.value}
  if(token.type==='+'){take();return primary()}
  if(token.type==='-'){take();return -primary()}
  if(token.type==='('){take();const v=expression();expect(')');return v}
  if(token.type==='word'){
   const name=take().value;if(name==='pi')return Math.PI;if(name==='e')return Math.E;
   if(!funcs[name])throw new Error('Unknown function or constant: '+name);
   expect('(');const arg=expression();expect(')');
   const inputValue=['sin','cos','tan'].includes(name)?angleIn(arg):arg;
   const value=funcs[name](inputValue);
   return ['asin','acos','atan'].includes(name)?angleOut(value):value;
  }
  throw new Error('Unexpected token: '+token.value);
 }
 function power(){let a=primary();if(peek()&&peek().type==='^'){take();a=Math.pow(a,power())}return a}
 function term(){let a=power();while(peek()&&['*','/'].includes(peek().type)){const op=take().type,b=power();a=op==='*'?a*b:a/b}return a}
 function expression(){let a=term();while(peek()&&['+','-'].includes(peek().type)){const op=take().type,b=term();a=op==='+'?a+b:a-b}return a}
 if(!t.length)throw new Error('Enter an expression');const value=expression();if(p!==t.length)throw new Error('Unexpected token: '+peek().value);if(!Number.isFinite(value))throw new Error('Expression is outside the supported real-number domain');return value;
}
window.FCScientific={evaluate:evaluateScientificExpression};
document.addEventListener('DOMContentLoaded',()=>{
 const input=document.getElementById('expression'),result=document.getElementById('result'),status=document.getElementById('status'),mode=document.getElementById('angleMode'),keys=document.getElementById('keys');
 const calculate=()=>{try{const value=evaluateScientificExpression(input.value,mode.value);result.textContent=new Intl.NumberFormat('en-IN',{maximumFractionDigits:12}).format(value);status.textContent='Evaluated in '+(mode.value==='deg'?'degree':'radian')+' mode.';if(typeof window.gtag==='function')window.gtag('event','calculator_calculate',{calculator_name:'Scientific Calculator',calculator_path:location.pathname})}catch(e){result.textContent='—';status.textContent=e.message}};
 document.getElementById('calculate').addEventListener('click',calculate);
 document.getElementById('clear').addEventListener('click',()=>{input.value='';result.textContent='—';status.textContent='Enter a mathematical expression.';input.focus()});
 keys.addEventListener('click',e=>{const b=e.target.closest('button[data-key]');if(!b)return;const k=b.dataset.key;if(k==='AC'){input.value='';}else if(k==='⌫'){input.value=input.value.slice(0,-1)}else if(k==='='){calculate();return}else input.value+=k;input.focus()});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();calculate()}});
 calculate();
});
})();