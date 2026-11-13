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
// Do not load analytics tags on the Privacy Policy URL used for consent review.
if(!/(^|\/)privacy\.html$/.test(location.pathname)){
// Google Tag Manager container: loaded once on every page using this shared shell.
// Keep the existing direct GA4 configuration below; do not add a second GA4 tag
// inside GTM unless the direct GA4 installation is deliberately migrated.
window.dataLayer=window.dataLayer||[];
if(!window.__fcGtmContainerLoaded){
  window.__fcGtmContainerLoaded=true;
  const gtmScript=document.createElement('script');
  gtmScript.async=true;
  gtmScript.src='https://www.googletagmanager.com/gtm.js?id=GTM-MGJQH4DB';
  document.head.appendChild(gtmScript);
}
// Privacy-first analytics: GA4 is the only configured analytics provider.
// Ensure localized pages also report to the same Friendly Calculator GA4 stream.
if(typeof window.gtag!=='function'){
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments)};
  window.gtag('js',new Date());window.gtag('config','G-QVWQSEDRGL');
  const gaScript=document.createElement('script');gaScript.async=true;gaScript.src='https://www.googletagmanager.com/gtag/js?id=G-QVWQSEDRGL';document.head.appendChild(gaScript);
}


}
const p=location.pathname;
const hi=p.startsWith('/hi/');
const r='/calculator/';
const links=hi?[
['होम','/hi/index.html'],['लॉग इन',r+'dashboard.html'],['सभी कैलकुलेटर',r+'site-directory.html'],['वित्त',r+'finance-calculators.html'],['टैक्स',r+'tax-calculators.html'],['बिज़नेस',r+'business-calculators.html'],['रोज़मर्रा',r+'everyday-calculators.html'],['बिज़नेस सेवाएँ',r+'business.html'],['ब्लॉग','/hi/blog/'],['एम्बेड','/embed/'],['API',r+'api.html'],['प्लान',r+'pricing.html'],['हमारे बारे में','/hi/about.html'],['संपर्क','/hi/contact.html'],['एडमिन',r+'admin.html']
]:[
['Home','/'],['Log In',r+'dashboard.html'],['All Calculators',r+'site-directory.html'],['Finance',r+'finance-calculators.html'],['Tax',r+'tax-calculators.html'],['Business Tools',r+'business-calculators.html'],['Everyday',r+'everyday-calculators.html'],['Blog','/blog/'],['About',r+'about.html'],['Contact',r+'contact.html'],['Admin',r+'admin.html']
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
const embedMode=new URLSearchParams(location.search).get('embed')==='1';
if(embedMode){
  document.body.classList.add('fc-embed-mode');
  const embedStyle=document.createElement('style');
  embedStyle.textContent='body.fc-embed-mode{margin:0!important;background:#fff!important}body.fc-embed-mode .fc-global-header,body.fc-embed-mode .fc-global-footer,body.fc-embed-mode .fc-skip-link,body.fc-embed-mode .fc-language-notice,body.fc-embed-mode .fc-share-panel,body.fc-embed-mode .fc-export-panel,body.fc-embed-mode .fc-related-tools{display:none!important}body.fc-embed-mode main{width:100%!important;max-width:none!important;margin:0!important;padding:12px!important}';
  document.head.append(embedStyle);
}

if(main&&!main.id)main.id='fc-main-content';
const shellLocaleForSkip=p.startsWith('/hi/')?'hi':(/^\/(es|fr|pt|ar|id|bn|ta)\//.exec(p)||[])[1]||'en';
const shellSkipLabels={hi:'मुख्य सामग्री पर जाएँ',es:'Saltar al contenido principal',fr:'Aller au contenu principal',pt:'Ir para o conteúdo principal',ar:'انتقل إلى المحتوى الرئيسي',id:'Lewati ke konten utama',bn:'মূল বিষয়বস্তুতে যান',ta:'முதன்மை உள்ளடக்கத்திற்குச் செல்லவும்'};
if(main&&!document.querySelector('.fc-skip-link')){
  const skip=document.createElement('a');skip.className='fc-skip-link';skip.href='#fc-main-content';skip.textContent=shellSkipLabels[shellLocaleForSkip]||'Skip to main content';document.body.prepend(skip);
}
const h=document.createElement('header');h.className='fc-global-header';
const localeNames={en:'English',hi:'हिन्दी',es:'Español',fr:'Français',pt:'Português',ar:'العربية',id:'Bahasa Indonesia',bn:'বাংলা',ta:'தமிழ்'};
const currentLocale=p.startsWith('/hi/')?'hi':(/^\/(es|fr|pt|ar|id|bn|ta)\//.exec(p)||[])[1]||'en';
const localeHome={en:'/',hi:'/hi/index.html',es:'/es/index.html',fr:'/fr/index.html',pt:'/pt/index.html',ar:'/ar/index.html',id:'/id/index.html',bn:'/bn/index.html',ta:'/ta/index.html'};
// Honour a language explicitly chosen by the visitor on future visits to the English root.
try{
  const savedLocale=localStorage.getItem('fc-language-preference');
  if(p==='/'&&savedLocale&&localeHome[savedLocale]){
    if(savedLocale!=='en')location.replace(localeHome[savedLocale]);
  }else if(p==='/'&&!savedLocale){
    const browserLocales=[...(navigator.languages||[]),navigator.language].filter(Boolean);
    const detected=browserLocales.map(value=>String(value).toLowerCase().split('-')[0]).find(code=>localeHome[code]);
    if(detected&&detected!=='en')location.replace(localeHome[detected]);
  }
}catch(_){}

const chrome={
en:{home:'Home',login:'Log In',all:'All Calculators',finance:'Finance',tax:'Tax',business:'Business Tools',everyday:'Everyday',blog:'Blog',embed:'Embed',forBusiness:'For Business',api:'API',plans:'Plans',about:'About',contact:'Contact',admin:'Admin',language:'Language',choose:'Choose website language',change:'Change language',footer:['Home','All Pages Directory','Finance','Tax','Business Tools','Everyday','For Business','API','Plans','Premium Waitlist','About','Methodology','Privacy','Terms','Disclaimer','Contact']},
hi:{home:'होम',login:'लॉग इन',all:'सभी कैलकुलेटर',finance:'वित्त',tax:'टैक्स',business:'बिज़नेस टूल्स',everyday:'रोज़मर्रा',blog:'ब्लॉग',embed:'एम्बेड',forBusiness:'बिज़नेस सेवाएँ',api:'API',plans:'प्लान',about:'हमारे बारे में',contact:'संपर्क',admin:'एडमिन',language:'भाषा',choose:'वेबसाइट की भाषा चुनें',change:'भाषा बदलें',footer:['होम','सभी पेज','वित्त','टैक्स','बिज़नेस टूल्स','रोज़मर्रा','बिज़नेस सेवाएँ','API','प्लान','प्रीमियम वेटलिस्ट','हमारे बारे में','कार्यप्रणाली','गोपनीयता','नियम','अस्वीकरण','संपर्क']},
es:{home:'Inicio',login:'Iniciar sesión',all:'Calculadoras',finance:'Finanzas',tax:'Impuestos',business:'Herramientas de negocio',everyday:'Diario',blog:'Blog',embed:'Insertar',forBusiness:'Para empresas',api:'API',plans:'Planes',about:'Acerca de',contact:'Contacto',admin:'Admin',language:'Idioma',choose:'Elegir idioma del sitio',change:'Cambiar idioma',footer:['Inicio','Directorio','Finanzas','Impuestos','Negocios','Diario','Para empresas','API','Planes','Lista premium','Acerca de','Metodología','Privacidad','Términos','Aviso legal','Contacto']},
fr:{home:'Accueil',login:'Connexion',all:'Calculatrices',finance:'Finance',tax:'Impôts',business:'Outils professionnels',everyday:'Quotidien',blog:'Blog',embed:'Intégrer',forBusiness:'Pour les entreprises',api:'API',plans:'Offres',about:'À propos',contact:'Contact',admin:'Admin',language:'Langue',choose:'Choisir la langue du site',change:'Changer de langue',footer:['Accueil','Répertoire','Finance','Impôts','Entreprise','Quotidien','Entreprises','API','Offres','Liste premium','À propos','Méthodologie','Confidentialité','Conditions','Avertissement','Contact']},
pt:{home:'Início',login:'Entrar',all:'Calculadoras',finance:'Finanças',tax:'Impostos',business:'Ferramentas empresariais',everyday:'Dia a dia',blog:'Blog',embed:'Incorporar',forBusiness:'Para empresas',api:'API',plans:'Planos',about:'Sobre',contact:'Contato',admin:'Admin',language:'Idioma',choose:'Escolher idioma do site',change:'Mudar idioma',footer:['Início','Diretório','Finanças','Impostos','Negócios','Dia a dia','Para empresas','API','Planos','Lista premium','Sobre','Metodologia','Privacidade','Termos','Aviso legal','Contato']},
ar:{home:'الرئيسية',login:'تسجيل الدخول',all:'جميع الحاسبات',finance:'التمويل',tax:'الضرائب',business:'أدوات الأعمال',everyday:'اليومي',blog:'المدونة',embed:'تضمين',forBusiness:'للأعمال',api:'API',plans:'الخطط',about:'من نحن',contact:'اتصل بنا',admin:'المسؤول',language:'اللغة',choose:'اختر لغة الموقع',change:'تغيير اللغة',footer:['الرئيسية','الدليل','التمويل','الضرائب','الأعمال','اليومي','للأعمال','API','الخطط','قائمة بريميوم','من نحن','المنهجية','الخصوصية','الشروط','إخلاء المسؤولية','اتصل بنا']},
id:{home:'Beranda',login:'Masuk',all:'Semua kalkulator',finance:'Keuangan',tax:'Pajak',business:'Alat bisnis',everyday:'Sehari-hari',blog:'Blog',embed:'Sematkan',forBusiness:'Untuk bisnis',api:'API',plans:'Paket',about:'Tentang',contact:'Kontak',admin:'Admin',language:'Bahasa',choose:'Pilih bahasa situs',change:'Ubah bahasa',footer:['Beranda','Direktori','Keuangan','Pajak','Bisnis','Sehari-hari','Untuk bisnis','API','Paket','Daftar premium','Tentang','Metodologi','Privasi','Ketentuan','Penafian','Kontak']},
bn:{home:'হোম',login:'লগ ইন',all:'সব ক্যালকুলেটর',finance:'অর্থ',tax:'কর',business:'ব্যবসার টুল',everyday:'দৈনন্দিন',blog:'ব্লগ',embed:'এম্বেড',forBusiness:'ব্যবসার জন্য',api:'API',plans:'প্ল্যান',about:'পরিচিতি',contact:'যোগাযোগ',admin:'অ্যাডমিন',language:'ভাষা',choose:'ওয়েবসাইটের ভাষা বাছুন',change:'ভাষা পরিবর্তন',footer:['হোম','ডিরেক্টরি','অর্থ','কর','ব্যবসা','দৈনন্দিন','ব্যবসার জন্য','API','প্ল্যান','প্রিমিয়াম তালিকা','পরিচিতি','পদ্ধতি','গোপনীয়তা','শর্তাবলি','দায় অস্বীকার','যোগাযোগ']},
ta:{home:'முகப்பு',login:'உள்நுழை',all:'அனைத்து கணிப்பான்கள்',finance:'நிதி',tax:'வரி',business:'வணிகக் கருவிகள்',everyday:'அன்றாடம்',blog:'வலைப்பதிவு',embed:'உட்பொதி',forBusiness:'வணிகங்களுக்கு',api:'API',plans:'திட்டங்கள்',about:'எங்களைப் பற்றி',contact:'தொடர்பு',admin:'நிர்வாகம்',language:'மொழி',choose:'இணையதள மொழியைத் தேர்ந்தெடுக்கவும்',change:'மொழியை மாற்று',footer:['முகப்பு','பட்டியல்','நிதி','வரி','வணிகம்','அன்றாடம்','வணிகங்களுக்கு','API','திட்டங்கள்','பிரீமியம் பட்டியல்','எங்களைப் பற்றி','முறை','தனியுரிமை','விதிமுறைகள்','மறுப்பு','தொடர்பு']}
};
const nav=chrome[currentLocale]||chrome.en;
links.splice(0,links.length,[nav.home,localeHome[currentLocale]],[nav.login,r+'dashboard.html'],[nav.all,r+'site-directory.html'],[nav.finance,r+'finance-calculators.html'],[nav.tax,r+'tax-calculators.html'],[nav.business,r+'business-calculators.html'],[nav.everyday,r+'everyday-calculators.html'],[nav.blog,'/blog/'],[nav.embed,'/embed/'],[nav.about,currentLocale==='hi'?'/hi/about.html':r+'about.html'],[nav.contact,currentLocale==='hi'?'/hi/contact.html':r+'contact.html'],[nav.admin,r+'admin.html']);
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
f.innerHTML='<div class="fc-global-footer-inner"><div class="fc-footer-intro"><img class="fc-footer-mark" src="/assets/friendly-calculator-logo.svg" width="30" height="30" alt="Friendly Calculator logo" loading="lazy" decoding="async"><strong>FRIENDLY CALCULATOR</strong><br><small>Practical tools for everyday calculations.</small></div><nav class="fc-global-footer-links" aria-label="Website pages"><a href="/">Home</a><a href="'+r+'site-directory.html">All Pages Directory</a><a href="'+r+'finance-calculators.html">Finance</a><a href="'+r+'tax-calculators.html">Tax</a><a href="'+r+'business-calculators.html">Business Tools</a><a href="'+r+'everyday-calculators.html">Everyday</a><a href="/blog/">Blog</a><a href="'+r+'about.html">About</a><a href="'+r+'methodology.html">Methodology</a><a href="'+r+'privacy.html">Privacy</a><a href="'+r+'terms.html">Terms</a><a href="'+r+'disclaimer.html">Disclaimer</a><a href="'+r+'contact.html">Contact</a><a href="'+languageHref+'" lang="'+currentLocale+'">'+languageLabel+'</a><a href="/embed/">Embed a calculator</a></nav><nav class="fc-social-links" aria-label="Social media and contact"><a class="fc-social-link" href="https://www.instagram.com/avnish_ahirwar" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg></a><a class="fc-social-link" href="https://www.linkedin.com/in/avnishahirwar415" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.2 8.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6M3.7 10h3v10h-3zM9 10h2.9v1.4h.1c.4-.8 1.4-1.7 2.9-1.7 3.1 0 3.7 2 3.7 4.5V20h-3v-5.2c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6V20H9z"/></svg></a><a class="fc-social-link" href="mailto:avnishahirwar415@gmail.com" aria-label="Email" title="Email"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a></nav><small>© 2026 Friendly Calculator</small></div>';
const footerLabelIndexes=[0,1,2,3,4,5,null,10,11,12,13,14,15];f.querySelectorAll('.fc-global-footer-links a').forEach((a,i)=>{if(i===6)a.textContent=nav.blog;else if(nav.footer[footerLabelIndexes[i]])a.textContent=nav.footer[footerLabelIndexes[i]];});
const fs=[...document.body.children].filter(e=>e.tagName==='FOOTER');if(fs.length)fs.forEach((e,i)=>i===fs.length-1?e.replaceWith(f):e.remove());else document.body.append(f);
const buildLocaleTarget=next=>{
  // Preserve the current page path when an equivalent translation exists.
  // Special English/Hindi pages use their established route aliases.
  const alias=localeRoutes[p];
  if(alias&&((next==='hi'&&alias.startsWith('/hi/'))||(next==='en'&&alias==='/')))return alias;
  const normalizedPath=currentLocale==='en'?p:p.replace(/^\/(?:hi|es|fr|pt|ar|id|bn|ta)(?=\/)/,'');
  if(next==='en')return normalizedPath==='/index.html'?'/':normalizedPath;
  if(normalizedPath==='/'||normalizedPath==='/index.html')return localeHome[next];
  return '/'+next+normalizedPath;
};
const languageSelect=document.getElementById('fc-language-select');
if(languageSelect){
  languageSelect.addEventListener('change',()=>{
    const next=languageSelect.value;
    if(!localeHome[next])return;
    try{localStorage.setItem('fc-language-preference',next)}catch(_){}
    if(next===currentLocale)return;
    const target=buildLocaleTarget(next);
    fetch(target,{method:'HEAD',cache:'no-store'}).then(response=>{
      if(response.ok){location.href=target;return;}
      try{sessionStorage.setItem('fc-language-notice','This page is not yet available in the selected language. Opening that language homepage instead.')}catch(_){}
      location.href=localeHome[next];
    }).catch(()=>{
      try{sessionStorage.setItem('fc-language-notice','The selected language page could not be checked. Opening that language homepage instead.')}catch(_){}
      location.href=localeHome[next];
    });
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


// Shared calculator enhancements: export, embed attribution, what-if controls and related links.
if(p.startsWith('/calculators/')&&main){
  if(!document.querySelector('style[data-fc-tools]')){
    const style=document.createElement('style');style.dataset.fcTools='1';
    style.textContent='.fc-export-panel,.fc-related-tools,.fc-whatif-panel{background:#fff;border:1px solid #dfe5eb;border-radius:12px;padding:18px;margin:18px 0}.fc-tool-actions{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}.fc-tool-actions button{border:0;border-radius:8px;background:#101c2c;color:#fff;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer}.fc-export-panel textarea{width:100%;min-height:88px;padding:10px;border:1px solid #bdc8d2;border-radius:8px;font:12px/1.5 ui-monospace,monospace}.fc-whatif-panel input[type=range]{width:100%}.fc-live-chart{margin:14px 0}.fc-live-row{margin:10px 0}.fc-live-row small{display:block;margin-bottom:4px;color:#526273}.fc-live-track{height:12px;background:#e8edf2;border-radius:20px;overflow:hidden}.fc-live-bar{height:100%;background:#385a7b;border-radius:20px}';
    document.head.appendChild(style);
  }
  if(!main.querySelector('#printResult')&&!main.querySelector('.fc-export-panel')){
    const panel=document.createElement('section');panel.className='fc-export-panel';
    const h=document.createElement('h2');h.textContent='Export and embed this calculator';
    const intro=document.createElement('p');intro.textContent='Print or save the result as a PDF, download a shareable result image, or embed this calculator with its attribution link.';
    const actions=document.createElement('div');actions.className='fc-tool-actions';
    const print=document.createElement('button');print.type='button';print.textContent='Print / Save as PDF';print.addEventListener('click',()=>window.print());
    const png=document.createElement('button');png.type='button';png.textContent='Download result image';png.addEventListener('click',()=>{
      const title=(main.querySelector('h1')?.textContent||document.title).trim();
      const result=main.querySelector('#extraResult,.results,.result,[aria-live="polite"]');
      const lines=(result?.innerText||'Enter values and calculate to create a result image.').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,12);
      const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=720;const ctx=canvas.getContext('2d');
      ctx.fillStyle='#f4f6f8';ctx.fillRect(0,0,1200,720);ctx.fillStyle='#101c2c';ctx.font='bold 38px Arial';ctx.fillText('Friendly Calculator',64,76);
      ctx.font='bold 28px Arial';ctx.fillText(title.slice(0,58),64,132);ctx.fillStyle='#526273';ctx.font='18px Arial';ctx.fillText('Illustrative result · '+new Date().toLocaleDateString('en-IN'),64,170);
      let y=225;ctx.font='20px Arial';for(const line of lines){if(y>630)break;ctx.fillStyle='#fff';ctx.fillRect(64,y-30,1072,54);ctx.fillStyle='#26384a';ctx.fillText(line.slice(0,90),84,y+5);y+=66;}
      ctx.fillStyle='#526273';ctx.font='15px Arial';ctx.fillText('Check inputs, assumptions and official terms before relying on this estimate.',64,684);
      canvas.toBlob(blob=>{if(!blob)return;const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download='friendly-calculator-result.png';a.click();URL.revokeObjectURL(url);},'image/png');
    });
    actions.append(print,png);
    const code=document.createElement('textarea');code.readOnly=true;code.setAttribute('aria-label','Calculator embed code');
    const embedUrl=location.origin+'/embed/?src='+encodeURIComponent(p);
    const title=(main.querySelector('h1')?.textContent||'Friendly Calculator').trim();
    code.value='<iframe src="'+embedUrl+'" title="'+title+' — Friendly Calculator" loading="lazy" width="100%" height="760" style="border:0" referrerpolicy="strict-origin-when-cross-origin"></iframe>\n<p>Powered by <a href="https://friendlycalculator.in/" rel="noopener">Friendly Calculator</a></p>';
    const copy=document.createElement('button');copy.type='button';copy.textContent='Copy embed code';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code.value);copy.textContent='Embed code copied';}catch(_){code.focus();code.select();copy.textContent='Select and copy the code';}});
    actions.append(copy);panel.append(h,intro,actions,code);main.append(panel);
  }
  const extraForm=main.querySelector('#extraForm'),extraResult=main.querySelector('#extraResult');
  if(extraForm&&extraResult&&!main.querySelector('.fc-whatif-panel')){
    const numeric=extraForm.querySelector('input[type="number"]');
    if(numeric){
      const current=Number(numeric.value)||100,min=numeric.min!==''?Number(numeric.min):Math.max(0,current*.5),max=numeric.max!==''?Number(numeric.max):Math.max(current*2,current+100);
      if(max>min){
        const panel=document.createElement('section');panel.className='fc-whatif-panel';
        const whatIfText={
          en:{title:'What-if scenario slider',before:'Adjust ',after:' to see how the result changes.'},
          hi:{title:'क्या हो अगर — परिदृश्य स्लाइडर',before:'परिणाम में बदलाव देखने के लिए ',after:' समायोजित करें।'},
          es:{title:'Control deslizante de escenarios',before:'Ajusta ',after:' para ver cómo cambia el resultado.'},
          fr:{title:'Curseur de simulation',before:'Ajustez ',after:' pour voir comment le résultat évolue.'},
          pt:{title:'Controle deslizante de cenários',before:'Ajuste ',after:' para ver como o resultado muda.'},
          ar:{title:'شريط تمرير السيناريو الافتراضي',before:'عدّل ',after:' لمعرفة كيفية تغيّر النتيجة.'},
          id:{title:'Penggeser skenario',before:'Sesuaikan ',after:' untuk melihat perubahan hasil.'},
          bn:{title:'সম্ভাব্য পরিস্থিতির স্লাইডার',before:'ফলাফল কীভাবে বদলায় তা দেখতে ',after:' সমন্বয় করুন।'},
          ta:{title:'மாற்று நிலை ஸ்லைடர்',before:'முடிவு எவ்வாறு மாறுகிறது என்பதைப் பார்க்க ',after:' மாற்றவும்।'}
        }[currentLocale]||{title:'What-if scenario slider',before:'Adjust ',after:' to see how the result changes.'};
        const h=document.createElement('h2');h.textContent=whatIfText.title;
        const label=document.createElement('label');label.textContent=whatIfText.before+(numeric.closest('label')?.querySelector('span')?.textContent||numeric.id||'the first input')+whatIfText.after;
        const range=document.createElement('input');range.type='range';range.min=min;range.max=max;range.step=numeric.step&&numeric.step!=='any'?numeric.step:Math.max((max-min)/100,.01);range.value=Math.max(min,Math.min(max,current));
        const value=document.createElement('output');value.textContent=range.value;
        const chartTitle=document.createElement('h3');chartTitle.textContent=currentLocale==='hi'?'परिणाम का लाइव चार्ट':'Live result chart';
        const chart=document.createElement('div');chart.className='fc-live-chart';chart.setAttribute('aria-live','polite');
        const note=document.createElement('p');note.className='small';note.textContent=currentLocale==='hi'?'बार गणना के संख्यात्मक परिणाम दिखाते हैं; अलग पंक्तियों की इकाइयाँ अलग हो सकती हैं।':'Bars display numeric outputs as shown; units may differ between rows.';
        let syncing=false;
        const draw=()=>{chart.replaceChildren();const rows=[...extraResult.querySelectorAll('.result-row')].map(row=>({label:row.querySelector('span')?.textContent||'',value:row.querySelector('strong')?.textContent||''})).map(x=>({...x,n:Number(x.value.replace(/[^\d.-]/g,''))})).filter(x=>x.label&&Number.isFinite(x.n)&&x.n>=0).slice(0,6);const maxValue=Math.max(1,...rows.map(x=>x.n));rows.forEach(x=>{const row=document.createElement('div');row.className='fc-live-row';const caption=document.createElement('small');caption.textContent=x.label+' · '+x.value;const track=document.createElement('div');track.className='fc-live-track';const bar=document.createElement('div');bar.className='fc-live-bar';bar.style.width=Math.max(1,x.n/maxValue*100)+'%';track.append(bar);row.append(caption,track);chart.append(row);});};
        range.addEventListener('input',()=>{syncing=true;numeric.value=range.value;value.textContent=range.value;syncing=false;extraForm.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
        extraForm.addEventListener('input',()=>{if(!syncing){const n=Number(numeric.value);if(Number.isFinite(n)){range.value=Math.max(min,Math.min(max,n));value.textContent=n;}extraForm.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}});
        extraForm.addEventListener('submit',()=>Promise.resolve().then(draw));
        panel.append(h,label,range,value,chartTitle,chart,note);extraResult.parentElement.insertAdjacentElement('afterend',panel);
        draw();
      }
    }
  }
  const relatedMap={
    '/calculators/land-unit-converter-calculator.html':[['Crop Cost & Profit','/calculators/crop-cost-profit-calculator.html'],['Crop Yield & Sale Value','/calculators/crop-yield-sale-value-calculator.html'],['Property Price per Sq Ft','/calculators/property-price-per-sq-ft-calculator.html']],
    '/calculators/crop-cost-profit-calculator.html':[['Land Unit Converter','/calculators/land-unit-converter-calculator.html'],['KCC Interest','/calculators/kcc-interest-calculator.html'],['Crop Yield & Sale Value','/calculators/crop-yield-sale-value-calculator.html']],
    '/calculators/kcc-interest-calculator.html':[['Crop Cost & Profit','/calculators/crop-cost-profit-calculator.html'],['MUDRA Loan EMI','/calculators/mudra-loan-category-emi-calculator.html']],
    '/calculators/livestock-cost-profit-calculator.html':[['Crop Cost & Profit','/calculators/crop-cost-profit-calculator.html'],['Crop Yield & Sale Value','/calculators/crop-yield-sale-value-calculator.html']],
    '/calculators/crop-yield-sale-value-calculator.html':[['Crop Cost & Profit','/calculators/crop-cost-profit-calculator.html'],['Land Unit Converter','/calculators/land-unit-converter-calculator.html']],
    '/calculators/pm-kisan-eligibility-checker.html':[['KCC Interest','/calculators/kcc-interest-calculator.html'],['Crop Cost & Profit','/calculators/crop-cost-profit-calculator.html']],
    '/calculators/ayushman-bharat-eligibility-checker.html':[['MP Ladli Behna Eligibility','/calculators/mp-ladli-behna-eligibility-checker.html'],['PMAY Eligibility','/calculators/pmay-eligibility-checker.html']],
    '/calculators/apy-eligibility-pension-planner.html':[['First Job Salary','/calculators/first-job-salary-calculator.html'],['Salary Calculator','/calculators/salary-calculator.html']],
    '/calculators/pmay-eligibility-checker.html':[['Rent vs Buy Home','/calculators/rent-vs-buy-home-calculator.html'],['Home Loan Eligibility','/calculators/home-loan-eligibility-calculator.html']],
    '/calculators/mudra-loan-category-emi-calculator.html':[['Business Loan EMI','/calculators/business-loan-emi-calculator.html'],['KCC Interest','/calculators/kcc-interest-calculator.html']],
    '/calculators/mp-ladli-behna-eligibility-checker.html':[['APY Pension Planner','/calculators/apy-eligibility-pension-planner.html'],['PMAY Eligibility','/calculators/pmay-eligibility-checker.html']],
    '/calculators/job-change-take-home-salary-calculator.html':[['Salary Calculator','/calculators/salary-calculator.html'],['First Job Salary','/calculators/first-job-salary-calculator.html']],
    '/calculators/first-job-salary-calculator.html':[['Salary Calculator','/calculators/salary-calculator.html'],['Job Change Take-home','/calculators/job-change-take-home-salary-calculator.html']],
    '/calculators/fd-rd-sip-comparison-calculator.html':[['FD Calculator','/calculators/fd-calculator.html'],['RD Calculator','/calculators/rd-calculator.html'],['SIP Calculator','/calculators/sip-calculator.html']],
    '/calculators/rent-vs-buy-home-calculator.html':[['Home Loan EMI','/calculators/loan-emi-calculator.html'],['Home Loan Eligibility','/calculators/home-loan-eligibility-calculator.html']],
    '/calculators/loan-prepayment-vs-investment-calculator.html':[['Loan Prepayment','/calculators/loan-prepayment-calculator.html'],['FD vs RD vs SIP','/calculators/fd-rd-sip-comparison-calculator.html']]
  };
  const fallbackRelated=p.includes('tax')||p.includes('gst')?[['Income Tax Calculator','/calculators/income-tax-calculator.html'],['GST Calculator','/calculators/gst-calculator.html'],['TDS Calculator','/calculators/tds-calculator.html']]:p.includes('salary')?[['Salary Calculator','/calculators/salary-calculator.html'],['CTC to In-hand Salary','/calculators/ctc-salary-calculator.html'],['Job Change Take-home','/calculators/job-change-take-home-salary-calculator.html']]:p.includes('loan')||p.includes('emi')?[['Loan EMI Calculator','/calculators/loan-emi-calculator.html'],['Home Loan Eligibility','/calculators/home-loan-eligibility-calculator.html'],['Loan Comparison','/calculators/loan-comparison-calculator.html']]:p.includes('fd')||p.includes('rd')||p.includes('sip')?[['FD Calculator','/calculators/fd-calculator.html'],['RD Calculator','/calculators/rd-calculator.html'],['SIP Calculator','/calculators/sip-calculator.html']]:p.includes('date')||p.includes('age')||p.includes('time')?[['Age Calculator','/calculators/age-calculator.html'],['Date Difference','/calculators/date-difference-calculator.html'],['Working Days','/calculators/working-days-calculator.html']]:p.includes('land')||p.includes('area')||p.includes('concrete')?[['Land Area Converter','/calculators/land-unit-converter-calculator.html'],['Concrete Calculator','/calculators/concrete-calculator.html'],['Property Price per Sq Ft','/calculators/property-price-per-sq-ft-calculator.html']]:p.includes('bmi')||p.includes('water')||p.includes('heart-rate')?[['BMI Calculator','/calculators/bmi-calculator.html'],['Water Intake Estimator','/calculators/water-intake-calculator.html'],['Heart Rate Zones','/calculators/heart-rate-zones-calculator.html']]:[['Basic Calculator','/calculators/basic-calculator.html'],['Percentage Calculator','/calculators/percentage-calculator.html'],['Unit Converter','/calculators/unit-converter.html']];
  const related=relatedMap[p]||fallbackRelated;
  const hasRelatedHeading=[...main.querySelectorAll('h2,h3')].some(h=>/related|more calculators/i.test(h.textContent));
  if(related&&!main.querySelector('.fc-related-tools')&&!hasRelatedHeading){
    const panel=document.createElement('section');panel.className='fc-related-tools';
    const h=document.createElement('h2');h.textContent='Related calculators';
    const list=document.createElement('p');related.forEach(([label,url],i)=>{if(i)list.append(' · ');const a=document.createElement('a');a.href=url;a.textContent=label;list.append(a);});
    panel.append(h,list);main.append(panel);
  }
}

// Add a truthful WebApplication entity to calculator pages that do not already define one.
// WebApplication is a schema.org subtype of SoftwareApplication. Do not invent ratings or reviews.
function injectCalculatorApplicationSchema(){
  const pathname=window.location.pathname;
  if(!pathname.includes('/calculators/')||!pathname.toLowerCase().endsWith('.html'))return;
  const hasApplicationSchema=[...document.querySelectorAll('script[type="application/ld+json"]')].some(node=>{
    try{
      const visit=value=>{
        if(!value||typeof value!=='object')return false;
        const types=Array.isArray(value['@type'])?value['@type']:[value['@type']];
        if(types.some(type=>type==='WebApplication'||type==='SoftwareApplication'))return true;
        return Object.values(value).some(child=>Array.isArray(child)?child.some(visit):visit(child));
      };
      return visit(JSON.parse(node.textContent||'null'));
    }catch{return false;}
  });
  if(hasApplicationSchema)return;
  const canonical=document.querySelector('link[rel="canonical"]')?.href||window.location.href.split('#')[0];
  const heading=document.querySelector('main h1,h1')?.textContent?.trim()||document.title.split(' | Friendly Calculator')[0].trim();
  const description=document.querySelector('meta[name="description"]')?.content?.trim();
  const key=pathname.toLowerCase();
  let applicationCategory='UtilitiesApplication';
  if(['loan','emi','mortgage','gst','tax','salary','fd-','rd-','sip-','ppf','nps','interest','investment','gratuity','tds','hra','finance','credit','savings'].some(token=>key.includes(token)))applicationCategory='FinanceApplication';
  else if(['gpa','cgpa','grade','education','math','algebra','fraction','percentage'].some(token=>key.includes(token)))applicationCategory='EducationalApplication';
  else if(['bmi','health','calorie','heart-rate','water-intake','pregnancy'].some(token=>key.includes(token)))applicationCategory='HealthApplication';
  const application={
    '@context':'https://schema.org',
    '@type':'WebApplication',
    name:heading,
    url:canonical,
    applicationCategory,
    operatingSystem:'Any',
    isAccessibleForFree:true,
    offers:{'@type':'Offer',price:'0',priceCurrency:'INR'},
    inLanguage:document.documentElement.lang||'en',
    ...(description?{description}:{}),
    provider:{'@type':'Organization',name:'Friendly Calculator',url:'https://friendlycalculator.in/'}
  };
  const script=document.createElement('script');
  script.type='application/ld+json';
  script.dataset.fcCalculatorSchema='true';
  script.textContent=JSON.stringify(application);
  document.head.appendChild(script);
}
injectCalculatorApplicationSchema();

/* Add FAQPage JSON-LD only when matching questions and answers are visibly present. */
function injectVisibleCalculatorFaqSchema(){
  const pathname=window.location.pathname.toLowerCase();
  if(!pathname.includes('/calculators/')||!pathname.endsWith('.html'))return;
  const hasFaqSchema=[...document.querySelectorAll('script[type="application/ld+json"]')].some(node=>{
    try{
      const visit=value=>{
        if(!value||typeof value!=='object')return false;
        const types=Array.isArray(value['@type'])?value['@type']:[value['@type']];
        if(types.includes('FAQPage'))return true;
        return Object.values(value).some(child=>Array.isArray(child)?child.some(visit):visit(child));
      };
      return visit(JSON.parse(node.textContent||'null'));
    }catch{return false;}
  });
  if(hasFaqSchema)return;
  const roots=[...document.querySelectorAll('.faq,.faq-section,[data-faq],section[id*="faq" i]')];
  if(!roots.length){
    for(const heading of document.querySelectorAll('h2,h3')){
      if(/frequently asked questions|\bfaqs\b/i.test(heading.textContent||'')){
        const section=heading.closest('section')||heading.parentElement;
        if(section)roots.push(section);
      }
    }
  }
  const mainEntity=[];
  const seen=new Set();
  roots.forEach(root=>root.querySelectorAll('details').forEach(detail=>{
    const summary=detail.querySelector(':scope > summary')||detail.querySelector('summary');
    const question=(summary?.textContent||'').replace(/\s+/g,' ').trim();
    const answer=[...detail.children].filter(child=>child!==summary).map(child=>child.textContent||'').join(' ').replace(/\s+/g,' ').trim();
    if(question&&answer&&question.length<=500&&answer.length<=5000&&!seen.has(question)){
      seen.add(question);
      mainEntity.push({'@type':'Question',name:question,acceptedAnswer:{'@type':'Answer',text:answer}});
    }
  }));
  if(!mainEntity.length)return;
  const script=document.createElement('script');
  script.type='application/ld+json';
  script.dataset.fcFaqSchema='true';
  script.textContent=JSON.stringify({'@context':'https://schema.org','@type':'FAQPage',mainEntity});
  document.head.appendChild(script);
}
injectVisibleCalculatorFaqSchema();

/* Localized, dated small-savings rate notes for English and translated calculator routes. */
function injectLocalizedSchemeRateNotice(){
  const path=window.location.pathname.toLowerCase();
  const slug=path.split('/').pop();
  const rates={
    'ppf-calculator.html':{rate:'7.1%',en:'PPF annual rate for Q3 FY 2026–27 (1 October–31 December 2026).',hi:'Q3 FY 2026–27 (1 अक्टूबर–31 दिसंबर 2026) के लिए PPF की वार्षिक ब्याज दर।',es:'Tasa anual del PPF para el tercer trimestre del año fiscal 2026–27 (1 de octubre–31 de diciembre de 2026).',fr:'Taux annuel du PPF pour le T3 de l’exercice 2026–27 (du 1er octobre au 31 décembre 2026).',pt:'Taxa anual do PPF para o 3º trimestre do ano fiscal 2026–27 (1 de outubro a 31 de dezembro de 2026).',ar:'معدل PPF السنوي للربع الثالث من السنة المالية 2026–27 (1 أكتوبر إلى 31 ديسمبر 2026).',id:'Suku bunga tahunan PPF untuk Q3 FY 2026–27 (1 Oktober–31 Desember 2026).',bn:'Q3 FY 2026–27 (১ অক্টোবর–৩১ ডিসেম্বর ২০২৬) সময়ের PPF বার্ষিক সুদের হার।',ta:'Q3 FY 2026–27 (1 அக்டோபர்–31 டிசம்பர் 2026) காலத்திற்கான PPF ஆண்டு வட்டி விகிதம்।'},
    'ssy-calculator.html':{rate:'8.2%',en:'SSY annual rate for Q3 FY 2026–27 (1 October–31 December 2026).',hi:'Q3 FY 2026–27 (1 अक्टूबर–31 दिसंबर 2026) के लिए SSY की वार्षिक ब्याज दर।',es:'Tasa anual de SSY para el tercer trimestre del año fiscal 2026–27.',fr:'Taux annuel du SSY pour le T3 de l’exercice 2026–27.',pt:'Taxa anual do SSY para o 3º trimestre do ano fiscal 2026–27.',ar:'معدل SSY السنوي للربع الثالث من السنة المالية 2026–27.',id:'Suku bunga tahunan SSY untuk Q3 FY 2026–27.',bn:'Q3 FY 2026–27 সময়ের SSY বার্ষিক সুদের হার।',ta:'Q3 FY 2026–27 காலத்திற்கான SSY ஆண்டு வட்டி விகிதம்।'},
    'nsc-calculator.html':{rate:'7.7%',en:'NSC annual rate for Q3 FY 2026–27; interest is compounded annually and paid at maturity.',hi:'Q3 FY 2026–27 के लिए NSC की वार्षिक दर; ब्याज सालाना चक्रवृद्धि होता है और मैच्योरिटी पर मिलता है।',es:'Tasa anual de NSC para el tercer trimestre de 2026–27; capitalización anual y pago al vencimiento.',fr:'Taux annuel du NSC pour le T3 2026–27 ; capitalisation annuelle et versement à l’échéance.',pt:'Taxa anual do NSC para o 3º trimestre de 2026–27; capitalização anual e pagamento no vencimento.',ar:'معدل NSC السنوي للربع الثالث 2026–27؛ يُحتسب مركبًا سنويًا ويُدفع عند الاستحقاق.',id:'Suku bunga tahunan NSC untuk Q3 FY 2026–27; bunga majemuk tahunan dan dibayar saat jatuh tempo.',bn:'Q3 FY 2026–27 সময়ের NSC বার্ষিক হার; সুদ বছরে চক্রবৃদ্ধি হয় এবং মেয়াদপূর্তিতে দেওয়া হয়।',ta:'Q3 FY 2026–27 காலத்திற்கான NSC ஆண்டு விகிதம்; வட்டி ஆண்டுதோறும் கூட்டு கணக்கிடப்பட்டு முதிர்வில் வழங்கப்படும்।'},
    'kvp-calculator.html':{rate:'7.5%',en:'KVP annual rate for Q3 FY 2026–27; the currently published doubling period is 115 months.',hi:'Q3 FY 2026–27 के लिए KVP की वार्षिक दर; वर्तमान प्रकाशित दोगुना होने की अवधि 115 महीने है।',es:'Tasa anual de KVP para el tercer trimestre de 2026–27; el plazo publicado para duplicar es de 115 meses.',fr:'Taux annuel du KVP pour le T3 2026–27 ; la durée publiée pour doubler le dépôt est de 115 mois.',pt:'Taxa anual do KVP para o 3º trimestre de 2026–27; o prazo publicado para dobrar é de 115 meses.',ar:'معدل KVP السنوي للربع الثالث 2026–27؛ مدة المضاعفة المنشورة حاليًا 115 شهرًا.',id:'Suku bunga tahunan KVP untuk Q3 FY 2026–27; jangka waktu penggandaan yang dipublikasikan adalah 115 bulan.',bn:'Q3 FY 2026–27 সময়ের KVP বার্ষিক হার; বর্তমানে প্রকাশিত দ্বিগুণ হওয়ার সময় ১১৫ মাস।',ta:'Q3 FY 2026–27 காலத்திற்கான KVP ஆண்டு விகிதம்; தற்போது வெளியிடப்பட்ட இரட்டிப்பு காலம் 115 மாதங்கள்।'},
    'scss-calculator.html':{rate:'8.2%',en:'SCSS annual rate for Q3 FY 2026–27; interest is paid quarterly.',hi:'Q3 FY 2026–27 के लिए SCSS की वार्षिक दर; ब्याज तिमाही आधार पर मिलता है।',es:'Tasa anual de SCSS para el tercer trimestre de 2026–27; los intereses se pagan trimestralmente.',fr:'Taux annuel du SCSS pour le T3 2026–27 ; les intérêts sont versés chaque trimestre.',pt:'Taxa anual do SCSS para o 3º trimestre de 2026–27; os juros são pagos trimestralmente.',ar:'معدل SCSS السنوي للربع الثالث 2026–27؛ تُدفع الفائدة كل ثلاثة أشهر.',id:'Suku bunga tahunan SCSS untuk Q3 FY 2026–27; bunga dibayarkan setiap kuartal.',bn:'Q3 FY 2026–27 সময়ের SCSS বার্ষিক হার; সুদ প্রতি ত্রৈমাসিকে দেওয়া হয়।',ta:'Q3 FY 2026–27 காலத்திற்கான SCSS ஆண்டு விகிதம்; வட்டி காலாண்டுதோறும் வழங்கப்படும்।'},
    'rd-calculator.html':{rate:'6.7%',en:'Post Office 5-year RD reference rate for Q3 FY 2026–27. Bank rates and other tenures may differ.',hi:'Q3 FY 2026–27 के लिए पोस्ट ऑफिस 5-वर्षीय RD की संदर्भ दर। बैंक और अन्य अवधियों की दरें अलग हो सकती हैं।',es:'Tasa de referencia para RD postal a 5 años en el T3 de 2026–27. Los bancos y otros plazos pueden variar.',fr:'Taux de référence du RD postal sur 5 ans au T3 2026–27. Les banques et autres durées peuvent différer.',pt:'Taxa de referência do RD postal de 5 anos no 3º trimestre de 2026–27. Bancos e outros prazos podem diferir.',ar:'السعر المرجعي لوديعة RD البريدية لمدة 5 سنوات للربع الثالث 2026–27. قد تختلف أسعار البنوك والآجال الأخرى.',id:'Suku bunga acuan RD Kantor Pos 5 tahun untuk Q3 FY 2026–27. Suku bunga bank dan tenor lain dapat berbeda.',bn:'Q3 FY 2026–27 সময়ের পোস্ট অফিস ৫-বছরের RD রেফারেন্স হার। ব্যাংক ও অন্যান্য মেয়াদের হার ভিন্ন হতে পারে।',ta:'Q3 FY 2026–27 காலத்திற்கான அஞ்சலக 5 ஆண்டு RD குறிப்பு விகிதம். வங்கி மற்றும் பிற காலங்களுக்கு விகிதங்கள் மாறலாம்।'},
    'post-office-mis-calculator.html':{rate:'7.4%',en:'Post Office Monthly Income Scheme annual rate for Q3 FY 2026–27.',hi:'Q3 FY 2026–27 के लिए पोस्ट ऑफिस मासिक आय योजना की वार्षिक दर।',es:'Tasa anual del Plan de Ingresos Mensuales de Correos para el T3 de 2026–27.',fr:'Taux annuel du compte postal de revenu mensuel pour le T3 2026–27.',pt:'Taxa anual do Esquema Postal de Renda Mensal para o 3º trimestre de 2026–27.',ar:'المعدل السنوي لنظام الدخل الشهري البريدي للربع الثالث 2026–27.',id:'Suku bunga tahunan Skema Pendapatan Bulanan Kantor Pos untuk Q3 FY 2026–27.',bn:'Q3 FY 2026–27 সময়ের পোস্ট অফিস মাসিক আয় প্রকল্পের বার্ষিক হার।',ta:'Q3 FY 2026–27 காலத்திற்கான அஞ்சலக மாதாந்திர வருமானத் திட்ட ஆண்டு விகிதம்।'}
  };
  const item=rates[slug];if(!item)return;
  const existing=document.querySelector('.fc-rate-update');
  const bodyText=document.body?.innerText||'';
  if(existing||/(?:Updated:|अपडेट:|Actualizado:|Mis à jour|Atualizado:|تم التحديث:|Diperbarui:|হালনাগাদ:|புதுப்பிப்பு:)/i.test(bodyText))return;
  const lang=(document.documentElement.lang||'en').toLowerCase().split('-')[0];
  const labels={en:'Updated: 13 November 2026.',hi:'अपडेट: 13 नवम्बर 2026।',es:'Actualizado: 13 de noviembre de 2026.',fr:'Mis à jour : 13 novembre 2026.',pt:'Atualizado: 13 de novembro de 2026.',ar:'تم التحديث: 13 نوفمبر 2026.',id:'Diperbarui: 13 November 2026.',bn:'হালনাগাদ: ১৩ নভেম্বর ২০২৬।',ta:'புதுப்பிப்பு: 13 நவம்பர் 2026.'};
  const sourceLabels={en:'Official rate notification',hi:'आधिकारिक दर अधिसूचना',es:'Notificación oficial de tasas',fr:'Notification officielle des taux',pt:'Notificação oficial das taxas',ar:'الإشعار الرسمي بالأسعار',id:'Pemberitahuan suku bunga resmi',bn:'সরকারি সুদের হার বিজ্ঞপ্তি',ta:'அதிகாரப்பூர்வ வட்டி அறிவிப்பு'};
  const note=document.createElement('p');note.className='fc-rate-update';note.style.cssText='margin:10px 0 16px;padding:12px 14px;border-left:4px solid #d8bd82;background:#f2f5f7;border-radius:8px;color:#25384a';
  const strong=document.createElement('strong');strong.textContent=(labels[lang]||labels.en)+' '+item.rate+' p.a. ';note.appendChild(strong);
  note.appendChild(document.createTextNode(item[lang]||item.en+' '));
  note.appendChild(document.createTextNode(' '));
  const link=document.createElement('a');link.href='https://dea.gov.in/budget-division/475';link.target='_blank';link.rel='noopener noreferrer';link.textContent=sourceLabels[lang]||sourceLabels.en;note.appendChild(link);
  const main=document.querySelector('main')||document.body;
  const hero=main.querySelector('.hero,header.hero')||main.querySelector('h1')?.closest('header')||main.querySelector('h1')?.parentElement;
  if(hero&&hero.parentNode)hero.parentNode.insertBefore(note,hero.nextSibling);else main.insertBefore(note,main.firstChild);
}
injectLocalizedSchemeRateNotice();



// Load the local calculator assistant only when a visitor opens it.
// This keeps its UI and search code off the initial page-load critical path.
if(!document.querySelector('#fc-ai-lazy-launch')&&!document.querySelector('script[data-fc-free-assistant]')&&!window.__fcFreeAssistantLoaded&&!location.pathname.startsWith('/avnish-ai/')&&!location.pathname.includes('/admin')){
  const language=(document.documentElement.lang||'en').toLowerCase().split('-')[0];
  const labels={
    en:{open:'Open assistant',loading:'Loading assistant…',retry:'Retry assistant'},
    hi:{open:'सहायक खोलें',loading:'सहायक लोड हो रहा है…',retry:'फिर से कोशिश करें'},
    es:{open:'Abrir asistente',loading:'Cargando asistente…',retry:'Reintentar asistente'},
    fr:{open:'Ouvrir l’assistant',loading:'Chargement…',retry:'Réessayer'},
    pt:{open:'Abrir assistente',loading:'Carregando…',retry:'Tentar novamente'},
    ar:{open:'فتح المساعد',loading:'جارٍ التحميل…',retry:'إعادة المحاولة'},
    id:{open:'Buka asisten',loading:'Memuat…',retry:'Coba lagi'},
    bn:{open:'সহায়ক খুলুন',loading:'লোড হচ্ছে…',retry:'আবার চেষ্টা করুন'},
    ta:{open:'உதவியாளரைத் திற',loading:'ஏற்றுகிறது…',retry:'மீண்டும் முயற்சிக்கவும்'}
  };
  const copy=labels[language]||labels.en;
  const launcher=document.createElement('button');
  launcher.id='fc-ai-lazy-launch';
  launcher.type='button';
  launcher.textContent=copy.open;
  launcher.setAttribute('aria-label',copy.open);
  launcher.addEventListener('click',()=>{
    if(window.__fcFreeAssistantLoaded){launcher.remove();document.querySelector('#fc-ai-launch')?.click();return;}
    launcher.disabled=true;
    launcher.textContent=copy.loading;
    const assistantScript=document.createElement('script');
    assistantScript.src='/assets/friendly-ai-assistant.js';
    assistantScript.dataset.fcFreeAssistant='true';
    assistantScript.onload=()=>{launcher.remove();document.querySelector('#fc-ai-launch')?.click();};
    assistantScript.onerror=()=>{assistantScript.remove();launcher.disabled=false;launcher.textContent=copy.retry;};
    document.head.appendChild(assistantScript);
  });
  document.body.appendChild(launcher);
}


})();