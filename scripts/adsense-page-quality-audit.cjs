#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'artifacts');
const TARGET=250;
const BOILERPLATE=[
 /this calculator (?:performs|evaluates|calculates) the displayed/i,
 /result is displayed when you enter/i,
 /enter the known values; results are shown/i,
 /check units, assumptions and professional guidance/i,
 /this simple arithmetic estimate is not a substitute/i,
 /a transparent browser-based calculator with formula, sample and assumptions/i
];
const CORE_SLUGS=['emi-calculator','loan-emi-calculator','gst-calculator','sip-calculator','fd-calculator','ppf-calculator','income-tax-calculator','hra-calculator','percentage-calculator','age-calculator','bmi-calculator','unit-converter','simple-interest-calculator','compound-interest-calculator','rd-calculator'];
function walk(dir,rel=''){
 if(!fs.existsSync(dir))return [];
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const next=path.join(dir,e.name), relative=path.posix.join(rel,e.name);
  if(e.isDirectory())return walk(next,relative);
  return e.isFile()&&e.name.toLowerCase().endsWith('.html')?[relative]:[];
 });
}
function stripMarkup(html){
 return html.replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]+>/g,' ')
  .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi,' ').replace(/\s+/g,' ').trim();
}
function mainText(html){
 const s=html.replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi,' ');
 const m=s.match(/<main\b[\s\S]*?<\/main>/i);
 return stripMarkup(m?m[0]:s);
}
function extractTitle(html){return ((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'').replace(/<[^>]+>/g,' ').trim();}
function extractDescription(html){
 const tag=(html.match(/<meta\b(?=[^>]*name=["']description["'])[^>]*>/i)||[])[0]||'';
 return ((tag.match(/\bcontent=["']([^"']*)["']/i)||[])[1]||'').trim();
}
function countMatches(text,re){const globalRe=new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g');return [...text.matchAll(globalRe)].length;}
function auditPage(file,html){
 const text=mainText(html), words=text?text.split(/\s+/).length:0;
 const tokens=text.toLowerCase().match(/[a-z0-9₹$%]+/g)||[];
 const uniqueRatio=tokens.length?new Set(tokens).size/tokens.length:0;
 const labels=[...html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi)].map(m=>stripMarkup(m[1])).filter(Boolean);
 const title=extractTitle(html),description=extractDescription(html),slug=path.basename(file,'.html');
 const formula=/\b(formula|equation|calculation method|how (?:this|the) calculator works|emi\s*=|sip\s*=|principal|interest rate|गणना का सूत्र|सूत्र)\b/i.test(text);
 const workedExample=/\b(worked example|calculation example|example calculation|for example|उदाहरण|गणना का उदाहरण)\b/i.test(text);
 const faq=/(?:frequently asked questions|<h[2-6][^>]*>\s*faq|<details\b)/i.test(html);
 const assumptions=/\b(assumptions?|limitations?|rounding|units?|eligibility|excludes?|does not include|not included)\b/i.test(text);
 const source=/https?:\/\/[^ "'<>]*(?:gov\.in|gov\.uk|gov\.au|canada\.ca|irs\.gov|federalreserve\.gov|rbi\.org\.in|incometax\.gov\.in|gst\.gov\.in|cbic\.gov\.in|epfindia\.gov\.in)/i.test(html);
 const generic=BOILERPLATE.reduce((n,re)=>n+countMatches(text,re),0);
 const placeholderLabels=labels.filter(x=>/^(input\s*[a-z0-9]+|value\s*[a-z0-9]*|variable\s*[a-z0-9]*|enter value)$/i.test(x)).length;
 const rawIdentifiers=labels.filter(x=>/(?:[a-z]+[A-Z][a-zA-Z0-9]*|difference_negative|difference_positive|latestdueDate|earliestmatingDate)/.test(x)).length;
 const hasCalculator=/<input\b|<select\b|<button\b/i.test(html);
 const hasCanonical=/<link\b(?=[^>]*rel=["']canonical["'])(?=[^>]*href=["'][^"']+["'])[^>]*>/i.test(html);
 const hasDescription=description.length>=45;
 const meaningfulLabels=labels.length>0&&placeholderLabels===0&&rawIdentifiers===0;
 const core=CORE_SLUGS.includes(slug);
 const features={words,uniqueRatio,formula,workedExample,faq,assumptions,source,meaningfulLabels,hasCalculator,hasCanonical,hasDescription,core,placeholderLabels,rawIdentifiers,generic};
 let score=Math.min(words,700)/700*18+uniqueRatio*12+(formula?12:0)+(workedExample?12:0)+(faq?8:0)+(assumptions?8:0)+(source?8:0)+(meaningfulLabels?8:0)+(hasCalculator?5:0)+(hasCanonical?3:0)+(hasDescription?3:0)+(core?12:0)-Math.min(generic,5)*5-placeholderLabels*8-rawIdentifiers*8;
 return {file,slug,title,description,score:Math.max(0,Math.min(100,Math.round(score))),features};
}
function audit(root=ROOT){
 const files=walk(path.join(root,'calculators')).filter(f=>!f.includes('/'));
 const pages=files.map(file=>auditPage(file,fs.readFileSync(path.join(root,'calculators',file),'utf8')));
 const byScore=[...pages].sort((a,b)=>b.score-a.score||a.slug.localeCompare(b.slug));
 const candidates=byScore.slice(0,TARGET), candidateSet=new Set(candidates.map(p=>p.file));
 const summary={
  generatedAt:new Date().toISOString(),
  scope:'English root calculators only; locale variants assessed separately after English page selection',
  totalRootCalculatorPages:pages.length,candidateTarget:TARGET,candidatesSelected:candidates.length,
  remainingForNoindexReview:pages.length-candidates.length,
  scoreMethod:'Heuristic prioritisation for manual review; not a Google quality score and not an automatic index/noindex decision.',
  signalCounts:Object.fromEntries(['formula','workedExample','faq','assumptions','source','meaningfulLabels','hasCalculator','hasCanonical','hasDescription','core'].map(k=>[k,pages.filter(p=>p.features[k]).length])),
  highRiskSignals:{
   placeholderLabelPages:pages.filter(p=>p.features.placeholderLabels>0).length,
   rawVariableLabelPages:pages.filter(p=>p.features.rawIdentifiers>0).length,
   genericTemplatePhrasePages:pages.filter(p=>p.features.generic>0).length
  },
  candidates,
  proposedNoindexReview:pages.filter(p=>!candidateSet.has(p.file)).map(p=>({file:p.file,score:p.score,signals:p.features}))
 };
 fs.mkdirSync(OUT,{recursive:true});
 fs.writeFileSync(path.join(OUT,'adsense-page-quality-audit.json'),JSON.stringify(summary,null,2)+'\n');
 const rows=candidates.map((p,i)=>'| '+(i+1)+' | ['+(p.title||p.slug)+'](https://friendlycalculator.in/calculators/'+p.file+') | '+p.score+' | '+(p.features.formula?'✓':'—')+' | '+(p.features.workedExample?'✓':'—')+' | '+(p.features.faq?'✓':'—')+' | '+(p.features.assumptions?'✓':'—')+' | '+(p.features.source?'✓':'—')+' |');
 const md=[
 '# Friendly Calculator — AdSense page-quality audit','',
 'Generated: '+summary.generatedAt,'',
 '## Scope','',
 '- Root English calculator pages only.',
 '- Locale pages are not auto-selected; their translation and canonical/hreflang relationships need separate review.',
 '- The 250 entries below are heuristic candidates for manual review, not guaranteed index-worthy pages.',
 '- Remaining pages are a proposed noindex review queue, not changed by this audit.','',
 '## Inventory','',
 '- Root calculator pages: '+summary.totalRootCalculatorPages,
 '- Candidate shortlist: '+summary.candidatesSelected,
 '- Remaining review queue: '+summary.remainingForNoindexReview,
 '- Placeholder input labels: '+summary.highRiskSignals.placeholderLabelPages,
 '- Raw variable labels: '+summary.highRiskSignals.rawVariableLabelPages,
 '- Generic template phrase signals: '+summary.highRiskSignals.genericTemplatePhrasePages,'',
 '## Candidate shortlist','',
 '| # | Page | Score | Formula | Example | FAQ | Assumptions | Source |',
 '|---:|---|---:|:---:|:---:|:---:|:---:|:---:|',
 ...rows,'',
 '## Limitations','',
 'Source-code audit only. It does not test calculation logic, browser rendering, Search Console indexing or AdSense account state. Word count is not an eligibility threshold. No pages, robots directives, sitemaps, Header/Footer or production settings are modified.'
 ].join('\n')+'\n';
 fs.writeFileSync(path.join(OUT,'adsense-page-quality-audit.md'),md);
 return summary;
}
if(require.main===module){const r=audit();console.log(JSON.stringify({total:r.totalRootCalculatorPages,candidates:r.candidatesSelected,reviewQueue:r.remainingForNoindexReview,risks:r.highRiskSignals,report:'artifacts/adsense-page-quality-audit.md'}));}
module.exports={audit,auditPage,mainText,stripMarkup};
