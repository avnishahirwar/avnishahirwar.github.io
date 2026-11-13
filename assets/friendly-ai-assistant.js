/* Friendly Calculator — Free Smart Assistant. Local directory search; no AI API, cookies or prompt storage. */
(()=>{'use strict';
if(window.__fcFreeAssistantLoaded)return;window.__fcFreeAssistantLoaded=true;
const path=location.pathname;if(path.startsWith('/avnish-ai/')||path.includes('/admin'))return;
const lang=(document.documentElement.lang||(path.startsWith('/hi/')?'hi':'en')).toLowerCase().slice(0,2);
const copy={
en:{open:'Open assistant',title:'Friendly Smart Assistant',sub:'Find the right calculator in seconds',placeholder:'Ask: home loan EMI, SIP, GST…',send:'Send',close:'Close',hello:'Hello! Tell me what you want to calculate. I can search the calculator directory and guide you to the right tool.',quick:'Try one of these',all:'Browse all calculators',none:'I could not find an exact match. Try a shorter phrase or browse the full calculator directory.',results:'Useful calculators',disclaimer:'I search the published calculator directory. I do not provide personalised financial, tax, legal or medical advice.',loading:'Loading calculator directory…',error:'The directory could not be loaded right now. You can still browse all calculators.',free:'This assistant runs in your browser using local matching rules. It does not call a paid AI API.'},
hi:{open:'सहायक खोलें',title:'Friendly Smart Assistant',sub:'सही कैलकुलेटर कुछ सेकंड में खोजें',placeholder:'पूछें: होम लोन EMI, SIP, GST…',send:'भेजें',close:'बंद करें',hello:'नमस्ते! बताइए आपको क्या गणना करनी है। मैं वेबसाइट की कैलकुलेटर डायरेक्टरी में सही टूल खोजकर उसका लिंक दूँगा।',quick:'इनमें से पूछें',all:'सभी कैलकुलेटर देखें',none:'सटीक मिलान नहीं मिला। छोटा शब्द लिखें या पूरी कैलकुलेटर डायरेक्टरी देखें।',results:'उपयोगी कैलकुलेटर',disclaimer:'यह प्रकाशित कैलकुलेटर डायरेक्टरी खोजता है। यह व्यक्तिगत वित्तीय, टैक्स, कानूनी या चिकित्सा सलाह नहीं देता।',loading:'कैलकुलेटर डायरेक्टरी लोड हो रही है…',error:'डायरेक्टरी अभी लोड नहीं हो सकी। आप सभी कैलकुलेटर देख सकते हैं।',free:'यह सहायक ब्राउज़र में स्थानीय matching rules से चलता है। यह किसी paid AI API को कॉल नहीं करता।'},
es:{open:'Abrir asistente',title:'Friendly Smart Assistant',sub:'Encuentra la calculadora adecuada',placeholder:'Pregunta: préstamo, SIP, GST…',send:'Enviar',close:'Cerrar',hello:'¡Hola! Dime qué quieres calcular. Buscaré en el directorio de calculadoras.',quick:'Prueba una opción',all:'Ver todas las calculadoras',none:'No encontré una coincidencia exacta. Prueba otra frase o consulta el directorio.',results:'Calculadoras útiles',disclaimer:'Busca en el directorio publicado; no ofrece asesoramiento financiero, fiscal, legal ni médico personalizado.',loading:'Cargando directorio…',error:'No se pudo cargar el directorio. Puedes ver todas las calculadoras.',free:'Funciona localmente en tu navegador; no llama a una API de IA de pago.'},
fr:{open:'Ouvrir l’assistant',title:'Friendly Smart Assistant',sub:'Trouvez le bon calculateur',placeholder:'Ex. prêt immobilier, SIP, GST…',send:'Envoyer',close:'Fermer',hello:'Bonjour ! Que souhaitez-vous calculer ? Je recherche dans le répertoire des calculateurs.',quick:'Essayez une option',all:'Voir tous les calculateurs',none:'Aucun résultat exact. Essayez une autre expression ou ouvrez le répertoire.',results:'Calculateurs utiles',disclaimer:'Recherche dans le répertoire publié ; ne fournit pas de conseil financier, fiscal, juridique ou médical personnalisé.',loading:'Chargement du répertoire…',error:'Répertoire indisponible. Vous pouvez consulter tous les calculateurs.',free:'Fonctionne localement dans le navigateur, sans API IA payante.'},
pt:{open:'Abrir assistente',title:'Friendly Smart Assistant',sub:'Encontre a calculadora certa',placeholder:'Ex.: empréstimo, SIP, GST…',send:'Enviar',close:'Fechar',hello:'Olá! O que deseja calcular? Vou pesquisar no diretório de calculadoras.',quick:'Experimente uma opção',all:'Ver todas as calculadoras',none:'Não encontrei uma correspondência exata. Tente outra frase ou abra o diretório.',results:'Calculadoras úteis',disclaimer:'Pesquisa o diretório publicado; não fornece aconselhamento financeiro, fiscal, jurídico ou médico personalizado.',loading:'Carregando diretório…',error:'Não foi possível carregar o diretório. Veja todas as calculadoras.',free:'Funciona localmente no navegador, sem API de IA paga.'},
ar:{open:'فتح المساعد',title:'Friendly Smart Assistant',sub:'اعثر على الحاسبة المناسبة',placeholder:'اسأل: قرض، SIP، GST…',send:'إرسال',close:'إغلاق',hello:'مرحباً! ماذا تريد أن تحسب؟ سأبحث في دليل الحاسبات.',quick:'جرّب أحد الخيارات',all:'عرض جميع الحاسبات',none:'لم أجد تطابقاً دقيقاً. جرّب عبارة أخرى أو افتح الدليل.',results:'حاسبات مفيدة',disclaimer:'يبحث في دليل الحاسبات المنشور ولا يقدم نصائح مالية أو ضريبية أو قانونية أو طبية شخصية.',loading:'جارٍ تحميل الدليل…',error:'تعذر تحميل الدليل. يمكنك عرض جميع الحاسبات.',free:'يعمل محلياً في المتصفح ولا يستدعي واجهة ذكاء اصطناعي مدفوعة.'},
id:{open:'Buka asisten',title:'Friendly Smart Assistant',sub:'Temukan kalkulator yang tepat',placeholder:'Tanya: pinjaman, SIP, GST…',send:'Kirim',close:'Tutup',hello:'Halo! Apa yang ingin Anda hitung? Saya akan mencari di direktori kalkulator.',quick:'Coba salah satu',all:'Lihat semua kalkulator',none:'Tidak ada kecocokan tepat. Coba frasa lain atau buka direktori.',results:'Kalkulator yang berguna',disclaimer:'Mencari direktori kalkulator yang diterbitkan; bukan nasihat keuangan, pajak, hukum, atau medis pribadi.',loading:'Memuat direktori…',error:'Direktori tidak dapat dimuat. Anda tetap dapat melihat semua kalkulator.',free:'Berjalan lokal di browser tanpa API AI berbayar.'},
bn:{open:'সহায়ক খুলুন',title:'Friendly Smart Assistant',sub:'সঠিক ক্যালকুলেটর খুঁজুন',placeholder:'জিজ্ঞাসা করুন: ঋণ, SIP, GST…',send:'পাঠান',close:'বন্ধ করুন',hello:'নমস্কার! কী হিসাব করতে চান? আমি ক্যালকুলেটর ডিরেক্টরিতে খুঁজব।',quick:'এগুলোর একটি চেষ্টা করুন',all:'সব ক্যালকুলেটর দেখুন',none:'সঠিক মিল পাওয়া যায়নি। অন্য শব্দ লিখুন বা ডিরেক্টরি দেখুন।',results:'প্রাসঙ্গিক ক্যালকুলেটর',disclaimer:'প্রকাশিত ডিরেক্টরি খোঁজে; ব্যক্তিগত আর্থিক, কর, আইনি বা চিকিৎসা পরামর্শ নয়।',loading:'ডিরেক্টরি লোড হচ্ছে…',error:'ডিরেক্টরি লোড করা যায়নি। সব ক্যালকুলেটর দেখুন।',free:'ব্রাউজারেই স্থানীয় নিয়মে চলে; পেইড AI API ব্যবহার করে না।'},
ta:{open:'உதவியாளரைத் திற',title:'Friendly Smart Assistant',sub:'சரியான கணிப்பானைக் கண்டறியுங்கள்',placeholder:'கேளுங்கள்: கடன், SIP, GST…',send:'அனுப்பு',close:'மூடு',hello:'வணக்கம்! எதை கணக்கிட விரும்புகிறீர்கள்? கணிப்பான் பட்டியலில் தேடுகிறேன்.',quick:'இதில் ஒன்றை முயற்சிக்கவும்',all:'அனைத்து கணிப்பான்களையும் காண்க',none:'சரியான பொருத்தம் இல்லை. வேறு சொற்களை முயற்சிக்கவும் அல்லது பட்டியலைத் திறக்கவும்.',results:'பயனுள்ள கணிப்பான்கள்',disclaimer:'வெளியிடப்பட்ட கணிப்பான் பட்டியலில் தேடுகிறது; தனிப்பட்ட நிதி, வரி, சட்ட அல்லது மருத்துவ ஆலோசனை அல்ல.',loading:'பட்டியல் ஏற்றப்படுகிறது…',error:'பட்டியலை ஏற்ற முடியவில்லை. அனைத்து கணிப்பான்களையும் காணலாம்.',free:'உலாவியில் உள்ளூராக இயங்குகிறது; கட்டண AI API அழைப்பதில்லை.'}
};
const t=copy[lang]||copy.en;
const style=document.createElement('style');
style.textContent=[
'#fc-ai-launch{position:fixed;right:20px;bottom:20px;z-index:9998;border:0;border-radius:999px;background:#14283d;color:#fff;padding:13px 18px;font:700 14px/1.2 Arial,sans-serif;box-shadow:0 8px 28px #10243a35;cursor:pointer;display:flex;align-items:center;gap:9px}',
'#fc-ai-launch:focus-visible,#fc-ai-panel button:focus-visible,#fc-ai-panel a:focus-visible,#fc-ai-panel input:focus-visible{outline:3px solid #d5a84b;outline-offset:3px}',
'#fc-ai-launch .fc-ai-dot{width:9px;height:9px;border-radius:50%;background:#75d6a0;display:inline-block}',
'#fc-ai-panel{position:fixed;right:20px;bottom:78px;z-index:9999;width:min(390px,calc(100vw - 24px));height:min(570px,calc(100dvh - 110px));background:#fff;border:1px solid #d8e0e8;border-radius:18px;box-shadow:0 18px 60px #10243a30;display:none;overflow:hidden;color:#1c2c3d;font:14px/1.45 Arial,sans-serif}',
'#fc-ai-panel[aria-hidden="false"]{display:flex;flex-direction:column}',
'#fc-ai-launch[aria-expanded="true"]{display:none}',
'.fc-ai-head{background:#14283d;color:#fff;padding:15px 16px;display:flex;justify-content:space-between;align-items:center;gap:10px}',
'.fc-ai-head strong{display:block;font-size:15px}.fc-ai-head small{display:block;color:#d7e1eb;margin-top:3px}',
'.fc-ai-head button{border:1px solid #ffffff55;background:transparent;color:#fff;border-radius:8px;padding:6px 10px;cursor:pointer}',
'.fc-ai-log{padding:14px;overflow:auto;flex:1;background:#f5f7f9}',
'.fc-ai-msg{max-width:94%;padding:11px 12px;border-radius:13px;margin:0 0 10px;white-space:pre-wrap;overflow-wrap:anywhere}',
'.fc-ai-msg.bot{background:#fff;border:1px solid #e0e6ec;border-top-left-radius:4px}.fc-ai-msg.user{background:#e4edf7;margin-left:auto;border-top-right-radius:4px}',
'.fc-ai-links{display:grid;gap:7px;margin:8px 0 12px}.fc-ai-links a{display:block;background:#fff;border:1px solid #d8e0e8;border-radius:10px;padding:9px 11px;color:#164d78;text-decoration:none;font-weight:700}.fc-ai-links a:hover{border-color:#7394b4;background:#fafdff}',
'.fc-ai-quick{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0 12px}.fc-ai-quick button{border:1px solid #ccd7e2;border-radius:999px;background:#fff;color:#24415c;padding:7px 10px;cursor:pointer;font-size:12px}',
'.fc-ai-foot{padding:11px;border-top:1px solid #e0e6ec;background:#fff}.fc-ai-form{display:flex;gap:8px}.fc-ai-form input{flex:1;min-width:0;border:1px solid #cbd5df;border-radius:10px;padding:11px;font:inherit;color:#182b3e}.fc-ai-form button{border:0;border-radius:10px;background:#14283d;color:#fff;font-weight:700;padding:0 14px;cursor:pointer}',
'.fc-ai-note{font-size:10px;color:#6b7885;margin:8px 2px 0}.fc-ai-loading{color:#687887;font-size:12px;margin:0 0 10px}',
'@media(max-width:480px){#fc-ai-launch{right:12px;bottom:12px;padding:11px 15px;font-size:13px}#fc-ai-panel{right:12px;bottom:12px;width:calc(100vw - 24px);height:min(640px,calc(100dvh - 88px));max-height:calc(100dvh - 88px)}}',
'@media(prefers-reduced-motion:no-preference){#fc-ai-panel{animation:fcAiIn .16s ease-out}@keyframes fcAiIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}}'
].join('\n');
document.head.append(style);
const launch=document.createElement('button');launch.id='fc-ai-launch';launch.type='button';launch.setAttribute('aria-expanded','false');launch.setAttribute('aria-controls','fc-ai-panel');
const dot=document.createElement('span');dot.className='fc-ai-dot';dot.setAttribute('aria-hidden','true');launch.append(dot,document.createTextNode(t.open));
const panel=document.createElement('section');panel.id='fc-ai-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label',t.title);panel.setAttribute('aria-hidden','true');
const head=document.createElement('div');head.className='fc-ai-head';const heading=document.createElement('div');const strong=document.createElement('strong');strong.textContent=t.title;const sub=document.createElement('small');sub.textContent=t.sub;heading.append(strong,sub);
const close=document.createElement('button');close.type='button';close.textContent='× '+t.close;close.setAttribute('aria-label',t.close);head.append(heading,close);
const log=document.createElement('div');log.className='fc-ai-log';log.setAttribute('aria-live','polite');log.setAttribute('aria-relevant','additions text');
const foot=document.createElement('div');foot.className='fc-ai-foot';const form=document.createElement('form');form.className='fc-ai-form';
const input=document.createElement('input');input.type='search';input.maxLength=160;input.placeholder=t.placeholder;input.setAttribute('aria-label',t.placeholder);input.autocomplete='off';
const send=document.createElement('button');send.type='submit';send.textContent=t.send;form.append(input,send);
const note=document.createElement('p');note.className='fc-ai-note';note.textContent=t.free+' '+t.disclaimer;foot.append(form,note);panel.append(head,log,foot);document.body.append(launch,panel);
const directoryUrl='/calculator/site-directory.html';let catalogue=null;
const addMessage=(text,who='bot')=>{const el=document.createElement('div');el.className='fc-ai-msg '+who;el.textContent=text;log.append(el);log.scrollTop=log.scrollHeight;};
const addLinks=items=>{if(!items.length)return;const box=document.createElement('div');box.className='fc-ai-links';items.forEach(item=>{const a=document.createElement('a');a.href=item.url;a.textContent=item.title;box.append(a);});log.append(box);log.scrollTop=log.scrollHeight;};
const addQuick=()=>{const box=document.createElement('div');box.className='fc-ai-quick';[['Home Loan EMI','home loan emi'],['SIP Calculator','sip calculator'],['GST Calculator','gst calculator'],['Land converter','land unit converter']].forEach(([label,q])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>ask(q));box.append(b);});log.append(box);};
const slugTitle=url=>decodeURIComponent(url.split('/').pop().replace(/\.html?$/i,'')).replace(/-calculator$/i,' Calculator').replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const getCatalogue=async()=>{
if(catalogue)return catalogue;const loading=document.createElement('p');loading.className='fc-ai-loading';loading.textContent=t.loading;log.append(loading);
try{const response=await fetch('/sitemap.xml',{credentials:'same-origin',cache:'force-cache'});if(!response.ok)throw new Error('sitemap unavailable');
const xml=new DOMParser().parseFromString(await response.text(),'application/xml');
const urls=[...xml.querySelectorAll('loc')].map(n=>n.textContent.trim()).filter(u=>{try{const p=new URL(u,location.origin).pathname;return p.endsWith('.html')&&(/\/calculators?\//.test(p))&&!/\/(?:site-directory|about|contact|methodology|privacy|terms|disclaimer)\.html$/.test(p);}catch(_){return false;}});
catalogue=[...new Set(urls)].map(url=>({url:new URL(url,location.origin).pathname,title:slugTitle(url),search:(slugTitle(url)+' '+url).toLowerCase()}));loading.remove();return catalogue;
}catch(_){loading.remove();catalogue=[];return catalogue;}
};
const aliases=[
[/home loan|housing loan|गृह ऋण|होम लोन/,'home loan emi'],[/personal loan|व्यक्तिगत ऋण|पर्सनल लोन/,'personal loan emi'],[/car loan|auto loan|कार लोन/,'car loan emi'],[/bike loan|two wheeler|बाइक लोन/,'bike loan emi'],[/emi|installment|किश्त|मासिक किस्त/,'loan emi'],[/sip|mutual fund|म्यूचुअल फंड/,'sip calculator'],[/fixed deposit|\bfd\b|एफडी|फिक्स्ड डिपॉजिट/,'fd calculator'],[/recurring deposit|\brd\b|आरडी/,'rd calculator'],[/goods and services|gst|जीएसटी/,'gst calculator'],[/income tax|आयकर|इनकम टैक्स/,'income tax calculator'],[/salary|take home|in hand|वेतन|सैलरी/,'salary calculator'],[/land|acre|hectare|bigha|बीघा|जमीन|भूमि/,'land unit converter'],[/kisan|farmer|किसान|कृषि/,'crop cost profit'],[/percentage|प्रतिशत/,'percentage calculator'],[/age|उम्र|आयु/,'age calculator'],[/bmi|body mass|बीएमआई/,'bmi calculator'],[/currency|exchange rate|मुद्रा/,'currency converter'],[/loan|ऋण|लोन/,'loan calculator'],[/tax|कर|टैक्स/,'tax calculator'],[/discount|छूट/,'discount calculator']
];
const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim();
const search=async query=>{
const all=await getCatalogue();const original=normalize(query);let q=original;
aliases.forEach(([re,term])=>{if(re.test(original))q=term;});
const tokens=[...new Set(q.split(/[\s-]+/).filter(x=>x.length>1))];
const ranked=all.map(item=>{
const title=normalize(item.title),hay=normalize(item.search);let score=0;
if(title===q)score+=100;
if(title.includes(q))score+=45;
if(q.includes(title)&&title.length>5)score+=30;
tokens.forEach(token=>{if(title.includes(token))score+=token.length>4?8:3;else if(hay.includes(token))score+=token.length>4?2:1;});
if(hay.includes(original))score+=12;
return {...item,score};
}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
const unique=new Map();
for(const item of ranked){const key=normalize(item.title).replace(/ calculator$/,'').trim();if(!unique.has(key))unique.set(key,item);}
return [...unique.values()].slice(0,5);
};
const ask=async raw=>{const query=String(raw||'').trim().slice(0,160);if(!query)return;addMessage(query,'user');input.value='';const q=normalize(query);
if(/^(hi|hello|नमस्ते|नमस्कार|hey)/.test(q)){addMessage(t.hello);addQuick();return;}
if(/(how.*work|कैसे काम|free|मुफ्त|फ्री)/.test(q)){addMessage(t.free+' '+t.disclaimer);addLinks([{title:t.all,url:directoryUrl}]);return;}
if(/(all calculators|directory|सभी कैलकुलेटर|डायरेक्टरी)/.test(q)){addMessage(t.results);addLinks([{title:t.all,url:directoryUrl}]);return;}
const results=await search(query);if(results.length){addMessage(t.results);addLinks(results);}else{addMessage(t.none);addLinks([{title:t.all,url:directoryUrl}]);}};
launch.addEventListener('click',()=>{const open=panel.getAttribute('aria-hidden')==='true';panel.setAttribute('aria-hidden',String(!open));launch.setAttribute('aria-expanded',String(open));if(open&&!log.childElementCount){addMessage(t.hello);addQuick();}if(open)input.focus();});
close.addEventListener('click',()=>{panel.setAttribute('aria-hidden','true');launch.setAttribute('aria-expanded','false');launch.focus();});
form.addEventListener('submit',event=>{event.preventDefault();ask(input.value);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel.getAttribute('aria-hidden')==='false')close.click();});
})();