#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const languages = ['hi','es','fr','pt','ar','id','bn','ta'];
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
const findings = [];
const stats = {total:files.length,english:0,localized:0,byLanguage:{},checks:{title:0,description:0,canonical:0,formula:0,workedExample:0,visibleFaq:0,faqSchema:0,chartOrTable:0,updatedRateStamp:0,authoritativeRateSource:0}};
const ratePattern = /(ppf|ssy|sukanya|nsc|kvp|scss|post-office-(?:rd|mis)|gst|income-tax|advance-tax|tds|epf|pf-calculator)/i;
for (const file of files.sort()) {
  const rel = path.relative(root,file).split(path.sep).join('/');
  const m = rel.match(/^([a-z]{2})\/calculators\//);
  const lang = m ? m[1] : 'en';
  if (lang === 'en') stats.english++; else {stats.localized++;stats.byLanguage[lang]=(stats.byLanguage[lang]||0)+1;}
  const html = fs.readFileSync(file,'utf8');
  const checks = {
    title:has(html,/<title>\s*[^<]{8,}<\/title>/i),
    description:has(html,/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{40,}/i)||has(html,/<meta[^>]+content=["'][^"']{40,}["'][^>]+name=["']description["']/i),
    canonical:has(html,/<link[^>]+rel=["']canonical["'][^>]+href=/i),
    formula:has(html,/(formula|calculation|emi\s*=|sip\s*=|principal|interest rate|गणना का सूत्र|सूत्र)/i),
    workedExample:has(html,/(worked example|calculation example|example calculation|उदाहरण|गणना का उदाहरण)/i),
    visibleFaq:has(html,/<(?:section|div)[^>]*(?:faq|frequently)[^>]*>|<details[^>]*>[\s\S]*?<summary/i),
    faqSchema:has(html,/"@type"\s*:\s*"FAQPage"/i),
    chartOrTable:has(html,/<table[\s>]/i)||has(html,/(chart|canvas|plot|visuali[sz]ation|amortization|amortisation)/i)
  };
  for (const k of Object.keys(checks)) if(checks[k]) stats.checks[k]++;
  const rateSensitive=ratePattern.test(path.basename(file));
  const updated=has(html,/updated\s*[:：]|अद्यतन\s*[:：]|अपडेट\s*[:：]/i);
  const source=has(html,/(dea\.gov\.in|indiapost\.gov\.in|gst\.gov\.in|incometax\.gov\.in|epfindia\.gov\.in)/i);
  if(rateSensitive){if(updated)stats.checks.updatedRateStamp++;if(source)stats.checks.authoritativeRateSource++;}
  const missing=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
  if(rateSensitive&&!updated)missing.push('updatedRateStamp');
  if(rateSensitive&&!source)missing.push('authoritativeRateSource');
  if(missing.length)findings.push({path:rel,language:lang,rateSensitive,missing});
}
const shell=fs.readFileSync(path.join(root,'assets/site-shell.js'),'utf8');
const report={generatedAt:new Date().toISOString(),scope:'calculator HTML pages in calculators/ and supported language calculator directories',expectedLanguages:languages,counts:stats,rateSensitivePages:files.filter(f=>ratePattern.test(path.basename(f))).length,sharedSchema:{softwareApplicationOrWebApplication:/WebApplication|SoftwareApplication/.test(shell),faqSchemaFromVisibleFaq:/FAQPage/.test(shell)},missingFindingCount:findings.length,findings};
const out=path.join(root,'artifacts');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'calculator-catalogue-audit.json'),JSON.stringify(report,null,2)+'\n');
const rows=findings.map(f=>'| '+f.path+' | '+f.language+' | '+f.missing.join(', ')+' |').join('\n');
const summary=['# Friendly Calculator — Full Catalogue Audit','','Generated: '+report.generatedAt,'','## Coverage','',
'- Total calculator HTML routes: '+stats.total,
'- English routes: '+stats.english,
'- Localized routes: '+stats.localized,
'- Localized routes by language: '+Object.entries(stats.byLanguage).map(([k,v])=>k+': '+v).join(', '),
'- Rate-sensitive routes: '+report.rateSensitivePages,'','## Passing route counts','','| Check | Passing pages |','|---|---:|',
...Object.entries(stats.checks).map(([k,v])=>'| '+k+' | '+v+' / '+stats.total+' |'),
'','## Shared shell','',
'- SoftwareApplication/WebApplication schema present: '+report.sharedSchema.softwareApplicationOrWebApplication,
'- FAQPage generation present: '+report.sharedSchema.faqSchemaFromVisibleFaq,
'','## Page-specific gaps','','| Page | Language | Missing checks |','|---|---|---|',
rows||'| None detected | — | — |',
'','Note: static source audit only. It does not prove calculation correctness, deployed behavior, search indexing, rich-result eligibility, or live Core Web Vitals.'].join('\n')+'\n';
fs.writeFileSync(path.join(out,'calculator-catalogue-audit.md'),summary);
console.log(JSON.stringify({total:stats.total,english:stats.english,localized:stats.localized,byLanguage:stats.byLanguage,findings:findings.length,report:'artifacts/calculator-catalogue-audit.md'}));
