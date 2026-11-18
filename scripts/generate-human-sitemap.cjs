#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const entries=JSON.parse(fs.readFileSync(path.join(root,'assets/calculator-search-index.json'),'utf8'));
const output=path.join(root,'sitemap.html');
const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const slug=value=>String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'category';
function buildPage(data){
 const groups=new Map();
 for(const item of data){if(!item||typeof item.name!=='string'||typeof item.url!=='string'||!item.url.startsWith('/')||item.url.startsWith('//')||item.url.includes('..'))throw Error('Unsafe catalogue URL');const category=String(item.category||'Other');if(!groups.has(category))groups.set(category,[]);groups.get(category).push(item);}
 const categories=[...groups.keys()].sort((a,b)=>a.localeCompare(b,'en'));
 const ids=new Map(categories.map((c,i)=>[c,slug(c)+'-'+(i+1)]));
 const calculatorCount=data.filter(x=>x.url.startsWith('/calculators/')).length;
 const internationalCount=data.length-calculatorCount;
 const parts=[
  '<!doctype html>','<html lang="en">','<head>','<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  '<title>Sitemap — All Calculators &amp; Pages | Friendly Calculator</title>',
  '<meta name="description" content="Browse every public Friendly Calculator page in one searchable, category-wise sitemap. Find calculator tools across finance, tax, maths, business, health, education and everyday topics.">',
  '<meta name="robots" content="index,follow,max-image-preview:large">',
  '<link rel="canonical" href="https://friendlycalculator.in/sitemap.html">',
  '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
  '<link rel="stylesheet" href="/assets/site-shell.css">',
  '<meta property="og:type" content="website">','<meta property="og:site_name" content="Friendly Calculator">',
  '<meta property="og:title" content="Complete Sitemap | Friendly Calculator">',
  '<meta property="og:description" content="Browse every public calculator page by category or search by name.">',
  '<meta property="og:url" content="https://friendlycalculator.in/sitemap.html">',
  '<meta property="og:image" content="https://friendlycalculator.in/og-friendly-calculator.png">',
  '<style>',
  '.fc-sitemap-page{max-width:1180px;margin:0 auto;padding:clamp(18px,3vw,36px);color:#172235}.fc-sitemap-hero{background:linear-gradient(135deg,#101c2c,#203b58);color:#fff;padding:clamp(22px,4vw,42px);border-radius:18px;margin:12px 0 24px}.fc-sitemap-hero h1{margin:0 0 12px;font-size:clamp(1.8rem,4vw,2.6rem);line-height:1.15}.fc-sitemap-hero p{max-width:850px;line-height:1.65;margin:8px 0}.fc-sitemap-stats{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.fc-sitemap-stats span{background:#ffffff18;border:1px solid #ffffff38;border-radius:999px;padding:7px 12px;font-size:.92rem}.fc-sitemap-actions{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0}.fc-sitemap-actions a{display:inline-block;border:1px solid #c8d2df;border-radius:9px;padding:9px 13px;color:#17314e;text-decoration:none;font-weight:650}.fc-sitemap-search{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;margin:20px 0}.fc-sitemap-search input{width:100%;min-height:48px;padding:12px 14px;border:1px solid #9aa9ba;border-radius:10px;font:inherit}.fc-sitemap-search button{border:0;border-radius:10px;background:#17314e;color:#fff;padding:0 18px;font:inherit;font-weight:650;cursor:pointer}.fc-sitemap-status{min-height:1.5em;color:#4b5d72}.sitemap-category-index{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 24px}.sitemap-category-index a{display:inline-flex;gap:8px;align-items:center;border:1px solid #d6dee8;border-radius:999px;padding:7px 10px;color:#17314e;text-decoration:none;font-size:.9rem}.sitemap-category-index span{font-variant-numeric:tabular-nums;color:#66768a}.sitemap-category{border:1px solid #dbe3ec;border-radius:12px;margin:10px 0;background:#fff;overflow:hidden}.sitemap-category summary{display:flex;justify-content:space-between;gap:12px;align-items:center;cursor:pointer;padding:14px 16px;font-weight:700;color:#17314e;list-style-position:inside}.sitemap-count{font-size:.85rem;font-weight:500;color:#61738a;white-space:nowrap}.sitemap-category ul{list-style:none;margin:0;padding:0 16px 16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:5px 18px}.sitemap-item{min-width:0}.sitemap-item a{display:block;padding:6px 0;color:#1d527c;text-decoration:none;line-height:1.4;overflow-wrap:anywhere}.sitemap-item a:hover{text-decoration:underline}.sitemap-item[hidden],.sitemap-category[hidden]{display:none!important}.fc-sitemap-note{color:#52647a;font-size:.95rem;line-height:1.6}.fc-sitemap-page a:focus-visible,.fc-sitemap-page input:focus-visible,.fc-sitemap-page button:focus-visible{outline:3px solid #b58b3d;outline-offset:3px}@media(max-width:560px){.fc-sitemap-search{grid-template-columns:1fr}.fc-sitemap-search button{min-height:44px}.sitemap-category ul{grid-template-columns:1fr}}',
  '</style>','</head>','<body>',
  '<main class="fc-sitemap-page" id="main-content" data-sitemap-total="'+data.length+'">',
  '<section class="fc-sitemap-hero" aria-labelledby="sitemap-title">',
  '<h1 id="sitemap-title">Friendly Calculator Sitemap</h1>',
  '<p>Find calculator pages across finance, tax, maths, business, science, education, health and everyday topics. Browse by category or search the full public catalogue.</p>',
  '<div class="fc-sitemap-stats"><span><strong>'+data.length.toLocaleString('en-IN')+'</strong> public catalogue entries</span><span><strong>'+calculatorCount.toLocaleString('en-IN')+'</strong> calculator pages</span><span><strong>'+categories.length+'</strong> catalogue categories</span><span><strong>'+internationalCount+'</strong> international entry</span></div>',
  '</section>',
  '<div class="fc-sitemap-actions"><a href="/calculator/site-directory.html">Curated Calculator Directory</a><a href="/international/">International Calculators</a><a href="/blog/">Guides &amp; Articles</a><a href="/calculator/languages.html">Languages</a></div>',
  '<section aria-labelledby="all-pages-heading"><h2 id="all-pages-heading">Search all calculator pages</h2>',
  '<p class="fc-sitemap-note">This page lists every entry in the public calculator search catalogue. The curated directory is a shorter collection of featured tools; this sitemap is the complete page index.</p>',
  '<div class="fc-sitemap-search"><label class="sr-only" for="sitemap-search">Search all calculator pages</label><input id="sitemap-search" type="search" placeholder="Search by calculator name, category or topic…" autocomplete="off"><button id="sitemap-clear" type="button">Clear search</button></div>',
  '<p class="fc-sitemap-status" id="sitemap-status" role="status" aria-live="polite">'+data.length.toLocaleString('en-IN')+' entries across '+categories.length+' categories.</p>',
  '<nav class="sitemap-category-index" aria-label="Jump to a calculator category">'+categories.map(c=>'<a href="#'+ids.get(c)+'">'+escape(c)+' <span>'+groups.get(c).length+'</span></a>').join(String.fromCharCode(10))+'</nav>',
  '<div id="sitemap-categories">'
 ];
 for(const category of categories){
  const items=groups.get(category).slice().sort((a,b)=>a.name.localeCompare(b.name,'en'));
  parts.push('<details class="sitemap-category" id="'+ids.get(category)+'" data-sitemap-category><summary><span>'+escape(category)+'</span><span class="sitemap-count">'+items.length+' pages</span></summary><ul>');
  for(const item of items){const search=[item.name,category,item.keywords||''].join(' ');parts.push('<li class="sitemap-item" data-search="'+escape(search)+'"><a href="'+escape(item.url)+'">'+escape(item.name)+'</a></li>');}
  parts.push('</ul></details>');
 }
 parts.push('</div></section>','<p class="fc-sitemap-note">Calculator results are estimates. Check the relevant calculator page for its formula, assumptions, limitations and sources. Tax and financial rules vary by country and can change.</p>','</main>','<script src="/assets/human-sitemap.js" defer></script>','<script src="/assets/site-shell.js" defer></script>','</body>','</html>');
 return parts.join(String.fromCharCode(10))+String.fromCharCode(10);
}
const generated=buildPage(entries);
if(process.argv.includes('--check')){const current=fs.readFileSync(output,'utf8');if(current!==generated){console.error('sitemap.html is out of date; regenerate it.');process.exit(1);}console.log('Human sitemap matches '+entries.length+' entries across '+new Set(entries.map(x=>x.category||'Other')).size+' categories.');}
else{fs.writeFileSync(output,generated);console.log('Generated sitemap.html with '+entries.length+' entries.');}
