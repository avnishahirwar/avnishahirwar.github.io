(()=>{'use strict';
/* Keep the site favicon consistent, including legacy and localized pages. */
const ensureFavicon=()=>{
  if(!document.head)return;
  const ensure=(rel,type,href,sizes)=>{
    const selector=`link[rel~="${rel}"][type="${type}"]`;
    let link=document.querySelector(selector);
    if(!link){
      link=document.createElement('link');
      link.rel=rel;
      link.type=type;
      if(sizes)link.sizes=sizes;
      link.href=href;
      document.head.appendChild(link);
    }
  };
  // Keep the same vector brand icon and square PNG sizes available across pages.
  ensure('icon','image/svg+xml','/favicon.svg','any');
  ensure('icon','image/png','/favicon-48.png','48x48');
  ensure('icon','image/png','/favicon-96.png','96x96');
};
ensureFavicon();
/* Installable app metadata and a conservative offline cache for public pages only. */
const ensurePwa=()=>{
  if(!document.head)return;
  // iOS Safari needs viewport-fit=cover before safe-area CSS can be applied.
  const viewport=document.querySelector('meta[name="viewport"]');
  if(viewport&&!/viewport-fit=cover/i.test(viewport.content||'')){
    viewport.content=(viewport.content||'width=device-width,initial-scale=1')+',viewport-fit=cover';
  }
  const addAppleMeta=(name,content)=>{
    if(!document.querySelector('meta[name="'+name+'"]')){
      const meta=document.createElement('meta');meta.name=name;meta.content=content;document.head.appendChild(meta);
    }
  };
  addAppleMeta('apple-mobile-web-app-capable','yes');
  addAppleMeta('apple-mobile-web-app-title','Friendly Calculator');
  addAppleMeta('apple-mobile-web-app-status-bar-style','default');
  if(!document.querySelector('link[rel="manifest"]')){
    const manifestLink=document.createElement('link');
    manifestLink.rel='manifest';
    manifestLink.href='/manifest.webmanifest';
    document.head.appendChild(manifestLink);
  }
  if(typeof navigator==='undefined'||!('serviceWorker' in navigator)||location.protocol!=='https:')return;
  const registerWorker=()=>{navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{});};
  if(document.readyState==='complete')registerWorker();
  else window.addEventListener('load',registerWorker,{once:true});
};
ensurePwa();

/* Offer a clear install path and explain the offline boundary. */
const ensurePwaInstallUi=()=>{
  if(!document.body||window.self!==window.top)return;
  if(/(?:^|\/)(?:admin|login|dashboard)(?:\/|\.|$)/i.test(location.pathname))return;
  if(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)return;
  if(navigator.standalone===true)return;
  if(document.getElementById('fc-pwa-install'))return;

  const style=document.createElement('style');
  style.textContent='.fc-pwa-install{position:fixed;left:14px;bottom:14px;z-index:1500;border:1px solid #d8bd82;border-radius:999px;background:#101c2c;color:#fff;padding:10px 15px;font:700 14px/1.2 system-ui,sans-serif;box-shadow:0 4px 18px #07132135;cursor:pointer}.fc-pwa-help{position:fixed;left:14px;bottom:66px;z-index:1500;width:min(340px,calc(100vw - 28px));padding:16px;border:1px solid #d9e0e6;border-radius:12px;background:#fff;color:#172638;box-shadow:0 8px 28px #07132130;font:14px/1.55 system-ui,sans-serif}.fc-pwa-help p{margin:0 0 10px}.fc-pwa-help button{border:0;border-radius:7px;background:#101c2c;color:#fff;padding:7px 12px;font:inherit;font-weight:700;cursor:pointer}.fc-pwa-network{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:1600;max-width:calc(100vw - 24px);padding:9px 14px;border-radius:9px;background:#25364b;color:#fff;font:600 13px/1.4 system-ui,sans-serif;box-shadow:0 4px 16px #07132135}';
  const button=document.createElement('button');
  button.id='fc-pwa-install';
  button.type='button';
  button.className='fc-pwa-install';
  button.textContent='Install Friendly Calculator';
  button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-controls','fc-pwa-help');

  const panel=document.createElement('section');
  panel.id='fc-pwa-help';
  panel.className='fc-pwa-help';
  panel.hidden=true;
  panel.setAttribute('aria-label','Install and offline help');
  const message=document.createElement('p');
  message.textContent='Install Friendly Calculator for an app-like shortcut. Previously visited public pages may be available offline; pages you have not opened before may still need an internet connection.';
  const close=document.createElement('button');
  close.type='button';
  close.textContent='Close';
  close.addEventListener('click',()=>{panel.hidden=true;button.setAttribute('aria-expanded','false');});
  panel.append(message,close);

  const network=document.createElement('div');
  network.className='fc-pwa-network';
  network.setAttribute('role','status');
  network.setAttribute('aria-live','polite');
  network.hidden=true;

  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    button.textContent='Install Friendly Calculator';
  });
  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    button.hidden=true;
    panel.hidden=true;
  });
  button.addEventListener('click',async()=>{
    if(deferredPrompt){
      const promptEvent=deferredPrompt;
      deferredPrompt=null;
      try{
        await promptEvent.prompt();
        const choice=await promptEvent.userChoice;
        if(choice&&choice.outcome==='accepted'){button.hidden=true;panel.hidden=true;return;}
        message.textContent='Installation was not completed. You can try again from this button or use your browser menu if it offers an install option.';
      }catch(_){
        message.textContent='Your browser could not open the install prompt. Use the browser menu and choose Install app or Add to Home Screen if that option is available.';
      }
    }else{
      const ua=navigator.userAgent||'';
      if(/iPad|iPhone|iPod/i.test(ua)){
        message.textContent='On iPhone or iPad, open this page in Safari, tap Share, then choose Add to Home Screen if available.';
      }else if(/Android/i.test(ua)){
        message.textContent='On Android, open the browser menu and choose Install app or Add to Home Screen if your browser offers it.';
      }else{
        message.textContent='In a supported desktop browser, use the install icon in the address bar or the browser menu option to install this site as an app, if available.';
      }
    }
    panel.hidden=!panel.hidden;
    button.setAttribute('aria-expanded',String(!panel.hidden));
  });

  window.addEventListener('offline',()=>{
    network.textContent='You are offline. Previously visited public pages may still be available on this device.';
    network.hidden=false;
  });
  window.addEventListener('online',()=>{
    network.textContent='Connection restored.';
    network.hidden=false;
    window.setTimeout(()=>{network.hidden=true;},3500);
  });

  document.head.appendChild(style);
  document.body.append(button,panel,network);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensurePwaInstallUi,{once:true});
else ensurePwaInstallUi();

// Do not load analytics tags on the Privacy Policy URL used for consent review.
if(!/(^|\/)(?:privacy|cookies)\.html$/.test(location.pathname)){
// Google Tag Manager container: loaded once on every page using this shared shell.
// Keep the existing direct GA4 configuration below; do not add a second GA4 tag
// inside GTM unless the direct GA4 installation is deliberately migrated.
window.dataLayer=window.dataLayer||[];
if(!window.__fcGtmContainerLoaded){
  window.__fcGtmContainerLoaded=true;
  const injectGtm=()=>{
    if(window.__fcGtmScriptStarted)return;
    window.__fcGtmScriptStarted=true;
    const gtmScript=document.createElement('script');
    gtmScript.async=true;
    gtmScript.fetchPriority='low';
    gtmScript.src='https://www.googletagmanager.com/gtm.js?id=GTM-MGJQH4DB';
    document.head.appendChild(gtmScript);
  };
  const scheduleGtm=()=>{
    // Direct GA4 remains available through its queued gtag commands. Delay the
    // additional GTM container until the visitor has had time to use the page.
    window.setTimeout(()=>{
      if('requestIdleCallback' in window)window.requestIdleCallback(injectGtm,{timeout:8000});
      else injectGtm();
    },8000);
  };
  if(document.readyState==='complete')scheduleGtm();
  else window.addEventListener('load',scheduleGtm,{once:true});
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
const isCalculatorRoute=/^\/(?:(?:hi|de|es|fr|pt|ar|id|bn|ta|ja|ru)\/)?calculators\//.test(p);
const hi=p.startsWith('/hi/');
// Keep category navigation inside the selected locale. A localized category card
// links to its own anchor; on other localized pages it returns to that locale's hub.
const locale=(document.documentElement.lang||'en').toLowerCase().split('-')[0];
const localeCodes=['hi','es','fr','pt','ar','id','bn','ta','ja','ru'];
if(localeCodes.includes(locale)){
  const categoryMap={
    '/calculator/finance-calculators.html':'finance',
    '/calculator/tax-calculators.html':'tax',
    '/calculator/business-calculators.html':'business',
    '/calculator/everyday-calculators.html':'everyday'
  };
  for(const [href,id] of Object.entries(categoryMap)){
    document.querySelectorAll('a[href="'+href+'"]').forEach(link=>{
      const card=link.closest('section,article,.card,.fc-locale-card');
      if(card&&p.startsWith('/'+locale+'/index.html'))card.id=id;
      link.href='/'+locale+'/index.html#'+id;
    });
  }
}

const r='/calculator/';
// Keep the owner-only Admin Dashboard route intact; it is intentionally not part of the public navigation.
const preservedAdminDashboardLink=['Admin',r+'admin.html'];
if(p==='/calculator/contact.html'){const robots=[...document.head.querySelectorAll('meta[name="robots" i]')];if(robots.length){robots[0].content='index,follow,max-image-preview:large';robots.slice(1).forEach(m=>m.remove())}document.head.querySelectorAll('meta[name="googlebot" i]').forEach(m=>m.remove())}
// Keep vector, 48px/96px PNG and Apple touch icons together on every page.
document.querySelectorAll('link[rel~="icon"],link[rel="shortcut icon"]').forEach(node=>node.remove());
const addIcon=(rel,type,sizes,href)=>{const link=document.createElement('link');link.rel=rel;link.type=type;if(sizes)link.sizes=sizes;link.href=href;document.head.appendChild(link);};
addIcon('icon','image/svg+xml','any','/favicon.svg');
addIcon('icon','image/png','48x48','/favicon-48.png');
addIcon('icon','image/png','96x96','/favicon-96.png');
addIcon('shortcut icon','image/png','48x48','/favicon-48.png');
document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(node=>node.remove());
addIcon('apple-touch-icon','image/png','180x180','/apple-touch-icon.png');
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
// Native calculator pages already ship their own accessible calculator UI; do not inject a second shared calculator.
if(p.startsWith('/calculators/')&&!document.querySelector('[data-fc-native-calculator]')){
  if(![...document.scripts].some(s=>(s.src||'').includes('/assets/page-calculators.js'))){
    const calcScript=document.createElement('script');calcScript.src='/assets/page-calculators.js';calcScript.defer=true;document.head.appendChild(calcScript);
  }
}
const main=document.querySelector('main,[role="main"]');
const embedMode=new URLSearchParams(location.search).get('embed')==='1';
if(embedMode){
  document.body.classList.add('fc-embed-mode');
  const embedStyle=document.createElement('style');
  embedStyle.textContent=[
    'html,body{margin:0!important;min-height:0!important;background:#fff!important}',
    'body.fc-embed-mode .fc-global-header,body.fc-embed-mode .fc-header,body.fc-embed-mode .fc-footer,body.fc-embed-mode footer,body.fc-embed-mode .fc-global-footer,body.fc-embed-mode .fc-skip-link,body.fc-embed-mode .fc-language-notice,body.fc-embed-mode .fc-share-panel,body.fc-embed-mode .fc-export-panel,body.fc-embed-mode .fc-related-tools,body.fc-embed-mode .fc-pwa-install,body.fc-embed-mode .fc-pwa-help,body.fc-embed-mode .fc-pwa-network,body.fc-embed-mode #fc-ai-lazy-launch,body.fc-embed-mode .fc-ai-launcher{display:none!important}',
    'body.fc-embed-mode main{display:block!important;width:100%!important;max-width:none!important;min-height:0!important;margin:0!important;padding:8px!important}',
    'body.fc-embed-mode main>*:not(.fc-embed-calculator){display:none!important}',
    'body.fc-embed-mode main>.fc-embed-calculator{display:block!important;width:100%!important;max-width:none!important;margin:0!important}',
    'body.fc-embed-mode .fc-embed-attribution{display:block!important;margin:8px 2px 2px!important;text-align:right!important;font:12px/1.4 system-ui,sans-serif!important;color:#647487!important}',
    'body.fc-embed-mode .fc-embed-attribution a{color:#20344c!important;font-weight:700!important;text-decoration:none!important}'
  ].join('');
  document.head.append(embedStyle);

  // Keep only the calculator's own input/result container. Page chrome, SEO copy,
  // related tools and editorial sections stay outside the third-party widget.
  if(main){
    const form=main.querySelector('form');
    const native=main.querySelector('[data-fc-native-calculator]');
    const standalone=main.querySelector('section.tool,section.calculator,.calculator,section#sip-tool');
    const candidate=native||standalone||(form&&form.closest('[data-fc-native-calculator],section.panel,section,article,.calculator,form'));
    const root=candidate&&[...main.children].find(child=>child===candidate||child.contains(candidate));
    if(root){
      root.classList.add('fc-embed-calculator');
      const referrerPath=(()=>{try{return new URL(document.referrer).pathname;}catch(_){return '';}})();
      if(referrerPath!=='/embed/'&&!root.querySelector('.fc-embed-attribution')){
        const credit=document.createElement('div');
        credit.className='fc-embed-attribution';
        const link=document.createElement('a');
        link.href='https://friendlycalculator.in/';
        link.target='_blank';
        link.rel='noopener noreferrer';
        link.textContent='Powered by Friendly Calculator';
        credit.append(link);
        root.append(credit);
      }
    }else{
      // Fail open rather than hiding a calculator whose markup is not recognised.
      document.body.classList.add('fc-embed-unmatched');
    }
  }
}

if(main&&!main.id)main.id='fc-main-content';
const shellLocaleForSkip=p.startsWith('/hi/')?'hi':(/^\/(de|es|fr|pt|ar|id|bn|ta|ja|ru)\//.exec(p)||[])[1]||'en';
const shellSkipLabels={de:'Zum Hauptinhalt springen',hi:'मुख्य सामग्री पर जाएँ',es:'Saltar al contenido principal',fr:'Aller au contenu principal',pt:'Ir para o conteúdo principal',ar:'انتقل إلى المحتوى الرئيسي',id:'Lewati ke konten utama',bn:'মূল বিষয়বস্তুতে যান',ta:'முதன்மை உள்ளடக்கத்திற்குச் செல்லவும்',ja:'メインコンテンツへ',ru:'Перейти к основному содержимому'};
if(main&&!document.querySelector('.fc-skip-link')){
  const skip=document.createElement('a');skip.className='fc-skip-link';skip.href='#fc-main-content';skip.textContent=shellSkipLabels[shellLocaleForSkip]||'Skip to main content';document.body.prepend(skip);
}
const h=document.createElement('header');h.className='fc-global-header';
const localeNames={en:'English',de:'Deutsch',hi:'हिन्दी',es:'Español',fr:'Français',pt:'Português',ar:'العربية',id:'Bahasa Indonesia',bn:'বাংলা',ta:'தமிழ்',ja:'日本語',ru:'Русский'};
const currentLocale=p.startsWith('/hi/')?'hi':(/^\/(de|es|fr|pt|ar|id|bn|ta|ja|ru)\//.exec(p)||[])[1]||'en';
const localeHome={en:'/',de:'/de/index.html',hi:'/hi/index.html',es:'/es/index.html',fr:'/fr/index.html',pt:'/pt/index.html',ar:'/ar/index.html',id:'/id/index.html',bn:'/bn/index.html',ta:'/ta/index.html',ja:'/ja/index.html',ru:'/ru/index.html'};
// The URL is the source of truth for the active language.
// Do not auto-redirect by browser language; visitors choose explicitly.

const chrome={
de:{home:'Startseite',login:'Anmelden',all:'Verzeichnis (Englisch)',search:'Rechner suchen',finance:'Finanzen',tax:'Steuern (Englisch)',business:'Business-Tools (Englisch)',global:'Globale Rechner (Englisch)',everyday:'Alltag (Englisch)',blog:'Blog (Englisch)',embed:'Einbetten',forBusiness:'Für Unternehmen',api:'API',plans:'Tarife',about:'Über uns',contact:'Kontakt',admin:'Admin',language:'Sprache',choose:'Website-Sprache auswählen',change:'Sprache ändern',footer:['Startseite','Verzeichnis','Finanzen','Steuern','Business','Alltag','Für Unternehmen','API','Tarife','Premium-Warteliste','Über uns','Methodik','Datenschutz','Nutzungsbedingungen','Haftungsausschluss','Kontakt']},
en:{home:'Home',login:'Login',all:'All Calculators',search:'Search Calculator',finance:'Finance',tax:'Tax',business:'Business Tools',global:'Global Calculators',everyday:'Everyday',blog:'Blog',embed:'Embed',forBusiness:'For Business',api:'API',plans:'Plans',about:'About',contact:'Contact',admin:'Admin',language:'Language',choose:'Choose website language',change:'Change language',footer:['Home','All Pages Directory','Finance','Tax','Business Tools','Everyday','For Business','API','Plans','Premium Waitlist','About','Methodology','Privacy','Terms','Disclaimer','Contact']},
hi:{home:'होम',login:'लॉग इन',all:'सभी कैलकुलेटर',search:'कैलकुलेटर खोजें',finance:'वित्त',tax:'टैक्स',business:'बिज़नेस टूल्स',global:'वैश्विक कैलकुलेटर',everyday:'रोज़मर्रा',blog:'ब्लॉग',embed:'एम्बेड',forBusiness:'बिज़नेस सेवाएँ',api:'API',plans:'प्लान',about:'हमारे बारे में',contact:'संपर्क',admin:'एडमिन',language:'भाषा',choose:'वेबसाइट की भाषा चुनें',change:'भाषा बदलें',footer:['होम','सभी पेज','वित्त','टैक्स','बिज़नेस टूल्स','रोज़मर्रा','बिज़नेस सेवाएँ','API','प्लान','प्रीमियम वेटलिस्ट','हमारे बारे में','कार्यप्रणाली','गोपनीयता','नियम','अस्वीकरण','संपर्क']},
es:{home:'Inicio',login:'Iniciar sesión',all:'Calculadoras',search:'Buscar calculadoras',finance:'Finanzas',tax:'Impuestos',business:'Herramientas de negocio',global:'Calculadoras globales',everyday:'Diario',blog:'Blog',embed:'Insertar',forBusiness:'Para empresas',api:'API',plans:'Planes',about:'Acerca de',contact:'Contacto',admin:'Admin',language:'Idioma',choose:'Elegir idioma del sitio',change:'Cambiar idioma',footer:['Inicio','Directorio','Finanzas','Impuestos','Negocios','Diario','Para empresas','API','Planes','Lista premium','Acerca de','Metodología','Privacidad','Términos','Aviso legal','Contacto']},
fr:{home:'Accueil',login:'Connexion',all:'Calculatrices',search:'Rechercher un calculateur',finance:'Finance',tax:'Impôts',business:'Outils professionnels',global:'Calculatrices internationales',everyday:'Quotidien',blog:'Blog',embed:'Intégrer',forBusiness:'Pour les entreprises',api:'API',plans:'Offres',about:'À propos',contact:'Contact',admin:'Admin',language:'Langue',choose:'Choisir la langue du site',change:'Changer de langue',footer:['Accueil','Répertoire','Finance','Impôts','Entreprise','Quotidien','Entreprises','API','Offres','Liste premium','À propos','Méthodologie','Confidentialité','Conditions','Avertissement','Contact']},
pt:{home:'Início',login:'Entrar',all:'Calculadoras',search:'Pesquisar calculadoras',finance:'Finanças',tax:'Impostos',business:'Ferramentas empresariais',global:'Calculadoras globais',everyday:'Dia a dia',blog:'Blog',embed:'Incorporar',forBusiness:'Para empresas',api:'API',plans:'Planos',about:'Sobre',contact:'Contato',admin:'Admin',language:'Idioma',choose:'Escolher idioma do site',change:'Mudar idioma',footer:['Início','Diretório','Finanças','Impostos','Negócios','Dia a dia','Para empresas','API','Planos','Lista premium','Sobre','Metodologia','Privacidade','Termos','Aviso legal','Contato']},
ar:{home:'الرئيسية',login:'تسجيل الدخول',all:'جميع الحاسبات',search:'البحث عن حاسبة',finance:'التمويل',tax:'الضرائب',business:'أدوات الأعمال',global:'حاسبات عالمية',everyday:'اليومي',blog:'المدونة',embed:'تضمين',forBusiness:'للأعمال',api:'API',plans:'الخطط',about:'من نحن',contact:'اتصل بنا',admin:'المسؤول',language:'اللغة',choose:'اختر لغة الموقع',change:'تغيير اللغة',footer:['الرئيسية','الدليل','التمويل','الضرائب','الأعمال','اليومي','للأعمال','API','الخطط','قائمة بريميوم','من نحن','المنهجية','الخصوصية','الشروط','إخلاء المسؤولية','اتصل بنا']},
id:{home:'Beranda',login:'Masuk',all:'Semua kalkulator',search:'Cari kalkulator',finance:'Keuangan',tax:'Pajak',business:'Alat bisnis',global:'Kalkulator global',everyday:'Sehari-hari',blog:'Blog',embed:'Sematkan',forBusiness:'Untuk bisnis',api:'API',plans:'Paket',about:'Tentang',contact:'Kontak',admin:'Admin',language:'Bahasa',choose:'Pilih bahasa situs',change:'Ubah bahasa',footer:['Beranda','Direktori','Keuangan','Pajak','Bisnis','Sehari-hari','Untuk bisnis','API','Paket','Daftar premium','Tentang','Metodologi','Privasi','Ketentuan','Penafian','Kontak']},
bn:{home:'হোম',login:'লগ ইন',all:'সব ক্যালকুলেটর',search:'ক্যালকুলেটর খুঁজুন',finance:'অর্থ',tax:'কর',business:'ব্যবসার টুল',global:'বিশ্বব্যাপী ক্যালকুলেটর',everyday:'দৈনন্দিন',blog:'ব্লগ',embed:'এম্বেড',forBusiness:'ব্যবসার জন্য',api:'API',plans:'প্ল্যান',about:'পরিচিতি',contact:'যোগাযোগ',admin:'অ্যাডমিন',language:'ভাষা',choose:'ওয়েবসাইটের ভাষা বাছুন',change:'ভাষা পরিবর্তন',footer:['হোম','ডিরেক্টরি','অর্থ','কর','ব্যবসা','দৈনন্দিন','ব্যবসার জন্য','API','প্ল্যান','প্রিমিয়াম তালিকা','পরিচিতি','পদ্ধতি','গোপনীয়তা','শর্তাবলি','দায় অস্বীকার','যোগাযোগ']},
ta:{home:'முகப்பு',login:'உள்நுழை',all:'அனைத்து கணிப்பான்கள்',search:'கணிப்பானைத் தேடு',finance:'நிதி',tax:'வரி',business:'வணிகக் கருவிகள்',global:'உலகளாவிய கணிப்பான்கள்',everyday:'அன்றாடம்',blog:'வலைப்பதிவு',embed:'உட்பொதி',forBusiness:'வணிகங்களுக்கு',api:'API',plans:'திட்டங்கள்',about:'எங்களைப் பற்றி',contact:'தொடர்பு',admin:'நிர்வாகம்',language:'மொழி',choose:'இணையதள மொழியைத் தேர்ந்தெடுக்கவும்',change:'மொழியை மாற்று',footer:['முகப்பு','பட்டியல்','நிதி','வரி','வணிகம்','அன்றாடம்','வணிகங்களுக்கு','API','திட்டங்கள்','பிரீமியம் பட்டியல்','எங்களைப் பற்றி','முறை','தனியுரிமை','விதிமுறைகள்','மறுப்பு','தொடர்பு']},
ja:{home:'ホーム',login:'ログイン',all:'計算ツール一覧（英語）',search:'計算ツールを検索',finance:'金融',tax:'税金',business:'ビジネスツール（英語）',global:'世界向け計算ツール（英語）',everyday:'日常（英語）',blog:'ブログ（英語）',embed:'埋め込み',forBusiness:'法人向け',api:'API',plans:'プラン',about:'サイトについて',contact:'お問い合わせ',admin:'管理',language:'言語',choose:'サイトの言語を選択',change:'言語を変更',footer:['ホーム','一覧','金融','税金','ビジネス','日常','法人向け','API','プラン','プレミアム','サイトについて','計算方法','プライバシー','利用規約','免責事項','お問い合わせ']},
ru:{home:'Главная',login:'Войти',all:'Каталог (английский)',search:'Поиск калькулятора',finance:'Финансы',tax:'Налоги',business:'Бизнес-инструменты (англ.)',global:'Международные калькуляторы',everyday:'На каждый день (англ.)',blog:'Блог (английский)',embed:'Встроить',forBusiness:'Для бизнеса',api:'API',plans:'Тарифы',about:'О проекте',contact:'Контакты',admin:'Администратор',language:'Язык',choose:'Выберите язык сайта',change:'Изменить язык',footer:['Главная','Каталог','Финансы','Налоги','Бизнес','На каждый день','Для бизнеса','API','Тарифы','Премиум','О проекте','Методология','Конфиденциальность','Условия','Отказ от ответственности','Контакты']}
};
const nav=chrome[currentLocale]||chrome.en;
const links=[
  [nav.home,localeHome[currentLocale]],
  [nav.business,currentLocale==='en'||['de','ja','ru'].includes(currentLocale)?r+'business-calculators.html':localeHome[currentLocale]+'#business'],
  [nav.finance,currentLocale==='en'?r+'finance-calculators.html':['de','ja','ru'].includes(currentLocale)?(currentLocale==='de'?'/de/calculators/currency-converter-calculator.html':'/'+currentLocale+'/calculators/mortgage-calculator.html'):localeHome[currentLocale]+'#finance'],
  [nav.tax,currentLocale==='en'?r+'tax.html':['de','ja','ru'].includes(currentLocale)?(currentLocale==='de'?r+'tax.html':'/'+currentLocale+'/international/vat-calculator.html'):localeHome[currentLocale]+'#tax'],
  [nav.everyday,currentLocale==='en'||['de','ja','ru'].includes(currentLocale)?r+'everyday-calculators.html':localeHome[currentLocale]+'#everyday'],
  [nav.global,currentLocale==='ja'||currentLocale==='ru'?'/'+currentLocale+'/international/':'/international/'],
  [nav.all,r+'site-directory.html'],
  [nav.blog,currentLocale==='hi'?'/hi/blog/':'/blog/'],
  [nav.login,r+'dashboard.html']
];
const languageControl='<label class="fc-language-control"><span class="fc-language-label">'+nav.language+'</span><select id="fc-language-select" aria-label="'+nav.choose+'">'+Object.entries(localeNames).map(([code,name])=>'<option value="'+code+'">'+name+'</option>').join('')+'</select></label>';
const currencyNames={INR:'INR · Indian Rupee',USD:'USD · US Dollar',EUR:'EUR · Euro',GBP:'GBP · British Pound',AED:'AED · UAE Dirham',CAD:'CAD · Canadian Dollar',AUD:'AUD · Australian Dollar',JPY:'JPY · Japanese Yen',SGD:'SGD · Singapore Dollar',CHF:'CHF · Swiss Franc',CNY:'CNY · Chinese Yuan',NZD:'NZD · New Zealand Dollar',SAR:'SAR · Saudi Riyal',BRL:'BRL · Brazilian Real',MXN:'MXN · Mexican Peso',ZAR:'ZAR · South African Rand',BDT:'BDT · Bangladeshi Taka',PKR:'PKR · Pakistani Rupee',IDR:'IDR · Indonesian Rupiah',THB:'THB · Thai Baht',RUB:'RUB · Russian Ruble',TRY:'TRY · Turkish Lira',KRW:'KRW · South Korean Won',VND:'VND · Vietnamese Dong',PHP:'PHP · Philippine Peso',MYR:'MYR · Malaysian Ringgit',PLN:'PLN · Polish Zloty',SEK:'SEK · Swedish Krona',NOK:'NOK · Norwegian Krone',DKK:'DKK · Danish Krone',CZK:'CZK · Czech Koruna',HUF:'HUF · Hungarian Forint',ILS:'ILS · Israeli New Shekel',NGN:'NGN · Nigerian Naira',KES:'KES · Kenyan Shilling',EGP:'EGP · Egyptian Pound',QAR:'QAR · Qatari Riyal',KWD:'KWD · Kuwaiti Dinar',OMR:'OMR · Omani Rial',LKR:'LKR · Sri Lankan Rupee',NPR:'NPR · Nepalese Rupee',BHD:'BHD · Bahraini Dinar',CLP:'CLP · Chilean Peso',COP:'COP · Colombian Peso',ARS:'ARS · Argentine Peso',UAH:'UAH · Ukrainian Hryvnia',MAD:'MAD · Moroccan Dirham',RON:'RON · Romanian Leu',BGN:'BGN · Bulgarian Lev'};
const currencyControl='<label class="fc-currency-control"><span class="fc-language-label">Display currency</span><select id="fc-currency-select" aria-label="Display currency">'+Object.entries(currencyNames).map(([code,name])=>'<option value="'+code+'">'+name+'</option>').join('')+'</select></label>';
const formatLocales={'en-IN':'India · English (IN)','hi-IN':'India · हिन्दी','en-US':'United States · English','en-GB':'United Kingdom · English','en-CA':'Canada · English','en-AU':'Australia · English','de-DE':'Germany · Deutsch','fr-FR':'France · Français','es-ES':'Spain · Español','pt-BR':'Brazil · Português','ar-AE':'UAE · العربية','ar-SA':'Saudi Arabia · العربية','ja-JP':'Japan · 日本語','ru-RU':'Russia · Русский','id-ID':'Indonesia · Bahasa','bn-BD':'Bangladesh · বাংলা','ta-IN':'India · தமிழ்','zh-CN':'China · 中文','en-ZA':'South Africa · English','tr-TR':'Türkiye · Türkçe','ko-KR':'South Korea · 한국어','vi-VN':'Vietnam · Tiếng Việt','fil-PH':'Philippines · Filipino','ms-MY':'Malaysia · Bahasa Melayu','pl-PL':'Poland · Polski','sv-SE':'Sweden · Svenska','nb-NO':'Norway · Norsk','da-DK':'Denmark · Dansk','cs-CZ':'Czechia · Čeština','hu-HU':'Hungary · Magyar','he-IL':'Israel · עברית','en-NG':'Nigeria · English','en-KE':'Kenya · English','ar-EG':'Egypt · العربية','ar-QA':'Qatar · العربية','ar-KW':'Kuwait · العربية','ar-OM':'Oman · العربية','si-LK':'Sri Lanka · සිංහල','ne-NP':'Nepal · नेपाली','es-CL':'Chile · Español','es-CO':'Colombia · Español','es-AR':'Argentina · Español','uk-UA':'Ukraine · Українська','ro-RO':'Romania · Română','ar-BH':'Bahrain · العربية','ar-MA':'Morocco · العربية'};
const countryNames={IN:'🇮🇳 India',US:'🇺🇸 United States',GB:'🇬🇧 United Kingdom',CA:'🇨🇦 Canada',AU:'🇦🇺 Australia',AE:'🇦🇪 United Arab Emirates',SA:'🇸🇦 Saudi Arabia',DE:'🇩🇪 Germany',FR:'🇫🇷 France',BR:'🇧🇷 Brazil',MX:'🇲🇽 Mexico',ID:'🇮🇩 Indonesia',PH:'🇵🇭 Philippines',NG:'🇳🇬 Nigeria',ZA:'🇿🇦 South Africa',PK:'🇵🇰 Pakistan',BD:'🇧🇩 Bangladesh',ES:'🇪🇸 Spain',JP:'🇯🇵 Japan',CN:'🇨🇳 China',RU:'🇷🇺 Russia',TR:'🇹🇷 Türkiye',KR:'🇰🇷 South Korea',VN:'🇻🇳 Vietnam',AR:'🇦🇷 Argentina',CL:'🇨🇱 Chile',CO:'🇨🇴 Colombia',SG:'🇸🇬 Singapore',NZ:'🇳🇿 New Zealand',CH:'🇨🇭 Switzerland',MY:'🇲🇾 Malaysia',IE:'🇮🇪 Ireland',IT:'🇮🇹 Italy',NL:'🇳🇱 Netherlands',PT:'🇵🇹 Portugal',PL:'🇵🇱 Poland',SE:'🇸🇪 Sweden',NO:'🇳🇴 Norway',DK:'🇩🇰 Denmark',KE:'🇰🇪 Kenya',NP:'🇳🇵 Nepal',IL:'🇮🇱 Israel',EG:'🇪🇬 Egypt',QA:'🇶🇦 Qatar',KW:'🇰🇼 Kuwait',OM:'🇴🇲 Oman'};
const countryControl='<label class="fc-country-control"><span class="fc-language-label">Country</span><select id="fc-country-select" aria-label="Choose country">'+Object.entries(countryNames).map(([code,name])=>'<option value="'+code+'">'+name+'</option>').join('')+'</select></label>';
const formatControl='<label class="fc-format-control"><span class="fc-language-label">Number & date format</span><select id="fc-locale-select" aria-label="Number and date format">'+Object.entries(formatLocales).map(([code,name])=>'<option value="'+code+'">'+name+'</option>').join('')+'</select></label>';
const unitControl='<label class="fc-unit-control"><span class="fc-language-label">Units</span><select id="fc-unit-system-select" aria-label="Measurement unit system"><option value="metric">Metric</option><option value="imperial">Imperial</option></select></label>';
h.innerHTML='<div class="fc-global-nav"><a class="fc-global-brand" href="'+localeHome[currentLocale]+'" aria-label="Friendly Calculator home"><img class="fc-brand-mark" src="/assets/friendly-calculator-logo.svg" width="34" height="34" alt="Friendly Calculator logo" decoding="async"> <span>FRIENDLY <b>CALCULATOR</b></span></a><nav id="fc-primary-navigation" class="fc-global-links" aria-label="'+nav.choose+'">'+links.map(([n,u])=>'<a href="'+u+'"'+(p===u?' aria-current="page"':'')+(n===nav.login?' class="fc-login-link"':'')+'>'+n+'</a>').join('')+languageControl+countryControl+currencyControl+formatControl+unitControl+'</nav></div>';
const reservedHeader=document.getElementById('fc-header-reservation');
const existingHeader=[...document.body.children].find(e=>e.tagName==='HEADER');
const existingHeaderIsNavigation=!!(existingHeader&&(existingHeader.querySelector('.fc-brand,.fc-global-brand')||existingHeader.querySelector('nav[aria-label="Main navigation"]')));
const headerIsReady=!!(existingHeader&&existingHeader.classList.contains('fc-global-header')&&existingHeader.querySelector('.fc-global-nav #fc-primary-navigation')&&existingHeader.querySelector('#fc-language-select')&&existingHeader.querySelector('#fc-currency-select')&&existingHeader.querySelector('#fc-country-select')&&existingHeader.querySelector('#fc-locale-select')&&existingHeader.querySelector('#fc-unit-system-select'));
if(headerIsReady){if(reservedHeader)reservedHeader.remove();}
else if(reservedHeader){reservedHeader.replaceWith(h);if(existingHeaderIsNavigation)existingHeader.remove();}
else if(existingHeaderIsNavigation){existingHeader.replaceWith(h);}
else document.body.prepend(h);
const activeHeader=headerIsReady?existingHeader:h;
const primaryNav=activeHeader.querySelector('#fc-primary-navigation');
if(primaryNav&&!activeHeader.querySelector('.fc-nav-toggle')){
  const menuText={en:'Menu',hi:'मेन्यू',es:'Menú',fr:'Menu',pt:'Menu',de:'Menü',ar:'القائمة',id:'Menu',bn:'মেনু',ta:'பட்டியல்',ja:'メニュー',ru:'Меню'};
  const closeText={en:'Close menu',hi:'मेन्यू बंद करें',es:'Cerrar menú',fr:'Fermer le menu',pt:'Fechar menu',de:'Menü schließen',ar:'إغلاق القائمة',id:'Tutup menu',bn:'মেনু বন্ধ করুন',ta:'பட்டியலை மூடு',ja:'メニューを閉じる',ru:'Закрыть меню'};
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='fc-nav-toggle';
  toggle.setAttribute('aria-controls','fc-primary-navigation');
  toggle.setAttribute('aria-expanded','false');
  toggle.textContent=menuText[currentLocale]||menuText.en;
  toggle.addEventListener('click',()=>{
    const open=toggle.getAttribute('aria-expanded')!=='true';
    toggle.setAttribute('aria-expanded',String(open));
    primaryNav.classList.toggle('fc-nav-open',open);
    toggle.textContent=open?(closeText[currentLocale]||closeText.en):(menuText[currentLocale]||menuText.en);
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){
      toggle.setAttribute('aria-expanded','false');
      primaryNav.classList.remove('fc-nav-open');
      toggle.textContent=menuText[currentLocale]||menuText.en;
      toggle.focus();
    }
  });
  primaryNav.addEventListener('click',event=>{
    if(event.target.closest('a')&&window.matchMedia('(max-width: 760px)').matches){
      toggle.setAttribute('aria-expanded','false');
      primaryNav.classList.remove('fc-nav-open');
      toggle.textContent=menuText[currentLocale]||menuText.en;
    }
  });
  const syncNav=()=>{
    if(!window.matchMedia('(max-width: 760px)').matches){
      primaryNav.classList.remove('fc-nav-open');
      toggle.setAttribute('aria-expanded','false');
      toggle.textContent=menuText[currentLocale]||menuText.en;
    }
  };
  window.addEventListener('resize',syncNav,{passive:true});
  activeHeader.querySelector('.fc-global-nav')?.insertBefore(toggle,primaryNav);
}
const routeLanguageSelect=activeHeader.querySelector('#fc-language-select');
const localeScript=document.createElement('script');localeScript.src='/assets/global-locale.js';localeScript.defer=true;document.head.appendChild(localeScript);
if(routeLanguageSelect){routeLanguageSelect.value=currentLocale;routeLanguageSelect.setAttribute('autocomplete','off');}
const footerLabels={
  de:['Über uns (Englisch)','Methodik (Englisch)','Datenschutz (Englisch)','Nutzungsbedingungen (Englisch)','Haftungsausschluss (Englisch)','Recht & Compliance (Englisch)','Einbetten','Kontakt (Englisch)'],
  en:['About','Methodology','Privacy','Terms','Disclaimer','Legal & Compliance','Embed','Contact'],
  hi:['हमारे बारे में','कार्यप्रणाली','गोपनीयता','नियम','अस्वीकरण','कानूनी एवं अनुपालन','एम्बेड','संपर्क'],
  es:['Acerca de','Metodología','Privacidad','Términos','Aviso legal','Legal y cumplimiento (inglés)','Insertar','Contacto'],
  fr:['À propos','Méthodologie','Confidentialité','Conditions','Avertissement','Droit et conformité (anglais)','Intégrer','Contact'],
  pt:['Sobre','Metodologia','Privacidade','Termos','Aviso legal','Jurídico e conformidade (inglês)','Incorporar','Contato'],
  ar:['من نحن','المنهجية','الخصوصية','الشروط','إخلاء المسؤولية','الشؤون القانونية والامتثال (بالإنجليزية)','تضمين','اتصل بنا'],
  id:['Tentang','Metodologi','Privasi','Ketentuan','Penafian','Hukum & Kepatuhan (Inggris)','Sematkan','Kontak'],
  bn:['পরিচিতি','পদ্ধতি','গোপনীয়তা','শর্তাবলি','দায় অস্বীকার','আইন ও সম্মতি (ইংরেজি)','এম্বেড','যোগাযোগ'],
  ta:['எங்களைப் பற்றி','முறை','தனியுரிமை','விதிமுறைகள்','மறுப்பு','சட்டம் மற்றும் இணக்கம் (ஆங்கிலம்)','உட்பொதி','தொடர்பு'],
  ja:['サイトについて（英語）','計算方法（英語）','プライバシー（英語）','利用規約（英語）','免責事項（英語）','法務・コンプライアンス（英語）','埋め込み','お問い合わせ（英語）'],
  ru:['О проекте (англ.)','Методология (англ.)','Конфиденциальность (англ.)','Условия (англ.)','Отказ от ответственности (англ.)','Право и соответствие (англ.)','Встроить','Контакты (англ.)']
};
const footerPaths=[currentLocale==='hi'?'/hi/about.html':r+'about.html',currentLocale==='hi'?'/hi/methodology.html':r+'methodology.html',r+'privacy.html',r+'terms.html',r+'disclaimer.html','/calculator/legal-compliance.html','/embed/',currentLocale==='hi'?'/hi/contact.html':r+'contact.html'];
const footerLinks=footerLabels[currentLocale].map((label,index)=>[label,footerPaths[index]]);
const f=document.createElement('footer');f.className='fc-global-footer';
f.innerHTML='<div class="fc-global-footer-inner"><div class="fc-footer-intro"><img class="fc-footer-mark" src="/assets/friendly-calculator-logo.svg" width="30" height="30" alt="Friendly Calculator logo" loading="lazy" decoding="async"><strong>FRIENDLY CALCULATOR</strong><br><small>'+({en:'Practical tools for everyday calculations.',hi:'रोज़मर्रा की गणनाओं के लिए उपयोगी टूल।',es:'Herramientas prácticas para cálculos cotidianos.',fr:'Des outils pratiques pour les calculs quotidiens.',pt:'Ferramentas práticas para cálculos do dia a dia.',ar:'أدوات عملية للحسابات اليومية.',id:'Alat praktis untuk perhitungan sehari-hari.',bn:'দৈনন্দিন হিসাবের জন্য ব্যবহারিক টুল।',ta:'அன்றாடக் கணக்கீடுகளுக்கான பயனுள்ள கருவிகள்.'}[currentLocale]||'Practical tools for everyday calculations.')+'</small></div><nav class="fc-global-footer-links" aria-label="'+nav.footer[10]+'">'+footerLinks.map(([n,u])=>'<a href="'+u+'"'+(p===u?' aria-current="page"':'')+'>'+n+'</a>').join('')+'</nav><nav class="fc-social-links" aria-label="Social media and contact"><a class="fc-social-link" href="https://www.instagram.com/avnish_ahirwar" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg></a><a class="fc-social-link" href="https://www.linkedin.com/in/avnishahirwar415" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.2 8.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6M3.7 10h3v10h-3zM9 10h2.9v1.4h.1c.4-.8 1.4-1.7 2.9-1.7 3.1 0 3.7 2 3.7 4.5V20h-3v-5.2c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6V20H9z"/></svg></a><a class="fc-social-link" href="mailto:avnishahirwar415@gmail.com" aria-label="Email" title="Email"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a></nav><small>© 2026 Friendly Calculator</small></div>'
const fs=[...document.body.children].filter(e=>e.tagName==='FOOTER');if(fs.length){fs.forEach((e,i)=>i===fs.length-1?e.replaceWith(f):e.remove());}else{document.body.append(f);}

// Financial/YMYL transparency: make authorship, update date, limitations and primary sources visible.
// Do not imply independent professional review or regulated credentials that have not been verified.
(function addFinancialEditorialDisclosure(){
  if(!main||!p.includes('/calculators/')||!p.endsWith('.html'))return;
  const slug=p.split('/').pop().replace(/\.html$/,'').toLowerCase();
  const financial=/(tax|gst|salary|loan|emi|sip|fd-|rd-|ppf|nps|epf|pf-|hra|gratuity|interest|investment|saving|pension|scheme|kisan|pmay|mudra|credit|mortgage|capital-gain|dividend|cagr|roi|inflation|portfolio|fire|annuity|scss|nsc|kvp|ssy|apy|insurance|budget|debt|cash-flow|profit|invoice|business|crop-cost|livestock-cost|sales-tax|reverse-charge)/i.test(slug);
  if(!financial||main.querySelector('.fc-financial-editorial'))return;
  const official=[
    ['Income Tax Department','https://www.incometax.gov.in/'],
    ['GST Portal','https://www.gst.gov.in/'],
    ['RBI','https://www.rbi.org.in/'],
    ['SEBI Investor','https://investor.sebi.gov.in/'],
    ['AMFI','https://www.amfiindia.com/'],
    ['PFRDA','https://www.pfrda.org.in/'],
    ['EPFO','https://www.epfindia.gov.in/'],
    ['Department of Economic Affairs — Small Savings','https://dea.gov.in/'],
    ['National Portal of India — Government Schemes','https://www.myscheme.gov.in/'],
    ['Ministry of Labour & Employment','https://labour.gov.in/'],
    ['NABARD','https://www.nabard.org/'],
    ['CBIC','https://www.cbic.gov.in/']
  ];
  let relevant=official.filter(([name])=>{
    if(/gst|invoice|reverse-charge|sales-tax/.test(slug))return ['GST Portal','CBIC'].includes(name);
    if(/income-tax|advance-tax|tds|hra|capital-gain|freelancer-tax|professional-tax/.test(slug))return ['Income Tax Department'].includes(name);
    if(/salary|ctc|gratuity|epf|pf-|pension|first-job|job-change/.test(slug))return ['Income Tax Department','EPFO','Ministry of Labour & Employment'].includes(name);
    if(/loan|emi|mortgage|credit|interest-rate|balance-transfer|mudra|kcc/.test(slug))return ['RBI','NABARD','National Portal of India — Government Schemes'].includes(name);
    if(/ppf|fd-|rd-|nps|sip|investment|mutual-fund|portfolio|dividend|cagr|return|scss|nsc|kvp|ssy|apy|savings|inflation|fire|annuity/.test(slug))return ['SEBI Investor','AMFI','PFRDA','Department of Economic Affairs — Small Savings','RBI'].includes(name);
    if(/kisan|pmay|scheme/.test(slug))return ['National Portal of India — Government Schemes','NABARD'].includes(name);
    return ['RBI','Income Tax Department','SEBI Investor'].includes(name);
  });
  const box=document.createElement('section');box.className='fc-financial-editorial';
  box.setAttribute('aria-label','Financial calculator editorial and source information');
  box.innerHTML='<h2>Editorial, calculation and source information</h2><p><strong>Author and publisher:</strong> Avnish Ahirwar — Founder and Editor, Friendly Calculator. The byline identifies editorial responsibility; it does not represent a chartered accountant, tax practitioner, lawyer, lender, or SEBI-registered investment adviser qualification. No independent professional review is claimed unless a page explicitly names a verified reviewer.</p><p><strong>Editorial disclosure updated:</strong> 14 November 2026. This is the date of this shared transparency notice, not a claim that every calculator’s formula, rate or rule was individually revalidated on this date. Check any page-specific review date and its linked primary source.</p><p><strong>Formula and assumptions:</strong> Review the page-specific “Formula”, “How this calculator works”, “Assumptions” and “Worked example” sections before using a result. Inputs, timing, rounding and exclusions differ by calculator. If the page does not state a material assumption or reproducible example, treat the result as incomplete and verify with the official provider.</p><p><strong>Important:</strong> Results are estimates for general education only. This is not financial, investment, tax, legal, accounting or lending advice, and it is not an offer, eligibility decision or guarantee. Confirm current rules, rates and terms for your circumstances with official sources and, where appropriate, a qualified professional.</p>';
  const sourceTitle=document.createElement('p');sourceTitle.innerHTML='<strong>Official references (check the source relevant to this calculator):</strong> ';
  relevant.forEach(([label,url],index)=>{if(index)sourceTitle.append(' · ');const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;sourceTitle.append(a);});
  box.append(sourceTitle);
  const policy=document.createElement('p');policy.innerHTML='<a href="/calculator/editorial-policy.html">Editorial Policy, Sources and Corrections</a> · <a href="/calculator/methodology.html">Calculation Methodology</a> · <a href="/calculator/about.html">Author information</a>';
  box.append(policy);
  const style=document.createElement('style');style.dataset.fcFinancialEditorial='true';style.textContent='.fc-financial-editorial{background:#fff;border:1px solid #dfe5eb;border-left:4px solid #d8bd82;border-radius:12px;padding:18px;margin:20px 0;color:#26384a;font-size:.94rem}.fc-financial-editorial h2{margin:0 0 10px;font-size:1.15rem}.fc-financial-editorial p{margin:9px 0}.fc-financial-editorial a{color:#174d79;text-underline-offset:2px}';
  document.head.append(style);
  const anchor=[...main.querySelectorAll('h2')].find(h=>/related calculators|related tools|frequently asked questions/i.test(h.textContent||''));
  if(anchor&&anchor.closest('section'))anchor.closest('section').before(box);else main.append(box);
})();
const buildLocaleTarget=next=>{
  // Preserve the current page path when an equivalent translation exists.
  // Special English/Hindi pages use their established route aliases.
  // Locale-specific route aliases are not assumed; test the equivalent URL below.
  const normalizedPath=currentLocale==='en'?p:p.replace(/^\/(?:hi|de|es|fr|pt|ar|id|bn|ta|ja|ru)(?=\/)/,'');
  if(next==='en')return normalizedPath==='/index.html'?'/':normalizedPath;
  if(normalizedPath==='/'||normalizedPath==='/index.html')return localeHome[next];
  return '/'+next+(normalizedPath.startsWith('/')?normalizedPath:'/'+normalizedPath);
};
const languageSelect=document.getElementById('fc-language-select');
if(languageSelect){
  languageSelect.addEventListener('change',()=>{
    const next=languageSelect.value;
    if(!localeHome[next])return;
    try{localStorage.setItem('fc-language-preference',next);localStorage.setItem('fc-language-source','manual')}catch(_){}
    if(next===currentLocale)return;
    const target=buildLocaleTarget(next);
    // Use GET for static hosts/CDNs that do not implement HEAD consistently.
    // Cancel the body as soon as headers arrive to avoid downloading the full page twice.
    fetch(target,{method:'GET',cache:'no-store',credentials:'same-origin'}).then(response=>{
      if(response.ok){response.body?.cancel();location.href=target;return;}
      response.body?.cancel();
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
if(isCalculatorRoute){
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
  if(!button||!isCalculatorRoute)return;
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
if(isCalculatorRoute&&main&&!document.querySelector('.fc-share-panel')){
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
    ['Pinterest','https://pinterest.com/pin/create/button/?url='+encodedUrl+'&description='+encodedText],
    ['Reddit','https://www.reddit.com/submit?url='+encodedUrl+'&title='+encodedText],
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
if(isCalculatorRoute&&main){
  if(!document.querySelector('style[data-fc-tools]')){
    const style=document.createElement('style');style.dataset.fcTools='1';
    style.textContent='.fc-export-panel,.fc-related-tools,.fc-whatif-panel,.fc-scenario-panel{background:#fff;border:1px solid #dfe5eb;border-radius:12px;padding:18px;margin:18px 0}.fc-tool-actions{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}.fc-tool-actions button{border:0;border-radius:8px;background:#101c2c;color:#fff;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer}.fc-export-panel textarea{width:100%;min-height:88px;padding:10px;border:1px solid #bdc8d2;border-radius:8px;font:12px/1.5 ui-monospace,monospace}.fc-whatif-panel input[type=range]{width:100%}.fc-live-chart{margin:14px 0}.fc-live-row{margin:10px 0}.fc-live-row small{display:block;margin-bottom:4px;color:#526273}.fc-live-track{height:12px;background:#e8edf2;border-radius:20px;overflow:hidden}.fc-live-bar{height:100%;background:#385a7b;border-radius:20px}.fc-scenario-list{display:grid;gap:10px}.fc-scenario-card{border:1px solid #dfe5eb;border-radius:8px;padding:12px;margin:10px 0}.fc-scenario-card p{overflow-wrap:anywhere}.fc-scenario-comparison{max-width:100%;overflow-x:auto}.fc-scenario-table{width:100%;border-collapse:collapse;min-width:520px}.fc-scenario-table th,.fc-scenario-table td{padding:9px;border-bottom:1px solid #dfe5eb;text-align:left;vertical-align:top}.fc-scenario-table th{background:#f3f6f8}';
    document.head.appendChild(style);
  }
  if(!main.querySelector('#printResult')&&!main.querySelector('.fc-export-panel')){
    const panel=document.createElement('section');panel.className='fc-export-panel';
    const h=document.createElement('h2');h.textContent='Export and embed this calculator';
    const intro=document.createElement('p');intro.textContent='Copy, share, print or download your calculated result. Screenshots are allowed. Please retain the Friendly Calculator attribution when sharing results.';
    const actions=document.createElement('div');actions.className='fc-tool-actions';
    const resultNode=()=>main.querySelector('#live-page-calculator [aria-live="polite"],#extraResult,.results,.result,[aria-live="polite"],#result,#resultBox,.calculator-result,.result-box,.output');
    const resultText=()=>{const node=resultNode();const value=(node?.innerText||'').trim();return value||'No calculated result is available yet. Enter values and calculate first.';};
    const copyText=async value=>{
      try{await navigator.clipboard.writeText(value);return true;}catch(_){
        const field=document.createElement('textarea');field.value=value;field.setAttribute('readonly','');field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();
        let copied=false;try{copied=document.execCommand('copy')}catch(__){}field.remove();return copied;
      }
    };
    const copyResult=document.createElement('button');copyResult.type='button';copyResult.textContent='Copy Result';
    copyResult.addEventListener('click',async()=>{const text=resultText();if(text.startsWith('No calculated result')){copyResult.textContent='Calculate first';return;}const ok=await copyText((main.querySelector('h1')?.textContent||document.title).trim()+'\n'+text+'\nSource: '+location.href.split('#')[0]);copyResult.textContent=ok?'Result copied':'Copy unavailable';});
    const shareResult=document.createElement('button');shareResult.type='button';shareResult.textContent='Share Result';
    shareResult.addEventListener('click',async()=>{const text=resultText();if(text.startsWith('No calculated result')){shareResult.textContent='Calculate first';return;}const title=(main.querySelector('h1')?.textContent||document.title).trim();const shareData={title:title+' — Friendly Calculator',text:text+'\nSource: '+location.href.split('#')[0],url:location.href.split('#')[0]};try{if(navigator.share){await navigator.share(shareData);shareResult.textContent='Shared';}else{const ok=await copyText(shareData.title+'\n'+shareData.text);shareResult.textContent=ok?'Share text copied':'Share unavailable';}}catch(error){if(error?.name!=='AbortError')shareResult.textContent='Share unavailable';}});
    const print=document.createElement('button');print.type='button';print.textContent='Print / Save as PDF';print.addEventListener('click',()=>window.print());
    const png=document.createElement('button');png.type='button';png.textContent='Download result image';png.addEventListener('click',()=>{
      const title=(main.querySelector('h1')?.textContent||document.title).trim();
      const result=resultNode();
      const lines=(result?.innerText||'Enter values and calculate to create a result image.').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,12);
      const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=720;const ctx=canvas.getContext('2d');
      ctx.fillStyle='#f4f6f8';ctx.fillRect(0,0,1200,720);ctx.fillStyle='#101c2c';ctx.font='bold 38px Arial';ctx.fillText('Friendly Calculator',64,76);
      ctx.font='bold 28px Arial';ctx.fillText(title.slice(0,58),64,132);ctx.fillStyle='#526273';ctx.font='18px Arial';ctx.fillText('Illustrative result · '+new Date().toLocaleDateString('en-IN'),64,170);
      let y=225;ctx.font='20px Arial';for(const line of lines){if(y>630)break;ctx.fillStyle='#fff';ctx.fillRect(64,y-30,1072,54);ctx.fillStyle='#26384a';ctx.fillText(line.slice(0,90),84,y+5);y+=66;}
      ctx.fillStyle='#526273';ctx.font='15px Arial';ctx.fillText('Check inputs, assumptions and official terms before relying on this estimate.',64,684);
      canvas.toBlob(blob=>{if(!blob)return;const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download='friendly-calculator-result.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');
    });
    actions.append(copyResult,shareResult,print,png);
    const code=document.createElement('textarea');code.readOnly=true;code.setAttribute('aria-label','Calculator embed code');
    const embedUrl=location.origin+'/embed/?src='+encodeURIComponent(p);
    const title=(main.querySelector('h1')?.textContent||'Friendly Calculator').trim();
    code.value='<iframe src="'+embedUrl+'" title="'+title+' — Friendly Calculator" loading="lazy" width="100%" height="760" style="border:0" referrerpolicy="strict-origin-when-cross-origin"></iframe>\n<p>Powered by <a href="https://friendlycalculator.in/" rel="noopener">Friendly Calculator</a></p>';
    const copy=document.createElement('button');copy.type='button';copy.textContent='Copy embed code';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code.value);copy.textContent='Embed code copied';}catch(_){code.focus();code.select();copy.textContent='Select and copy the code';}});
    actions.append(copy);const rights=document.createElement('p');rights.className='fc-content-rights';rights.textContent='© Friendly Calculator. You may save and share your own calculation results with attribution. Republishing website text, design or bulk-copying content without permission is not allowed.';panel.append(h,intro,actions,code,rights);main.append(panel);
  }

  // User-controlled, device-local scenario snapshots and Excel-compatible CSV export.
  // Nothing is stored or transmitted until the visitor explicitly selects Save scenario.
  if(!main.querySelector('.fc-scenario-panel')){
    const scenarioCopy=currentLocale==='hi'?{
      title:'सेव किए गए गणना परिदृश्य',
      description:'अधिकतम 3 परिदृश्य केवल इसी ब्राउज़र और डिवाइस पर सेव होंगे। कोई डेटा Friendly Calculator सर्वर पर अपलोड नहीं होगा।',
      save:'वर्तमान परिदृश्य सेव करें',compare:'सेव किए गए परिदृश्यों की तुलना करें',clear:'सभी परिदृश्य हटाएँ',
      restore:'इनपुट वापस लाएँ',delete:'हटाएँ',csv:'CSV डाउनलोड करें (Excel)',
      saved:'परिदृश्य इसी डिवाइस के ब्राउज़र में सेव हुआ।',deleted:'परिदृश्य इस डिवाइस से हटा दिया गया।',
      cleared:'इस डिवाइस से सभी सेव किए गए परिदृश्य हटा दिए गए।',
      compared:'परिदृश्यों की तुलना हो गई। निष्कर्ष निकालने से पहले मान्यताओं और इकाइयों की जाँच करें।',
      restored:'इनपुट वापस आ गए। यदि कैलकुलेटर अपने आप अपडेट न हो तो Calculate चुनें।',
      enter:'पहले मान दर्ज करें और गणना करें।',maximum:'अधिकतम 3 परिदृश्य सेव हो सकते हैं। नया सेव करने से पहले एक हटाएँ।',
      needTwo:'तुलना के लिए कम-से-कम दो परिदृश्य सेव करें।'
    }:{
      title:'Save and compare scenarios',
      description:'Save up to 3 calculation snapshots on this device. Nothing is uploaded to Friendly Calculator.',
      save:'Save current scenario',compare:'Compare saved scenarios',clear:'Clear saved scenarios',
      restore:'Restore inputs',delete:'Delete',csv:'Download CSV (Excel)',
      saved:'Scenario saved only in this browser on this device.',deleted:'Scenario deleted from this device.',
      cleared:'All saved scenarios cleared from this device.',
      compared:'Saved scenarios compared. Review the assumptions and units before drawing conclusions.',
      restored:'Inputs restored. Select Calculate if this calculator does not update automatically.',
      enter:'Enter values and calculate first.',maximum:'You can save up to 3 scenarios. Delete one before saving another.',
      needTwo:'Save at least two scenarios to compare.'
    };
    const excludedField=/dob|birth|email|phone|mobile|address|password|token|secret|api.?key/i;
    const calculatorControls=()=>{
      const root=main.querySelector('#live-page-calculator,form,[data-fc-native-calculator]')||main;
      return [...root.querySelectorAll('input,select,textarea')].filter(el=>{
        if(el.closest('.fc-export-panel,.fc-scenario-panel'))return false;
        if(['hidden','submit','button','reset','image','file','password','email','tel'].includes((el.type||'').toLowerCase()))return false;
        if(excludedField.test((el.name||'')+' '+(el.id||'')))return false;
        if(['checkbox','radio'].includes((el.type||'').toLowerCase())&&!el.checked)return false;
        return true;
      });
    };
    const fieldLabel=el=>{
      const labels=el.labels?[...el.labels].map(x=>x.textContent.trim()).filter(Boolean):[];
      return labels[0]||el.getAttribute('aria-label')||el.name||el.id||'Input';
    };
    const readInputs=()=>calculatorControls().map(el=>({
      key:el.name||el.id||fieldLabel(el),
      label:fieldLabel(el),
      value:el.type==='checkbox'||el.type==='radio'?(el.checked?'Yes':'No'):String(el.value??'')
    }));
    const csvEscape=value=>'"'+String(value??'').replace(/"/g,'""')+'"';
    const exportCsv=document.createElement('button');
    exportCsv.type='button';exportCsv.textContent=scenarioCopy.csv;
    exportCsv.addEventListener('click',()=>{
      const rows=[['Friendly Calculator — '+(main.querySelector('h1')?.textContent||document.title)],['Page',location.href.split('#')[0]],['Exported',new Date().toISOString()],[],['Type','Name','Value']];
      readInputs().forEach(item=>rows.push(['Input',item.label,item.value]));
      const result=main.querySelector('#live-page-calculator [aria-live="polite"],#extraResult,.results,.result,[aria-live="polite"],#result,#resultBox,.calculator-result,.result-box,.output');
      const resultText=(result?.innerText||'').trim();
      if(resultText)rows.push(['Result','Calculated result',resultText]);
      const outputTables=main.querySelectorAll('#visualReport table,#sipResult table,#extraResult table,#result table,#resultBox table,.calculator-result table,.result-box table,.fc-result-table');
      outputTables.forEach((table,tableIndex)=>{
        [...table.rows].forEach((row,rowIndex)=>{
          const values=[...row.cells].map(cell=>(cell.innerText||cell.textContent||'').trim());
          if(values.length)rows.push(['Output table '+(tableIndex+1),'Row '+(rowIndex+1),...values]);
        });
      });
      const csv='\uFEFF'+rows.map(row=>row.map(csvEscape).join(',')).join('\r\n');
      const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='friendly-calculator-result.csv';document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    const exportActions=main.querySelector('.fc-export-panel .fc-tool-actions');
    if(exportActions)exportActions.appendChild(exportCsv);

    const panel=document.createElement('section');panel.className='fc-scenario-panel';
    panel.setAttribute('aria-label','Saved calculation scenarios');
    const heading=document.createElement('h2');heading.textContent=scenarioCopy.title;
    const description=document.createElement('p');
    description.textContent=scenarioCopy.description;
    const actions=document.createElement('div');actions.className='fc-tool-actions';
    const save=document.createElement('button');save.type='button';save.textContent=scenarioCopy.save;
    const compare=document.createElement('button');compare.type='button';compare.textContent=scenarioCopy.compare;
    const clear=document.createElement('button');clear.type='button';clear.textContent=scenarioCopy.clear;
    const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const list=document.createElement('div');list.className='fc-scenario-list';
    const comparison=document.createElement('div');comparison.className='fc-scenario-comparison';
    actions.append(save,compare,clear);panel.append(heading,description,actions,status,list,comparison);main.append(panel);
    const storageKey='fc-scenarios-v1:'+location.pathname;
    const readSaved=()=>{
      try{const value=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(value)?value.filter(item=>item&&typeof item==='object'&&Array.isArray(item.inputs)&&item.inputs.every(input=>input&&typeof input.key==='string'&&typeof input.label==='string'&&typeof input.value==='string')).slice(0,3):[];}catch(_){return [];}
    };
    const writeSaved=items=>{
      try{localStorage.setItem(storageKey,JSON.stringify(items.slice(0,3)));return true;}catch(_){status.textContent='Browser storage is unavailable or full. No scenario was saved.';return false;}
    };
    const resultSnapshot=()=>{
      const node=main.querySelector('#live-page-calculator [aria-live="polite"],#extraResult,.results,.result,[aria-live="polite"],#result,#resultBox,.calculator-result,.result-box,.output');
      return (node?.innerText||'').trim();
    };
    const render=()=>{
      const saved=readSaved();list.replaceChildren();comparison.replaceChildren();
      saved.forEach((item,index)=>{
        const card=document.createElement('article');card.className='fc-scenario-card';
        const title=document.createElement('strong');title.textContent=item.name+' · '+new Date(item.savedAt).toLocaleString();
        const result=document.createElement('p');result.textContent=item.result||'No result text was detected when saved.';
        const restore=document.createElement('button');restore.type='button';restore.textContent=scenarioCopy.restore;
        restore.addEventListener('click',()=>{
          const controls=calculatorControls();
          item.inputs.forEach(input=>{
            const control=controls.find(el=>(el.name||el.id||fieldLabel(el))===input.key);
            if(!control)return;
            if(control.type==='checkbox'||control.type==='radio')control.checked=input.value==='Yes';
            else control.value=input.value;
            control.dispatchEvent(new Event('input',{bubbles:true}));
            control.dispatchEvent(new Event('change',{bubbles:true}));
          });
          status.textContent=scenarioCopy.restored;
        });
        const remove=document.createElement('button');remove.type='button';remove.textContent=scenarioCopy.delete;
        remove.addEventListener('click',()=>{const next=readSaved();next.splice(index,1);writeSaved(next);status.textContent=scenarioCopy.deleted;render();});
        const buttons=document.createElement('div');buttons.className='fc-tool-actions';buttons.append(restore,remove);
        card.append(title,result,buttons);list.appendChild(card);
      });
      compare.disabled=saved.length<2;
      clear.disabled=saved.length===0;
    };
    save.addEventListener('click',()=>{
      const inputs=readInputs(),result=resultSnapshot();
      if(!inputs.length&&!result){status.textContent=scenarioCopy.enter;return;}
      const saved=readSaved();
      if(saved.length>=3){status.textContent=scenarioCopy.maximum;return;}
      saved.push({name:'Scenario '+(saved.length+1),savedAt:new Date().toISOString(),inputs,result});
      if(writeSaved(saved)){status.textContent=scenarioCopy.saved;render();}
    });
    compare.addEventListener('click',()=>{
      const saved=readSaved();comparison.replaceChildren();
      if(saved.length<2){status.textContent=scenarioCopy.needTwo;return;}
      const table=document.createElement('table');table.className='fc-scenario-table';
      const head=document.createElement('thead'),headRow=document.createElement('tr');
      ['Input / result',...saved.map(item=>item.name)].forEach(label=>{const th=document.createElement('th');th.scope='col';th.textContent=label;headRow.appendChild(th);});
      head.appendChild(headRow);table.appendChild(head);
      const body=document.createElement('tbody'),keys=[...new Set(saved.flatMap(item=>item.inputs.map(input=>input.key)))];
      keys.forEach(key=>{
        const row=document.createElement('tr'),label=document.createElement('th');label.scope='row';
        const sample=saved.flatMap(item=>item.inputs).find(input=>input.key===key);label.textContent=sample?.label||key;row.appendChild(label);
        saved.forEach(item=>{const cell=document.createElement('td');cell.textContent=item.inputs.find(input=>input.key===key)?.value??'—';row.appendChild(cell);});body.appendChild(row);
      });
      const resultRow=document.createElement('tr'),resultLabel=document.createElement('th');resultLabel.scope='row';resultLabel.textContent='Calculated result';resultRow.appendChild(resultLabel);
      saved.forEach(item=>{const cell=document.createElement('td');cell.textContent=item.result||'—';resultRow.appendChild(cell);});body.appendChild(resultRow);
      table.appendChild(body);comparison.appendChild(table);status.textContent=scenarioCopy.compared;
    });
    clear.addEventListener('click',()=>{
      try{localStorage.removeItem(storageKey);status.textContent=scenarioCopy.cleared;render();}catch(_){status.textContent='Unable to clear browser storage.';}
    });
    render();
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
    '/calculators/loan-prepayment-vs-investment-calculator.html':[['Loan Prepayment','/calculators/loan-prepayment-calculator.html'],['FD vs RD vs SIP','/calculators/fd-rd-sip-comparison-calculator.html']],
    '/calculators/accuracy-calculator.html':[['Confusion Matrix Calculator','/calculators/confusion-matrix-calculator.html'],['Confidence Interval Calculator','/calculators/confidence-interval-calculator.html'],['ANOVA Calculator','/calculators/anova-calculator.html']],
    '/calculators/anova-calculator.html':[['Confidence Interval Calculator','/calculators/confidence-interval-calculator.html'],['Expected Value Calculator','/calculators/expected-value-calculator.html'],['Class Width Calculator','/calculators/class-width-calculator.html']],
    '/calculators/bayes-theorem-calculator.html':[['Conditional Probability Calculator','/calculators/conditional-probability-calculator.html'],['Joint Probability Calculator','/calculators/joint-probability-calculator.html'],['Confusion Matrix Calculator','/calculators/confusion-matrix-calculator.html']],
    '/calculators/chebyshevs-theorem-calculator.html':[['Confidence Interval Calculator','/calculators/confidence-interval-calculator.html'],['Class Width Calculator','/calculators/class-width-calculator.html'],['ANOVA Calculator','/calculators/anova-calculator.html']],
    '/calculators/confusion-matrix-calculator.html':[['Accuracy Calculator','/calculators/accuracy-calculator.html'],['Bayes’ Theorem Calculator','/calculators/bayes-theorem-calculator.html'],['Conditional Probability Calculator','/calculators/conditional-probability-calculator.html']],
    '/calculators/conditional-probability-calculator.html':[['Bayes’ Theorem Calculator','/calculators/bayes-theorem-calculator.html'],['Joint Probability Calculator','/calculators/joint-probability-calculator.html'],['Expected Value Calculator','/calculators/expected-value-calculator.html']],
    '/calculators/expected-value-calculator.html':[['Joint Probability Calculator','/calculators/joint-probability-calculator.html'],['Conditional Probability Calculator','/calculators/conditional-probability-calculator.html'],['ANOVA Calculator','/calculators/anova-calculator.html']],
    '/calculators/joint-probability-calculator.html':[['Conditional Probability Calculator','/calculators/conditional-probability-calculator.html'],['Bayes’ Theorem Calculator','/calculators/bayes-theorem-calculator.html'],['Expected Value Calculator','/calculators/expected-value-calculator.html']],
    '/calculators/class-width-calculator.html':[['Chebyshev’s Theorem Calculator','/calculators/chebyshevs-theorem-calculator.html'],['Confidence Interval Calculator','/calculators/confidence-interval-calculator.html'],['ANOVA Calculator','/calculators/anova-calculator.html']],
    '/calculators/confidence-interval-calculator.html':[['ANOVA Calculator','/calculators/anova-calculator.html'],['Chebyshev’s Theorem Calculator','/calculators/chebyshevs-theorem-calculator.html'],['Accuracy Calculator','/calculators/accuracy-calculator.html']],
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

/* Accessible display preferences: persistent theme and text scaling. */
(()=>{
  if(!document.body||window.self!==window.top||document.getElementById('fc-display-settings'))return;
  const lang=(document.documentElement.lang||'en').toLowerCase().split('-')[0];
  const labels={
    en:{open:'Display settings',title:'Display settings',theme:'Dark mode',smaller:'A−',larger:'A+',close:'Close',themeOn:'Dark mode on',themeOff:'Dark mode off',text:'Text size'},
    hi:{open:'दिखावट सेटिंग',title:'दिखावट सेटिंग',theme:'डार्क मोड',smaller:'अ−',larger:'अ+',close:'बंद करें',themeOn:'डार्क मोड चालू',themeOff:'डार्क मोड बंद',text:'अक्षर का आकार'},
    es:{open:'Apariencia',title:'Ajustes de pantalla',theme:'Modo oscuro',smaller:'A−',larger:'A+',close:'Cerrar',themeOn:'Modo oscuro activado',themeOff:'Modo oscuro desactivado',text:'Tamaño del texto'},
    fr:{open:'Affichage',title:'Paramètres d’affichage',theme:'Mode sombre',smaller:'A−',larger:'A+',close:'Fermer',themeOn:'Mode sombre activé',themeOff:'Mode sombre désactivé',text:'Taille du texte'},
    pt:{open:'Aparência',title:'Configurações de exibição',theme:'Modo escuro',smaller:'A−',larger:'A+',close:'Fechar',themeOn:'Modo escuro ativado',themeOff:'Modo escuro desativado',text:'Tamanho do texto'},
    ar:{open:'إعدادات العرض',title:'إعدادات العرض',theme:'الوضع الداكن',smaller:'A−',larger:'A+',close:'إغلاق',themeOn:'الوضع الداكن مفعّل',themeOff:'الوضع الداكن متوقف',text:'حجم النص'},
    id:{open:'Tampilan',title:'Pengaturan tampilan',theme:'Mode gelap',smaller:'A−',larger:'A+',close:'Tutup',themeOn:'Mode gelap aktif',themeOff:'Mode gelap nonaktif',text:'Ukuran teks'},
    bn:{open:'প্রদর্শন সেটিংস',title:'প্রদর্শন সেটিংস',theme:'ডার্ক মোড',smaller:'অ−',larger:'অ+',close:'বন্ধ',themeOn:'ডার্ক মোড চালু',themeOff:'ডার্ক মোড বন্ধ',text:'লেখার আকার'},
    ta:{open:'காட்சி அமைப்புகள்',title:'காட்சி அமைப்புகள்',theme:'இருண்ட பயன்முறை',smaller:'அ−',larger:'அ+',close:'மூடு',themeOn:'இருண்ட பயன்முறை இயக்கம்',themeOff:'இருண்ட பயன்முறை முடக்கம்',text:'எழுத்து அளவு'}
  };
  const t=labels[lang]||labels.en;
  const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch(_){return fallback;}};
  const write=(key,value)=>{try{localStorage.setItem(key,value);}catch(_){}};
  const theme=read('fc-display-theme','');
  const initialTheme=theme==='dark'||theme==='light'?theme:
    (window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  const allowedSizes=['normal','large','larger'];
  const initialSize=allowedSizes.includes(read('fc-display-size','normal'))?read('fc-display-size','normal'):'normal';
  const applyTheme=value=>{
    document.documentElement.setAttribute('data-fc-theme',value);
    write('fc-display-theme',value);
    themeButton.setAttribute('aria-pressed',String(value==='dark'));
    themeButton.textContent=t.theme+' · '+(value==='dark'?'●':'○');
    status.textContent=value==='dark'?t.themeOn:t.themeOff;
  };
  const applySize=value=>{
    const safe=allowedSizes.includes(value)?value:'normal';
    document.documentElement.setAttribute('data-fc-text-size',safe);
    write('fc-display-size',safe);
    sizeValue.textContent=safe==='normal'?'100%':safe==='large'?'112.5%':'125%';
    smaller.disabled=safe==='normal';
    larger.disabled=safe==='larger';
  };
  const open=document.createElement('button');
  open.id='fc-display-settings';
  open.type='button';
  open.textContent=t.open;
  open.setAttribute('aria-expanded','false');
  open.setAttribute('aria-controls','fc-display-panel');
  const panel=document.createElement('section');
  panel.id='fc-display-panel';
  panel.className='fc-display-panel';
  panel.hidden=true;
  panel.setAttribute('aria-label',t.title);
  const heading=document.createElement('strong');heading.textContent=t.title;
  const themeButton=document.createElement('button');themeButton.type='button';themeButton.className='fc-display-action';
  themeButton.addEventListener('click',()=>applyTheme(document.documentElement.getAttribute('data-fc-theme')==='dark'?'light':'dark'));
  const sizeLabel=document.createElement('label');sizeLabel.className='fc-display-size-label';sizeLabel.textContent=t.text;
  const sizeRow=document.createElement('div');sizeRow.className='fc-display-size-row';
  const smaller=document.createElement('button');smaller.type='button';smaller.className='fc-display-action';smaller.textContent=t.smaller;smaller.setAttribute('aria-label',t.smaller+' '+t.text);
  const sizeValue=document.createElement('output');sizeValue.className='fc-display-size-value';
  const larger=document.createElement('button');larger.type='button';larger.className='fc-display-action';larger.textContent=t.larger;larger.setAttribute('aria-label',t.larger+' '+t.text);
  smaller.addEventListener('click',()=>applySize(document.documentElement.getAttribute('data-fc-text-size')==='larger'?'large':'normal'));
  larger.addEventListener('click',()=>applySize(document.documentElement.getAttribute('data-fc-text-size')==='normal'?'large':'larger'));
  sizeRow.append(smaller,sizeValue,larger);
  const status=document.createElement('p');status.className='fc-display-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const close=document.createElement('button');close.type='button';close.className='fc-display-close';close.textContent=t.close;
  const closePanel=()=>{panel.hidden=true;open.setAttribute('aria-expanded','false');};
  close.addEventListener('click',closePanel);
  open.addEventListener('click',()=>{panel.hidden=!panel.hidden;open.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)themeButton.focus();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){closePanel();open.focus();}});
  panel.append(heading,themeButton,sizeLabel,sizeRow,status,close);
  document.body.append(open,panel);
  applyTheme(initialTheme);
  applySize(initialSize);
})();


// Store only calculator paths and page titles in this browser. Query strings are
// deliberately excluded so entered amounts or other input values are never saved.
if(isCalculatorRoute&&main){
  const recentKey='fc-recent-v1';
  const favouriteKey='fc-favourites-v1';
  const pageItem={url:location.pathname,title:(main.querySelector('h1')?.textContent||document.title||'Calculator').trim().slice(0,120)};
  const readItems=key=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(item=>item&&typeof item.url==='string'&&item.url.startsWith('/')&&typeof item.title==='string'):[];}catch(_){return [];}};
  const writeItems=(key,items)=>{try{localStorage.setItem(key,JSON.stringify(items));return true;}catch(_){return false;}};
  const recent=readItems(recentKey).filter(item=>item.url!==pageItem.url);
  recent.unshift(pageItem);
  writeItems(recentKey,recent.slice(0,5));
  const heading=main.querySelector('h1');
  const existingFavourite=heading?.nextElementSibling?.classList.contains('fc-favourite-toggle')?heading.nextElementSibling:null;
  const favouriteButton=existingFavourite||document.createElement('button');
  if(!existingFavourite){
    favouriteButton.type='button';
    favouriteButton.className='fc-favourite-toggle';
  }
  const refreshFavourite=()=>{
    const saved=readItems(favouriteKey);
    const active=saved.some(item=>item.url===pageItem.url);
    favouriteButton.setAttribute('aria-pressed',String(active));
    favouriteButton.textContent=active?'★ Saved to favourites':'☆ Add to favourites';
  };
  favouriteButton.addEventListener('click',()=>{
    const saved=readItems(favouriteKey);
    const exists=saved.some(item=>item.url===pageItem.url);
    const next=exists?saved.filter(item=>item.url!==pageItem.url):[pageItem,...saved.filter(item=>item.url!==pageItem.url)].slice(0,20);
    if(writeItems(favouriteKey,next))refreshFavourite();
    else favouriteButton.textContent='Browser storage unavailable';
  });
  if(!existingFavourite&&heading)heading.insertAdjacentElement('afterend',favouriteButton);
  refreshFavourite();
}

})();