#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const languages = ['hi','es','fr','pt','ar','id','bn','ta','de'];
const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
  }
}
walk(path.join(root,'calculators'));
for (const lang of languages) walk(path.join(root,lang,'calculators'));
const has = (html,re) => re.test(html);
const shell = fs.readFileSync(path.join(root,'assets/site-shell.js'),'utf8');
const sharedFaqSchema = /FAQPage/.test(shell);
const findings = [];
let excludedRedirects = 0;
let rateSensitivePages = 0;
const stats = {total:0,english:0,localized:0,byLanguage:{},checks:{title:0,description:0,canonical:0,formula:0,workedExample:0,visibleFaq:0,faqSchema:0,chartOrTable:0,updatedRateStamp:0,authoritativeRateSource:0}};
const ratePattern = /(ppf|ssy|sukanya|nsc|kvp|scss|post-office-(?:rd|mis)|gst|income-tax|advance-tax|tds|epf|pf-calculator|uk-stamp-duty|national-insurance|superannuation|atal-pension-yojana)/i;
for (const file of files.sort()) {
  const rel = path.relative(root,file).split(path.sep).join('/');
  const html = fs.readFileSync(file,'utf8');
  const redirectOnly = has(html,/<meta\b(?=[^>]*http-equiv=[\"']refresh[\"'])[^>]*>/i) && has(html,/<meta\b(?=[^>]*name=[\"']robots[\"'])(?=[^>]*noindex)[^>]*>/i);
  if (redirectOnly) { excludedRedirects++; continue; }
  const m = rel.match(/^([a-z]{2})\/calculators\//);
  const lang = m ? m[1] : 'en';
  stats.total++;
  if (lang === 'en') stats.english++; else {stats.localized++;stats.byLanguage[lang]=(stats.byLanguage[lang]||0)+1;}
  const visible = html.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi,' ').replace(/\s+/g,' ');
  const visibleFaq = has(html,/<(?:section|div)[^>]*(?:faq|frequently)[^>]*>|<details[^>]*>[\s\S]*?<summary/i);
  const checks = {
    title:has(html,/<title>\s*[^<]{8,}<\/title>/i),
    description:has(html,/<meta[^>]+name=[\"']description[\"'][^>]+content=[\"'][^\"']{40,}/i)||has(html,/<meta[^>]+content=[\"'][^\"']{40,}[\"'][^>]+name=[\"']description[\"']/i),
    canonical:has(html,/<link\b(?=[^>]*\brel=[\"']canonical[\"'])(?=[^>]*\bhref=[\"'][^\"']+[\"'])[^>]*>/i),
    formula:has(visible,/(formula|calculation method|how (?:this|the) calculator works|emi\s*=|sip\s*=|principal|interest rate|गणना का सूत्र|सूत्र)/i),
    workedExample:has(visible,/(worked example|calculation example|example calculation|उदाहरण|गणना का उदाहरण)/i),
    visibleFaq,
    faqSchema:has(html,/\"@type\"\s*:\s*\"FAQPage\"/i)||(sharedFaqSchema&&visibleFaq),
    chartOrTable:has(html,/<table[\s>]/i)||has(visible,/(chart|canvas|plot|visuali[sz]ation|amortization|amortisation|ग्राफ|चार्ट)/i)
  };
  for (const k of Object.keys(checks)) if(checks[k]) stats.checks[k]++;
  const rateSensitive=ratePattern.test(path.basename(file));
  const updated=has(visible,/last\s+updated|updated\s*[:：]|checked\s+(?:against|on)|rates?\s+(?:last\s+)?checked|अद्यतन\s*[:：]|अपडेट\s*[:：]|दरें?\s+जाँची\s+गई/i);
  const source=has(html,/(dea\.gov\.in|indiapost\.gov\.in|gst\.gov\.in|cbic\.gov\.in|incometax\.gov\.in|epfindia\.gov\.in|pfrda\.org\.in|mof\.gov\.in|canada\.ca|gov\.uk|ato\.gov\.au)/i);
  if(rateSensitive){rateSensitivePages++;if(updated)stats.checks.updatedRateStamp++;if(source)stats.checks.authoritativeRateSource++;}
  const required=['title','description','canonical','formula','workedExample','visibleFaq'];
  const missing=required.filter(k=>!checks[k]);
  if(rateSensitive&&!updated)missing.push('updatedRateStamp');
  if(rateSensitive&&!source)missing.push('authoritativeRateSource');
  if(missing.length)findings.push({path:rel,language:lang,rateSensitive,missing});
}
const report={generatedAt:new Date().toISOString(),scope:'calculator HTML pages in calculators/ and supported language calculator directories (redirect-only files excluded)',expectedLanguages:languages,counts:stats,excludedRedirects,rateSensitivePages,sharedSchema:{softwareApplicationOrWebApplication:/WebApplication|SoftwareApplication/.test(shell),faqSchemaFromVisibleFaq:sharedFaqSchema},missingFindingCount:findings.length,findings};
const out=path.join(root,'artifacts');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'calculator-catalogue-audit.json'),JSON.stringify(report,null,2)+'\n');
const rows=findings.map(f=>'| '+f.path+' | '+f.language+' | '+f.missing.join(', ')+' |').join('\n');
const summary=['# Friendly Calculator — Full Catalogue Audit','','Generated: '+report.generatedAt,'','## Coverage','',
'- Total calculator HTML routes: '+stats.total,
'- English routes: '+stats.english,
'- Localized routes: '+stats.localized,
'- Localized routes by language: '+Object.entries(stats.byLanguage).map(([k,v])=>k+': '+v).join(', '),
'- Rate-sensitive routes: '+report.rateSensitivePages,
'- Redirect-only files excluded from calculator coverage: '+excludedRedirects,'','## Passing route counts','','| Check | Passing pages |','|---|---:|',
...Object.entries(stats.checks).map(([k,v])=>'| '+k+' | '+v+' / '+stats.total+' |'),
'','Chart/table coverage is informational, not a universal requirement; simple calculators do not need an artificial chart. FAQ schema is counted as present when the shared shell can generate it from visible page FAQs.',
'','## Shared shell','',
'- SoftwareApplication/WebApplication schema present: '+report.sharedSchema.softwareApplicationOrWebApplication,
'- FAQPage generation present: '+report.sharedSchema.faqSchemaFromVisibleFaq,
'','## Page-specific gaps','','| Page | Language | Missing checks |','|---|---|---|',
rows||'| None detected | — | — |',
'','Note: static source audit only. It does not prove calculation correctness, deployed behavior, search indexing, rich-result eligibility, or live Core Web Vitals.'].join('\n')+'\n';
fs.writeFileSync(path.join(out,'calculator-catalogue-audit.md'),summary);
console.log(JSON.stringify({total:stats.total,english:stats.english,localized:stats.localized,byLanguage:stats.byLanguage,findings:findings.length,report:'artifacts/calculator-catalogue-audit.md'}));
