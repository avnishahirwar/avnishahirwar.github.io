(()=>{'use strict';
function determinant(m){
 const n=m.length;
 if(n===1)return m[0][0];
 if(n===2)return m[0][0]*m[1][1]-m[0][1]*m[1][0];
 return m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
}
function transpose(m){return m[0].map((_,j)=>m.map(row=>row[j]));}
function add(a,b,sign=1){return a.map((row,i)=>row.map((v,j)=>v+sign*b[i][j]));}
function multiply(a,b){const bt=transpose(b);return a.map(row=>bt.map(col=>row.reduce((sum,v,i)=>sum+v*col[i],0)));}
function inverse(m){
 const n=m.length, det=determinant(m);
 if(Math.abs(det)<1e-12)throw new Error('Matrix A is singular (determinant is zero); an inverse does not exist.');
 const a=m.map((row,i)=>row.concat(Array.from({length:n},(_,j)=>i===j?1:0)));
 for(let col=0;col<n;col++){
  let pivot=col;for(let r=col+1;r<n;r++)if(Math.abs(a[r][col])>Math.abs(a[pivot][col]))pivot=r;
  if(Math.abs(a[pivot][col])<1e-12)throw new Error('A stable pivot could not be found; the matrix may be singular.');
  [a[col],a[pivot]]=[a[pivot],a[col]];
  const divisor=a[col][col];for(let j=0;j<2*n;j++)a[col][j]/=divisor;
  for(let r=0;r<n;r++){if(r===col)continue;const factor=a[r][col];for(let j=0;j<2*n;j++)a[r][j]-=factor*a[col][j];}
 }
 return a.map(row=>row.slice(n));
}
function formatNumber(x){if(Math.abs(x)<1e-10)x=0;return Number(x.toFixed(8)).toString();}
function renderMatrix(m){return '<table aria-label="Matrix result"><tbody>'+m.map(row=>'<tr>'+row.map(v=>'<td>'+formatNumber(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}
function inverseSteps(m){
 const n=m.length,a=m.map((row,i)=>row.concat(Array.from({length:n},(_,j)=>i===j?1:0))),steps=[];
 for(let col=0;col<n;col++){
  let pivot=col;
  for(let r=col+1;r<n;r++)if(Math.abs(a[r][col])>Math.abs(a[pivot][col]))pivot=r;
  if(Math.abs(a[pivot][col])<1e-12)throw new Error('A stable pivot could not be found; the matrix may be singular.');
  if(pivot!==col){[a[col],a[pivot]]=[a[pivot],a[col]];steps.push('Swap row R'+(col+1)+' with row R'+(pivot+1)+'.');}
  const divisor=a[col][col];
  steps.push('Make the pivot in R'+(col+1)+' equal to 1: divide R'+(col+1)+' by '+formatNumber(divisor)+'.');
  for(let j=0;j<2*n;j++)a[col][j]/=divisor;
  for(let r=0;r<n;r++){
   if(r===col)continue;
   const factor=a[r][col];
   if(Math.abs(factor)<1e-12)continue;
   steps.push('Eliminate column '+(col+1)+' in R'+(r+1)+': R'+(r+1)+' ← R'+(r+1)+' − ('+formatNumber(factor)+') × R'+(col+1)+'.');
   for(let j=0;j<2*n;j++)a[r][j]-=factor*a[col][j];
  }
 }
 steps.push('The left block is now the identity matrix; the right block is A⁻¹.');
 return steps;
}
function calculate(a,b,op){
 const n=a.length,det=determinant(a);
 if(op==='add'||op==='subtract'){
  const sign=op==='add'?1:-1,matrix=add(a,b,sign),symbol=sign===1?'+':'−',steps=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)steps.push('C'+(i+1)+(j+1)+' = '+formatNumber(a[i][j])+' '+symbol+' '+formatNumber(b[i][j])+' = '+formatNumber(matrix[i][j])+'.');
  return {matrix,steps};
 }
 if(op==='multiply'){
  const bt=transpose(b),matrix=multiply(a,b),steps=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
   const terms=a[i].map((v,k)=>'('+formatNumber(v)+' × '+formatNumber(bt[j][k])+')');
   steps.push('C'+(i+1)+(j+1)+' = '+terms.join(' + ')+' = '+formatNumber(matrix[i][j])+'.');
  }
  return {matrix,steps};
 }
 if(op==='transpose'){
  const matrix=transpose(a),steps=[];
  for(let i=0;i<n;i++)steps.push('Column '+(i+1)+' of Aᵀ is row '+(i+1)+' of A: ['+a[i].map(formatNumber).join(', ')+'].');
  return {matrix,steps};
 }
 if(op==='determinant'){
  if(n===2){
   const [x,y]=a[0],[z,w]=a[1];
   return {scalar:det,steps:['For A = [[a, b], [c, d]], det(A) = (a × d) − (b × c).','Substitute: det(A) = ('+formatNumber(x)+' × '+formatNumber(w)+') − ('+formatNumber(y)+' × '+formatNumber(z)+') = '+formatNumber(det)+'.']};
  }
  const [[x,y,z],[p,q,r],[s,t,u]]=a;
  const term1=formatNumber(q*u-r*t),term2=formatNumber(p*u-r*s),term3=formatNumber(p*t-q*s);
  return {scalar:det,steps:['Expand along the first row: det(A) = a(ei − fh) − b(di − fg) + c(dh − eg).','Substitute: det(A) = '+formatNumber(x)+' × ('+formatNumber(q)+' × '+formatNumber(u)+' − '+formatNumber(r)+' × '+formatNumber(t)+') − '+formatNumber(y)+' × ('+formatNumber(p)+' × '+formatNumber(u)+' − '+formatNumber(r)+' × '+formatNumber(s)+') + '+formatNumber(z)+' × ('+formatNumber(p)+' × '+formatNumber(t)+' − '+formatNumber(q)+' × '+formatNumber(s)+').','Evaluate the minors: '+formatNumber(x)+' × ('+term1+') − '+formatNumber(y)+' × ('+term2+') + '+formatNumber(z)+' × ('+term3+') = '+formatNumber(det)+'.']};
 }
 if(op==='inverse'){
  const matrix=inverse(a),steps=['Calculate det(A) = '+formatNumber(det)+'.','Because the determinant is non-zero, an inverse exists.',...inverseSteps(a)];
  return {matrix,steps};
 }
 throw new Error('Choose a supported matrix operation.');
}
if(typeof module!=='undefined'&&module.exports)module.exports={determinant,transpose,add,multiply,inverse,calculate};
if(typeof window!=='undefined')window.FriendlyMatrix={determinant,transpose,add,multiply,inverse,calculate};
function init(){
 const size=document.getElementById('matrixSize');if(!size)return;
 const operation=document.getElementById('matrixOperation'),gridA=document.getElementById('matrixA'),gridB=document.getElementById('matrixB'),fieldB=document.getElementById('matrixBField'),out=document.getElementById('matrixResult');
 function buildGrid(node,n,values){node.dataset.size=String(n);node.innerHTML='';for(let i=0;i<n*n;i++){const input=document.createElement('input');input.type='number';input.step='any';input.value=String(values[i]??0);input.setAttribute('aria-label',(node===gridA?'Matrix A':'Matrix B')+' row '+(Math.floor(i/n)+1)+' column '+(i%n+1));node.appendChild(input);}}
 function examples(){const n=Number(size.value);buildGrid(gridA,n,n===2?[1,2,3,4]:[1,2,3,0,1,4,5,6,0]);buildGrid(gridB,n,n===2?[5,6,7,8]:[2,0,1,1,3,2,4,1,0]);updateOperation();}
 function read(node,n){const values=[...node.querySelectorAll('input')].map(el=>{if(el.value.trim()==='')throw new Error('Fill every matrix cell before calculating.');const v=Number(el.value);if(!Number.isFinite(v))throw new Error('Every matrix entry must be a finite number.');return v;});return Array.from({length:n},(_,i)=>values.slice(i*n,(i+1)*n));}
 function updateOperation(){fieldB.hidden=['transpose','determinant','inverse'].includes(operation.value);}
 function run(){
  try{
   const n=Number(size.value),a=read(gridA,n),b=read(gridB,n),result=calculate(a,b,operation.value);
   let html='';
   if(result.matrix)html=renderMatrix(result.matrix);
   else html='<p><strong>det(A) = '+formatNumber(result.scalar)+'</strong></p>';
   html+='<h3>How it works</h3><ol class="steps">'+result.steps.map(step=>'<li>'+step+'</li>').join('')+'</ol>';
   out.innerHTML=html;out.classList.remove('matrix-error');out.classList.add('matrix-success');
  }catch(error){out.innerHTML='<p class="matrix-error">'+String(error.message||'Unable to calculate this matrix.')+'</p>';out.classList.remove('matrix-success');}
 }
 size.addEventListener('change',examples);operation.addEventListener('change',updateOperation);
 document.getElementById('calculateMatrix').addEventListener('click',run);
 document.getElementById('resetMatrix').addEventListener('click',()=>{examples();out.innerHTML='<p class="matrix-note">Examples restored. Choose Calculate to see the result.</p>';});
 examples();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();}
})();