(()=>{'use strict';
const r='/calculator/';
const links=[['All Calculators','/#calculator-tools'],['Business',r+'business.html'],['API',r+'api.html'],['Contact',r+'contact.html']];
const p=location.pathname;
const h=document.createElement('header');h.className='fc-global-header';
h.innerHTML='<div class="fc-global-nav"><a class="fc-global-brand" href="/" aria-label="Friendly Calculator home">FRIENDLY <b>CALCULATOR</b></a><nav class="fc-global-links" aria-label="Main navigation">'+links.map(([n,u])=>'<a href="'+u+'"'+(p===u?' aria-current="page"':'')+'>'+n+'</a>').join('')+(p===r+'admin.html'?'':'<a class="fc-admin-link" href="'+r+'admin.html" rel="nofollow">Admin</a>')+'</nav></div>';
const old=[...document.body.children].find(e=>e.tagName==='HEADER');if(old)old.replaceWith(h);else document.body.prepend(h);
const f=document.createElement('footer');f.className='fc-global-footer';
f.innerHTML='<div class="fc-global-footer-inner"><div class="fc-footer-intro"><strong>FRIENDLY CALCULATOR</strong><br><small>Practical online calculators with clear estimates.</small></div><nav class="fc-global-footer-links" aria-label="Important links"><a href="/#calculator-tools">All Calculators</a><a href="'+r+'about.html">About</a><a href="'+r+'methodology.html">Methodology</a><a href="'+r+'privacy.html">Privacy</a><a href="'+r+'terms.html">Terms</a><a href="'+r+'disclaimer.html">Disclaimer</a><a href="'+r+'contact.html">Contact</a></nav><small>© 2026 Friendly Calculator</small></div>';
const fs=[...document.body.children].filter(e=>e.tagName==='FOOTER');if(fs.length)fs.forEach((e,i)=>i===fs.length-1?e.replaceWith(f):e.remove());else document.body.append(f);
document.querySelectorAll('a[href="/#tools"],a[href="/#calculators"],a[href="#tools"],a[href="#calculators"]').forEach(a=>a.href='/#calculator-tools');
document.querySelectorAll('.ad-slot,.ad-break,.ad,.ad-placeholder,.adsense-placeholder,.advertisement,.ad-container,[data-ad-slot],[aria-label="Advertisement space"]').forEach(e=>e.remove());
if(p.startsWith('/calculators/')){
document.querySelectorAll('.faq').forEach(e=>{const t=e.textContent||'';if(t.includes('How accurate is this calculator?')&&t.includes('Does this replace professional advice?'))e.remove()});
document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{try{const j=JSON.parse(s.textContent);if(j['@type']==='FAQPage'&&Array.isArray(j.mainEntity)&&j.mainEntity.some(q=>q.name==='How accurate is this calculator?'))s.remove()}catch(_){}});
document.querySelectorAll('p').forEach(e=>{const t=(e.textContent||'').trim();if(t.startsWith('Results are estimates based on entered values and assumptions. They are not professional advice.'))e.remove()});
}
})();