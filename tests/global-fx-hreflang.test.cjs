const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const origin='https://friendlycalculator.in';
const locales=['hi','es','fr','pt','ar','id','bn','ta'];
const headOf=html=>html.slice(0,html.toLowerCase().indexOf('</head>'));
const noindexOf=html=>/<meta\\b(?=[^>]*\\bname=["'](?:robots|googlebot)["'])(?=[^>]*\\bcontent=["'][^"']*\\bnoindex\\b)[^>]*>/i.test(headOf(html));
const hasPlaceholder=html=>{
 const tags=[...headOf(html).matchAll(/<meta\\b[^>]*>/gi)].map(m=>m[0]);
 const tag=tags.find(t=>/\\bname=["']description["']/i.test(t));
 const desc=tag?(tag.match(/\\bcontent=["']([^"']*)["']/i)||[])[1]||'':'';
 return /^\\s*\\[[^\\]]{2,40}\\]\\s*/.test(desc);
};
const canonicalOf=html=>{
 const tags=[...headOf(html).matchAll(/<link\\b[^>]*>/gi)].map(m=>m[0]);
 const tag=tags.find(t=>/\\brel=["']canonical["']/i.test(t));
 return tag?(tag.match(/\\bhref=["']([^"']+)["']/i)||[])[1]||'':'';
};
const declaredLang=html=>((headOf(html).match(/<html\\b[^>]*\\blang=["']([^"']+)["']/i)||[])[1]||'').toLowerCase();
const alternatesOf=html=>[...headOf(html).matchAll(/<link\\b(?=[^>]*\\brel=["']alternate["'])(?=[^>]*\\bhreflang=["']([^"']+)["'])(?=[^>]*\\bhref=["']([^"']+)["'])[^>]*>/gi)].map(m=>[m[1],m[2]]);
const pageFor=(locale,route)=>path.join(root,locale==='en'?'':locale,'calculators',route);
const expectedForLocale=(candidates,sourceLocale,route)=>{
 const entries=[];
 for(const locale of candidates){
  const file=pageFor(locale,route);
  if(!fs.existsSync(file))continue;
  const html=fs.readFileSync(file,'utf8');
  const url=origin+'/'+(locale==='en'?'':locale+'/')+'calculators/'+route;
  const lang=declaredLang(html);
  if(noindexOf(html)||hasPlaceholder(html)||canonicalOf(html)!==url||lang.split('-')[0]!==locale)continue;
  entries.push({locale,lang,url});
 }
 const langs=entries.map(x=>x.lang), urls=entries.map(x=>x.url);
 if(entries.length<2||new Set(langs).size!==langs.length||new Set(urls).size!==urls.length)return [];
 if(!entries.some(x=>x.locale===sourceLocale))return [];
 const pairs=entries.map(x=>[x.lang,x.url]);
 const english=entries.find(x=>x.lang==='en'||x.lang.startsWith('en-'));
 if(english)pairs.push(['x-default',english.url]);
 return pairs;
};
const sorted=items=>items.slice().sort(([a],[b])=>a.localeCompare(b));

test('all existing localized currency converters load the shared reference-rate client',()=>{
 for(const locale of locales){
  const html=fs.readFileSync(path.join(root,locale,'calculators/currency-converter-calculator.html'),'utf8');
  assert.match(html,/\/assets\/currency-converter-live\.js/,'missing shared FX client: '+locale);
  assert.deepEqual(sorted(alternatesOf(html)),sorted(expectedForLocale(['en',...locales],locale,'currency-converter-calculator.html')),locale+' hreflang must match only indexable self-canonical locale pages');
 }
});

test('English currency converter and German page use only published reciprocal hreflang clusters',()=>{
 const route='currency-converter-calculator.html';
 const candidates=['en','de',...locales];
 for(const locale of ['en','de']){
  const html=fs.readFileSync(pageFor(locale,route),'utf8');
  assert.deepEqual(sorted(alternatesOf(html)),sorted(expectedForLocale(candidates,locale,route)),locale+' hreflang must match the eligible reciprocal cluster');
  assert.match(html,/\\/assets\\/currency-converter-live\\.js/);
 }
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

test('percentage calculator hreflang cluster contains only indexable published language pages',()=>{
 const route='percentage-calculator.html';
 const candidates=['en','hi','de','es','fr','pt','ar','id','bn','ta','ja','ru'];
 for(const locale of candidates){
  const file=pageFor(locale,route);
  if(!fs.existsSync(file)) continue;
  const html=fs.readFileSync(file,'utf8');
  assert.deepEqual(sorted(alternatesOf(html)),sorted(expectedForLocale(candidates,locale,route)),locale+'/'+route+' published reciprocal hreflang');
 }
});

test('simple-interest English and Bengali hreflang alternates match indexable published translations',()=>{
 const route='simple-interest-calculator.html';
 const candidates=['en','bn','ar','es','fr','hi','id','pt','ta'];
 for(const locale of ['en','bn']){
  const file=pageFor(locale,route);
  const html=fs.readFileSync(file,'utf8');
  assert.deepEqual(sorted(alternatesOf(html)),sorted(expectedForLocale(candidates,locale,route)),locale+'/'+route+' published reciprocal hreflang');
 }
});

test('priority calculator hreflang clusters are complete and reciprocal across indexable locales',()=>{
 const routes=[
  'basic-calculator.html',
  'bike-loan-calculator.html',
  'business-loan-emi-calculator.html',
  'car-loan-calculator.html',
  'discount-calculator.html',
  'ppf-calculator.html'
 ];
 const baseLocales=['en','hi','es','fr','pt','ar','id','bn','ta'];
 const expandedLocales=[...baseLocales,'de','ja','ru','vi','te','gu','kn'];
 for(const route of routes){
  const candidates=route==='basic-calculator.html'?expandedLocales:baseLocales;
  for(const locale of candidates){
   const file=pageFor(locale,route);
   if(!fs.existsSync(file)) continue;
   const html=fs.readFileSync(file,'utf8');
   assert.deepEqual(sorted(alternatesOf(html)),sorted(expectedForLocale(candidates,locale,route)),locale+'/'+route+' published reciprocal hreflang');
  }
 }
});
