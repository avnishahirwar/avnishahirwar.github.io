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
function evaluateScientificExpression(input,mode='deg',variable=null,trace=null){
 const t=tokenize(input);let p=0;const peek=()=>t[p];const take=()=>t[p++];
 const expect=x=>{if(!peek()||peek().type!==x)throw new Error('Expected '+x);return take()};
 const record=(label,value)=>{if(Array.isArray(trace)&&Number.isFinite(value))trace.push({label,value})};
 const funcs={sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,sqrt:Math.sqrt,log:Math.log10,ln:Math.log,abs:Math.abs,exp:Math.exp};
 const angleIn=x=>mode==='deg'?x*Math.PI/180:x;const angleOut=x=>mode==='deg'?x*180/Math.PI:x;
 function primary(){
  const token=peek();if(!token)throw new Error('Enter an expression');
  if(token.type==='number'){take();return token.value}
  if(token.type==='+'){take();return primary()}
  if(token.type==='-'){take();const v=-primary();record('Apply unary minus',v);return v}
  if(token.type==='('){take();const v=expression();expect(')');return v}
  if(token.type==='word'){
   const name=take().value;if(name==='pi')return Math.PI;if(name==='e')return Math.E;
   if(name==='x'){if(variable===null)throw new Error('Use x only in graph mode');return variable}
   if(!funcs[name])throw new Error('Unknown function or constant: '+name);
   expect('(');const arg=expression();expect(')');
   const inputValue=['sin','cos','tan'].includes(name)?angleIn(arg):arg;
   const raw=funcs[name](inputValue),value=['asin','acos','atan'].includes(name)?angleOut(raw):raw;
   record(name+'('+format(arg)+')',value);return value;
  }
  throw new Error('Unexpected token: '+token.value);
 }
 function power(){let a=primary();if(peek()&&peek().type==='^'){take();const b=power();a=Math.pow(a,b);record('Evaluate power',a)}return a}
 function term(){let a=power();while(peek()&&['*','/'].includes(peek().type)){const op=take().type,b=power();a=op==='*'?a*b:a/b;record(op==='*'?'Multiply':'Divide',a)}return a}
 function expression(){let a=term();while(peek()&&['+','-'].includes(peek().type)){const op=take().type,b=term();a=op==='+'?a+b:a-b;record(op==='+'?'Add':'Subtract',a)}return a}
 if(!t.length)throw new Error('Enter an expression');const value=expression();if(p!==t.length)throw new Error('Unexpected token: '+peek().value);if(!Number.isFinite(value))throw new Error('Expression is outside the supported real-number domain');return value;
}
function format(n){return new Intl.NumberFormat('en-IN',{maximumFractionDigits:8}).format(n)}
window.FCScientific={evaluate:evaluateScientificExpression};
document.addEventListener('DOMContentLoaded',()=>{
 const input=document.getElementById('expression'),result=document.getElementById('result'),status=document.getElementById('status'),mode=document.getElementById('angleMode'),keys=document.getElementById('keys');
 const steps=document.getElementById('workedSteps'),graph=document.getElementById('functionGraph'),graphStatus=document.getElementById('graphStatus');
 const calculate=()=>{
  try{
   const trace=[],value=evaluateScientificExpression(input.value,mode.value,null,trace);
   result.textContent=format(value);status.textContent='Evaluated in '+(mode.value==='deg'?'degree':'radian')+' mode.';
   if(steps){steps.replaceChildren();const intro=document.createElement('li');intro.textContent='Start with: '+input.value;steps.appendChild(intro);trace.forEach(item=>{const li=document.createElement('li');li.textContent=item.label+' → '+format(item.value);steps.appendChild(li)});const final=document.createElement('li');final.textContent='Final result = '+format(value);steps.appendChild(final)}
   if(typeof window.gtag==='function')window.gtag('event','calculator_calculate',{calculator_name:'Scientific Calculator',calculator_path:location.pathname});
  }catch(e){result.textContent='—';status.textContent=e.message;if(steps)steps.replaceChildren()}
  drawGraph();
 };
 function drawGraph(){
  if(!graph)return;const ctx=graph.getContext('2d');if(!ctx)return;
  const w=graph.width= Math.max(320,Math.floor(graph.clientWidth*devicePixelRatio)),h=graph.height= Math.floor(260*devicePixelRatio);
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
  const xmin=-10,xmax=10,ymin=-10,ymax=10,X=x=>((x-xmin)/(xmax-xmin))*w,Y=y=>h-((y-ymin)/(ymax-ymin))*h;
  ctx.strokeStyle='#e2e8ef';ctx.lineWidth=1;for(let i=0;i<=20;i++){const x=i*w/20,y=i*h/20;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  ctx.strokeStyle='#64748b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(X(0),0);ctx.lineTo(X(0),h);ctx.moveTo(0,Y(0));ctx.lineTo(w,Y(0));ctx.stroke();
  ctx.strokeStyle='#b68b3d';ctx.lineWidth=2.5;ctx.beginPath();let pen=false;
  for(let px=0;px<=w;px+=2){const x=xmin+(px/w)*(xmax-xmin);let y;try{y=evaluateScientificExpression(input.value,mode.value,x)}catch(e){pen=false;continue}
   if(!Number.isFinite(y)||Math.abs(y)>100){pen=false;continue}const py=Y(y);if(!pen){ctx.moveTo(px,py);pen=true}else ctx.lineTo(px,py)}
  ctx.stroke();if(graphStatus)graphStatus.textContent='Graph of y = '+input.value+' for x from −10 to 10; y-axis clipped to −10 to 10.';
 }
 document.getElementById('calculate').addEventListener('click',calculate);
 document.getElementById('clear').addEventListener('click',()=>{input.value='';result.textContent='—';status.textContent='Enter a mathematical expression.';if(steps)steps.replaceChildren();if(graphStatus)graphStatus.textContent='Enter an expression containing x to graph it.';if(graph){const c=graph.getContext('2d');c&&c.clearRect(0,0,graph.width,graph.height)}input.focus()});
 keys.addEventListener('click',e=>{const b=e.target.closest('button[data-key]');if(!b)return;const k=b.dataset.key;if(k==='AC'){input.value=''}else if(k==='⌫'){input.value=input.value.slice(0,-1)}else if(k==='='){calculate();return}else input.value+=k;input.focus()});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();calculate()}});
 calculate();
});
})();