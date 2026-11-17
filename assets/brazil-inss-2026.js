(function(root){'use strict';
function amount(value,name){const n=Number(value);if(!Number.isFinite(n)||n<0)throw new RangeError(name+' deve ser um número não negativo.');return n;}
function calculateBrazilINSS2026(monthlySalary){
 const gross=amount(monthlySalary,'Salário mensal');
 const cap=8475.55,base=Math.min(gross,cap);
 const bands=[[1621,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]];
 let contribution=0,lower=0;
 for(const [upper,rate] of bands){const slice=Math.max(0,Math.min(base,upper)-lower);contribution+=slice*rate;if(base<=upper)break;lower=upper;}
 contribution=Math.round((contribution+Number.EPSILON)*100)/100;
 return {gross,contributionBase:base,contribution,estimatedNetAfterINSS:Math.max(0,gross-contribution),ceiling:cap,capped:gross>cap,effectiveRate:gross>0?contribution/gross*100:0,year:2026,scope:'Empregado, empregado doméstico e trabalhador avulso; contribuição progressiva mensal. Não inclui IRPF, FGTS, benefícios, múltiplos vínculos ou categorias individuais/facultativas.'};
}
const api={calculateBrazilINSS2026};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FCBrazilINSS2026=Object.freeze(api);
if(typeof document!=='undefined'){
 const form=document.getElementById('br-inss-form'),salary=document.getElementById('br-inss-salary'),result=document.getElementById('br-inss-result'),error=document.getElementById('br-inss-error');
 if(form){const fmt=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2}).format(n);
 form.addEventListener('submit',event=>{event.preventDefault();try{const r=calculateBrazilINSS2026(salary.value);error.textContent='';result.replaceChildren();const heading=document.createElement('strong');heading.textContent='Contribuição mensal estimada: '+fmt(r.contribution);const dl=document.createElement('dl');const rows=[['Salário mensal informado',fmt(r.gross)],['Base limitada ao teto',fmt(r.contributionBase)],['Teto previdenciário 2026',fmt(r.ceiling)],['Alíquota efetiva sobre o salário',r.effectiveRate.toFixed(2)+'%'],['Salário após INSS (antes de IRPF e outros descontos)',fmt(r.estimatedNetAfterINSS)]];for(const [label,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}result.append(heading,dl);if(r.capped){const note=document.createElement('p');note.textContent='A base de contribuição foi limitada ao teto previdenciário mensal de 2026.';result.append(note);}if(typeof gtag==='function')gtag('event','calculator_used',{calculator_page:location.pathname,calculator_action:'calculate'});}catch(err){result.replaceChildren();error.textContent=err.message;}});form.requestSubmit();}
}
})(typeof window!=='undefined'?window:globalThis);
