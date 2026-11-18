(()=>{'use strict';
/* Small homepage-only shell: keep calculator-page features out of the homepage bundle. */
const main=document.querySelector('main');
if(main&&!main.id)main.id='fc-main-content';
if(main&&!document.querySelector('.fc-skip-link')){
  const skip=document.createElement('a');
  skip.className='fc-skip-link';
  skip.href='#fc-main-content';
  skip.textContent='Skip to main content';
  document.body.prepend(skip);
}

/* Keep the homepage language selector working without loading calculator-page code. */
const homes={en:'/',hi:'/hi/index.html',de:'/de/index.html',es:'/es/index.html',fr:'/fr/index.html',pt:'/pt/index.html',ar:'/ar/index.html',id:'/id/index.html',bn:'/bn/index.html',ta:'/ta/index.html',ja:'/ja/index.html',ru:'/ru/index.html'};
const languageSelect=document.getElementById('fc-language-select');
if(languageSelect){
  languageSelect.addEventListener('change',()=>{
    const next=languageSelect.value;
    const target=homes[next];
    if(!target||next==='en')return;
    try{localStorage.setItem('fc-language-preference',next);localStorage.setItem('fc-language-source','manual');}catch(_){}
    fetch(target,{method:'GET',cache:'no-store',credentials:'same-origin'}).then(response=>{
      if(response.ok){response.body?.cancel();location.href=target;return;}
      response.body?.cancel();
      try{sessionStorage.setItem('fc-language-notice',(languageSelect.options[languageSelect.selectedIndex]?.textContent||next)+' translation is not available for this page yet.');}catch(_){}
      location.href='/?lang='+encodeURIComponent(next);
    }).catch(()=>{location.href='/?lang='+encodeURIComponent(next);});
  });
}

/* Register offline support after the first page load. */
if(location.protocol==='https:'&&'serviceWorker' in navigator){
  const register=()=>navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{});
  if(document.readyState==='complete')register();
  else window.addEventListener('load',register,{once:true});
}

/* Preserve the existing GTM container, but keep it off the initial render path. */
if(!window.__fcGtmContainerLoaded){
  window.__fcGtmContainerLoaded=true;
  const inject=()=>{
    if(window.__fcGtmScriptStarted)return;
    window.__fcGtmScriptStarted=true;
    const script=document.createElement('script');
    script.async=true;
    script.fetchPriority='low';
    script.src='https://www.googletagmanager.com/gtm.js?id=GTM-MGJQH4DB';
    document.head.appendChild(script);
  };
  const schedule=()=>window.setTimeout(()=>{
    if('requestIdleCallback' in window)window.requestIdleCallback(inject,{timeout:8000});
    else inject();
  },8000);
  if(document.readyState==='complete')schedule();
  else window.addEventListener('load',schedule,{once:true});
}

/* Keep the homepage install affordance and offline notice. */
if(document.body&&window.self===window.top&&!document.getElementById('fc-pwa-install')&&!(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)&&navigator.standalone!==true){
  const style=document.createElement('style');
  style.textContent='.fc-pwa-install{position:fixed;left:14px;bottom:14px;z-index:1500;border:1px solid #d8bd82;border-radius:999px;background:#101c2c;color:#fff;padding:10px 15px;font:700 14px/1.2 system-ui,sans-serif;box-shadow:0 4px 18px #07132135;cursor:pointer}.fc-pwa-help{position:fixed;left:14px;bottom:66px;z-index:1500;width:min(340px,calc(100vw - 28px));padding:16px;border:1px solid #d9e0e6;border-radius:12px;background:#fff;color:#172638;box-shadow:0 8px 28px #07132130;font:14px/1.55 system-ui,sans-serif}.fc-pwa-help p{margin:0 0 10px}.fc-pwa-help button{border:0;border-radius:7px;background:#101c2c;color:#fff;padding:7px 12px;font:inherit;font-weight:700;cursor:pointer}.fc-pwa-network{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:1600;max-width:calc(100vw - 24px);padding:9px 14px;border-radius:9px;background:#25364b;color:#fff;font:600 13px/1.4 system-ui,sans-serif;box-shadow:0 4px 16px #07132135}';
  document.head.appendChild(style);
  const install=document.createElement('button');
  install.id='fc-pwa-install';install.type='button';install.className='fc-pwa-install';install.textContent='Install Friendly Calculator';
  install.setAttribute('aria-expanded','false');install.setAttribute('aria-controls','fc-pwa-help');
  const panel=document.createElement('section');
  panel.id='fc-pwa-help';panel.className='fc-pwa-help';panel.hidden=true;panel.setAttribute('aria-label','Install and offline help');
  const message=document.createElement('p');
  message.textContent='Install Friendly Calculator for an app-like shortcut. Previously visited public pages may be available offline; pages you have not opened before may still need an internet connection.';
  const close=document.createElement('button');close.type='button';close.textContent='Close';
  close.addEventListener('click',()=>{panel.hidden=true;install.setAttribute('aria-expanded','false');});
  panel.append(message,close);
  let promptEvent=null;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;});
  window.addEventListener('appinstalled',()=>{install.hidden=true;panel.hidden=true;promptEvent=null;});
  install.addEventListener('click',async()=>{
    if(promptEvent){
      const current=promptEvent;promptEvent=null;
      try{await current.prompt();const choice=await current.userChoice;if(choice?.outcome==='accepted'){install.hidden=true;panel.hidden=true;return;}}
      catch(_){message.textContent='Your browser could not open the install prompt. Use the browser menu and choose Install app or Add to Home Screen if available.';}
    }else{
      message.textContent=/iPad|iPhone|iPod/i.test(navigator.userAgent||'')
        ?'On iPhone or iPad, open this page in Safari, tap Share, then choose Add to Home Screen if available.'
        :/Android/i.test(navigator.userAgent||'')
          ?'On Android, open the browser menu and choose Install app or Add to Home Screen if available.'
          :'Use your browser menu or address-bar install icon if your browser offers one.';
    }
    panel.hidden=!panel.hidden;install.setAttribute('aria-expanded',String(!panel.hidden));
  });
  const network=document.createElement('div');network.className='fc-pwa-network';network.setAttribute('role','status');network.setAttribute('aria-live','polite');network.hidden=true;
  window.addEventListener('offline',()=>{network.textContent='You are offline. Previously visited public pages may still be available on this device.';network.hidden=false;});
  window.addEventListener('online',()=>{network.textContent='Connection restored.';network.hidden=false;window.setTimeout(()=>{network.hidden=true;},3500);});
  document.body.append(install,panel,network);
}

/* Keep the homepage fallback consistent with the shared two-mode Settings panel. */
if(document.body&&!document.getElementById('fc-display-settings')){
  const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch(_){return fallback;}};
  const write=(key,value)=>{try{localStorage.setItem(key,value);}catch(_){}};
  const open=document.createElement('button');open.id='fc-display-settings';open.type='button';open.textContent='Settings';open.setAttribute('aria-expanded','false');open.setAttribute('aria-controls','fc-display-panel');
  const panel=document.createElement('section');panel.id='fc-display-panel';panel.className='fc-display-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Settings & Accessibility');
  const heading=document.createElement('strong');heading.textContent='Settings & Accessibility';
  const modes=document.createElement('div');modes.className='fc-theme-mode-options';modes.setAttribute('role','group');modes.setAttribute('aria-label','Accessibility');
  const normal=document.createElement('button');normal.type='button';normal.className='fc-display-action';normal.textContent='Normal Mode';
  const dark=document.createElement('button');dark.type='button';dark.className='fc-display-action';dark.textContent='Dark Mode';
  const status=document.createElement('p');status.className='fc-display-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const close=document.createElement('button');close.type='button';close.className='fc-display-close';close.textContent='Close';
  let currentTheme=read('fc-display-theme','');
  if(currentTheme!=='dark'&&currentTheme!=='light')currentTheme=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  const applyTheme=value=>{
    currentTheme=value==='dark'?'dark':'light';
    document.documentElement.setAttribute('data-fc-theme',currentTheme);
    write('fc-display-theme',currentTheme);
    normal.setAttribute('aria-pressed',String(currentTheme==='light'));
    dark.setAttribute('aria-pressed',String(currentTheme==='dark'));
    status.textContent=currentTheme==='dark'?'Dark Mode enabled.':'Normal Mode enabled.';
  };
  normal.addEventListener('click',()=>applyTheme('light'));
  dark.addEventListener('click',()=>applyTheme('dark'));
  const closePanel=()=>{panel.hidden=true;open.setAttribute('aria-expanded','false');};
  close.addEventListener('click',()=>{closePanel();open.focus();});
  open.addEventListener('click',()=>{panel.hidden=!panel.hidden;open.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)normal.focus();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){closePanel();open.focus();}});
  modes.append(normal,dark);panel.append(heading,modes,status,close);document.body.append(open,panel);applyTheme(currentTheme);
}

/* Load the assistant code only after a visitor asks to open it. */
if(!document.getElementById('fc-ai-lazy-launch')){
  const launcher=document.createElement('button');launcher.id='fc-ai-lazy-launch';launcher.type='button';launcher.textContent='Open assistant';launcher.setAttribute('aria-label','Open assistant');
  launcher.addEventListener('click',()=>{
    if(window.__fcFreeAssistantLoaded){launcher.remove();document.querySelector('#fc-ai-launch')?.click();return;}
    launcher.disabled=true;launcher.textContent='Loading assistant…';
    const script=document.createElement('script');script.src='/assets/friendly-ai-assistant.js';script.dataset.fcFreeAssistant='true';
    script.onload=()=>{launcher.remove();document.querySelector('#fc-ai-launch')?.click();};
    script.onerror=()=>{script.remove();launcher.disabled=false;launcher.textContent='Retry assistant';};
    document.head.appendChild(script);
  });
  document.body.appendChild(launcher);
}

/* Keep the English homepage's existing header and add the same shared footer
   used by calculator pages. The footer is additive and includes the Sitemap. */
if (document.body && !document.querySelector('.fc-global-footer')) {
  const footer = document.createElement('footer');
  footer.className = 'fc-global-footer';
  footer.setAttribute('aria-label', 'Website footer');

  const inner = document.createElement('div');
  inner.className = 'fc-global-footer-inner';

  const intro = document.createElement('div');
  intro.className = 'fc-footer-intro';
  const logo = document.createElement('img');
  logo.className = 'fc-footer-mark';
  logo.src = '/assets/friendly-calculator-logo.svg';
  logo.width = 30;
  logo.height = 30;
  logo.alt = 'Friendly Calculator logo';
  logo.loading = 'lazy';
  logo.decoding = 'async';
  const brand = document.createElement('strong');
  brand.textContent = 'FRIENDLY CALCULATOR';
  const tagline = document.createElement('small');
  tagline.textContent = 'Practical tools for everyday calculations.';
  intro.append(logo, brand, document.createElement('br'), tagline);

  const nav = document.createElement('nav');
  nav.className = 'fc-global-footer-links';
  nav.setAttribute('aria-label', 'Footer navigation');
  const links = [
    ['About', '/calculator/about.html'],
    ['Methodology', '/calculator/methodology.html'],
    ['Privacy', '/calculator/privacy.html'],
    ['Terms', '/calculator/terms.html'],
    ['Disclaimer', '/calculator/disclaimer.html'],
    ['Legal & Compliance', '/calculator/legal-compliance.html'],
    ['Embed', '/embed/'],
    ['Contact', '/calculator/contact.html'],
    ['Sitemap', '/sitemap.html']
  ];
  for (const [label, href] of links) {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    nav.appendChild(link);
  }

  const social = document.createElement('nav');
  social.className = 'fc-social-links';
  social.setAttribute('aria-label', 'Social media and contact');
  const socialLinks = [
    ['Instagram', 'https://www.instagram.com/avnish_ahirwar'],
    ['LinkedIn', 'https://www.linkedin.com/in/avnishahirwar415'],
    ['Email', 'mailto:avnishahirwar415@gmail.com']
  ];
  for (const [label, href] of socialLinks) {
    const link = document.createElement('a');
    link.className = 'fc-social-link';
    link.href = href;
    link.setAttribute('aria-label', label);
    link.title = label;
    if (href.startsWith('https://')) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    link.textContent = label;
    social.appendChild(link);
  }

  const copyright = document.createElement('small');
  copyright.textContent = '© 2026 Friendly Calculator';
  inner.append(intro, nav, social, copyright);
  footer.appendChild(inner);
  document.body.appendChild(footer);
}
})();
