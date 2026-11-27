#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'artifacts');
const TARGET=250;
const CURRENT_YEAR=2026;
const REPEATED_PARAGRAPH_MIN_PAGES=5;
const BOILERPLATE=[
 /this calculator (?:performs|evaluates|calculates) the displayed/i,
 /result is displayed when you enter/i,
 /enter the known values; results are shown/i,
 /check units, assumptions and professional guidance/i,
 /this simple arithmetic estimate is not a substitute/i,
 /a transparent browser-based calculator with formula, sample and assumptions/i
];
const RATE_SENSITIVE=/(ppf|ssy|sukanya|nsc|kvp|scss|post-office-(?:rd|mis)|gst|income-tax|advance-tax|tds|epf|pf-calculator|uk-stamp-duty|national-insurance|superannuation|atal-pension-yojana)/i;
// Certain regulated/age-restricted topic routes are excluded from the report and index shortlist.
const EXCLUDED_TOPIC=/(firearm|ammunition|explosive|weapon|gun-(?:safe|storage)|pepper-spray|stun-gun|nicotine|vape|tobacco|cannabis|marijuana|casino|gambling|porn|adult-content|alcohol-intake|alcohol-unit|drug-dose|poison|pesticide-toxicity)/i;
const SKIP_DIRS=new Set(['.git','.github','node_modules','vendor','dist','coverage','tests','admin','avnish-ai','artifacts']);
const CORE_SLUGS=['emi-calculator','loan-emi-calculator','gst-calculator','sip-calculator','fd-calculator','ppf-calculator','income-tax-calculator','hra-calculator','percentage-calculator','age-calculator','bmi-calculator','unit-converter','simple-interest-calculator','compound-interest-calculator','rd-calculator'];

function walk(dir,rel=''){
 if(!fs.existsSync(dir))return [];
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const next=path.join(dir,e.name),relative=path.posix.join(rel,e.name);
  if(e.isDirectory()){
   if(e.name.startsWith('.')||SKIP_DIRS.has(e.name))return [];
   return walk(next,relative);
  }
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
 const m=s.match(/<main\b[\s\S]*?<\/main>/i)||s.match(/<article\b[\s\S]*?<\/article>/i);
 return stripMarkup(m?m[0]:s);
}
function tagText(html,tag){
 return [...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>([\\s\\S]*?)<\\/'+tag+'>','gi'))]
  .map(m=>stripMarkup(m[1])).filter(Boolean);
}
function attrValue(tag,name){
 const match=new RegExp("\\b"+name+"\\s*=\\s*","i").exec(tag);
 if(!match)return '';
 const rest=tag.slice(match.index+match[0].length);
 const quote=rest[0];
 if(quote==='"'||quote==="'"){
  const end=rest.indexOf(quote,1);
  return end<0?'':rest.slice(1,end);
 }
 return (rest.match(/^[^\s>]+/)||[''])[0];
}
function extractTitle(html){
 const tag=(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'';
 return stripMarkup(tag);
}
function extractDescription(html){
 const tags=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
 const tag=tags.find(item=>attrValue(item,'name').toLowerCase()==='description');
 return tag?attrValue(tag,'content').trim():'';
}
function extractCanonical(html){
 const tags=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]);
 const tag=tags.find(item=>attrValue(item,'rel').toLowerCase().split(/\s+/).includes('canonical'));
 if(!tag)return '';
 const href=attrValue(tag,'href');
 try{
  const url=new URL(href,'https://friendlycalculator.in');
  return url.origin==='https://friendlycalculator.in'&&!url.search&&!url.hash?url.href:'';
 }catch(_){return '';}
}
function hasNoindex(html){
 return /<meta\b[^>]*(?:name\s*=\s*["'](?:robots|googlebot)["'][^>]*content\s*=\s*["'][^"']*\bnoindex\b|content\s*=\s*["'][^"']*\bnoindex\b[^>]*name\s*=\s*["'](?:robots|googlebot)["'])/i.test(html);
}
function hasRefreshRedirect(html){
 return /<meta\b(?=[^>]*http-equiv\s*=\s*["']refresh["'])[^>]*>/i.test(html);
}
function isSelfCanonical(file,canonical){
 const expected='https://friendlycalculator.in/calculators/'+file.replace(/\\/g,'/');
 return canonical===expected;
}
function extractParagraphs(html){
 const main=(html.match(/<main\b[\s\S]*?<\/main>/i)||html.match(/<article\b[\s\S]*?<\/article>/i)||[])[0]||html;
 return [...main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
  .map(m=>stripMarkup(m[1]).toLowerCase().replace(/\s+/g,' ').trim())
  .filter(p=>p.split(/\s+/).length>=10);
}
function countMatches(text,re){
 const globalRe=new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g');
 return [...text.matchAll(globalRe)].length;
}
function isHistoricalPrimaryYear(file,title){
 const primary=(file+' '+title).toLowerCase();
 const years=[...primary.matchAll(/\b(20\d{2})(?:[-–/](\d{2}|20\d{2}))?\b/g)].map(m=>Number(m[1]));
 return years.some(year=>year<CURRENT_YEAR);
}
function mainHeadingInfo(html){
 const main=(html.match(/<main\b[\s\S]*?<\/main>/i)||html.match(/<article\b[\s\S]*?<\/article>/i)||[])[0]||html;
 const h1=tagText(main,'h1');
 const sequence=[...main.matchAll(/<h([1-6])\b[^>]*>/gi)].map(m=>Number(m[1]));
 let hierarchy=true,last=0;
 for(const level of sequence){
  if(last&&level>last+1){hierarchy=false;break;}
  last=level;
 }
 return {h1Count:h1.length,h1:h1[0]||'',headingHierarchy:hierarchy};
}
function auditPage(file,html,repeatedParagraphs=new Set()){
 const text=mainText(html),words=text?text.split(/\s+/).length:0;
 const paragraphs=[...new Set(extractParagraphs(html))];
 const repeated=paragraphs.filter(p=>repeatedParagraphs.has(p));
 const repeatedParagraphWords=repeated.reduce((n,p)=>n+p.split(/\s+/).length,0);
 const pageSpecificWords=Math.max(0,words-repeatedParagraphWords);
 const repeatedParagraphRatio=words?repeatedParagraphWords/words:0;
 const tokens=text.toLowerCase().match(/[a-z0-9₹$%]+/g)||[];
 const uniqueRatio=tokens.length?new Set(tokens).size/tokens.length:0;
 const labels=[...html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi)].map(m=>stripMarkup(m[1])).filter(Boolean);
 const title=extractTitle(html),description=extractDescription(html),slug=path.basename(file,'.html');
 const canonical=extractCanonical(html);
 const {h1,h1Count,headingHierarchy}=mainHeadingInfo(html);
 const formula=/\b(formula|equation|calculation method|how (?:this|the) calculator works|emi\s*=|sip\s*=|principal|interest rate|गणना का सूत्र|सूत्र)\b/i.test(text);
 const workedExample=/\b(worked example|calculation example|example calculation|for example|उदाहरण|गणना का उदाहरण)\b/i.test(text);
 const faq=/(?:frequently asked questions|<h[2-6][^>]*>\s*faq|<details\b)/i.test(html);
 const assumptions=/\b(assumptions?|limitations?|rounding|units?|eligibility|excludes?|does not include|not included)\b/i.test(text);
 const source=/https?:\/\/[^ "'<>]*(?:gov\.in|gov\.uk|gov\.au|canada\.ca|irs\.gov|federalreserve\.gov|rbi\.org\.in|incometax\.gov\.in|gst\.gov\.in|cbic\.gov\.in|epfindia\.gov\.in)/i.test(html);
 const updated=/last\s+updated|updated\s*[:：]|checked\s+(?:against|on)|rates?\s+(?:last\s+)?checked|अद्यतन\s*[:：]|अपडेट\s*[:：]/i.test(text);
 const generic=BOILERPLATE.reduce((n,re)=>n+countMatches(text,re),0);
 const placeholderLabels=labels.filter(x=>/^(input\s*[a-z0-9]+|value\s*[a-z0-9]*|variable\s*[a-z0-9]*|enter value)$/i.test(x)).length;
 const rawIdentifiers=labels.filter(x=>/(?:[a-z]+[A-Z][a-zA-Z0-9]*|difference_negative|difference_positive|latestdueDate|earliestmatingDate)/.test(x)).length;
 const hasCalculator=/<input\b|<select\b|<button\b|FC_EQUATION_CONFIG|generated-equation-calculator/i.test(html);
 const hasTitle=title.length>=18&&title.length<=90;
 const hasDescription=description.length>=45&&description.length<=180;
 const meaningfulH1=h1.length>=6&&!/^(?:calculator|online calculator|tool)$/i.test(h1);
 const rateSensitive=RATE_SENSITIVE.test(slug);
 const historicalYear=isHistoricalPrimaryYear(file,title);
 const noindex=hasNoindex(html),redirectOnly=hasRefreshRedirect(html);
 const selfCanonical=isSelfCanonical(file,canonical);
 const sensitiveExcluded=EXCLUDED_TOPIC.test(file);
 const features={
  words,pageSpecificWords,repeatedParagraphWords,repeatedParagraphRatio,uniqueRatio,
  formula,workedExample,faq,assumptions,source,updated,rateSensitive,
  meaningfulLabels:labels.length>0&&placeholderLabels===0&&rawIdentifiers===0,
  hasCalculator,hasCanonical:Boolean(canonical),selfCanonical,hasTitle,hasDescription,
  h1Count,meaningfulH1,headingHierarchy,core:CORE_SLUGS.includes(slug),
  placeholderLabels,rawIdentifiers,generic,noindex,redirectOnly,historicalYear,sensitiveExcluded
 };
 let score=Math.min(pageSpecificWords,700)/700*18+uniqueRatio*8+(formula?12:0)+(workedExample?12:0)+(faq?5:0)+(assumptions?7:0)+(source?8:0)+(updated?3:0)+(features.meaningfulLabels?7:0)+(hasCalculator?5:0)+(selfCanonical?5:0)+(hasTitle?3:0)+(hasDescription?3:0)+(meaningfulH1?4:0)+(headingHierarchy?3:0)+(features.core?5:0)-Math.min(generic,5)*6-placeholderLabels*8-rawIdentifiers*8-repeatedParagraphRatio*30;
 const baseEligible=pageSpecificWords>=180&&repeatedParagraphRatio<=0.35&&placeholderLabels===0&&rawIdentifiers===0&&generic===0&&hasCalculator&&hasTitle&&hasDescription&&meaningfulH1&&h1Count===1&&headingHierarchy&&selfCanonical&&!noindex&&!redirectOnly&&!historicalYear&&!sensitiveExcluded&&(!rateSensitive||(updated&&source));
 const obviousTemplate=generic>=2&&pageSpecificWords<260;
 const repeatedThin=repeatedParagraphRatio>=0.5&&pageSpecificWords<260;
 const veryShort=pageSpecificWords<120;
 const rawUi=placeholderLabels>0||rawIdentifiers>0;
 const missingPurpose=!hasCalculator||(!formula&&pageSpecificWords<220);
 const qualitySignalCount=[veryShort,obviousTemplate,repeatedThin,rawUi,missingPurpose,(historicalYear&&rateSensitive)].filter(Boolean).length;
 const hardThin=qualitySignalCount>=2&&selfCanonical&&!noindex&&!redirectOnly&&!sensitiveExcluded;
 return {file,slug,title,description,canonical,h1,score:Math.max(0,Math.min(100,Math.round(score))),features:{...features,baseEligible,qualityEligible:false,hardThin}};
}
function countBy(items,key){
 const counts=new Map();
 for(const item of items){
  const value=String(item[key]||'').toLowerCase().replace(/\s+/g,' ').trim();
  if(value)counts.set(value,(counts.get(value)||0)+1);
 }
 return counts;
}
function audit(root=ROOT){
 const files=walk(path.join(root,'calculators')).filter(f=>!f.includes('/'));
 const sourcePages=files.map(file=>({file,html:fs.readFileSync(path.join(root,'calculators',file),'utf8')}));
 const paragraphFrequency=new Map();
 for(const p of sourcePages)for(const paragraph of new Set(extractParagraphs(p.html)))paragraphFrequency.set(paragraph,(paragraphFrequency.get(paragraph)||0)+1);
 const repeatedParagraphs=new Set([...paragraphFrequency].filter(([,count])=>count>=REPEATED_PARAGRAPH_MIN_PAGES).map(([paragraph])=>paragraph));
 const pages=sourcePages.map(p=>auditPage(p.file,p.html,repeatedParagraphs));
 const titleFrequency=countBy(pages,'title'),descriptionFrequency=countBy(pages,'description');
 const canonicalFrequency=countBy(pages,'canonical');
 for(const page of pages){
  const f=page.features;
  f.duplicateTitle=(titleFrequency.get(String(page.title||'').toLowerCase())||0)>1;
  f.duplicateDescription=(descriptionFrequency.get(String(page.description||'').toLowerCase())||0)>1;
  f.duplicateCanonical=(canonicalFrequency.get(String(page.canonical||'').toLowerCase())||0)>1;
  f.qualityEligible=f.baseEligible&&!f.duplicateTitle&&!f.duplicateDescription&&!f.duplicateCanonical;
 }
 const excludedSensitive=pages.filter(p=>p.features.sensitiveExcluded).length;
 const visiblePages=pages.filter(p=>!p.features.sensitiveExcluded);
 const byScore=visiblePages.filter(p=>p.features.qualityEligible).sort((a,b)=>b.score-a.score||a.slug.localeCompare(b.slug));
 const candidates=byScore.slice(0,TARGET),candidateSet=new Set(candidates.map(p=>p.file));
 const existingNoindex=visiblePages.filter(p=>p.features.noindex).length;
 const redirectOnly=visiblePages.filter(p=>p.features.redirectOnly).length;
 const noindexRecommended=visiblePages.filter(p=>!candidateSet.has(p.file)&&p.features.hardThin);
 const noindexSet=new Set(noindexRecommended.map(p=>p.file));
 const manualReview=visiblePages.filter(p=>!candidateSet.has(p.file)&&!noindexSet.has(p.file)&&!p.features.noindex&&!p.features.redirectOnly);
 const reasonCounts={
  veryShort:noindexRecommended.filter(p=>p.features.pageSpecificWords<120).length,
  repeatedTemplate:noindexRecommended.filter(p=>p.features.repeatedParagraphRatio>=0.5&&p.features.pageSpecificWords<260).length,
  genericBoilerplate:noindexRecommended.filter(p=>p.features.generic>=2&&p.features.pageSpecificWords<260).length,
  placeholderOrRawLabels:noindexRecommended.filter(p=>p.features.placeholderLabels>0||p.features.rawIdentifiers>0).length,
  missingCalculatorOrFormula:noindexRecommended.filter(p=>!p.features.hasCalculator||(!p.features.formula&&p.features.pageSpecificWords<220)).length,
  historicalRatePage:noindexRecommended.filter(p=>p.features.historicalYear&&p.features.rateSensitive).length
 };
 const summary={
  generatedAt:new Date().toISOString(),
  scope:'English root calculator routes only; translated routes are inventoried separately and are not modified by this audit.',
  totalRootCalculatorPages:pages.length,
  excludedSensitiveTopicPages:excludedSensitive,
  candidateTarget:TARGET,
  eligibleBeforeDuplicateMetadata:pages.filter(p=>p.features.baseEligible&&!p.features.sensitiveExcluded).length,
  candidatesSelected:candidates.length,
  remainingVisibleForReview:visiblePages.length-candidates.length,
  noindexRecommendedCount:noindexRecommended.length,
  manualReviewCount:manualReview.length,
  alreadyNoindexCount:existingNoindex,
  redirectOnlyCount:redirectOnly,
  scoreMethod:'Source-code triage heuristic, not a Google quality score or guaranteed index-worthiness. The shortlist requires page-by-page formula/runtime validation.',
  signalCounts:Object.fromEntries(['formula','workedExample','faq','assumptions','source','updated','meaningfulLabels','hasCalculator','selfCanonical','hasTitle','hasDescription','meaningfulH1','headingHierarchy','rateSensitive'].map(k=>[k,visiblePages.filter(p=>p.features[k]).length])),
  highRiskSignals:{
   repeatedParagraphTemplates:repeatedParagraphs.size,
   placeholderLabelPages:visiblePages.filter(p=>p.features.placeholderLabels>0).length,
   rawVariableLabelPages:visiblePages.filter(p=>p.features.rawIdentifiers>0).length,
   genericTemplatePhrasePages:visiblePages.filter(p=>p.features.generic>0).length,
   duplicateTitlePages:visiblePages.filter(p=>p.features.duplicateTitle).length,
   duplicateDescriptionPages:visiblePages.filter(p=>p.features.duplicateDescription).length,
   nonSelfCanonicalPages:visiblePages.filter(p=>!p.features.selfCanonical).length,
   staleYearPrimaryPages:visiblePages.filter(p=>p.features.historicalYear).length
  },
  noindexReasonCounts:reasonCounts,
  candidates,
  noindexReviewCandidates:noindexRecommended.map(p=>({file:p.file,title:p.title,score:p.score,signals:p.features})),
  manualReviewQueue:manualReview.map(p=>({file:p.file,title:p.title,score:p.score,signals:p.features}))
 };
 fs.mkdirSync(OUT,{recursive:true});
 fs.writeFileSync(path.join(OUT,'adsense-page-quality-audit.json'),JSON.stringify(summary,null,2)+'\n');
 const rows=candidates.map((p,i)=>'| '+(i+1)+' | ['+(p.title||p.slug)+'](https://friendlycalculator.in/calculators/'+p.file+') | '+p.score+' | '+(p.features.formula?'✓':'—')+' | '+(p.features.workedExample?'✓':'—')+' | '+(p.features.faq?'✓':'—')+' | '+(p.features.assumptions?'✓':'—')+' | '+(p.features.source?'✓':'—')+' |');
 const md=[
  '# Friendly Calculator — AdSense page-quality audit','',
  'Generated: '+summary.generatedAt,'',
  '## Scope','',
  '- English root calculator routes only. Localized routes are not changed or treated as duplicates by this pass.',
  '- Excluded topic routes are counted for internal audit only and are not printed in this report.',
  '- The shortlist is a source-code candidate list for manual validation, not a Google ranking or automatic approval guarantee.',
  '- Noindex recommendations use multiple quality signals, not a single word-count threshold. Routes remain online.','',
  '## Inventory','',
  '- Root English calculator pages: '+summary.totalRootCalculatorPages,
  '- Candidate pages selected: '+summary.candidatesSelected,
  '- Strong candidates before duplicate metadata checks: '+summary.eligibleBeforeDuplicateMetadata,
  '- Suggested noindex review: '+summary.noindexRecommendedCount,
  '- Manual review queue: '+summary.manualReviewCount,
  '- Already noindex: '+summary.alreadyNoindexCount,
  '- Redirect-only pages: '+summary.redirectOnlyCount,
  '- Excluded topic pages: '+summary.excludedSensitiveTopicPages,'',
  '## Quality signals','',
  '- Repeated paragraph templates detected across '+REPEATED_PARAGRAPH_MIN_PAGES+' or more pages: '+summary.highRiskSignals.repeatedParagraphTemplates,
  '- Placeholder input label pages: '+summary.highRiskSignals.placeholderLabelPages,
  '- Raw variable label pages: '+summary.highRiskSignals.rawVariableLabelPages,
  '- Generic boilerplate phrase pages: '+summary.highRiskSignals.genericTemplatePhrasePages,
  '- Duplicate title pages: '+summary.highRiskSignals.duplicateTitlePages,
  '- Duplicate description pages: '+summary.highRiskSignals.duplicateDescriptionPages,
  '- Non-self-canonical pages: '+summary.highRiskSignals.nonSelfCanonicalPages,
  '- Historical-year primary pages: '+summary.highRiskSignals.staleYearPrimaryPages,'',
  '## Suggested noindex review reasons','',
  ...Object.entries(reasonCounts).map(([key,value])=>'- '+key+': '+value),'',
  '## Candidate shortlist','',
  '| # | Page | Score | Formula | Example | FAQ | Assumptions | Source |',
  '|---:|---|---:|:---:|:---:|:---:|:---:|:---:|',
  ...rows,'',
  '## Release constraints','',
  'Do not apply the noindex recommendation list without reviewing the JSON reasons and ensuring homepage, site navigation and internal search behave as intended. This audit does not change pages, robots metadata, sitemaps, formulas, header/footer, locale routes or production settings. Calculation correctness, live rendering, indexing status and AdSense account state require separate verification.'
 ].join('\n')+'\n';
 fs.writeFileSync(path.join(OUT,'adsense-page-quality-audit.md'),md);
 return summary;
}
if(require.main===module){
 const r=audit();
 console.log(JSON.stringify({
  total:r.totalRootCalculatorPages,
  candidates:r.candidatesSelected,
  noindexRecommended:r.noindexRecommendedCount,
  manualReview:r.manualReviewCount,
  exclusions:r.excludedSensitiveTopicPages,
  report:'artifacts/adsense-page-quality-audit.md'
 }));
}
module.exports={audit,auditPage,extractParagraphs,extractTitle,extractDescription,extractCanonical,hasNoindex,hasRefreshRedirect,isSelfCanonical,isHistoricalPrimaryYear,mainHeadingInfo,mainText,stripMarkup};
