(()=>{'use strict';
const r='/calculator/';
const links=[
['Home','/'],
['All Calculators',r+'site-directory.html'],
['Finance',r+'finance-calculators.html'],
['Tax',r+'tax-calculators.html'],
['Business Tools',r+'business-calculators.html'],
['Everyday',r+'everyday-calculators.html'],
['For Business',r+'business.html'],
['API',r+'api.html'],
['Plans',r+'pricing.html'],
['About',r+'about.html'],
['Contact',r+'contact.html']
];
const p=location.pathname;
if(p==='/'||p.startsWith('/calculators/')){
  const main=document.querySelector('main');
  if(main){
    const makeAd=()=>{const slot=document.createElement('aside');slot.className='fc-ad-reserved';slot.setAttribute('aria-label','Advertisement placement reserved');slot.dataset.adStatus='reserved';return slot};
    const anchor=main.querySelector('.hero')||main.querySelector('.home-intro')||main.querySelector('h1');
    if(anchor&&!main.querySelector('.fc-ad-reserved'))anchor.insertAdjacentElement('afterend',makeAd());
    if(main.querySelectorAll('.fc-ad-reserved').length<2)main.appendChild(makeAd());
  }
}
if(p.startsWith('/calculators/')){
  if(![...document.scripts].some(s=>(s.src||'').includes('/assets/page-calculators.js'))){
    const calcScript=document.createElement('script');calcScript.src='/assets/page-calculators.js';calcScript.defer=true;document.head.appendChild(calcScript);
  }
}
const h=document.createElement('header');h.className='fc-global-header';
h.innerHTML='<div class="fc-global-nav"><a class="fc-global-brand" href="/" aria-label="Friendly Calculator home">FRIENDLY <b>CALCULATOR</b></a><nav id="fc-primary-navigation" class="fc-global-links" aria-label="Main navigation">'+links.map(([n,u])=>'<a href="'+u+'"'+(p===u?' aria-current="page"':'')+'>'+n+'</a>').join('')+'<a class="fc-admin-link" href="'+r+'admin.html" rel="nofollow"'+(p===r+'admin.html'?' aria-current="page"':'')+'>Admin Dashboard</a>'+'</nav></div>';
const old=[...document.body.children].find(e=>e.tagName==='HEADER');if(old)old.replaceWith(h);else document.body.prepend(h);
const f=document.createElement('footer');f.className='fc-global-footer';
f.innerHTML='<div class="fc-global-footer-inner"><div class="fc-footer-intro"><strong>FRIENDLY CALCULATOR</strong><br><small>Practical online calculators with clear estimates.</small></div><nav class="fc-global-footer-links" aria-label="Website pages"><a href="/">Home</a><a href="'+r+'site-directory.html">All Pages Directory</a><a href="'+r+'finance-calculators.html">Finance</a><a href="'+r+'tax-calculators.html">Tax</a><a href="'+r+'business-calculators.html">Business Tools</a><a href="'+r+'everyday-calculators.html">Everyday</a><a href="'+r+'business.html">For Business</a><a href="'+r+'api.html">API</a><a href="'+r+'pricing.html">Plans</a><a href="'+r+'premium-waitlist.html">Premium Waitlist</a><a href="'+r+'about.html">About</a><a href="'+r+'methodology.html">Methodology</a><a href="'+r+'privacy.html">Privacy</a><a href="'+r+'terms.html">Terms</a><a href="'+r+'disclaimer.html">Disclaimer</a><a href="'+r+'contact.html">Contact</a></nav><small>© 2026 Friendly Calculator</small></div>';
const fs=[...document.body.children].filter(e=>e.tagName==='FOOTER');if(fs.length)fs.forEach((e,i)=>i===fs.length-1?e.replaceWith(f):e.remove());else document.body.append(f);
document.querySelectorAll('a[href="/#tools"],a[href="/#calculators"],a[href="/#contact"],a[href="#tools"],a[href="#calculators"]').forEach(a=>a.href=/contact/.test(a.getAttribute('href'))?r+'contact.html':r+'site-directory.html');
document.querySelectorAll('.ad-slot,.ad-break,.ad,.ad-placeholder,.adsense-placeholder,.advertisement,.ad-container,[data-ad-slot],[aria-label="Advertisement space"]').forEach(e=>e.remove());
if(p.startsWith('/calculators/')){
document.querySelectorAll('.faq').forEach(e=>{const t=e.textContent||'';if(t.includes('How accurate is this calculator?')&&t.includes('Does this replace professional advice?'))e.remove()});
document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{try{const j=JSON.parse(s.textContent);if(j['@type']==='FAQPage'&&Array.isArray(j.mainEntity)&&j.mainEntity.some(q=>q.name==='How accurate is this calculator?'))s.remove()}catch(_){}});
document.querySelectorAll('p').forEach(e=>{const t=(e.textContent||'').trim();if(t.startsWith('Results are estimates based on entered values and assumptions. They are not professional advice.'))e.remove()});
}
})();