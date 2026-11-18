(function(){
  const cfg=window.FC_EQUATION_CONFIG;
  if(!cfg)return;
  const form=document.getElementById('calc'),out=document.getElementById('out');
  const safe=cfg.variables||[];
  safe.forEach(v=>{const l=document.createElement('label');l.textContent=v;const i=document.createElement('input');i.name=v;i.type='number';i.step='any';l.appendChild(i);form.appendChild(l)});
  function jsExpr(s){return s.replace(/\^/g,'**').replace(/\bln\b/g,'Math.log').replace(/\blog10\b/g,'Math.log10').replace(/\bsqrt\b/g,'Math.sqrt').replace(/\babs\b/g,'Math.abs').replace(/\bpi\b/gi,'Math.PI').replace(/×/g,'*').replace(/÷/g,'/');}
  document.getElementById('go').addEventListener('click',function(){
    const vals=Object.fromEntries([...form.elements].map(i=>[i.name,Number(i.value)]));
    const rows=[];
    for(const e of (cfg.equations||[])){
      if(!e.rhs.every(k=>Number.isFinite(vals[k])))continue;
      try{const value=Function(...e.rhs,'return '+jsExpr(e.formula))( ...e.rhs.map(k=>vals[k]) );if(Number.isFinite(value))rows.push('<tr><th>'+e.lhs+'</th><td>'+value.toLocaleString(undefined,{maximumFractionDigits:10})+'</td></tr>')}catch(_){}}
    out.innerHTML=rows.length?'<table><tbody>'+rows.join('')+'</tbody></table>':'Enter all required right-hand-side values for at least one equation.';out.style.display='block';
  });
})();
