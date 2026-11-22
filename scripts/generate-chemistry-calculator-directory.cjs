#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {biologyEntries} = require('./generate-biology-calculator-directory.cjs');

const ROOT = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'assets/calculator-search-index.json');
const OUTPUT_FILE = path.join(ROOT, 'calculator/chemistry-calculators.html');
const SITE_ORIGIN = 'https://friendlycalculator.in';
const PAGE_URL = SITE_ORIGIN + '/calculator/chemistry-calculators.html';
const SECTIONS = [
  ['atomic', 'Atoms, periodic trends & chemical bonding', 'Explore atomic structure, electron configuration, periodic trends, molecular formulae and bonding calculations.'],
  ['stoichiometry', 'Moles, formulae, reactions & stoichiometry', 'Convert amounts and compositions, balance reactions, and estimate reactants, products and yields.'],
  ['solutions', 'Solutions, concentration & acid–base chemistry', 'Work with solution preparation, concentration units, pH, buffers, neutralization and related properties.'],
  ['thermodynamics', 'Thermodynamics, gases & phase changes', 'Compare gas, solution and phase properties, including heat, energy, entropy and vapor-pressure calculations.'],
  ['kinetics', 'Chemical kinetics, equilibrium & surface chemistry', 'Explore reaction rates, equilibrium, activation energy, radioactive change and adsorption models.'],
  ['electrochemistry', 'Electrochemistry, materials & crystallography', 'Browse electrochemical cells, electrolysis, crystal structures, lattice properties and surface-tension relations.'],
  ['analytical', 'Analytical, spectroscopy & applied chemistry', 'Use spectroscopy, calibration, chemical identification and other analytical or laboratory chemistry tools.'],
  ['environment', 'Environmental, water & process chemistry', 'Estimate water-quality, wastewater, residence-time and industrial or environmental process quantities.']
];
const SECTION_ORDER = new Map(SECTIONS.map(([id], index) => [id, index]));
const CHEMISTRY_MIXED_TOOL = /activation energy|activity coefficient|actual yield|air.?fuel ratio|alligation|arrhenius|atom calculator|atom economy|atomic mass|average atomic mass|avogadro|beer.?lambert|bleach dilution|boiling point|bond order|buffer capacity|buffer pH|calibration curve|cell emf|chemical|combustion|concentration calculator|cubic cell|degree of unsaturation|detention time|diffusion coefficient|dilution factor|double bond equivalent|effective nuclear charge|electrolysis|electron configuration|electronegativity|empirical formula|entropy calculator|equilibrium constant|freezing point depression|gibbs|grams to moles|half.life|heat of combustion|henderson|hydraulic retention time|hydrogen ion|ionic strength|kp calculator|langmuir|lattice energy|liquid ethylene density|mass concentration|mass percent|miller indices|mixing ratio|molality|molar mass|molar ratio|molarity|mole calculator|mole fraction|molecular weight|moles to atoms|net ionic equation|nernst|neutralization|normality|osmotic pressure|partial pressure|percent composition|percent ionic character|percent solution|percent yield|ph calculator|pka calculator|ppm to molarity|q10 calculator|radioactive decay|radiocarbon dating|raoult|rate constant|rate of effusion|reaction quotient|reconstitution|residence time|resuspension|saponification|serial dilution|solution dilution|theoretical yield|titration|two.photon absorption|vapor pressure|water hardness|young.?laplace/i;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

function classify(item) {
  const text = `${item.name || ''} ${item.keywords || ''} ${item.description || ''}`.toLowerCase();
  if (/chemical oxygen demand|crude protein|detention time|hydraulic retention|residence time|wastewater|water hardness/.test(text)) return 'environment';
  if (/cell emf|electrolysis|lattice energy|miller indices|cubic cell|young.?laplace|two.photon absorption/.test(text)) return 'electrochemistry';
  if (/activation energy|activity coefficient|arrhenius|diffusion coefficient|equilibrium|half.life|langmuir|q10|radioactive decay|radiocarbon|rate constant|rate of effusion|reaction quotient/.test(text)) return 'kinetics';
  if (/boiling point|entropy|freezing point|gibbs|heat of combustion|molar mass of gas|osmotic pressure|partial pressure|raoult|vapor pressure|liquid ethylene|phase rule/.test(text)) return 'thermodynamics';
  if (/buffer|concentration|dilution|hydrogen ion|ionic strength|molarity|molality|mixing ratio|mole fraction|neutralization|normality|pka|ph calculator|ppm|reconstitution|resuspension|solution|titration|alligation|water hardness/.test(text)) return 'solutions';
  if (/actual yield|air.?fuel|atom economy|chemical equation|ionic equation|combustion|grams to moles|molar mass|molar ratio|mole calculator|moles to atoms|molecular weight|percent composition|percent yield|saponification|theoretical yield/.test(text)) return 'stoichiometry';
  if (/beer.?lambert|calibration curve|chemical name|electron configuration quiz|protein solubility/.test(text)) return 'analytical';
  return 'atomic';
}

function isChemistryEntry(item, biologyUrls = new Set(biologyEntries().map(entry => entry.url))) {
  const category = String(item.category || '').trim().toLowerCase();
  if (category !== 'chemistry' && category !== 'biology & chemistry') return false;
  const url = String(item.url || '');
  if (biologyUrls.has(url)) return false;
  return category === 'chemistry' || CHEMISTRY_MIXED_TOOL.test(String(item.name || ''));
}

function chemistryEntries() {
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  const biologyUrls = new Set(biologyEntries().map(entry => entry.url));
  const byUrl = new Map();
  for (const item of index) {
    if (!isChemistryEntry(item, biologyUrls)) continue;
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
  const entries = chemistryEntries();
  const sections = SECTIONS.map(([id, title, description]) => {
    const members = entries.filter(item => item.section === id);
    if (!members.length) return '';
    const links = members.map(item => {
      const search = `${item.name} ${item.category} ${item.keywords || ''} ${item.description || ''}`.toLocaleLowerCase();
      return `      <li class="chem-tool" data-search="${escapeHtml(search)}"><a href="${escapeHtml(item.url)}">${escapeHtml(item.name)}</a><p>${escapeHtml(item.description || 'Open this calculator to enter your own values and review its assumptions.')}</p></li>`;
    }).join('\n');
    return `    <details class="chem-section" data-section="${id}"><summary><span>${escapeHtml(title)}</span><span class="section-count">${members.length} tools</span></summary><p class="section-description">${escapeHtml(description)}</p><ul class="chem-tool-list">\n${links}\n    </ul></details>`;
  }).filter(Boolean).join('\n');
  const date = new Date().toISOString().slice(0, 10);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Chemistry Calculators | Friendly Calculator</title>
<meta name="description" content="Search a categorized directory of chemistry calculators for atoms, stoichiometry, solutions, acid–base chemistry, thermodynamics, kinetics, electrochemistry and analytical chemistry.">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${PAGE_URL}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="website"><meta property="og:site_name" content="Friendly Calculator">
<meta property="og:title" content="Chemistry Calculators | Friendly Calculator">
<meta property="og:description" content="Search chemistry calculators grouped by atoms, reactions, solutions, thermodynamics, kinetics, electrochemistry and analytical topics.">
<meta property="og:url" content="${PAGE_URL}"><meta property="og:image" content="${SITE_ORIGIN}/og-friendly-calculator.png">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Chemistry Calculators | Friendly Calculator">
<meta name="twitter:description" content="Browse chemistry calculators by topic.">
<meta property="og:image:alt" content="Friendly Calculator — online calculators and practical tools">
<meta name="twitter:image" content="${SITE_ORIGIN}/og-friendly-calculator.png"><meta name="twitter:image:alt" content="Friendly Calculator — online calculators and practical tools">
<link rel="stylesheet" href="/assets/site-shell.css"><link rel="stylesheet" href="/assets/site-chrome.css?v=1">
<style>
:root{--chem-ink:#172638;--chem-muted:#596b7c;--chem-line:#dce4eb;--chem-paper:#fff;--chem-wash:#f4f7f9;--chem-accent:#176b78}
*{box-sizing:border-box}body{margin:0;background:var(--chem-wash);color:var(--chem-ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
.chem-wrap{width:min(1100px,94%);margin:0 auto}.chem-nav{padding:16px 0;border-bottom:1px solid var(--chem-line);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.chem-brand{font-weight:850;text-decoration:none;color:var(--chem-ink);letter-spacing:.03em}.chem-nav nav{display:flex;gap:14px;flex-wrap:wrap}.chem-nav nav a{font-size:.9rem}
.chem-hero{padding:30px 0 18px}.chem-hero h1{font-size:clamp(1.9rem,4vw,2.8rem);line-height:1.12;margin:8px 0}.chem-hero p{max-width:850px;color:var(--chem-muted)}.chem-kicker{font-size:.78rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--chem-accent)}
.chem-search{background:var(--chem-paper);border:1px solid var(--chem-line);border-radius:12px;padding:18px;margin:10px 0 18px}.chem-search label{font-weight:750;display:block;margin-bottom:8px}.chem-search-row{display:flex;gap:9px}.chem-search input{flex:1;min-width:0;border:1px solid #aebbc7;border-radius:8px;padding:12px;font:inherit}.chem-search button{border:0;border-radius:8px;background:var(--chem-accent);color:#fff;padding:11px 17px;font:inherit;font-weight:750;cursor:pointer}.chem-search-status{font-size:.88rem;color:var(--chem-muted);margin:8px 0 0}
.chem-directory{display:grid;gap:12px}.chem-section{background:var(--chem-paper);border:1px solid var(--chem-line);border-radius:12px;overflow:hidden}.chem-section>summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer;padding:15px 18px;font-weight:800;font-size:1.05rem;background:#e8f3f4}.chem-section>summary::-webkit-details-marker{display:none}.chem-section>summary::before{content:"+";color:var(--chem-accent);font-size:1.2rem;margin-right:4px}.chem-section[open]>summary::before{content:"−"}.section-count{font-size:.78rem;font-weight:700;color:var(--chem-muted);white-space:nowrap}.section-description{color:var(--chem-muted);margin:0;padding:13px 18px 0}.chem-tool-list{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px;margin:0;padding:8px 18px 15px}.chem-tool{padding:12px 0;border-bottom:1px solid #edf0f3;min-width:0}.chem-tool a{font-weight:750;text-decoration:none}.chem-tool a:hover{text-decoration:underline}.chem-tool p{margin:4px 0 0;color:var(--chem-muted);font-size:.86rem}.chem-tool[hidden],.chem-section[hidden]{display:none!important}.chem-empty{display:none;background:white;border:1px solid var(--chem-line);border-radius:10px;padding:18px;color:var(--chem-muted)}.chem-note{margin:20px 0;background:#fff;border:1px solid var(--chem-line);border-radius:12px;padding:18px;color:var(--chem-muted);font-size:.9rem}.chem-note h2{font-size:1.1rem;margin:0 0 7px;color:var(--chem-ink)}.chem-note p:last-child{margin-bottom:0}.chem-footer{padding:24px 0 34px;color:var(--chem-muted);font-size:.88rem}.chem-footer a{margin-right:12px}
@media(max-width:650px){.chem-search-row{flex-direction:column}.chem-search button{width:100%}.chem-tool-list{grid-template-columns:1fr}.chem-section>summary{align-items:flex-start}.chem-nav{align-items:flex-start;flex-direction:column}}
</style>
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage','name':'Chemistry Calculators','url':PAGE_URL,'dateModified':date,'isAccessibleForFree':true,'description':'A searchable directory of chemistry calculators from the Friendly Calculator catalogue.'})}</script>
</head>
<body>
<header class="chem-wrap chem-nav"><a class="chem-brand" href="/">FRIENDLY CALCULATOR</a><nav aria-label="Main navigation"><a href="/">Home</a><a href="/calculator/site-directory.html">All calculators</a><a href="/calculator/biology-calculators.html">Biology</a><a href="/calculator/money-calculators.html">Money &amp; finance</a><a href="/calculator/finance-calculators.html">Finance overview</a></nav></header>
<main class="chem-wrap">
<section class="chem-hero"><p class="chem-kicker">Chemistry toolkit · ${entries.length} listed calculators</p><h1>Chemistry Calculators</h1><p>Browse chemistry-focused calculators currently available in the Friendly Calculator catalogue, grouped into searchable topics. Find tools for atoms, reactions, stoichiometry, solutions, acid–base chemistry, thermodynamics, kinetics, electrochemistry, analysis and environmental processes.</p><p><a href="/calculator/site-directory.html#biology-chemistry">See the combined biology and chemistry index →</a></p></section>
<section class="chem-search" aria-labelledby="chem-search-label"><label id="chem-search-label" for="chem-search-input">Search chemistry calculators</label><div class="chem-search-row"><input id="chem-search-input" type="search" autocomplete="off" placeholder="Try molarity, equilibrium, atoms, pH…" aria-describedby="chem-search-status"><button id="chem-search-clear" type="button">Clear search</button></div><p class="chem-search-status" id="chem-search-status" role="status" aria-live="polite">Browse by topic or search all ${entries.length} listed calculators.</p></section>
<section class="chem-directory" aria-label="Chemistry calculator subcategories">\n${sections}\n</section><p id="chem-search-empty" class="chem-empty">No calculators match that search. Try another topic or clear the search.</p>
<section class="chem-note"><h2>Scope and responsible use</h2><p>This directory organizes chemistry-related tools already available in the Friendly Calculator catalogue; it is not a claim to include every chemistry calculator worldwide. Coverage depends on the current catalogue and available calculator pages. Each calculator's assumptions, units and limitations apply to its results.</p><p>Educational and laboratory estimates should be checked against suitable references and experimental conditions. Do not use an estimate as a substitute for required safety procedures, validated analytical methods, regulatory standards or qualified professional judgment.</p></section>
</main><footer class="chem-wrap chem-footer"><a href="/calculator/site-directory.html">All calculators</a><a href="/calculator/methodology.html">Methodology</a><a href="/calculator/disclaimer.html">Disclaimer</a><a href="/calculator/contact.html">Contact</a><p>© Friendly Calculator</p></footer>
<script>
(()=>{'use strict';const input=document.getElementById('chem-search-input'),clear=document.getElementById('chem-search-clear'),status=document.getElementById('chem-search-status'),empty=document.getElementById('chem-search-empty'),groups=[...document.querySelectorAll('.chem-section')],items=[...document.querySelectorAll('.chem-tool')];function filter(){const q=input.value.trim().toLocaleLowerCase();let visible=0;for(const item of items){const match=!q||(item.dataset.search||'').includes(q);item.hidden=!match;if(match)visible++;}for(const group of groups){const has=[...group.querySelectorAll('.chem-tool')].some(item=>!item.hidden);group.hidden=!has;if(q&&has)group.open=true;}empty.style.display=q&&visible===0?'block':'none';const groupCount=groups.filter(group=>!group.hidden).length;status.textContent=q?(visible+' matching calculators across '+groupCount+' topic groups.'):'Browse by topic or search all '+items.length+' listed calculators.';}input.addEventListener('input',filter);clear.addEventListener('click',()=>{input.value='';filter();input.focus();});})();
</script><script src="/assets/site-shell.js" defer></script><script src="/assets/site-chrome.js?v=1" defer></script>
</body></html>
`;
}

function main() {
  const html = build();
  const count = (html.match(/class="chem-tool"/g) || []).length;
  if (process.argv.includes('--check')) {
    if (!html.includes('Chemistry Calculators</h1>') || count < 100) throw new Error('Generated chemistry directory is incomplete.');
    console.log(`Chemistry directory check passed: ${count} calculators.`);
    return;
  }
  fs.mkdirSync(path.dirname(OUTPUT_FILE), {recursive:true});
  fs.writeFileSync(OUTPUT_FILE, html);
  console.log(`Generated ${path.relative(ROOT, OUTPUT_FILE)} with ${count} verified calculator links.`);
}
if (require.main === module) main();
module.exports = {build, chemistryEntries, classify, isChemistryEntry};
