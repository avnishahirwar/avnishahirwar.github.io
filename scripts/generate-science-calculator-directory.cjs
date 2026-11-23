#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {biologyEntries} = require('./generate-biology-calculator-directory.cjs');
const {chemistryEntries} = require('./generate-chemistry-calculator-directory.cjs');
const {physicsEntries} = require('./generate-physics-calculator-directory.cjs');

const ROOT = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'assets/calculator-search-index.json');
const OUTPUT_FILE = path.join(ROOT, 'calculator/science-calculators.html');
const SITE_ORIGIN = 'https://friendlycalculator.in';
const PAGE_URL = SITE_ORIGIN + '/calculator/science-calculators.html';
const SUBJECTS = [
  ['physics', 'Physics', 'Physics-based calculators for mechanics, energy, fluids, heat, waves, optics, electricity, modern physics and space.', '/calculator/physics-calculators.html'],
  ['biology', 'Biology & life sciences', 'Biology and applied life-science tools for animals, plants, genetics, molecular biology, laboratory methods and ecology.', '/calculator/biology-calculators.html'],
  ['chemistry', 'Chemistry', 'Chemistry calculators for atoms, reactions, solutions, thermodynamics, kinetics, electrochemistry, analysis and environmental processes.', '/calculator/chemistry-calculators.html'],
  ['ecology', 'Ecology, environment & sustainability', 'Ecology and environmental tools for populations, biodiversity, water, emissions, materials, energy and impact estimates.', ''],
  ['astronomy', 'Astronomy & space', 'Space-science tools for astronomical distances and comparing weight under planetary surface gravity.', '']
];
const SUBJECT_ORDER = new Map(SUBJECTS.map(([id], index) => [id, index]));
const TOPICS = {
  physics: {
    mechanics: 'Mechanics, motion & energy', rotation: 'Rotation, oscillations & gravitation',
    'fluids-materials': 'Fluids, pressure & material properties', thermal: 'Heat, gases & thermodynamics',
    'waves-sound': 'Waves, sound & acoustics', optics: 'Optics, light & imaging',
    'electricity-magnetism': 'Electricity, circuits & magnetism', modern: 'Quantum, nuclear & modern physics',
    'astronomy-space': 'Astronomy, space & geophysics', engineering: 'Aerospace, vehicles & engineering applications',
    'units-measurement': 'Units, constants & measurement', applied: 'Applied & interdisciplinary physics'
  },
  biology: {
    pets: 'Pets, companion animals & veterinary tools', livestock: 'Livestock, breeding & animal production',
    plants: 'Plants, crops, gardens & forestry', genetics: 'Genetics, heredity & molecular biology',
    laboratory: 'Cell biology, biochemistry & laboratory methods', ecology: 'Ecology, environment & field biology',
    other: 'Other biology & applied life-science tools'
  },
  chemistry: {
    atomic: 'Atoms, periodic trends & chemical bonding', stoichiometry: 'Moles, formulae, reactions & stoichiometry',
    solutions: 'Solutions, concentration & acid–base chemistry', thermodynamics: 'Thermodynamics, gases & phase changes',
    kinetics: 'Chemical kinetics, equilibrium & surface chemistry', electrochemistry: 'Electrochemistry, materials & crystallography',
    analytical: 'Analytical, spectroscopy & applied chemistry', environment: 'Environmental, water & process chemistry'
  },
  ecology: {'environmental-science': 'Ecology, environment & sustainability'},
  astronomy: {'space-science': 'Astronomy & space science'}
};
const TOPIC_ORDER = Object.fromEntries(Object.entries(TOPICS).map(([subject, topics]) => [subject, new Map(Object.keys(topics).map((id, index) => [id, index]))]));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

function isSafeCalculatorUrl(url) {
  return url.startsWith('/calculators/') && url.endsWith('.html') && !url.includes('..') && !url.includes('?') && !url.includes('#') && fs.existsSync(path.join(ROOT, url.slice(1)));
}

function scienceEntries() {
  const byUrl = new Map();
  const add = (item, subject, topic) => {
    const url = String(item.url || '');
    if (!isSafeCalculatorUrl(url)) return;
    const entry = {...item, url, subject, topic: TOPICS[subject][topic] ? topic : Object.keys(TOPICS[subject])[0]};
    const previous = byUrl.get(url);
    if (!previous || String(entry.description || '').length > String(previous.description || '').length) byUrl.set(url, entry);
  };

  for (const item of physicsEntries()) add(item, 'physics', item.section);
  for (const item of biologyEntries()) add(item, 'biology', item.section);
  for (const item of chemistryEntries()) add(item, 'chemistry', item.section);

  // These exact catalogue categories are not currently covered by the three subject hubs.
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  for (const item of index) {
    const category = String(item.category || '').trim().toLowerCase();
    if (category === 'ecology') add(item, 'ecology', 'environmental-science');
    if (category === 'astronomy & space') add(item, 'astronomy', 'space-science');
  }

  return [...byUrl.values()].sort((a, b) =>
    SUBJECT_ORDER.get(a.subject) - SUBJECT_ORDER.get(b.subject) ||
    TOPIC_ORDER[a.subject].get(a.topic) - TOPIC_ORDER[b.subject].get(b.topic) ||
    String(a.name || '').localeCompare(String(b.name || ''), 'en') || a.url.localeCompare(b.url));
}

function build() {
  const entries = scienceEntries();
  const subjectMarkup = SUBJECTS.map(([id, title, description, directoryUrl]) => {
    const members = entries.filter(item => item.subject === id);
    if (!members.length) return '';
    const topics = [...new Set(members.map(item => item.topic))];
    const topicMarkup = topics.map(topic => {
      const group = members.filter(item => item.topic === topic);
      const links = group.map(item => {
        const search = `${item.name || ''} ${title} ${TOPICS[id][topic]} ${item.category || ''} ${item.keywords || ''} ${item.description || ''}`.toLocaleLowerCase();
        const detail = item.description || 'Open this calculator to review its inputs, method, units and limitations.';
        return `        <li class="science-tool" data-search="${escapeHtml(search)}"><a href="${escapeHtml(item.url)}">${escapeHtml(item.name || item.url)}</a><p>${escapeHtml(detail)}</p></li>`;
      }).join('\n');
      return `      <details class="science-topic" data-topic="${escapeHtml(topic)}"><summary><span>${escapeHtml(TOPICS[id][topic])}</span><span class="science-count">${group.length} calculators</span></summary><ul class="science-tool-list">\n${links}\n      </ul></details>`;
    }).join('\n');
    const directoryLink = directoryUrl ? ` <a class="subject-hub-link" href="${directoryUrl}">Open the dedicated ${escapeHtml(title)} directory →</a>` : '';
    return `    <details class="science-subject" id="science-${id}" data-subject="${id}"><summary><span>${escapeHtml(title)}</span><span class="science-count">${members.length} calculators</span></summary><p class="science-description">${escapeHtml(description)}${directoryLink}</p>\n${topicMarkup}\n    </details>`;
  }).filter(Boolean).join('\n');
  const topicLinks = SUBJECTS.map(([id, title]) => {
    const count = entries.filter(item => item.subject === id).length;
    return count ? `      <a href="#science-${id}">${escapeHtml(title)} <span>${count}</span></a>` : '';
  }).filter(Boolean).join('\n');
  const date = new Date().toISOString().slice(0, 10);
  const description = `Search ${entries.length} science calculators across physics, biology, chemistry, ecology, environmental science, astronomy and space in one Friendly Calculator directory.`;
  const schema = {'@context':'https://schema.org','@type':'CollectionPage','name':'Science Calculators','url':PAGE_URL,'dateModified':date,'isAccessibleForFree':true,'numberOfItems':entries.length,'description':'A searchable directory of science-related calculators currently available in the Friendly Calculator catalogue.'};
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Science Calculators | Friendly Calculator</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="keywords" content="science calculators, physics calculators, biology calculators, chemistry calculators, ecology calculators, astronomy calculators">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${PAGE_URL}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="website"><meta property="og:site_name" content="Friendly Calculator">
<meta property="og:title" content="Science Calculators | Friendly Calculator">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${PAGE_URL}"><meta property="og:image" content="${SITE_ORIGIN}/og-friendly-calculator.png">
<meta property="og:image:alt" content="Friendly Calculator — online calculators and practical tools">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Science Calculators | Friendly Calculator">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${SITE_ORIGIN}/og-friendly-calculator.png"><meta name="twitter:image:alt" content="Friendly Calculator — online calculators and practical tools">
<link rel="stylesheet" href="/assets/site-shell.css"><link rel="stylesheet" href="/assets/site-chrome.css?v=1">
<style>
:root{--science-ink:#172638;--science-muted:#596b7c;--science-line:#dce4eb;--science-paper:#fff;--science-wash:#f4f7f9;--science-accent:#285d83}
*{box-sizing:border-box}body{margin:0;background:var(--science-wash);color:var(--science-ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
.science-wrap{width:min(1100px,94%);margin:0 auto}.science-nav{padding:16px 0;border-bottom:1px solid var(--science-line);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.science-brand{font-weight:850;text-decoration:none;color:var(--science-ink);letter-spacing:.03em}.science-nav nav{display:flex;gap:14px;flex-wrap:wrap}.science-nav nav a{font-size:.9rem}
.science-hero{padding:30px 0 18px}.science-hero h1{font-size:clamp(1.9rem,4vw,2.8rem);line-height:1.12;margin:8px 0}.science-hero p{max-width:850px;color:var(--science-muted)}.science-kicker{font-size:.78rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--science-accent)}
.science-topics{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 20px}.science-topics a{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--science-line);border-radius:999px;background:#fff;padding:7px 11px;text-decoration:none;font-size:.85rem}.science-topics a span{font-weight:800;color:var(--science-accent)}
.science-search{background:var(--science-paper);border:1px solid var(--science-line);border-radius:12px;padding:18px;margin:10px 0 18px}.science-search label{font-weight:750;display:block;margin-bottom:8px}.science-search-row{display:flex;gap:9px}.science-search input{flex:1;min-width:0;border:1px solid #aebbc7;border-radius:8px;padding:12px;font:inherit}.science-search button{border:0;border-radius:8px;background:var(--science-accent);color:#fff;padding:11px 17px;font:inherit;font-weight:750;cursor:pointer}.science-search-status{font-size:.88rem;color:var(--science-muted);margin:8px 0 0}
.science-directory{display:grid;gap:12px}.science-subject,.science-topic{background:var(--science-paper);border:1px solid var(--science-line);border-radius:12px;overflow:hidden}.science-subject>summary,.science-topic>summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer;padding:15px 18px;font-weight:800;font-size:1.05rem;background:#eaf1f6}.science-subject>summary::-webkit-details-marker,.science-topic>summary::-webkit-details-marker{display:none}.science-subject>summary::before,.science-topic>summary::before{content:"+";color:var(--science-accent);font-size:1.2rem;margin-right:4px}.science-subject[open]>summary::before,.science-topic[open]>summary::before{content:"−"}.science-count{font-size:.78rem;font-weight:700;color:var(--science-muted);white-space:nowrap}.science-description{color:var(--science-muted);margin:0;padding:13px 18px}.subject-hub-link{display:inline-block;margin-left:6px;font-weight:700}.science-topic{margin:0 12px 12px}.science-topic>summary{font-size:.95rem;background:#f4f7f9}.science-tool-list{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px;margin:0;padding:8px 18px 15px}.science-tool{padding:12px 0;border-bottom:1px solid #edf0f3;min-width:0}.science-tool a{font-weight:750;text-decoration:none}.science-tool a:hover{text-decoration:underline}.science-tool p{margin:4px 0 0;color:var(--science-muted);font-size:.86rem}.science-tool[hidden],.science-topic[hidden],.science-subject[hidden]{display:none!important}.science-empty{display:none;background:#fff;border:1px solid var(--science-line);border-radius:10px;padding:18px;color:var(--science-muted)}.science-note{margin:20px 0;background:#fff;border:1px solid var(--science-line);border-radius:12px;padding:18px;color:var(--science-muted);font-size:.9rem}.science-note h2{font-size:1.1rem;margin:0 0 7px;color:var(--science-ink)}.science-note p:last-child{margin-bottom:0}.science-footer{padding:24px 0 34px;color:var(--science-muted);font-size:.88rem}.science-footer a{margin-right:12px}
@media(max-width:650px){.science-search-row{flex-direction:column}.science-search button{width:100%}.science-tool-list{grid-template-columns:1fr}.science-subject>summary,.science-topic>summary{align-items:flex-start}.science-nav{align-items:flex-start;flex-direction:column}}
</style>
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
<header class="science-wrap science-nav"><a class="science-brand" href="/">FRIENDLY CALCULATOR</a><nav aria-label="Main navigation"><a href="/">Home</a><a href="/calculator/site-directory.html">All calculators</a><a href="/calculator/physics-calculators.html">Physics</a><a href="/calculator/biology-calculators.html">Biology</a><a href="/calculator/chemistry-calculators.html">Chemistry</a></nav></header>
<main class="science-wrap">
<section class="science-hero"><p class="science-kicker">Science toolkit · ${entries.length} listed calculators</p><h1>Science Calculators</h1><p>Browse searchable science-related calculators currently available in the Friendly Calculator catalogue. Explore physics, biology and life sciences, chemistry, ecology and environmental tools, plus astronomy and space calculators. Search by calculator, formula or subject.</p><p>This directory brings together published tools; it is not a claim to include every science calculator worldwide.</p></section>
<nav class="science-topics" aria-label="Science subjects">\n${topicLinks}\n</nav>
<section class="science-search" aria-labelledby="science-search-label"><label id="science-search-label" for="science-search-input">Search science calculators</label><div class="science-search-row"><input id="science-search-input" type="search" autocomplete="off" placeholder="Try genetics, stoichiometry, momentum, ecology…" aria-describedby="science-search-status"><button id="science-search-clear" type="button">Clear search</button></div><p class="science-search-status" id="science-search-status" role="status" aria-live="polite">Browse ${entries.length} listed calculators across ${SUBJECTS.length} science subjects.</p></section>
<section class="science-directory" aria-label="Science calculator topics">\n${subjectMarkup}\n</section><p id="science-search-empty" class="science-empty">No calculators match that search. Try another subject or clear the search.</p>
<section class="science-note"><h2>Scope, formula assumptions &amp; educational use</h2><p>This searchable directory organizes science-related calculator pages currently available in the Friendly Calculator catalogue. Coverage depends on the current catalogue and its subject tags; it is not a complete list of tools worldwide. Calculators may use simplified models and assumptions. Review each tool's formula, inputs, units, data sources and stated limitations before using a result.</p><p>These tools are intended for learning and general estimation, not as substitutes for validated laboratory methods, safety procedures, medical or veterinary care, environmental regulation, professional engineering analysis or qualified scientific judgment. Independently verify results before making high-stakes decisions.</p></section>
</main><footer class="science-wrap science-footer"><a href="/calculator/site-directory.html">All calculators</a><a href="/calculator/methodology.html">Methodology</a><a href="/calculator/disclaimer.html">Disclaimer</a><a href="/calculator/contact.html">Contact</a><p>© Friendly Calculator</p></footer>
<script>
(()=>{'use strict';const input=document.getElementById('science-search-input'),clear=document.getElementById('science-search-clear'),status=document.getElementById('science-search-status'),empty=document.getElementById('science-search-empty'),subjects=[...document.querySelectorAll('.science-subject')],topics=[...document.querySelectorAll('.science-topic')],items=[...document.querySelectorAll('.science-tool')];function filter(){const q=input.value.trim().toLocaleLowerCase();let visible=0;for(const item of items){const match=!q||(item.dataset.search||'').includes(q);item.hidden=!match;if(match)visible++;}for(const topic of topics){const has=[...topic.querySelectorAll('.science-tool')].some(item=>!item.hidden);topic.hidden=!has;if(q&&has)topic.open=true;}for(const subject of subjects){const has=[...subject.querySelectorAll('.science-tool')].some(item=>!item.hidden);subject.hidden=!has;if(q&&has)subject.open=true;}empty.style.display=q&&visible===0?'block':'none';const subjectCount=subjects.filter(subject=>!subject.hidden).length;status.textContent=q?(visible+' matching calculators across '+subjectCount+' science subjects.'):'Browse '+items.length+' listed calculators across '+subjects.length+' science subjects.';}input.addEventListener('input',filter);clear.addEventListener('click',()=>{input.value='';filter();input.focus();});})();
</script><script src="/assets/site-shell.js" defer></script><script src="/assets/site-chrome.js?v=1" defer></script>
</body></html>
`;
}

function main() {
  const html = build();
  const count = (html.match(/class="science-tool"/g) || []).length;
  if (process.argv.includes('--check')) {
    if (!html.includes('<h1>Science Calculators</h1>') || count < 600) throw new Error('Generated Science directory is incomplete.');
    console.log(`Science directory check passed: ${count} calculators.`);
    return;
  }
  fs.mkdirSync(path.dirname(OUTPUT_FILE), {recursive:true});
  fs.writeFileSync(OUTPUT_FILE, html);
  console.log(`Generated ${path.relative(ROOT, OUTPUT_FILE)} with ${count} verified calculator links.`);
}
if (require.main === module) main();
module.exports = {build, scienceEntries, isSafeCalculatorUrl};
