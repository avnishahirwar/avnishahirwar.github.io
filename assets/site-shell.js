(()=>{'use strict';
const p=location.pathname;
const hi=p.startsWith('/hi/');
const r='/calculator/';
const links=hi?[
['होम','/hi/index.html'],['कैलकुलेटर',r+'site-directory.html'],['वित्त',r+'finance-calculators.html'],['टैक्स',r+'tax-calculators.html'],['बिज़नेस',r+'business-calculators.html'],['हमारे बारे में','/hi/about.html'],['तरीका','/hi/methodology.html'],['संपर्क','/hi/contact.html']
]:[
['Home','/'],['Log In',r+'dashboard.html'],['All Calculators',r+'site-directory.html'],['Finance',r+'finance-calculators.html'],['Tax',r+'tax-calculators.html'],['Business Tools',r+'business-calculators.html'],['Everyday',r+'everyday-calculators.html'],['For Business',r+'business.html'],['API',r+'api.html'],['Plans',r+'pricing.html'],['About',r+'about.html'],['Contact',r+'contact.html'],['Admin',r+'admin.html']
];
if(p==='/calculator/contact.html'){const robots=[...document.head.querySelectorAll('meta[name="robots" i]')];if(robots.length){robots[0].content='index,follow,max-image-preview:large';robots.slice(1).forEach(m=>m.remove())}document.head.querySelectorAll('meta[name="googlebot" i]').forEach(m=>m.remove())}
if(!document.querySelector('link[rel="icon"][type="image/png"]')){const l=document.createElement('link');l.rel='icon';l.type='image/png';l.sizes='192x192';l.href='/favicon-96.png';document.head.prepend(l)}if(!document.querySelector('link[rel="icon"][type="image/svg+xml"]')){const l=document.createElement('link');l.rel='icon';l.type='image/svg+xml';l.href='/favicon.svg';document.head.appendChild(l)}if(!document.querySelector('link[rel="apple-touch-icon"]')){const l=document.createElement('link');l.rel='apple-touch-icon';l.sizes='180x180';l.href='/apple-touch-icon.png';document.head.appendChild(l)}

// Ad placements stay absent until approved ad units are configured and serving.
if(p.startsWith('/calculators/')){
  if(![...document.scripts].some(s=>(s.src||'').includes('/assets/page-calculators.js'))){
    const calcScript=document.createElement('script');calcScript.src='/assets/page-calculators.js';calcScript.defer=true;document.head.appendChild(calcScript);
  }
}
const main=document.querySelector('main,[role="main"]');
if(main&&!main.id)main.id='fc-main-content';
if(main&&!document.querySelector('.fc-skip-link')){
  const skip=document.createElement('a');skip.className='fc-skip-link';skip.href='#fc-main-content';skip.textContent='Skip to main content';document.body.prepend(skip);
}
const h=document.createElement('header');h.className='fc-global-header';
const languageHref=hi?'/':'/hi/index.html'; const languageLabel=hi?'English':'हिन्दी';
h.innerHTML='<div class="fc-global-nav"><a class="fc-global-brand" href="'+(hi?'/hi/index.html':'/')+'" aria-label="Friendly Calculator home"><img class="fc-brand-mark" src="/favicon.svg" width="34" height="34" alt="" decoding="async"> <span>FRIENDLY <b>CALCULATOR</b></span></a><nav id="fc-primary-navigation" class="fc-global-links" aria-label="Main navigation">'+links.map(([n,u])=>'<a href="'+u+'"'+(p===u?' aria-current="page"':'')+(n==='Log In'?' class="fc-login-link"':'')+'>'+n+'</a>').join('')+'<a href="'+languageHref+'" lang="'+(hi?'en':'hi')+'">'+languageLabel+'</a></nav></div>';
const old=[...document.body.children].find(e=>e.tagName==='HEADER');if(old)old.replaceWith(h);else document.body.prepend(h);
const f=document.createElement('footer');f.className='fc-global-footer';
f.innerHTML='<div class="fc-global-footer-inner"><div class="fc-footer-intro"><img class="fc-footer-mark" src="/favicon.svg" width="30" height="30" alt="" loading="lazy" decoding="async"><strong>FRIENDLY CALCULATOR</strong><br><small>Practical online calculators with clear estimates.</small></div><nav class="fc-global-footer-links" aria-label="Website pages"><a href="/">Home</a><a href="'+r+'site-directory.html">All Pages Directory</a><a href="'+r+'finance-calculators.html">Finance</a><a href="'+r+'tax-calculators.html">Tax</a><a href="'+r+'business-calculators.html">Business Tools</a><a href="'+r+'everyday-calculators.html">Everyday</a><a href="'+r+'business.html">For Business</a><a href="'+r+'api.html">API</a><a href="'+r+'pricing.html">Plans</a><a href="'+r+'premium-waitlist.html">Premium Waitlist</a><a href="'+r+'about.html">About</a><a href="'+r+'methodology.html">Methodology</a><a href="'+r+'privacy.html">Privacy</a><a href="'+r+'terms.html">Terms</a><a href="'+r+'disclaimer.html">Disclaimer</a><a href="'+r+'contact.html">Contact</a><a href="'+languageHref+'" lang="'+(hi?'en':'hi')+'">'+languageLabel+'</a></nav><nav class="fc-social-links" aria-label="Social media and contact"><a class="fc-social-link" href="https://www.instagram.com/avnish_ahirwar" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg></a><a class="fc-social-link" href="https://www.linkedin.com/in/avnishahirwar415" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.2 8.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6M3.7 10h3v10h-3zM9 10h2.9v1.4h.1c.4-.8 1.4-1.7 2.9-1.7 3.1 0 3.7 2 3.7 4.5V20h-3v-5.2c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6V20H9z"/></svg></a><a class="fc-social-link" href="mailto:avnishahirwar415@gmail.com" aria-label="Email" title="Email"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a></nav><small>© 2026 Friendly Calculator</small></div>';
const fs=[...document.body.children].filter(e=>e.tagName==='FOOTER');if(fs.length)fs.forEach((e,i)=>i===fs.length-1?e.replaceWith(f):e.remove());else document.body.append(f);
document.querySelectorAll('a[href="/#tools"],a[href="/#calculators"],a[href="/#contact"],a[href="#tools"],a[href="#calculators"]').forEach(a=>a.href=/contact/.test(a.getAttribute('href'))?r+'contact.html':r+'site-directory.html');
if(p.startsWith('/calculators/')){document.querySelectorAll('a[href^="/#calc-"]').forEach(a=>{const section=document.getElementById('live-page-calculator');if(section)a.href='#live-page-calculator';else{const control=document.querySelector('main form,main input,main select,main button');if(control){const target=control.closest('section')||control.parentElement;if(target){if(!target.id)target.id='fc-calculator';a.href='#'+target.id;}}}});}
document.querySelectorAll('.ad-slot,.ad-break,.ad,.ad-placeholder,.adsense-placeholder,.advertisement,.ad-container,[data-ad-slot],[aria-label="Advertisement space"]').forEach(e=>e.remove());
if(p.startsWith('/calculators/')){
document.querySelectorAll('.faq').forEach(e=>{const t=e.textContent||'';if(t.includes('How accurate is this calculator?')&&t.includes('Does this replace professional advice?'))e.remove()});
document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{try{const j=JSON.parse(s.textContent);if(j['@type']==='FAQPage'&&Array.isArray(j.mainEntity)&&j.mainEntity.some(q=>q.name==='How accurate is this calculator?'))s.remove()}catch(_){}});
document.querySelectorAll('p').forEach(e=>{const t=(e.textContent||'').trim();if(t.startsWith('Results are estimates based on entered values and assumptions. They are not professional advice.'))e.remove()});
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button||!p.startsWith('/calculators/'))return;
  const label=(button.textContent||'').trim();
  const isCalculate=/calculate/i.test(label)||(p.endsWith('/basic-calculator.html')&&label==='=');
  if(!isCalculate||typeof window.gtag!=='function')return;
  window.gtag('event','calculator_calculate',{
    calculator_name:(document.querySelector('h1')?.textContent||'Calculator').trim(),
    calculator_path:p,
    control_label:label
  });
});
document.addEventListener('change',event=>{
  const field=event.target;
  if(!field||field.id!=='calculatorSearch'||!field.value.trim()||typeof window.gtag!=='function')return;
  const count=Number((document.getElementById('searchCount')?.textContent||'').match(/\d+/)?.[0]||0);
  window.gtag('event','calculator_search',{
    search_term_length:field.value.trim().length,
    results_count:count
  });
});

// Give visitors simple, non-intrusive ways to share useful calculator pages.
if(p.startsWith('/calculators/')&&main&&!document.querySelector('.fc-share-panel')){
  const shareUrl=location.href.split('#')[0];
  const shareTitle=(document.querySelector('h1')?.textContent||document.title||'Friendly Calculator').trim();
  const encodedUrl=encodeURIComponent(shareUrl);
  const encodedText=encodeURIComponent(shareTitle+' — Friendly Calculator');
  const shareItems=[
    ['WhatsApp','https://wa.me/?text='+encodedText+'%20'+encodedUrl],
    ['Facebook','https://www.facebook.com/sharer/sharer.php?u='+encodedUrl],
    ['X','https://twitter.com/intent/tweet?text='+encodedText+'&url='+encodedUrl],
    ['Telegram','https://t.me/share/url?url='+encodedUrl+'&text='+encodedText],
    ['LinkedIn','https://www.linkedin.com/sharing/share-offsite/?url='+encodedUrl],
    ['Email','mailto:?subject='+encodedText+'&body='+encodedUrl]
  ];
  const panel=document.createElement('section');
  panel.className='fc-share-panel';
  panel.setAttribute('aria-label','Share this calculator');
  const heading=document.createElement('h2');heading.textContent='Share this calculator';
  const intro=document.createElement('p');intro.textContent='Found this tool useful? Share the calculator page with someone who may need it.';
  const actions=document.createElement('div');actions.className='fc-share-actions';
  shareItems.forEach(([label,href])=>{
    const a=document.createElement('a');a.className='fc-share-link';a.href=href;a.textContent=label;
    if(!href.startsWith('mailto:')){a.target='_blank';a.rel='noopener noreferrer'}
    a.addEventListener('click',()=>{if(typeof window.gtag==='function')window.gtag('event','share_click',{method:label,content_type:'calculator',item_id:p})});
    actions.append(a);
  });
  const copy=document.createElement('button');copy.className='fc-share-copy';copy.type='button';copy.textContent='Copy link';
  copy.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(shareUrl);copy.textContent='Link copied';if(typeof window.gtag==='function')window.gtag('event','share_click',{method:'copy_link',content_type:'calculator',item_id:p});}
    catch(_){copy.textContent='Copy unavailable';}
  });
  actions.append(copy);panel.append(heading,intro,actions);main.append(panel);
}

})();