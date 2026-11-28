const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const origin='https://friendlycalculator.in';
const configuredLocales=fs.readdirSync(root,{withFileTypes:true})
 .filter(entry=>entry.isDirectory()&&/^[a-z]{2,3}$/i.test(entry.name))
 .map(entry=>entry.name.toLowerCase());
const locales=[...new Set(['en',...configuredLocales])];
const headOf=html=>html.slice(0,Math.max(0,html.toLowerCase().indexOf('</head>')));
const noindexOf=html=>/<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(headOf(html))||
 /<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(headOf(html));
const attr=(tag,name)=>{
 const re=/([a-z][a-z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;let m;
 while((m=re.exec(tag)))if(m[1].toLowerCase()===name.toLowerCase())return m[2]??m[3]??'';
 return '';
};
const alternatesOf=html=>[...headOf(html).matchAll(/<link\b[^>]*>/gi)]
 .map(m=>m[0]).filter(tag=>attr(tag,'rel').toLowerCase().split(/\s+/).includes('alternate')&&attr(tag,'hreflang'))
 .map(tag=>[attr(tag,'hreflang'),attr(tag,'href')]);
const canonicalOf=html=>{
 const tag=[...headOf(html).matchAll(/<link\b[^>]*>/gi)].map(m=>m[0])
  .find(tag=>attr(tag,'rel').toLowerCase().split(/\s+/).includes('canonical'));
 return tag?attr(tag,'href'):'';
};
const pageFor=(locale,route)=>path.join(root,locale==='en'?'':locale,'calculators',route);
const pageLang=(html,locale)=>(html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)||[])[1]?.toLowerCase()||locale;
const placeholderOf=html=>{
 const tag=[...headOf(html).matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]).find(tag=>attr(tag,'name').toLowerCase()==='description');
 return /^\s*\[[^\]]{2,40}\]\s*/.test(tag?attr(tag,'content'):'');
};
const indexableLocales=(candidates,route)=>candidates.filter(locale=>{
 const file=pageFor(locale,route);
 if(!fs.existsSync(file))return false;
 const html=fs.readFileSync(file,'utf8');
 const canonical=canonicalOf(html);
 const expected=origin+'/'+(locale==='en'?'':locale+'/')+'calculators/'+route;
 return !noindexOf(html)&&!placeholderOf(html)&&canonical===expected;
});
const expectedPairs=(available,route)=>{
 const pairs=available.map(locale=>{
  const html=fs.readFileSync(pageFor(locale,route),'utf8');
  return [pageLang(html,locale),origin+'/'+(locale==='en'?'':locale+'/')+'calculators/'+route];
 });
 if(pairs.length<2)return [];
 if(pairs.some(([lang])=>lang==='en'||lang.startsWith('en-'))){
  const english=pairs.find(([lang])=>lang==='en')||pairs.find(([lang])=>lang.startsWith('en-'));
  pairs.push(['x-default',english[1]]);
 }
 return pairs;
};
const sorted=items=>items.slice().sort(([a],[b])=>a.localeCompare(b));

test('configured localized currency converters load the shared reference-rate client',()=>{
 for(const locale of ['hi','es','fr','pt','ar','id','bn','ta']){
  const file=pageFor(locale,'currency-converter-calculator.html');
  if(!fs.existsSync(file))continue;
  const html=fs.readFileSync(file,'utf8');
  assert.match(html,/\/assets\/currency-converter-live\.js/,'missing shared FX client: '+locale);
  if(noindexOf(html)||placeholderOf(html))assert.deepEqual(alternatesOf(html),[],locale+' noindex/placeholder page must not carry hreflang');
 }
});

test('English and German currency converter pages share reciprocal hreflang when both translations are indexable',()=>{
 const route='currency-converter-calculator.html';
 const english=fs.readFileSync(pageFor('en',route),'utf8');
 const german=fs.readFileSync(pageFor('de',route),'utf8');
 assert.ok(!noindexOf(german),'German currency page is indexable');
 assert.ok(!placeholderOf(german),'German currency page has localized metadata');
 const expected=expectedPairs(indexableLocales(locales,route),route);
 assert.deepEqual(sorted(alternatesOf(english)),sorted(expected),'English page must link to all indexable translations');
 assert.deepEqual(sorted(alternatesOf(german)),sorted(expected),'German page must reciprocate the same translation cluster');
 for(const html of [english,german])assert.match(html,/\/assets\/currency-converter-live\.js/);
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

test('percentage calculator hreflang cluster contains exactly the indexable self-canonical language pages',()=>{
 const route='percentage-calculator.html';
 const expected=expectedPairs(indexableLocales(locales,route),route);
 for(const locale of locales){
  const file=pageFor(locale,route);if(!fs.existsSync(file))continue;
  const html=fs.readFileSync(file,'utf8'),actual=alternatesOf(html);
  if(noindexOf(html)||placeholderOf(html))assert.deepEqual(actual,[],locale+' noindex/placeholder page must not carry hreflang');
  else assert.deepEqual(sorted(actual),sorted(expected),locale+'/'+route);
 }
});

test('simple-interest hreflang excludes the thin Bengali page and keeps an English self/default alternate',()=>{
 const route='simple-interest-calculator.html';
 const english=fs.readFileSync(pageFor('en',route),'utf8');
 const bengali=fs.readFileSync(pageFor('bn',route),'utf8');
 assert.ok(noindexOf(bengali),'Bengali page remains noindex until its content is substantive');
 assert.deepEqual(sorted(alternatesOf(english)),sorted(expectedPairs(indexableLocales(locales,route),route)));
 assert.deepEqual(alternatesOf(bengali),[]);
});

test('priority calculator hreflang clusters are complete and reciprocal across all indexable locale editions',()=>{
 const routes=[
  'basic-calculator.html','bike-loan-calculator.html','business-loan-emi-calculator.html',
  'car-loan-calculator.html','discount-calculator.html','ppf-calculator.html'
 ];
 for(const route of routes){
  const expected=expectedPairs(indexableLocales(locales,route),route);
  for(const locale of locales){
   const file=pageFor(locale,route);if(!fs.existsSync(file))continue;
   const html=fs.readFileSync(file,'utf8'),actual=alternatesOf(html);
   if(noindexOf(html)||placeholderOf(html))assert.deepEqual(actual,[],locale+'/'+route+' noindex/placeholder page must not carry hreflang');
   else assert.deepEqual(sorted(actual),sorted(expected),locale+'/'+route);
  }
 }
});
