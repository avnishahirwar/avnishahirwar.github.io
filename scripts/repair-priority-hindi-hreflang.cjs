#!/usr/bin/env node
'use strict';

// Add only missing, self-canonical hreflang links for the ten priority Hindi calculator clusters.
// Existing links are never removed or rewritten. Noindex pages are excluded.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = process.cwd();
const ORIGIN = 'https://friendlycalculator.in';
const LOCALES = ['en','hi','es','fr','pt','ar','id','bn','ta','mr','te'];
const SLUGS = ['loan-emi-calculator','home-loan-emi-calculator','car-loan-calculator','personal-loan-eligibility-calculator','sip-calculator','fd-calculator','rd-calculator','ppf-calculator','gst-calculator','income-tax-calculator'];
function read(file){return fs.readFileSync(file,'utf8');}
function isNoindex(html){const h=html.slice(0,html.toLowerCase().indexOf('</head>'));return /<meta\b(?=[^>]*\bname=[\"'](?:robots|googlebot)[\"'])(?=[^>]*\bcontent=[\"'][^\"']*\bnoindex\b)[^>]*>/i.test(h)||/<meta\b(?=[^>]*\bcontent=[\"'][^\"']*\bnoindex\b)(?=[^>]*\bname=[\"'](?:robots|googlebot)[\"'])[^>]*>/i.test(h);}
function langOf(html){return (html.match(/<html\b[^>]*\blang=[\"']([^\"']+)[\"']/i)||[])[1]?.toLowerCase()||null;}
function canonicalOf(html){const m=html.slice(0,html.toLowerCase().indexOf('</head>')).match(/<link\b(?=[^>]*\brel=[\"']canonical[\"'])(?=[^>]*\bhref=[\"']([^\"']+)[\"'])[^>]*>/i);if(!m)return null;try{const u=new URL(m[1],ORIGIN);return u.origin===ORIGIN&&!u.search&&!u.hash?u.href:null;}catch{return null;}}
function alternates(html){const h=html.slice(0,html.toLowerCase().indexOf('</head>'));return [...h.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).filter(t=>/\brel=[\"']alternate[\"']/i.test(t)).map(t=>({lang:(t.match(/\bhreflang=[\"']([^\"']+)[\"']/i)||[])[1]?.toLowerCase(),href:(t.match(/\bhref=[\"']([^\"']+)[\"']/i)||[])[1]})).filter(x=>x.lang&&x.href);}
function main(){
 const report={clusters:0,indexablePages:0,pagesChanged:0,linksAdded:0,skippedNoindex:0,skippedMissing:0,conflicts:[]};
 for(const slug of SLUGS){
  const group=[];
  for(const locale of LOCALES){
   const relative=(locale==='en'?'calculators/':locale+'/calculators/')+slug+'.html';
   const file=path.join(ROOT,relative);
   if(!fs.existsSync(file)){report.skippedMissing++;continue;}
   const html=read(file);
   if(isNoindex(html)){report.skippedNoindex++;continue;}
   const lang=langOf(html),canonical=canonicalOf(html);
   if(!lang||!canonical||new URL(canonical).pathname!=='/'+relative){report.conflicts.push({file:relative,reason:'missing or non-self canonical/lang'});continue;}
   group.push({file,relative,html,lang,canonical});
  }
  if(group.length<2)continue;
  report.clusters++;report.indexablePages+=group.length;
  const english=group.find(p=>p.lang==='en');
  if(!english){report.conflicts.push({slug,reason:'no indexable English page; x-default not generated'});}
  for(const page of group){
   const existing=alternates(page.html),byLang=new Map();
   for(const link of existing){if(!byLang.has(link.lang))byLang.set(link.lang,[]);byLang.get(link.lang).push(link.href);}
   const desired=group.map(target=>({lang:target.lang,href:target.canonical}));
   if(english)desired.push({lang:'x-default',href:english.canonical});
   const additions=[];
   for(const target of desired){
    const prior=byLang.get(target.lang)||[];
    if(prior.some(h=>new URL(h,ORIGIN).href===target.href))continue;
    if(prior.length){report.conflicts.push({file:page.relative,lang:target.lang,existing:prior,expected:target.href});continue;}
    additions.push('<link rel=\"alternate\" hreflang=\"'+target.lang+'\" href=\"'+target.href+'\">');
   }
   if(!additions.length)continue;
   const next=page.html.replace(/<\/head>/i,additions.join('\n')+'\n</head>');
   if(next===page.html)continue;
   report.pagesChanged++;report.linksAdded+=additions.length;
   if(process.argv.includes('--write'))fs.writeFileSync(page.file,next);
  }
 }
 console.log('Priority Hindi hreflang repair: '+JSON.stringify(report));
 if(!process.argv.includes('--write'))console.log('Dry run only; no files changed.');
}
main();
