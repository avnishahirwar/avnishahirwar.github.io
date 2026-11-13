(()=>{'use strict';
/* Keep the site favicon consistent, including legacy and localized pages. */
const ensureFavicon=()=>{
  const icons=[...document.querySelectorAll('link[rel~="icon"]')];
  if(!icons.length){
    const link=document.createElement('link');
    link.rel='icon';link.type='image/png';link.sizes='96x96';link.href='/favicon-96.png';
    document.head.appendChild(link);
    return;
  }
  for(const icon of icons){
    const href=icon.getAttribute('href')||'';
    let pathname='';
    try{pathname=new URL(href,location.href).pathname.toLowerCase();}catch(_){continue;}
    if(pathname.endsWith('.png'))icon.type='image/png';
    else if(pathname.endsWith('.svg'))icon.type='image/svg+xml';
    else if(pathname.endsWith('.ico'))icon.type='image/x-icon';
  }
};
ensureFavicon();
// Privacy-first analytics: GA4 is the only configured analytics provider.
// Ensure localized pages also report to the same Friendly Calculator GA4 stream.
if(typeof window.gtag!=='function'){
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments)};
  window.gtag('js',new Date());window.gtag('config','G-QVWQSEDRGL');
  const gaScript=document.createElement('script');gaScript.async=true;gaScript.src='https://www.googletagmanager.com/gtag/js?id=G-QVWQSEDRGL';document.head.appendChild(gaScript);
}


const p=location.pathname;
const hi=p.startsWith('/hi/');
const r='/calculator/';
const links=hi?[
['होम','/hi/index.html'],['लॉग इन',r+'dashboard.html'],['सभी कैलकुलेटर',r+'site-directory.html'],['वित्त',r+'finance-calculators.html'],['टैक्स',r+'tax-calculators.html'],['बिज़नेस',r+'business-calculators.html'],['रोज़मर्रा',r+'everyday-calculators.html'],['बिज़नेस सेवाएँ',r+'business.html'],['API',r+'api.html'],['प्लान',r+'pricing.html'],['हमारे बारे में','/hi/about.html'],['संपर्क','/hi/contact.html'],['एडमिन',r+'admin.html']
]:[
['Home','/'],['Log In',r+'dashboard.html'],['All Calculators',r+'site-directory.html'],['Finance',r+'finance-calculators.html'],['Tax',r+'tax-calculators.html'],['Business Tools',r+'business-calculators.html'],['Everyday',r+'everyday-calculators.html'],['For Business',r+'business.html'],['API',r+'api.html'],['Plans',r+'pricing.html'],['About',r+'about.html'],['Contact',r+'contact.html'],['Admin',r+'admin.html']
];
if(p==='/calculator/contact.html'){const robots=[...document.head.querySelectorAll('meta[name="robots" i]')];if(robots.length){robots[0].content='index,follow,max-image-preview:large';robots.slice(1).forEach(m=>m.remove())}document.head.querySelectorAll('meta[name="googlebot" i]').forEach(m=>m.remove())}
// One PNG favicon, one theme colour and one share-preview image across the site.
document.querySelectorAll('link[rel~="icon"],link[rel="shortcut icon"]').forEach(node=>node.remove());
const favicon=document.createElement('link');favicon.rel='icon';favicon.type='image/png';favicon.sizes='96x96';favicon.href='/favicon-96.png';document.head.appendChild(favicon);
if(!document.querySelector('link[rel="apple-touch-icon"]')){const apple=document.createElement('link');apple.rel='apple-touch-icon';apple.sizes='180x180';apple.href='/apple-touch-icon.png';document.head.appendChild(apple);}
const themeMeta=document.querySelector('meta[name="theme-color" i]')||document.head.appendChild(document.createElement('meta'));
themeMeta.name='theme-color';themeMeta.content='#101c2c';
const setMeta=(selector,attr,value)=>{let node=document.head.querySelector(selector);if(!node){node=document.createElement('meta');const key=selector.match(/\[(property|name)=["']([^"']+)["']\]/);if(key)node.setAttribute(key[1],key[2]);document.head.appendChild(node);}node.setAttribute(attr,value);};
setMeta('meta[property="og:image"]','content','https://friendlycalculator.in/og-friendly-calculator.png');
setMeta('meta[property="og:image:type"]','content','image/png');
setMeta('meta[property="og:image:width"]','content','1200');
setMeta('meta[property="og:image:height"]','content','630');
setMeta('meta[name="twitter:card"]','content','summary_large_image');
setMeta('meta[name="twitter:image"]','content','https://friendlycalculator.in/og-friendly-calculator.png');


// Ad placements stay absent until approved ad units are configured and serving.
if(p.includes('/calculators/compound-interest-calculator.html')&&p.split('/').length>3){document.getElementById('v3')?.closest('label')?.remove();}
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
const localeNames={en:'English',hi:'हिन्दी',es:'Español',fr:'Français',pt:'Português',ar:'العربية',id:'Bahasa Indonesia',bn:'বাংলা',ta:'தமிழ்'};
const currentLocale=p.startsWith('/hi/')?'hi':(/^\/(es|fr|pt|ar|id|bn|ta)\//.exec(p)||[])[1]||'en';
const localeHome={en:'/',hi:'/hi/index.html',es:'/es/index.html',fr:'/fr/index.html',pt:'/pt/index.html',ar:'/ar/index.html',id:'/id/index.html',bn:'/bn/index.html',ta:'/ta/index.html'};
// Honour a language explicitly chosen by the visitor on future visits to the English root.
try{const savedLocale=localStorage.getItem('fc-language-preference');if(p==='/'&&savedLocale&&savedLocale!=='en'&&localeHome[savedLocale])location.replace(localeHome[savedLocale]);}catch(_){}

const chrome={
en:{home:'Home',login:'Log In',all:'All Calculators',finance:'Finance',tax:'Tax',business:'Business Tools',everyday:'Everyday',forBusiness:'For Business',api:'API',plans:'Plans',about:'About',contact:'Contact',admin:'Admin',language:'Language',choose:'Choose website language',change:'Change language',footer:['Home','All Pages Directory','Finance','Tax','Business Tools','Everyday','For Business','API','Plans','Premium Waitlist','About','Methodology','Privacy','Terms','Disclaimer','Contact']},
hi:{home:'होम',login:'लॉग इन',all:'सभी कैलकुलेटर',finance:'वित्त',tax:'टैक्स',business:'बिज़नेस टूल्स',everyday:'रोज़मर्रा',forBusiness:'बिज़नेस सेवाएँ',api:'API',plans:'प्लान',about:'हमारे बारे में',contact:'संपर्क',admin:'एडमिन',language:'भाषा',choose:'वेबसाइट की भाषा चुनें',change:'भाषा बदलें',footer:['होम','सभी पेज','वित्त','टैक्स','बिज़नेस टूल्स','रोज़मर्रा','बिज़नेस सेवाएँ','API','प्लान','प्रीमियम वेटलिस्ट','हमारे बारे में','कार्यप्रणाली','गोपनीयता','नियम','अस्वीकरण','संपर्क']},
es:{home:'Inicio',login:'Iniciar sesión',all:'Calculadoras',finance:'Finanzas',tax:'Impuestos',business:'Herramientas de negocio',everyday:'Diario',forBusiness:'Para empresas',api:'API',plans:'Planes',about:'Acerca de',contact:'Contacto',admin:'Admin',language:'Idioma',choose:'Elegir idioma del sitio',change:'Cambiar idioma',footer:['Inicio','Directorio','Finanzas','Impuestos','Negocios','Diario','Para empresas','API','Planes','Lista premium','Acerca de','Metodología','Privacidad','Términos','Aviso legal','Contacto']},
fr:{home:'Accueil',login:'Connexion',all:'Calculatrices',finance:'Finance',tax:'Impôts',business:'Outils professionnels',everyday:'Quotidien',forBusiness:'Pour les entreprises',api:'API',plans:'Offres',about:'À propos',contact:'Contact',admin:'Admin',language:'Langue',choose:'Choisir la langue du site',change:'Changer de langue',footer:['Accueil','Répertoire','Finance','Impôts','Entreprise','Quotidien','Entreprises','API','Offres','Liste premium','À propos','Méthodologie','Confidentialité','Conditions','Avertissement','Contact']},
pt:{home:'Início',login:'Entrar',all:'Calculadoras',finance:'Finanças',tax:'Impostos',business:'Ferramentas empresariais',everyday:'Dia a dia',forBusiness:'Para empresas',api:'API',plans:'Planos',about:'Sobre',contact:'Contato',admin:'Admin',language:'Idioma',choose:'Escolher idioma do site',change:'Mudar idioma',footer:['Início','Diretório','Finanças','Impostos','Negócios','Dia a dia','Para empresas','API','Planos','Lista premium','Sobre','Metodologia','Privacidade','Termos','Aviso legal','Contato']},
ar:{home:'الرئيسية',login:'تسجيل الدخول',all:'جميع الحاسبات',finance:'التمويل',tax:'الضرائب',business:'أدوات الأعمال',everyday:'اليومي',forBusiness:'للأعمال',api:'API',plans:'الخطط',about:'من نحن',contact:'اتصل بنا',admin:'المسؤول',language:'اللغة',choose:'اختر لغة الموقع',change:'تغيير اللغة',footer:['الرئيسية','الدليل','التمويل','الضرائب','الأعمال','اليومي','للأعمال','API','الخطط','قائمة بريميوم','من نحن','المنهجية','الخصوصية','الشروط','إخلاء المسؤولية','اتصل بنا']},
id:{home:'Beranda',login:'Masuk',all:'Semua kalkulator',finance:'Keuangan',tax:'Pajak',business:'Alat bisnis',everyday:'Sehari-hari',forBusiness:'Untuk bisnis',api:'API',plans:'Paket',about:'Tentang',contact:'Kontak',admin:'Admin',language:'Bahasa',choose:'Pilih bahasa situs',change:'Ubah bahasa',footer:['Beranda','Direktori','Keuangan','Pajak','Bisnis','Sehari-hari','Untuk bisnis','API','Paket','Daftar premium','Tentang','Metodologi','Privasi','Ketentuan','Penafian','Kontak']},
bn:{home:'হোম',login:'লগ ইন',all:'সব ক্যালকুলেটর',finance:'অর্থ',tax:'কর',business:'ব্যবসার টুল',everyday:'দৈনন্দিন',forBusiness:'ব্যবসার জন্য',api:'API',plans:'প্ল্যান',about:'পরিচিতি',contact:'যোগাযোগ',admin:'অ্যাডমিন',language:'ভাষা',choose:'ওয়েবসাইটের ভাষা বাছুন',change:'ভাষা পরিবর্তন',footer:['হোম','ডিরেক্টরি','অর্থ','কর','ব্যবসা','দৈনন্দিন','ব্যবসার জন্য','API','প্ল্যান','প্রিমিয়াম তালিকা','পরিচিতি','পদ্ধতি','গোপনীয়তা','শর্তাবলি','দায় অস্বীকার','যোগাযোগ']},
ta:{home:'முகப்பு',login:'உள்நுழை',all:'அனைத்து கணிப்பான்கள்',finance:'நிதி',tax:'வரி',business:'வணிகக் கருவிகள்',everyday:'அன்றாடம்',forBusiness:'வணிகங்களுக்கு',api:'API',plans:'திட்டங்கள்',about:'எங்களைப் பற்றி',contact:'தொடர்பு',admin:'நிர்வாகம்',language:'மொழி',choose:'இணையதள மொழியைத் தேர்ந்தெடுக்கவும்',change:'மொழியை மாற்று',footer:['முகப்பு','பட்டியல்','நிதி','வரி','வணிகம்','அன்றாடம்','வணிகங்களுக்கு','API','திட்டங்கள்','பிரீமியம் பட்டியல்','எங்களைப் பற்றி','முறை','தனியுரிமை','விதிமுறைகள்','மறுப்பு','தொடர்பு']}
};
const nav=chrome[currentLocale]||chrome.en;
links.splice(0,links.length,[nav.home,localeHome[currentLocale]],[nav.login,r+'dashboard.html'],[nav.all,r+'site-directory.html'],[nav.finance,r+'finance-calculators.html'],[nav.tax,r+'tax-calculators.html'],[nav.business,r+'business-calculators.html'],[nav.everyday,r+'everyday-calculators.html'],[nav.forBusiness,r+'business.html'],[nav.api,r+'api.html'],[nav.plans,r+'pricing.html'],[nav.about,currentLocale==='hi'?'/hi/about.html':r+'about.html'],[nav.contact,currentLocale==='hi'?'/hi/contact.html':r+'contact.html'],[nav.admin,r+'admin.html']);
const localizedCalcPrefix=currentLocale==='en'?'/calculators/':'/'+currentLocale+'/calculators/';
links.splice(3,0,['SIP',localizedCalcPrefix+'sip-calculator.html'],['FD',localizedCalcPrefix+'fd-calculator.html'],['GST',localizedCalcPrefix+'gst-calculator.html']);
links.splice(6,0,['Loan EMI',localizedCalcPrefix+'loan-emi-calculator.html'],['Percentage',localizedCalcPrefix+'percentage-calculator.html'],['Discount',localizedCalcPrefix+'discount-calculator.html']);
const loanToolsLabels={en:'Loan Calculators',hi:'ऋण कैलकुलेटर',es:'Calculadoras de préstamos',fr:'Calculatrices de prêt',pt:'Calculadoras de empréstimos',ar:'حاسبات القروض',id:'Kalkulator pinjaman',bn:'ঋণ ক্যালকুলেটর',ta:'கடன் கணிப்பான்கள்'};
links.splice(9,0,[loanToolsLabels[currentLocale]||loanToolsLabels.en,'/calculator/loan-calculators.html']);
const everydayLabels={en:['Age','Date Difference','Fuel Cost'],hi:['आयु','तिथि अंतर','ईंधन लागत'],es:['Edad','Diferencia de fechas','Combustible'],fr:['Âge','Différence de dates','Carburant'],pt:['Idade','Diferença de datas','Combustível'],ar:['العمر','فرق التواريخ','الوقود'],id:['Usia','Selisih tanggal','Bahan bakar'],bn:['বয়স','তারিখের পার্থক্য','জ্বালানি'],ta:['வயது','தேதி வித்தியாசம்','எரிபொருள்']};
const everyday=everydayLabels[currentLocale]||everydayLabels.en;
links.splice(9,0,[everyday[0],localizedCalcPrefix+'age-calculator.html'],[everyday[1],localizedCalcPrefix+'date-difference-calculator.html'],[everyday[2],localizedCalcPrefix+'fuel-cost-calculator.html','car-loan-calculator.html','bike-loan-calculator.html','gold-loan-calculator.html','loan-against-property-calculator.html','personal-loan-eligibility-calculator.html','home-loan-amortization-schedule-calculator.html']);


const languageHref='#fc-language-select';
const languageLabel=nav.change;
const localeRoutes={'/':'/hi/index.html','/calculator/about.html':'/hi/about.html','/calculator/methodology.html':'/hi/methodology.html','/calculator/contact.html':'/hi/contact.html','/hi/index.html':'/','/hi/about.html':'/calculator/about.html','/hi/methodology.html':'/calculator/methodology.html','/hi/contact.html':'/calculator/contact.html'};
const languageControl='<label class="fc-language-control"><span class="fc-language-label">'+nav.language+'</span><select id="fc-language-select" aria-label="'+nav.choose+'">'+Object.entries(localeNames).map(([code,name])=>'<option value="'+code+'"'+(code===currentLocale?' selected':'')+'>'+name+'</option>').join('')+'</select></label>';
h.innerHTML='<div class="fc-global-nav"><a class="fc-global-brand" href="'+localeHome[currentLocale]+'" aria-label="Friendly Calculator home"><img class="fc-brand-mark" src="/assets/friendly-calculator-logo.svg" width="34" height="34" alt="Friendly Calculator logo" decoding="async"> <span>FRIENDLY <b>CALCULATOR</b></span></a><nav id="fc-primary-navigation" class="fc-global-links" aria-label="Main navigation">'+links.map(([n,u])=>'<a href="'+u+'"'+(p===u?' aria-current="page"':'')+(n==='Log In'?' class="fc-login-link"':'')+'>'+n+'</a>').join('')+languageControl+'</nav></div>';
const old=[...document.body.children].find(e=>e.tagName==='HEADER');if(old)old.replaceWith(h);else document.body.prepend(h);
const f=document.createElement('footer');f.className='fc-global-footer';
f.innerHTML='<div class="fc-global-footer-inner"><div class="fc-footer-intro"><img class="fc-footer-mark" src="/assets/friendly-calculator-logo.svg" width="30" height="30" alt="Friendly Calculator logo" loading="lazy" decoding="async"><strong>FRIENDLY CALCULATOR</strong><br><small>Practical tools for everyday calculations.</small></div><nav class="fc-global-footer-links" aria-label="Website pages"><a href="/">Home</a><a href="'+r+'site-directory.html">All Pages Directory</a><a href="'+r+'finance-calculators.html">Finance</a><a href="'+r+'tax-calculators.html">Tax</a><a href="'+r+'business-calculators.html">Business Tools</a><a href="'+r+'everyday-calculators.html">Everyday</a><a href="'+r+'business.html">For Business</a><a href="'+r+'api.html">API</a><a href="'+r+'pricing.html">Plans</a><a href="'+r+'premium-waitlist.html">Premium Waitlist</a><a href="'+r+'about.html">About</a><a href="'+r+'methodology.html">Methodology</a><a href="'+r+'privacy.html">Privacy</a><a href="'+r+'terms.html">Terms</a><a href="'+r+'disclaimer.html">Disclaimer</a><a href="'+r+'contact.html">Contact</a><a href="'+languageHref+'" lang="'+currentLocale+'">'+languageLabel+'</a></nav><nav class="fc-social-links" aria-label="Social media and contact"><a class="fc-social-link" href="https://www.instagram.com/avnish_ahirwar" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg></a><a class="fc-social-link" href="https://www.linkedin.com/in/avnishahirwar415" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.2 8.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6M3.7 10h3v10h-3zM9 10h2.9v1.4h.1c.4-.8 1.4-1.7 2.9-1.7 3.1 0 3.7 2 3.7 4.5V20h-3v-5.2c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6V20H9z"/></svg></a><a class="fc-social-link" href="mailto:avnishahirwar415@gmail.com" aria-label="Email" title="Email"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a></nav><small>© 2026 Friendly Calculator</small></div>';
f.querySelectorAll('.fc-global-footer-links a').forEach((a,i)=>{if(nav.footer[i])a.textContent=nav.footer[i];});
const fs=[...document.body.children].filter(e=>e.tagName==='FOOTER');if(fs.length)fs.forEach((e,i)=>i===fs.length-1?e.replaceWith(f):e.remove());else document.body.append(f);
const languageSelect=document.getElementById('fc-language-select');
if(languageSelect){
  languageSelect.addEventListener('change',()=>{
    const next=languageSelect.value;
    if(!localeHome[next])return;
    try{localStorage.setItem('fc-language-preference',next)}catch(_){}
    if(next===currentLocale)return;
    if(next==='en'&&p==='/hi/index.html'){location.href='/';return;}
    if(next==='hi'&&p==='/'){location.href='/hi/index.html';return;}
    const calcMatch=p.match(/^\/(?:hi|es|fr|pt|ar|id|bn|ta)\/calculators\/([^/]+)$/)||p.match(/^\/calculators\/([^/]+)$/);
    // Resolve calculator destinations against the actual static files instead of a
    // manually maintained slug allowlist. This keeps newly translated pages usable
    // as soon as they are added to a locale folder.
    if(calcMatch){
      const target=next==='en'?'/calculators/'+calcMatch[1]:'/'+next+'/calculators/'+calcMatch[1];
      fetch(target,{method:'HEAD',cache:'no-store'}).then(response=>{
        if(response.ok){location.href=target;return;}
        try{sessionStorage.setItem('fc-language-notice','This calculator is not available in the selected language yet. Opening that language homepage.')}catch(_){}
        location.href=localeHome[next];
      }).catch(()=>{
        try{sessionStorage.setItem('fc-language-notice','The translated calculator could not be checked. Opening that language homepage.')}catch(_){}
        location.href=localeHome[next];
      });
      return;
    }
    const destination=localeRoutes[p];
    if(destination&&((next==='hi'&&destination.startsWith('/hi/'))||(next==='en'&&destination==='/'))){location.href=destination;return;}
    try{sessionStorage.setItem('fc-language-notice','This page is not yet translated in the selected language. Opening the available language homepage.')}catch(_){}
    location.href=localeHome[next];
  });
}
try{
  const notice=sessionStorage.getItem('fc-language-notice');
  if(notice){sessionStorage.removeItem('fc-language-notice');const n=document.createElement('p');n.className='fc-language-notice';n.setAttribute('role','status');n.textContent=notice;const target=document.querySelector('main')||document.body;target.prepend(n);}
}catch(_){}
document.querySelectorAll('a[href="/#tools"],a[href="/#calculators"],a[href="/#contact"],a[href="#tools"],a[href="#calculators"]').forEach(a=>a.href=/contact/.test(a.getAttribute('href'))?r+'contact.html':r+'site-directory.html');
if(p.startsWith('/calculators/')){
  const getLocalCalculatorTarget=()=>document.getElementById('sip-tool')||document.getElementById('live-page-calculator')||document.querySelector('main form,main input,main select,main button')?.closest('section');
  const localTarget=getLocalCalculatorTarget();
  document.querySelectorAll('a[href^="/#calc-"],a[href^="https://friendlycalculator.in/#calc-"]').forEach(a=>{
    if(localTarget){if(!localTarget.id)localTarget.id='fc-calculator';a.href='#'+localTarget.id;}
  });
  document.addEventListener('click',event=>{
    const anchor=event.target.closest('a[href]');
    if(!anchor)return;
    let destination;try{destination=new URL(anchor.href,location.href)}catch(_){return}
    if(destination.origin!==location.origin||destination.pathname!=='/'||!destination.hash.startsWith('#calc-'))return;
    const target=getLocalCalculatorTarget();
    if(!target)return;
    event.preventDefault();
    if(!target.id)target.id='fc-calculator';
    target.scrollIntoView({behavior:'smooth',block:'start'});
    history.replaceState(null,'','#'+target.id);
  });
}
document.querySelectorAll('.ad-slot,.ad-break,.ad,.ad-placeholder,.adsense-placeholder,.advertisement,.ad-container,[data-ad-slot],[aria-label="Advertisement space"]').forEach(e=>e.remove());
if(p.startsWith('/calculators/')){
const genericFaqs=new Set(['how accurate is this calculator?','does this replace professional advice?']);
document.querySelectorAll('.faq').forEach(section=>{
  section.querySelectorAll('details').forEach(item=>{
    const question=(item.querySelector('summary')?.textContent||'').trim().toLowerCase();
    if(genericFaqs.has(question))item.remove();
  });
  if(!section.querySelector('details'))section.remove();
});
document.querySelectorAll('script[type="application/ld+json"]').forEach(script=>{
  try{
    const data=JSON.parse(script.textContent);
    if(data['@type']==='FAQPage'&&Array.isArray(data.mainEntity)){
      data.mainEntity=data.mainEntity.filter(item=>!genericFaqs.has(String(item.name||'').trim().toLowerCase()));
      if(data.mainEntity.length)script.textContent=JSON.stringify(data);else script.remove();
    }
  }catch(_){}
});
document.querySelectorAll('h2').forEach(heading=>{
  if(!/how to use/i.test(heading.textContent||''))return;
  const list=heading.nextElementSibling;
  if(!list||list.tagName!=='OL')return;
  const existing=[...list.children];
  if(existing.length===1){
    const raw=(existing[0].textContent||'').trim();
    const markers=[...raw.matchAll(/(?:^| )([0-9]{1,2})[.] +/g)];
    if(markers.length>=2&&markers[0][1]==='1'&&markers.every((m,i)=>Number(m[1])===i+1)){
      const parts=raw.split(/(?:^| )[0-9]{1,2}[.] +/g).filter(Boolean);
      list.replaceChildren(...parts.map(part=>{const li=document.createElement('li');li.textContent=part.trim();return li;}));
    }
  }
  [...list.children].forEach(item=>{
    let value=(item.textContent||'').trim().replace(/^[0-9]{1,2}[.] +/,'');
    if(!value)return;
    if(!/^(enter|choose|select|set|review|compare|press|click|calculate|read|check|use|provide|add|subtract|type|pick|open|adjust|confirm|start|measure)/i.test(value)){
      value=/^(assumed|annual|expected|interest|return|rate|investment|loan|principal|period|tenure|duration|amount|height|weight|unit|date|time|quantity|price|fuel|distance|working|number|monthly|yearly|total)/i.test(value)?'Enter the '+value:'Enter '+value;
    }
    value=value.charAt(0).toUpperCase()+value.slice(1).replace(/[. ]+$/,'')+'.';
    item.textContent=value;
  });
});
document.querySelectorAll('p').forEach(e=>{const t=(e.textContent||'').trim();if(t.startsWith('Results are estimates based on entered values and assumptions. They are not professional advice.'))e.remove()});
document.querySelectorAll('p').forEach(e=>{if((e.textContent||'').trim().toLowerCase().startsWith('open the interactive calculator'))e.remove()});
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


/* Add useful internal links and consistent structured data to calculator pages. */
const calculatorPath=p.replace(/^\/(hi|es|fr|pt|ar|id|bn|ta)(?=\/calculators\/)/,'');
if(calculatorPath.startsWith('/calculators/')&&main){
  const slug=calculatorPath.split('/').pop().replace(/\.html$/,'');
  const catalog={
    'loan-emi-calculator':[['loan-prepayment-calculator','Loan Prepayment'],['car-loan-calculator','Car Loan EMI'],['home-loan-amortization-schedule-calculator','Home Loan Amortization'],['home-loan-eligibility-calculator','Home Loan Eligibility'],['mortgage-calculator','Mortgage Calculator']],
    'gst-calculator':[['gst-input-tax-credit-calculator','GST Input Tax Credit'],['gst-interest-calculator','GST Interest'],['gst-late-fee-calculator','GST Late Fee'],['reverse-charge-gst-calculator','Reverse Charge GST'],['gst-on-rent-calculator','GST on Rent']],
    'income-tax-calculator':[['salary-calculator','Salary Calculator'],['tds-calculator','TDS Calculator'],['hra-calculator','HRA Exemption'],['ctc-salary-calculator','CTC to In-Hand Salary'],['advance-tax-calculator','Advance Tax']],
    'number-to-words-indian-format':[['basic-calculator','Basic Calculator'],['percentage-calculator','Percentage Calculator'],['roman-numeral-converter','Roman Numeral Converter'],['unit-converter','Unit Converter'],['currency-converter-calculator','Currency Converter']],
    'land-unit-converter-calculator':[['bigha-to-sq-ft-calculator','Bigha to Sq Ft'],['stamp-duty-calculator','Stamp Duty'],['property-price-per-sq-ft-calculator','Property Price per Sq Ft'],['unit-converter','Unit Converter'],['concrete-calculator','Concrete']],
    'gratuity-calculator':[['epf-pf-calculator','EPF / PF'],['eps-pension-calculator','EPS Pension'],['leave-encashment-calculator','Leave Encashment'],['salary-calculator','Salary Calculator'],['retirement-corpus-calculator','Retirement Corpus']],
    'eps-pension-calculator':[['epf-pf-calculator','EPF / PF'],['gratuity-calculator','Gratuity'],['retirement-corpus-calculator','Retirement Corpus'],['nps-calculator','NPS'],['ppf-calculator','PPF']],
    'ssy-calculator':[['ppf-calculator','PPF'],['kvp-calculator','KVP'],['nsc-calculator','NSC'],['fd-calculator','FD'],['rd-calculator','RD']],
    'kvp-calculator':[['ssy-calculator','SSY'],['nsc-calculator','NSC'],['ppf-calculator','PPF'],['fd-calculator','FD'],['rd-calculator','RD']],
    'steps-to-km-calculator':[['pace-calculator','Pace Calculator'],['mileage-calculator','Mileage Calculator'],['unit-converter','Unit Converter'],['fuel-cost-calculator','Fuel Cost'],['time-zone-converter','Time Zone Converter']],
    'stamp-duty-calculator':[['bigha-to-sq-ft-calculator','Bigha to Sq Ft'],['land-unit-converter-calculator','Land Unit Converter'],['property-price-per-sq-ft-calculator','Property Price per Sq Ft'],['mortgage-calculator','Mortgage Calculator'],['home-loan-amortization-schedule-calculator','Home Loan Amortization']],
    'bigha-to-sq-ft-calculator':[['land-unit-converter-calculator','Land Unit Converter'],['stamp-duty-calculator','Stamp Duty'],['property-price-per-sq-ft-calculator','Property Price per Sq Ft'],['unit-converter','Unit Converter'],['concrete-calculator','Concrete']]
  };
  let items=catalog[slug];
  if(!items){
    if(/loan|emi|mortgage/.test(slug))items=catalog['loan-emi-calculator'];
    else if(/gst|tax|tds|salary|hra/.test(slug))items=catalog['income-tax-calculator'];
    else if(/ssy|kvp|nsc|ppf|fd|rd|sip|eps|epf|gratuity|nps/.test(slug))items=catalog['ssy-calculator'];
    else if(/land|bigha|property|stamp/.test(slug))items=catalog['land-unit-converter-calculator'];
    else if(/steps|pace|mileage|distance|unit-converter/.test(slug))items=catalog['steps-to-km-calculator'];
    else items=[['basic-calculator','Basic Calculator'],['percentage-calculator','Percentage Calculator'],['unit-converter','Unit Converter'],['date-difference-calculator','Date Difference'],['age-calculator','Age Calculator']];
  }
  const relatedSection=[...main.querySelectorAll('section')].find(section=>(section.querySelector('h2')?.textContent||'').toLowerCase().includes('related'));
  const relatedCount=relatedSection?relatedSection.querySelectorAll('a[href^="/calculators/"]').length:0;
  if(relatedCount<4&&!main.querySelector('.fc-related-calculators')){
    const section=document.createElement('section');section.className='fc-related-calculators';section.style.cssText='margin:22px 0;padding:18px;background:#fff;border:1px solid #dfe5eb;border-radius:12px';
    const heading=document.createElement('h2');heading.textContent='Related calculators';
    const list=document.createElement('ul');list.style.cssText='display:flex;flex-wrap:wrap;gap:8px 22px;padding-left:20px';
    items.forEach(([path,label])=>{if(path===slug)return;const li=document.createElement('li'),a=document.createElement('a');a.href='/calculators/'+path+'.html';a.textContent=label;li.append(a);list.append(li);});
    section.append(heading,list);main.append(section);
  }
  const schemaScripts=[...document.querySelectorAll('script[type="application/ld+json"]')];
  const schemaData=schemaScripts.map(script=>{try{return JSON.parse(script.textContent)}catch(_){return null}}).filter(Boolean);
  const hasType=type=>schemaData.some(data=>{const t=data['@type'];return t===type||(Array.isArray(t)&&t.includes(type))});
  const addSchema=data=>{const script=document.createElement('script');script.type='application/ld+json';script.textContent=JSON.stringify(data);document.head.append(script);};
  const pageTitle=(document.querySelector('h1')?.textContent||document.title||'Calculator').trim();
  if(!hasType('WebApplication')){
    const category=/gst|tax|loan|emi|mortgage|sip|fd|rd|ppf|nps|eps|epf|ssy|kvp|gratuity|salary/.test(slug)?'FinanceApplication':'UtilitiesApplication';
    addSchema({'@context':'https://schema.org','@type':'WebApplication','name':pageTitle,'url':location.origin+p,'applicationCategory':category,'operatingSystem':'Any','offers':{'@type':'Offer','price':'0','priceCurrency':'INR'}});
  }
  if(!hasType('BreadcrumbList'))addSchema({'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Home','item':location.origin+'/'},{'@type':'ListItem','position':2,'name':'All Calculators','item':location.origin+'/calculator/site-directory.html'},{'@type':'ListItem','position':3,'name':pageTitle,'item':location.origin+p}]});
  if(!hasType('FAQPage')){
    const questions=[...main.querySelectorAll('details')].map(detail=>({name:(detail.querySelector('summary')?.textContent||'').trim(),text:(detail.querySelector('p')?.textContent||'').trim()})).filter(item=>item.name.length>8&&item.text.length>25);
    if(questions.length>=2)addSchema({'@context':'https://schema.org','@type':'FAQPage','mainEntity':questions.map(item=>({'@type':'Question','name':item.name,'acceptedAnswer':{'@type':'Answer','text':item.text}}))});
  }
}

/* Calculator-specific related links and copy-ready, attributed embed snippet. */
if(p.startsWith('/calculators/')&&main){
  const slug=p.split('/').pop();
  const groups=[
    {test:/emi|loan|mortgage|amortization|prepayment|interest-rate|eligibility/i,items:[['Home Loan EMI Calculator','/calculators/home-loan-emi-calculator.html'],['Car Loan Calculator','/calculators/car-loan-calculator.html'],['Personal Loan Calculator','/calculators/personal-loan-calculator.html'],['Loan Prepayment Calculator','/calculators/loan-prepayment-calculator.html'],['Home Loan Amortization Schedule','/calculators/home-loan-amortization-schedule-calculator.html']]},
    {test:/land|bigha|guntha|sq-ft|stamp-duty|property-price/i,items:[['Land Unit Converter','/calculators/land-unit-converter-calculator.html'],['Bigha to Sq Ft Calculator','/calculators/bigha-to-sq-ft-calculator.html'],['Stamp Duty Calculator','/calculators/stamp-duty-calculator.html'],['Property Price per Sq Ft','/calculators/property-price-per-sq-ft-calculator.html'],['Mortgage Calculator','/calculators/mortgage-calculator.html']]},
    {test:/gratuity|eps|ssy|kvp|ppf|fd-|rd-|nsc|epf|salary|pension/i,items:[['Gratuity Calculator','/calculators/gratuity-calculator.html'],['EPS Pension Calculator','/calculators/eps-pension-calculator.html'],['SSY Maturity Calculator','/calculators/ssy-calculator.html'],['KVP Calculator','/calculators/kvp-calculator.html'],['PPF Calculator','/calculators/ppf-calculator.html']]},
    {test:/steps-to-km|pace|mileage|walking|distance/i,items:[['Steps to Km Calculator','/calculators/steps-to-km-calculator.html'],['Pace Calculator','/calculators/pace-calculator.html'],['Mileage Calculator','/calculators/mileage-calculator.html'],['Unit Converter','/calculators/unit-converter.html'],['Fuel Cost Calculator','/calculators/fuel-cost-calculator.html']]},
    {test:/number-to-words|roman-numeral|percentage|basic-calculator|unit-converter|currency-converter/i,items:[['Number to Words (Indian Format)','/calculators/number-to-words-indian-format.html'],['Percentage Calculator','/calculators/percentage-calculator.html'],['Basic Calculator','/calculators/basic-calculator.html'],['Roman Numeral Converter','/calculators/roman-numeral-converter.html'],['Unit Converter','/calculators/unit-converter.html']]}
  ];
  const match=groups.find(g=>g.test.test(slug));
  if(match&&!document.querySelector('.fc-related-calculators')){
    const section=document.createElement('section');section.className='fc-related-calculators';section.style.cssText='margin:24px 0;padding:18px;border:1px solid #dfe5eb;border-radius:12px;background:#fff';
    const h=document.createElement('h2');h.textContent='Related calculators';
    const list=document.createElement('ul');list.style.cssText='display:flex;flex-wrap:wrap;gap:8px 22px;padding-left:20px';
    match.items.filter(([,href])=>href!==p).slice(0,5).forEach(([label,href])=>{const li=document.createElement('li'),a=document.createElement('a');a.href=href;a.textContent=label;li.append(a);list.append(li)});
    section.append(h,list);main.append(section);
  }
  if(!document.querySelector('.fc-embed-panel')){
    const url=location.origin+p,title=(document.querySelector('h1')?.textContent||'Friendly Calculator').trim();
    const safeTitle=title.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    const html='<iframe src="'+url+'" title="'+safeTitle+'" loading="lazy" width="100%" height="620" style="border:0;border-radius:12px;max-width:100%" referrerpolicy="strict-origin-when-cross-origin"></iframe>\n<p>Calculator provided by <a href="'+url+'" target="_blank" rel="noopener noreferrer">Friendly Calculator</a>.</p>';
    const section=document.createElement('section');section.className='fc-embed-panel';section.style.cssText='margin:24px 0;padding:18px;border:1px solid #dfe5eb;border-radius:12px;background:#fff';
    const h=document.createElement('h2');h.textContent='Embed this calculator';
    const intro=document.createElement('p');intro.textContent='Copy this HTML into your website. The iframe and attribution link automatically point to this calculator on Friendly Calculator.';
    const area=document.createElement('textarea');area.readOnly=true;area.rows=5;area.value=html;area.setAttribute('aria-label','Calculator embed HTML');area.style.cssText='width:100%;max-width:100%;padding:12px;border:1px solid #bdc8d2;border-radius:8px;font:13px/1.5 ui-monospace,monospace';
    const button=document.createElement('button');button.type='button';button.textContent='Copy embed code';button.style.cssText='margin-top:10px;padding:10px 16px;border:0;border-radius:8px;background:#101c2c;color:#fff;font-weight:700;cursor:pointer';
    button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(html);button.textContent='Copied';}catch(_){area.focus();area.select();button.textContent='Select and copy';}});
    section.append(h,intro,area,button);main.append(section);
  }
}

})();