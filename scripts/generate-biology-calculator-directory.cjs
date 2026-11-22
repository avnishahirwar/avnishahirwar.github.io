#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'assets/calculator-search-index.json');
const OUTPUT_FILE = path.join(ROOT, 'calculator/biology-calculators.html');
const SECTIONS = [
  ['pets', 'Pets, companion animals & veterinary tools', 'Find companion-animal age, care, nutrition, breeding and veterinary arithmetic. These are informational tools, not a substitute for a veterinarian.'],
  ['livestock', 'Livestock, breeding & animal production', 'Explore livestock growth, gestation, feed, field and animal-production estimates using the tool-specific assumptions.'],
  ['plants', 'Plants, crops, gardens & forestry', 'Plant growth, crop planning, soil, seeds, garden materials and forestry measurements.'],
  ['genetics', 'Genetics, heredity & molecular biology', 'Explore genetic crosses, allele frequencies, DNA/RNA and related molecular-biology calculations.'],
  ['laboratory', 'Cell biology, biochemistry & laboratory methods', 'Cell, protein, enzyme and biological-laboratory calculations using the assumptions shown by each tool.'],
  ['ecology', 'Ecology, environment & field biology', 'Environmental, water, field and broader life-science measurements.'],
  ['other', 'Other biology & applied life-science tools', 'Additional biology-tagged tools that do not fit a more specific topic above.']
];
const SECTION_ORDER = new Map(SECTIONS.map(([id], i) => [id, i]));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

// Biology & Chemistry is a mixed index category. Include only unmistakable
// biological subject matter; broad chemistry and crystallography remain out.
const MIXED_BIOLOGY_TERMS = /\b(biology|biological|bioinformatics|dna|rna|gene|genetic|genotype|allele|punnett|hardy.?weinberg|enzyme|protein|microb\w*|bacteria|bacterial|virus|viral|fung\w*|pathogen|animal|insect|cricket|gestation|pregnancy|mutation|qpcr|nucleic acid|molecular biology|ecology|microbiology|wildlife|horse|mare|cow|goat|sheep|swine|rabbit|guinea pig|cat|dog)\b/i;
const MIXED_BIOLOGY_EXCEPTIONS = new Set(['Cell Dilution Calculator', 'Cell Doubling Time Calculator']);

function isBiologyEntry(item) {
  const category = String(item.category || '').trim().toLowerCase();
  if (category === 'biology') return true;
  if (category !== 'biology & chemistry') return false;
  const text = `${item.name || ''} ${item.keywords || ''} ${item.description || ''}`;
  return MIXED_BIOLOGY_TERMS.test(text) || MIXED_BIOLOGY_EXCEPTIONS.has(item.name);
}

function classify(item) {
  const text = `${item.name || ''} ${item.keywords || ''} ${item.description || ''}`.toLowerCase();
  if (/\b(dog\w*|cat\w*|bird\w*|pet\w*|guinea pig|hamster|turtle|rabbit|rat cage|fish oil|veterinar\w*|crate|harness|cage|toxicity|dosage|dose|calorie|catculator|pet sitter|quality of life|heat cycle|raw dog food|nutrition|benadryl|cephalexin|metacam|tramadol)\b/.test(text)) return 'pets';
  if (/\b(cattle|cow|sheep|swine|pig|goat|horse|mare|llama|livestock|gestation|feed conversion|forage|dry matter|animal mortality|animal production|grain bin)\b/.test(text)) return 'livestock';
  if (/\b(plant|tree|forest|seed|vegetable|corn|crop|fertiliz\w*|gdu|growing degree|soil|garden|lawn|grass|mulch|compost|sod|grow room|light integral|vpd|spacing|yield|basal area|acres?\b|pine straw|potting|raised bed|grain|harvest)\b/.test(text)) return 'plants';
  if (/\b(dna|rna|gene|genetic|genotype|allele|punnett|hardy.?weinberg|mutation|qpcr|annealing|ligation|copy number|dihybrid|trihybrid|heredity)\b/.test(text)) return 'genetics';
  if (/\b(cell|protein|enzyme|dilution|concentration|log reduction|generation time|molecular weight|michaelis|isoelectric|mlvss|microbial|microbiology|bacteria|bacterial|virus|fung\w*|pathogen)\b/.test(text)) return 'laboratory';
  if (/\b(ecology|environment|wastewater|water quality|water potential|mortality|population|field biology|wildlife|organism|habitat|biodiversity|insect|cricket)\b/.test(text)) return 'ecology';
  return 'other';
}

function biologyEntries() {
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  const byUrl = new Map();
  for (const item of index) {
    if (!isBiologyEntry(item)) continue;
    const url = String(item.url || '');
    if (!url.startsWith('/calculators/') || !url.endsWith('.html') || url.includes('..') || url.includes('?') || url.includes('#')) continue;
    if (!fs.existsSync(path.join(ROOT, url.slice(1)))) continue;
    const entry = {...item, url, section: classify(item)};
    const previous = byUrl.get(url);
    if (!previous || String(entry.description || '').length > String(previous.description || '').length) byUrl.set(url, entry);
  }
  return [...byUrl.values()].sort((a, b) => SECTION_ORDER.get(a.section) - SECTION_ORDER.get(b.section) || a.name.localeCompare(b.name, 'en') || a.url.localeCompare(b.url));
}

function build() {
  const entries = biologyEntries();
  const sections = SECTIONS.map(([id, title, description]) => {
    const members = entries.filter(item => item.section === id);
    if (!members.length) return '';
    const links = members.map(item => {
      const search = `${item.name} ${item.category} ${item.keywords || ''} ${item.description || ''}`.toLowerCase();
      return `      <li class="bio-tool" data-search="${escapeHtml(search)}"><a href="${escapeHtml(item.url)}">${escapeHtml(item.name)}</a><p>${escapeHtml(item.description || 'Open this calculator to enter your own values and review its assumptions.')}</p></li>`;
    }).join('\n');
    return `    <details class="bio-section" data-section="${id}"><summary><span>${escapeHtml(title)}</span><span class="section-count">${members.length} tools</span></summary><p class="section-description">${escapeHtml(description)}</p><ul class="bio-tool-list">\n${links}\n    </ul></details>`;
  }).filter(Boolean).join('\n');
  const date = new Date().toISOString().slice(0, 10);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Biology Calculators Worldwide | Friendly Calculator</title>
<meta name="description" content="Search a categorized directory of biology and life-science calculators for animals, plants, genetics, molecular biology, laboratory methods and ecology.">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://friendlycalculator.in/calculator/biology-calculators.html">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="website"><meta property="og:site_name" content="Friendly Calculator">
<meta property="og:title" content="Biology Calculators Worldwide | Friendly Calculator">
<meta property="og:description" content="Search biology tools for animal care, plant science, genetics, molecular biology, lab methods and ecology.">
<meta property="og:url" content="https://friendlycalculator.in/calculator/biology-calculators.html">
<meta property="og:image" content="https://friendlycalculator.in/og-friendly-calculator.png">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Biology Calculators Worldwide | Friendly Calculator">
<meta name="twitter:description" content="Browse biology and life-science calculators by topic.">
<link rel="stylesheet" href="/assets/site-shell.css"><link rel="stylesheet" href="/assets/site-chrome.css?v=1">
<style>
:root{--bio-ink:#172638;--bio-muted:#596b7c;--bio-line:#dce4eb;--bio-paper:#fff;--bio-wash:#f4f7f9;--bio-accent:#28624f}
*{box-sizing:border-box}body{margin:0;background:var(--bio-wash);color:var(--bio-ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
.bio-wrap{width:min(1100px,94%);margin:0 auto}.bio-nav{padding:16px 0;border-bottom:1px solid var(--bio-line);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.bio-brand{font-weight:850;text-decoration:none;color:var(--bio-ink);letter-spacing:.03em}.bio-nav nav{display:flex;gap:14px;flex-wrap:wrap}.bio-nav nav a{font-size:.9rem}
.bio-hero{padding:30px 0 18px}.bio-hero h1{font-size:clamp(1.9rem,4vw,2.8rem);line-height:1.12;margin:8px 0}.bio-hero p{max-width:850px;color:var(--bio-muted)}.bio-kicker{font-size:.78rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--bio-accent)}
.bio-search{background:var(--bio-paper);border:1px solid var(--bio-line);border-radius:12px;padding:18px;margin:10px 0 18px}.bio-search label{font-weight:750;display:block;margin-bottom:8px}.bio-search-row{display:flex;gap:9px}.bio-search input{flex:1;min-width:0;border:1px solid #aebbc7;border-radius:8px;padding:12px;font:inherit}.bio-search button{border:0;border-radius:8px;background:var(--bio-accent);color:#fff;padding:11px 17px;font:inherit;font-weight:750;cursor:pointer}.bio-search-status{font-size:.88rem;color:var(--bio-muted);margin:8px 0 0}
.bio-directory{display:grid;gap:12px}.bio-section{background:var(--bio-paper);border:1px solid var(--bio-line);border-radius:12px;overflow:hidden}.bio-section>summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer;padding:15px 18px;font-weight:800;font-size:1.05rem;background:#edf4f0}.bio-section>summary::-webkit-details-marker{display:none}.bio-section>summary::before{content:"+";color:var(--bio-accent);font-size:1.2rem;margin-right:4px}.bio-section[open]>summary::before{content:"−"}.section-count{font-size:.78rem;font-weight:700;color:var(--bio-muted);white-space:nowrap}.section-description{color:var(--bio-muted);margin:0;padding:13px 18px 0}.bio-tool-list{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px;margin:0;padding:8px 18px 15px}.bio-tool{padding:12px 0;border-bottom:1px solid #edf0f3;min-width:0}.bio-tool a{font-weight:750;text-decoration:none}.bio-tool a:hover{text-decoration:underline}.bio-tool p{margin:4px 0 0;color:var(--bio-muted);font-size:.86rem}.bio-tool[hidden],.bio-section[hidden]{display:none!important}.bio-empty{display:none;background:white;border:1px solid var(--bio-line);border-radius:10px;padding:18px;color:var(--bio-muted)}.bio-note{margin:20px 0;background:#fff;border:1px solid var(--bio-line);border-radius:12px;padding:18px;color:var(--bio-muted);font-size:.9rem}.bio-note h2{font-size:1.1rem;margin:0 0 7px;color:var(--bio-ink)}.bio-note p:last-child{margin-bottom:0}.bio-footer{padding:24px 0 34px;color:var(--bio-muted);font-size:.88rem}.bio-footer a{margin-right:12px}
@media(max-width:650px){.bio-search-row{flex-direction:column}.bio-search button{width:100%}.bio-tool-list{grid-template-columns:1fr}.bio-section>summary{align-items:flex-start}.bio-nav{align-items:flex-start;flex-direction:column}}
</style>
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage','name':'Biology Calculators Worldwide','url':'https://friendlycalculator.in/calculator/biology-calculators.html','dateModified':date,'isAccessibleForFree':true,'description':'A searchable directory of biology and life-science calculators from the Friendly Calculator catalogue.'})}</script>
</head>
<body>
<header class="bio-wrap bio-nav"><a class="bio-brand" href="/">FRIENDLY CALCULATOR</a><nav aria-label="Main navigation"><a href="/">Home</a><a href="/calculator/site-directory.html">All calculators</a><a href="/calculator/money-calculators.html">Money &amp; finance</a><a href="/calculator/finance-calculators.html">Finance overview</a></nav></header>
<main class="bio-wrap">
<section class="bio-hero"><p class="bio-kicker">Global biology toolkit · ${entries.length} listed calculators</p><h1>Biology &amp; Life-Science Calculators</h1><p>Browse the biology-related calculators currently available on Friendly Calculator, from animal and plant topics to genetics, molecular biology, lab methods and ecology. Search by calculator name, organism or subject, then open a tool to enter your own assumptions.</p><p><a href="/calculator/site-directory.html#biology-chemistry">See the combined biology and chemistry index →</a></p></section>
<section class="bio-search" aria-labelledby="bio-search-label"><label id="bio-search-label" for="bio-search-input">Search biology calculators</label><div class="bio-search-row"><input id="bio-search-input" type="search" autocomplete="off" placeholder="Try genetics, dog, plant, DNA, soil…" aria-describedby="bio-search-status"><button id="bio-search-clear" type="button">Clear search</button></div><p class="bio-search-status" id="bio-search-status" role="status" aria-live="polite">Browse by topic or search all ${entries.length} listed calculators.</p></section>
<section class="bio-directory" aria-label="Biology calculator subcategories">\n${sections}\n</section><p id="bio-search-empty" class="bio-empty">No calculators match that search. Try another topic or clear the search.</p>
<section class="bio-note"><h2>Scope and responsible use</h2><p>This directory organizes biology-related tools already published in the Friendly Calculator catalogue; it is not a claim to list every biology calculator worldwide. Coverage depends on current catalogue tags and available calculator pages. Results use the assumptions stated by each calculator and may be educational or approximate.</p><p>Animal-health, veterinary, medication, toxicity, nutrition and breeding results are informational only. Confirm health or treatment questions with a qualified veterinarian. Verify laboratory, ecological, agricultural and species-specific assumptions with appropriate scientific or local sources before relying on an estimate.</p></section>
</main><footer class="bio-wrap bio-footer"><a href="/calculator/site-directory.html">All calculators</a><a href="/calculator/methodology.html">Methodology</a><a href="/calculator/disclaimer.html">Disclaimer</a><a href="/calculator/contact.html">Contact</a><p>© Friendly Calculator</p></footer>
<script>
(()=>{'use strict';const input=document.getElementById('bio-search-input'),clear=document.getElementById('bio-search-clear'),status=document.getElementById('bio-search-status'),empty=document.getElementById('bio-search-empty'),groups=[...document.querySelectorAll('.bio-section')],items=[...document.querySelectorAll('.bio-tool')];function filter(){const q=input.value.trim().toLocaleLowerCase();let visible=0;for(const item of items){const match=!q||(item.dataset.search||'').includes(q);item.hidden=!match;if(match)visible++;}for(const group of groups){const has=[...group.querySelectorAll('.bio-tool')].some(item=>!item.hidden);group.hidden=!has;if(q&&has)group.open=true;}empty.style.display=q&&visible===0?'block':'none';const groupCount=groups.filter(group=>!group.hidden).length;status.textContent=q?(visible+' matching calculators across '+groupCount+' topic groups.'):'Browse by topic or search all '+items.length+' listed calculators.';}input.addEventListener('input',filter);clear.addEventListener('click',()=>{input.value='';filter();input.focus();});})();
</script><script src="/assets/site-shell.js" defer></script><script src="/assets/site-chrome.js?v=1" defer></script>
</body></html>\n`;
}

function main() {
  const html = build();
  const count = (html.match(/class="bio-tool"/g) || []).length;
  if (process.argv.includes('--check')) {
    if (!html.includes('Biology &amp; Life-Science Calculators') || count < 100) throw new Error('Generated biology directory is incomplete.');
    console.log(`Biology directory check passed: ${count} calculators.`);
    return;
  }
  fs.mkdirSync(path.dirname(OUTPUT_FILE), {recursive:true});
  fs.writeFileSync(OUTPUT_FILE, html);
  console.log(`Generated ${path.relative(ROOT, OUTPUT_FILE)} with ${count} verified calculator links.`);
}
if (require.main === module) main();
module.exports = {build, biologyEntries, classify, isBiologyEntry};
