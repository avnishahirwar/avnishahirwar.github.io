const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const origin='https://friendlycalculator.in';
const languageCatalogue=require('../config/language-catalogue.json');
const candidates=[...new Set(['en',...languageCatalogue.locales.map(item=>item.code)])];
const headOf=html=>{const end=html.toLowerCase().indexOf('</head>');return end<0?html:html.slice(0,end);};
const noindexOf=html=>/<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(headOf(html))||/<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(headOf(html));
const alternatesOf=html=>[...headOf(html).matchAll(/<link\b[^>]*>/gi)].map(m=>m[0])
 .filter(tag=>/\brel=["']alternate["']/i.test(tag))
 .map(tag=>[(tag.match(/\bhreflang=["']([^"']+)["']/i)||[])[1],(tag.match(/\bhref=["']([^"']+)["']/i)||[])[1]])
 .filter(pair=>pair[0]&&pair[1]);
const pageFor=(locale,route)=>path.join(root,locale==='en'?'':locale,'calculators',route);
function pageState(locale,route){
 const file=pageFor(locale,route),url=origin+'/'+(locale==='en'?'':locale+'/')+'calculators/'+route;
 if(!fs.existsSync(file))return {exists:false,indexable:false,file,url,lang:locale,html:''};
 const html=fs.readFileSync(file,'utf8'),head=headOf(html);
 const tags=[...head.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]);
 const canonicalTag=tags.find(tag=>/\brel=["']canonical["']/i.test(tag));
 const canonical=(canonicalTag?.match(/\bhref=["']([^"']+)["']/i)||[])[1]||'';
 const lang=(head.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)||[])[1]||locale;
 const descriptionTag=[...head.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]).find(tag=>/\bname=["']description["']/i.test(tag));
 const description=(descriptionTag?.match(/\bcontent=["']([^"']*)["']/i)||[])[1]||'';
 let canonicalUrl='';try{canonicalUrl=new URL(canonical,origin).href;}catch{}
 const placeholder=locale!=='en'&&/^\s*\[[^\]]{2,40}\]\s*/.test(description);
 const pathname=new URL(url).pathname;
 const canonicalPath=canonicalUrl?new URL(canonicalUrl).pathname:'';
 const selfCanonical=canonicalUrl===url || canonicalPath===pathname+'/index.html' || (pathname.endsWith('/index.html')&&canonicalPath===pathname.slice(0,-'index.html'.length));
 return {exists:true,indexable:!noindexOf(html)&&!placeholder&&selfCanonical,file,url,lang:lang.trim(),html};
}
const routeLocales=route=>candidates.filter(locale=>pageState(locale,route).exists);
function expectedPairs(route){
 const entries=routeLocales(route).map(locale=>pageState(locale,route)).filter(page=>page.indexable);
 const langs=entries.map(page=>page.lang),urls=entries.map(page=>page.url);
 if(entries.length<2||new Set(langs).size!==langs.length||new Set(urls).size!==urls.length)return [];
 const pairs=entries.map(page=>[page.lang,page.url]);
 const english=entries.find(page=>page.lang==='en'||page.lang.toLowerCase().startsWith('en-'));
 if(english)pairs.push(['x-default',english.url]);
 return pairs;
}
const sorted=items=>items.slice().sort(([a],[b])=>a.localeCompare(b));

test('localized currency converters load the shared reference-rate client and follow eligible hreflang groups',()=>{
 const route='currency-converter-calculator.html',expected=sorted(expectedPairs(route));
 for(const locale of routeLocales(route)){
  const state=pageState(locale,route);
  assert.match(state.html,/\/assets\/currency-converter-live\.js/,'missing shared FX client: '+locale);
  assert.deepEqual(sorted(alternatesOf(state.html)),expected,locale+' currency hreflang must match self-canonical indexable siblings');
 }
});

test('English and German currency converter pages preserve reciprocal eligible alternates',()=>{
 const route='currency-converter-calculator.html';
 const english=pageState('en',route),german=pageState('de',route);
 assert.ok(english.exists&&german.exists);
 const expected=sorted(expectedPairs(route));
 assert.deepEqual(sorted(alternatesOf(english.html)),expected);
 assert.deepEqual(sorted(alternatesOf(german.html)),expected);
 assert.match(english.html,/\/assets\/currency-converter-live\.js/);
 assert.match(german.html,/\/assets\/currency-converter-live\.js/);
});

test('shared FX client uses free reference rates and preserves a manual fallback',()=>{
 const js=fs.readFileSync(path.join(root,'assets/currency-converter-live.js'),'utf8');
 assert.match(js,/api\.frankfurter\.dev\/v2\/rate/);
 assert.match(js,/rateInput\.readOnly=false/);
 assert.match(js,/text\.manual/);
 assert.match(js,/new Intl\.NumberFormat/);
});

test('generated sitemap check includes hreflang clusters',()=>{
 const output=execFileSync(process.execPath,['scripts/generate-sitemaps.cjs','--check'],{cwd:root,encoding:'utf8'});
 assert.match(output,/language clusters/);
});

for(const route of ['percentage-calculator.html','simple-interest-calculator.html','basic-calculator.html','bike-loan-calculator.html','business-loan-emi-calculator.html','car-loan-calculator.html','discount-calculator.html','ppf-calculator.html']){
 test(route+' hreflang cluster contains only self-canonical indexable published translations',()=>{
  const expected=sorted(expectedPairs(route));
  for(const locale of routeLocales(route)){
   const state=pageState(locale,route);
   assert.deepEqual(sorted(alternatesOf(state.html)),expected,locale+'/'+route);
  }
 });
}

test('shared currency converter preserves its manual-rate fallback',()=>{
 const js=fs.readFileSync(path.join(root,'assets/currency-converter-live.js'),'utf8');
 assert.match(js,/rateInput\.readOnly=false/);
 assert.match(js,/rateInput\.addEventListener/);
});
