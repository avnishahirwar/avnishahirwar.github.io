#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'assets/calculator-search-index.json');
const OUTPUT_FILE = path.join(ROOT, 'calculator/economic-calculators.html');
const GROUPS = [
  ['macro', 'Macroeconomics & national output', 'Explore GDP measures, economic gaps, money circulation and broad economic indicators.'],
  ['prices', 'Inflation, prices & real rates', 'Compare price-level changes, inflation-adjusted values and the relationship between nominal and real rates.'],
  ['money', 'Money supply & economic multipliers', 'Review money supply, money creation, circulation velocity and multiplier concepts.'],
  ['markets', 'Markets, demand & production', 'Work with elasticity, consumer surplus, marginal costs and revenues, and opportunity cost.'],
  ['labor', 'Labor, productivity & employment', 'Explore workforce participation, productivity and unemployment measures.'],
  ['business', 'Business economics & resource decisions', 'Estimate economic profit, value added and order quantities using stated assumptions.'],
  ['distribution', 'Income distribution & inequality', 'Calculate a summary measure of income distribution and inequality.']
];
const GROUP_ORDER = new Map(GROUPS.map(([id], i) => [id, i]));
const ECONOMIC_NAME = /^(?:consumer surplus calculator|cross price elasticity calculator|economic profit calculator|economic value added calculator|eoq calculator \(economic order quantity\)|fisher equation calculator|gdp deflator formula calculator|gdp gap calculator|gdp per capita calculator|gini coefficient calculator|income elasticity of demand calculator|inflation calculator|labor force participation rate calculator|marginal cost calculator|marginal revenue calculator|money multiplier calculator|money supply calculator|natural rate of unemployment calculator|opportunity cost calculator|price elasticity of demand calculator|price elasticity of supply calculator|productivity calculator|real gdp calculator|real interest rate calculator|salary inflation calculator|spending multiplier calculator|unemployment rate calculator|velocity of money calculator)$/i;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

function classify(item) {
  const name = String(item.name || '').toLowerCase();
  if (/^(gdp|gini|velocity of money|spending multiplier|money multiplier|money supply)/.test(name)) return name.startsWith('gini') ? 'distribution' : 'macro';
  if (/inflation|fisher equation|real interest rate/.test(name)) return 'prices';
  if (/consumer surplus|elasticity|marginal cost|marginal revenue|opportunity cost/.test(name)) return 'markets';
  if (/labor force|unemployment|productivity/.test(name)) return 'labor';
  if (/economic profit|economic value added|eoq/.test(name)) return 'business';
  return 'macro';
}
function economicEntries() {
  const catalogue = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  const unique = new Map();
  for (const item of catalogue) {
    if (!ECONOMIC_NAME.test(String(item.name || '').trim())) continue;
    const url = String(item.url || '');
    if (!(url.startsWith('/calculators/') || url.startsWith('/international/')) ||
        !url.endsWith('.html') || url.includes('..') || url.includes('?') || url.includes('#')) continue;
    if (!fs.existsSync(path.join(ROOT, url.slice(1)))) continue;
    const entry = {...item, url, group: classify(item)};
    const old = unique.get(url);
    if (!old || String(entry.description || '').length > String(old.description || '').length) unique.set(url, entry);
  }
  return [...unique.values()].sort((a, b) =>
    GROUP_ORDER.get(a.group) - GROUP_ORDER.get(b.group) ||
    String(a.name).localeCompare(String(b.name), 'en') || a.url.localeCompare(b.url)
  );
}
function build() {
  const entries = economicEntries();
  const sections = GROUPS.map(([id, title, description]) => {
    const members = entries.filter(entry => entry.group === id);
    if (!members.length) return '';
    const links = members.map(entry => {
      const terms = `${entry.name} ${entry.category || ''} ${entry.keywords || ''} ${entry.description || ''}`.toLowerCase();
      return `      <li class="econ-tool" data-search="${escapeHtml(terms)}"><a href="${escapeHtml(entry.url)}">${escapeHtml(entry.name)}</a><p>${escapeHtml(entry.description || 'Open this calculator to enter your own values and review its assumptions.')}</p></li>`;
    }).join('\n');
    return `    <details class="econ-category" data-category="${id}"><summary><span>${escapeHtml(title)}</span><span class="category-count">${members.length} tools</span></summary><p class="category-description">${escapeHtml(description)}</p><ul class="econ-tool-list">\n${links}\n    </ul></details>`;
  }).filter(Boolean).join('\n');
  const date = new Date().toISOString().slice(0, 10);
  const title = 'Economics Calculators | Friendly Calculator';
  const canonical = 'https://friendlycalculator.in/calculator/economic-calculators.html';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="Browse a searchable directory of economics calculators for GDP, inflation, money supply, demand, elasticity, labor and business economics.">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${canonical}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="website"><meta property="og:site_name" content="Friendly Calculator"><meta property="og:title" content="${title}">
<meta property="og:description" content="Search economics calculators for macroeconomic indicators, inflation, money, markets, labor and business decisions."><meta property="og:url" content="${canonical}">
<meta property="og:image" content="https://friendlycalculator.in/og-friendly-calculator.png">
<meta property="og:image:alt" content="Friendly Calculator — online calculators and practical tools">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="Browse economics calculators by topic and search the current site directory.">
<meta name="twitter:image" content="https://friendlycalculator.in/og-friendly-calculator.png">
<meta name="twitter:image:alt" content="Friendly Calculator — online calculators and practical tools">
<link rel="stylesheet" href="/assets/site-shell.css"><link rel="stylesheet" href="/assets/site-chrome.css?v=1">
<style>
:root{--econ-ink:#172638;--econ-muted:#596b7c;--econ-line:#dce4eb;--econ-paper:#fff;--econ-wash:#f4f7f9;--econ-accent:#174f82}
*{box-sizing:border-box}body{margin:0;background:var(--econ-wash);color:var(--econ-ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
.econ-wrap{width:min(1100px,94%);margin:0 auto}.econ-nav{padding:16px 0;border-bottom:1px solid var(--econ-line);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.econ-brand{font-weight:850;text-decoration:none;color:var(--econ-ink);letter-spacing:.03em}.econ-nav nav{display:flex;gap:14px;flex-wrap:wrap}.econ-nav nav a{font-size:.9rem}
.econ-hero{padding:30px 0 18px}.econ-hero h1{font-size:clamp(1.9rem,4vw,2.8rem);line-height:1.12;margin:8px 0}.econ-hero p{max-width:850px;color:var(--econ-muted)}.econ-kicker{font-size:.78rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--econ-accent)}
.econ-search{background:var(--econ-paper);border:1px solid var(--econ-line);border-radius:12px;padding:18px;margin:10px 0 18px}.econ-search label{font-weight:750;display:block;margin-bottom:8px}.econ-search-row{display:flex;gap:9px}.econ-search input{flex:1;min-width:0;border:1px solid #aebbc7;border-radius:8px;padding:12px;font:inherit}.econ-search button{border:0;border-radius:8px;background:var(--econ-accent);color:#fff;padding:11px 17px;font:inherit;font-weight:750;cursor:pointer}.econ-search-status{font-size:.88rem;color:var(--econ-muted);margin:8px 0 0}
.econ-directory{display:grid;gap:12px}.econ-category{background:var(--econ-paper);border:1px solid var(--econ-line);border-radius:12px;overflow:hidden}.econ-category>summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer;padding:15px 18px;font-weight:800;font-size:1.05rem;background:#edf3f7}.econ-category>summary::-webkit-details-marker{display:none}.econ-category>summary::before{content:"+";color:var(--econ-accent);font-size:1.2rem;margin-right:4px}.econ-category[open]>summary::before{content:"−"}.category-count{font-size:.78rem;font-weight:700;color:var(--econ-muted);white-space:nowrap}.category-description{color:var(--econ-muted);margin:0;padding:13px 18px 0}.econ-tool-list{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px;margin:0;padding:8px 18px 15px}.econ-tool{padding:12px 0;border-bottom:1px solid #edf0f3;min-width:0}.econ-tool a{font-weight:750;text-decoration:none}.econ-tool a:hover{text-decoration:underline}.econ-tool p{margin:4px 0 0;color:var(--econ-muted);font-size:.86rem}.econ-tool[hidden],.econ-category[hidden]{display:none!important}.econ-empty{display:none;background:white;border:1px solid var(--econ-line);border-radius:10px;padding:18px;color:var(--econ-muted)}.econ-note{margin:20px 0;background:#fff;border:1px solid var(--econ-line);border-radius:12px;padding:18px;color:var(--econ-muted);font-size:.9rem}.econ-note h2{font-size:1.1rem;margin:0 0 7px;color:var(--econ-ink)}.econ-footer{padding:24px 0 34px;color:var(--econ-muted);font-size:.88rem}.econ-footer a{margin-right:12px}
@media(max-width:650px){.econ-search-row{flex-direction:column}.econ-search button{width:100%}.econ-tool-list{grid-template-columns:1fr}.econ-category>summary{align-items:flex-start}.econ-nav{align-items:flex-start;flex-direction:column}}
</style>
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage','name':'Economics Calculators','url':canonical,'dateModified':date,'isAccessibleForFree':true,'description':'A searchable directory of economics calculators currently available on Friendly Calculator.'})}</script>
</head>
<body>
<header class="econ-wrap econ-nav"><a class="econ-brand" href="/">FRIENDLY CALCULATOR</a><nav aria-label="Main navigation"><a href="/">Home</a><a href="/calculator/finance-calculators.html">Finance overview</a><a href="/calculator/money-calculators.html">Money directory</a><a href="/calculator/site-directory.html">All calculators</a></nav></header>
<main class="econ-wrap">
<section class="econ-hero"><p class="econ-kicker">Economics toolkit · ${entries.length} listed calculators</p><h1>Economics Calculators</h1><p>Explore economics calculators currently available in the Friendly Calculator catalogue, from GDP and inflation measures to markets, labor, money supply and business decisions. Search by calculator name, topic or keyword, then open a tool to enter your own assumptions.</p><p><a href="/calculator/site-directory.html">Browse all calculator categories →</a></p></section>
<section class="econ-search" aria-labelledby="econ-search-label"><label id="econ-search-label" for="econ-search-input">Search economics calculators</label><div class="econ-search-row"><input id="econ-search-input" type="search" autocomplete="off" placeholder="Try GDP, elasticity, inflation, unemployment…" aria-describedby="econ-search-status"><button id="econ-search-clear" type="button">Clear search</button></div><p class="econ-search-status" id="econ-search-status" role="status" aria-live="polite">Browse by topic or search all ${entries.length} listed calculators.</p></section>
<section class="econ-directory" aria-label="Economics calculator categories">\n${sections}\n</section><p id="econ-search-empty" class="econ-empty">No calculators match that search. Try another topic or clear the search.</p>
<section class="econ-note"><h2>Interpret estimates with context</h2><p>This directory contains economics-focused tools currently available on this website, not every calculator worldwide. Results depend on the inputs, definitions, units, data and assumptions used by each tool. Economic indicators and institutional definitions may vary by country and period; compare like-for-like measures and consult authoritative statistics when precision matters.</p><p>Calculators are educational estimates, not a substitute for official statistical releases, professional economic analysis or policy advice.</p></section>
</main><footer class="econ-wrap econ-footer"><a href="/calculator/site-directory.html">All calculators</a><a href="/calculator/methodology.html">Methodology</a><a href="/calculator/disclaimer.html">Disclaimer</a><a href="/calculator/contact.html">Contact</a><p>© Friendly Calculator</p></footer>
<script>
(()=>{'use strict';const input=document.getElementById('econ-search-input'),clear=document.getElementById('econ-search-clear'),status=document.getElementById('econ-search-status'),empty=document.getElementById('econ-search-empty'),groups=[...document.querySelectorAll('.econ-category')],items=[...document.querySelectorAll('.econ-tool')];function filter(){const q=input.value.trim().toLocaleLowerCase();let visible=0;for(const item of items){const match=!q||(item.dataset.search||'').includes(q);item.hidden=!match;if(match)visible++;}for(const group of groups){const has=[...group.querySelectorAll('.econ-tool')].some(item=>!item.hidden);group.hidden=!has;if(q&&has)group.open=true;}empty.style.display=q&&visible===0?'block':'none';const groupCount=groups.filter(group=>!group.hidden).length;status.textContent=q?(visible+' matching calculators across '+groupCount+' topic groups.'):'Browse by topic or search all '+items.length+' listed calculators.';}input.addEventListener('input',filter);clear.addEventListener('click',()=>{input.value='';filter();input.focus();});})();
</script><script src="/assets/site-shell.js" defer></script><script src="/assets/site-chrome.js?v=1" defer></script>
</body></html>\n`;
}
function main() {
  const html = build();
  const count = (html.match(/class="econ-tool"/g) || []).length;
  if (process.argv.includes('--check')) {
    if (!html.includes('Economics Calculators</h1>') || count < 20) throw new Error('Generated economics directory is incomplete.');
    console.log(`Economics directory check passed: ${count} calculators.`);
    return;
  }
  fs.mkdirSync(path.dirname(OUTPUT_FILE), {recursive: true});
  fs.writeFileSync(OUTPUT_FILE, html);
  console.log(`Generated ${path.relative(ROOT, OUTPUT_FILE)} with ${count} verified calculator links.`);
}
if (require.main === module) main();
module.exports = {build, economicEntries, classify};
