'use strict';
/**
 * Build the English calculator directory from the canonical published search index.
 * Every core route appears exactly once in one of the 20 established homepage categories.
 * Usage: node scripts/build-site-directory.cjs [--check]
 */
const fs = require('node:fs');
const path = require('node:path');
const {catalogueStats} = require('./sync-calculator-counts.cjs');
const ROOT = path.resolve(__dirname, '..');
const GROUPS = [
  {
    "id": "savings-investments",
    "label": "Savings, Investment & Retirement",
    "desc": "Savings plans, investments and long-term financial planning"
  },
  {
    "id": "loans-credit",
    "label": "Loans, EMI & Credit",
    "desc": "Loan payments, borrowing costs and credit comparisons"
  },
  {
    "id": "insurance-protection",
    "label": "Insurance & Protection",
    "desc": "Insurance premiums and protection planning"
  },
  {
    "id": "tax-payroll",
    "label": "Tax, Salary & Payroll",
    "desc": "Tax estimates, salary calculations and payroll"
  },
  {
    "id": "business-operations",
    "label": "Business & Operations",
    "desc": "Business, trade, logistics and operating metrics"
  },
  {
    "id": "math-statistics",
    "label": "Math & Statistics",
    "desc": "Mathematics, statistics, probability and scientific calculations"
  },
  {
    "id": "astronomy-space",
    "label": "Astronomy & Space",
    "desc": "Astronomy and space-related calculations"
  },
  {
    "id": "astrology-numerology",
    "label": "Astrology & Numerology",
    "desc": "Astrology and numerology tools"
  },
  {
    "id": "geometry-construction",
    "label": "Geometry & Construction",
    "desc": "Geometry, measurement, construction and property tools"
  },
  {
    "id": "date-time-work",
    "label": "Date, Time & Work",
    "desc": "Dates, durations, calendars and working-time calculations"
  },
  {
    "id": "converters-technology",
    "label": "Converters & Technology",
    "desc": "Unit conversion, digital tools and technical utilities"
  },
  {
    "id": "home-travel",
    "label": "Home, Travel & Everyday Costs",
    "desc": "Household, travel, transport and everyday planning"
  },
  {
    "id": "energy-sustainability",
    "label": "Energy & Sustainability",
    "desc": "Energy use, environment and sustainability calculations"
  },
  {
    "id": "food-cooking",
    "label": "Food & Cooking",
    "desc": "Food, cooking and restaurant calculations"
  },
  {
    "id": "education-learning",
    "label": "Education & Learning",
    "desc": "Academic, study and learning tools"
  },
  {
    "id": "health-family",
    "label": "Health, Fitness & Family",
    "desc": "Health, fitness, sports and family-related tools"
  },
  {
    "id": "agriculture-rural",
    "label": "Agriculture & Rural",
    "desc": "Farming, agriculture and rural finance"
  },
  {
    "id": "government-schemes",
    "label": "Government Schemes",
    "desc": "Government schemes, eligibility and public benefits"
  },
  {
    "id": "career-salary",
    "label": "Career & Salary Planning",
    "desc": "Career and salary planning tools"
  },
  {
    "id": "biology-chemistry",
    "label": "Biology & Chemistry",
    "desc": "Biology, chemistry and life-science calculations"
  }
];
function esc(value) { return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function categoryFor(item) {
  const category=String(item.category||'').toLowerCase(), name=String(item.name||'').toLowerCase(), text=name+' '+String(item.keywords||'').toLowerCase();
  if(/astronomy|space/.test(category)) return 'astronomy-space';
  if(/astrology|numerology/.test(category)) return 'astrology-numerology';
  if(/agriculture|farming|rural/.test(category)) return 'agriculture-rural';
  if(/government|scheme|eligibility/.test(category)) return 'government-schemes';
  if(/career/.test(category)) return 'career-salary';
  if(/biology|chemistry/.test(category)) return 'biology-chemistry';
  if(/insurance|protection/.test(category)||/\binsurance\b/.test(text)) return 'insurance-protection';
  if(/tax|payroll|salary/.test(category)||/\b(tax|payroll|salary|paycheck|wage)\b/.test(name)) return 'tax-payroll';
  if(/loan|credit|mortgage/.test(category)||/\b(loan|emi|mortgage|credit|debt|refinance)\b/.test(text)) return 'loans-credit';
  if(/business|trade|organisation|enterprise|operation|logistic|supply chain|manufacturing/.test(category)) return 'business-operations';
  if(/savings|investment|retirement|banking|finance/.test(category)) return 'savings-investments';
  if(/energy|ecology|environment|sustainability|carbon/.test(category)||/\b(energy|electricity|carbon|solar|power usage)\b/.test(name)) return 'energy-sustainability';
  if(/food|cooking|restaurant/.test(category)||/\b(recipe|cooking|food|restaurant|baking|kitchen)\b/.test(name)) return 'food-cooking';
  if(/education|academic|study|learning/.test(category)) return 'education-learning';
  if(/health|fitness|family|sports|exercise|workout|pets/.test(category)||/\b(bmi|calorie|fitness|health|workout|exercise|pet)\b/.test(name)) return 'health-family';
  if(/geometry|construction|architecture|built environment|real estate|property/.test(category)||/\b(triangle|circle|polygon|area|volume|roof|concrete|brick|tile|wire size|flooring|land area)\b/.test(name)) return 'geometry-construction';
  if(/date|time|work/.test(category)||/\b(age|date|time|days|day count|calendar|duration|countdown|shift|working hours)\b/.test(name)) return 'date-time-work';
  if(/conversion|converter|data|technology|tools|design|electrical|electronics|fashion|textile|other|calculator/.test(category)) return 'converters-technology';
  if(/home|garden|travel|everyday|automobile|transport|hospitality|tourism/.test(category)) return 'home-travel';
  if(/math|statistics|physics|science|number/.test(category)) return 'math-statistics';
  if(/\b(travel|hotel|car|fuel|mileage|household|rent|utility)\b/.test(name)) return 'home-travel';
  if(/\b(mean|median|mode|probability|standard deviation|equation|fraction|percentage|ratio)\b/.test(name)) return 'math-statistics';
  return 'math-statistics';
}
function build() {
  const {entries,core}=catalogueStats();
  const buckets=new Map(GROUPS.map(group=>[group.id,[]]));
  for(const item of entries.filter(entry=>entry.url.startsWith('/calculators/'))) buckets.get(categoryFor(item)).push(item);
  for(const list of buckets.values()) list.sort((a,b)=>String(a.name).localeCompare(String(b.name),'en'));
  const grouped=[...buckets.values()].reduce((sum,list)=>sum+list.length,0);
  if(grouped!==core || GROUPS.some(group=>!buckets.get(group.id).length)) throw new Error('Directory grouping mismatch: grouped '+grouped+' / core '+core);
  const quick=GROUPS.map(group=>'<a href="#'+group.id+'">'+esc(group.label)+' <span>'+buckets.get(group.id).length.toLocaleString('en-US')+' calculators</span></a>').join('');
  const sections=GROUPS.map(group=>{
    const list=buckets.get(group.id),count=list.length;
    const cards=list.map(item=>'<a class="card" href="'+esc(item.url)+'" data-search="'+esc([item.name,item.category,item.keywords,item.description].join(' ').toLowerCase())+'"><strong>'+esc(item.name)+'</strong><span>'+esc(item.description||item.keywords||group.desc)+'</span></a>').join('');
    return '<section class="section calculator-category" id="'+group.id+'"><div class="section-head"><div><h2>'+esc(group.label)+'</h2><p>'+esc(group.desc)+'</p></div><strong>'+count.toLocaleString('en-US')+' tools</strong></div><div class="cards">'+cards+'</div></section>';
  }).join('');
  const intl=entries.filter(entry=>entry.url.startsWith('/international/')).map(item=>'<a class="card" href="'+esc(item.url)+'" data-search="'+esc([item.name,item.category,item.keywords,item.description].join(' ').toLowerCase())+'"><strong>'+esc(item.name)+'</strong><span>'+esc(item.description||item.keywords||'International calculator')+'</span></a>').join('');
  const fmt=core.toLocaleString('en-US');
  return '<!doctype html>\n<html lang="en"><head>\n<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>Site Directory - '+fmt+' Calculators | Friendly Calculator</title>\n<meta name="description" content="Browse '+fmt+' unique calculators across 20 categories on Friendly Calculator. Search finance, tax, health, math, business and everyday tools.">\n<meta name="robots" content="index,follow,max-image-preview:large">\n<link rel="canonical" href="https://friendlycalculator.in/calculator/site-directory.html">\n<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n<meta property="og:type" content="website"><meta property="og:site_name" content="Friendly Calculator"><meta property="og:title" content="Site Directory - '+fmt+' Calculators | Friendly Calculator"><meta property="og:description" content="Browse '+fmt+' unique calculators across 20 categories on Friendly Calculator."><meta property="og:url" content="https://friendlycalculator.in/calculator/site-directory.html"><meta property="og:image" content="https://friendlycalculator.in/og-friendly-calculator.png"><meta property="og:image:alt" content="Friendly Calculator — online calculators and practical tools">\n<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Site Directory - '+fmt+' Calculators | Friendly Calculator"><meta name="twitter:description" content="Browse '+fmt+' unique calculators across 20 categories on Friendly Calculator."><meta name="twitter:image" content="https://friendlycalculator.in/og-friendly-calculator.png">\n<link rel="stylesheet" href="/assets/site-shell.css">\n<style>*{box-sizing:border-box}body{margin:0;background:#f5f6f8;color:#172638;font:16px/1.7 system-ui,sans-serif}.wrap{width:min(1100px,94%);margin:24px auto}.hero,.panel{background:#fff;border:1px solid #dfe5eb;border-radius:14px;padding:22px;margin:16px 0}.hero{background:#101c2c;color:#fff}.hero p{margin:.3em 0}.search{width:100%;padding:12px;border:1px solid #b8c4cf;border-radius:8px;font:inherit}.quicklinks{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}.quicklinks a{display:flex;justify-content:space-between;gap:8px;padding:9px;background:#edf3f7;border-radius:8px;text-decoration:none;color:#172638}.quicklinks span{color:#596b7c;font-size:.85rem;white-space:nowrap}.section{margin:24px 0}.section-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:10px}.section h2{margin:0;font-size:1.25rem}.section-head p{margin:3px 0;color:#596b7c}.section-head strong{white-space:nowrap}.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}.card{display:grid;gap:4px;background:#fff;border:1px solid #dfe5eb;border-radius:9px;padding:12px;text-decoration:none;color:#172638}.card strong{font-size:.98rem}.card span{color:#596b7c;font-size:.85rem;line-height:1.5}.card:hover{border-color:#101c2c}.hidden{display:none}.fc-footer{background:#101c2c;color:#fff;margin-top:24px;padding:24px}.fc-footer a{color:#bfd4e3}.fc-footer-links{display:grid;gap:4px;margin-top:8px}@media(max-width:650px){.cards{grid-template-columns:1fr}.section-head{align-items:flex-start;flex-direction:column}}</style></head><body><main class="wrap">\n<header class="hero"><p>FRIENDLY CALCULATOR · DIRECTORY</p><h1>All '+fmt+' unique calculators</h1><p>Browse every published core calculator in 20 topic categories. Search by name, category or keyword. No duplicate calculator URLs are listed.</p></header>\n<section class="panel"><label for="q">Search calculators</label><input class="search" id="q" type="search" placeholder="Type a calculator name or topic..." autocomplete="off"><p>'+fmt+' core calculators across '+GROUPS.length+' categories</p><nav class="quicklinks">'+quick+'</nav></section>\n'+sections+'\n'+(intl?'<section class="section"><h2>International calculators</h2><div class="cards">'+intl+'</div></section>':'')+'\n</main><footer class="fc-footer"><div class="wrap"><strong>FRIENDLY CALCULATOR</strong><nav class="fc-footer-links"><a href="/">Home</a><a href="/calculator/about.html">About</a><a href="/calculator/privacy.html">Privacy</a><a href="/calculator/terms.html">Terms</a><a href="/calculator/contact.html">Contact</a></nav></div></footer>\n<script>(function(){var q=document.getElementById("q");if(!q)return;q.addEventListener("input",function(){var v=q.value.trim().toLowerCase();document.querySelectorAll(".card").forEach(function(c){c.classList.toggle("hidden",!!v&&!(c.getAttribute("data-search")||"").includes(v));});document.querySelectorAll(".calculator-category").forEach(function(s){s.classList.toggle("hidden",!!v&&!s.querySelector(".card:not(.hidden)"));});});})();</script><script src="/assets/site-shell.js" defer></script></body></html>';
}
const target=path.join(ROOT,'calculator','site-directory.html');
const output=build();
if(process.argv.includes('--check')) {
  const current=fs.readFileSync(target,'utf8');
  if(current!==output) { console.error('site-directory.html is out of date. Run node scripts/build-site-directory.cjs'); process.exit(1); }
  console.log('site-directory.html is up to date: '+catalogueStats().core.toLocaleString('en-US')+' unique core calculators across '+GROUPS.length+' categories.');
} else { fs.writeFileSync(target,output); console.log('Built '+catalogueStats().core+' core calculators across '+GROUPS.length+' categories.'); }
