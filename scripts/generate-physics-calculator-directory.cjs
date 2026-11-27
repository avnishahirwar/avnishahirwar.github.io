#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'assets/calculator-search-index.json');
const SITE_DIRECTORY_FILE = path.join(ROOT, 'calculator/site-directory.html');
const OUTPUT_FILE = path.join(ROOT, 'calculator/physics-calculators.html');
const SITE_ORIGIN = 'https://friendlycalculator.in';
const PAGE_URL = SITE_ORIGIN + '/calculator/physics-calculators.html';
const SECTIONS = [
  ['mechanics', 'Mechanics, motion & energy', 'Explore motion, force, momentum, energy, springs, projectile motion and related classical mechanics.'],
  ['rotation', 'Rotation, oscillations & gravitation', 'Browse rotational motion, angular quantities, pendulums, oscillations and gravity models.'],
  ['fluids-materials', 'Fluids, pressure & material properties', 'Find fluid flow, pressure, buoyancy, density, elasticity, strength and material-property tools.'],
  ['thermal', 'Heat, gases & thermodynamics', 'Work with temperature, heat transfer, gas laws, thermal properties and thermodynamic relations.'],
  ['waves-sound', 'Waves, sound & acoustics', 'Calculate wave properties, sound speed, acoustics, resonance and frequency relationships.'],
  ['optics', 'Optics, light & imaging', 'Explore lenses, refraction, reflection, diffraction, optical resolution and light behavior.'],
  ['electricity-magnetism', 'Electricity, circuits & magnetism', 'Use tools for circuits, electrical quantities, components, magnetic fields and electromagnetic effects.'],
  ['modern', 'Quantum, nuclear & modern physics', 'Browse atomic, quantum, nuclear, radiation and relativity-related calculations.'],
  ['astronomy-space', 'Astronomy, space & geophysics', 'Explore astronomical scales, celestial objects, planetary quantities and space-related models.'],
  ['engineering', 'Aerospace, vehicles & engineering applications', 'Browse physical models for propulsion, flight, vehicles, structural design and engineering systems.'],
  ['units-measurement', 'Units, constants & measurement', 'Convert physics units and work with constants, measurement scales and related quantities.'],
  ['applied', 'Applied & interdisciplinary physics', 'Find additional experimental, communications and interdisciplinary tools from the physics catalogue.']
];
const SECTION_ORDER = new Map(SECTIONS.map(([id], index) => [id, index]));
const SUPPLEMENTAL_ROUTES = new Set([
  '/calculators/current-divider-calculator.html',
  '/calculators/elastic-constants-calculator.html',
  '/calculators/impulse-and-momentum-calculator.html',
  '/calculators/light-year-conversion.html',
  '/calculators/projectile-time-of-flight-calculator.html'
]);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

function decodeHtml(value) {
  return String(value ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/gi, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function readAttributes(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function pageMetadata(url) {
  const html = fs.readFileSync(path.join(ROOT, url.slice(1)), 'utf8');
  const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleTag ? decodeHtml(titleTag[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()).split(/\s*[|–—]\s*/)[0] : '';
  const descriptionTag = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0])
    .find(tag => (readAttributes(tag).name || '').toLowerCase() === 'description');
  const description = descriptionTag ? readAttributes(descriptionTag).content || '' : '';
  return {name: title, description};
}

function classify(item) {
  const text = `${item.name || ''} ${item.url || ''} ${item.keywords || ''} ${item.description || ''}`.toLowerCase();
  if (/quantum|nuclear|radioactiv|half.life|bohr model|schwarzschild|relativit|photoelectric|compton|de broglie|planck constant|mass.energy|electronvolt|photon energy|radiation dose|barn.pole|bug.rivet|length contraction|gravitational time dilation|boltzmann factor|cyclotron|fermi level|rydberg|excess electron|intrinsic carrier|debye length/.test(text)) return 'modern';
  if (/astronom|cosmolog|alien civilization|black hole|planet|stellar|star formation|light.year|kepler|drake equation|escape velocity|redshift|solar system|celestial|space telescope|earth curvature|orbital period|earth orbit|parallax|synodic|sunrise|sunset|daylight|distance to horizon|radar horizon|cloud base|coriolis|elongation calculator/.test(text)) return 'astronomy-space';
  if (/electric|circuit|voltage|current|ohm|resistor|capacitor|capacitance|inductor|inductance|wire size|wire gauge|wattage|amp to|watts to amps|power factor|power dissipation|battery|magnet|magnetic|electromagnet|lorentz|solenoid|transformer|rectifier|boost converter|buck converter|motor|generator|electrical conductivity|electrical resistance|current divider|dipole moment|hall coefficient|conductivity to resistivity|excess electron|mosfet|diode|transistor|filter calculator|reactance|impedance|skin depth|kva to amperage|watt calculator|internal resistance/.test(text)) return 'electricity-magnetism';
  if (/optics|optical|lens|mirror|refraction|refract|incidence|reflection|reflect|diffraction|snell|focal length|aperture|angular resolution|magnification|diopter|light intensity|illumination|laser|fiber optic|polariz|rayleigh criterion|binocular|malus law|projector|telescope|watts to lux|frequency of light|inverse square law/.test(text)) return 'optics';
  if (/alfven|alfvén|wave|sound|acoustic|wavelength|beat frequency|frequency calculator|doppler|resonance|harmonic|sonic|ultrasonic|sound pressure|attenuation|reverberation|frequency bandwidth|free space path loss|fresnel zone|modulation|noise figure|signal.to.noise|insertion loss|antenna|radio horizon|radar|transmission calculator|db gain|helmholtz resonator/.test(text)) return 'waves-sound';
  if (/thermodynam|thermal|heat|temperature|gas law|boyle|charles law|gay.lussac|calorim|specific heat|heat transfer|entropy|enthalpy|black.?body|cooling|conduction|convection|radiation|btu to tons|steam table|dew point|carnot|effectiveness.ntu|ideal gas|mean free path|mixed air|mixing ratio of air|nusselt|prandtl number|psychrometric|stefan.boltzmann|van der waals|isentropic flow/.test(text)) return 'thermal';
  if (/fluid|pressure|density|buoy|archimedes|viscos|reynolds|bernoulli|weir|flow rate|flow calculator|cv flow|hydraulic|elastic constant|elastic mod|young.?s mod|bulk mod|shear mod|poisson|stress|strain|hardness|brinell|buckling|angle of repose|surface tension|capillary|material|beam deflection|bending|manometer|darcy.weisbach|froude|knudsen|npsh|open channel|porosity|permeability|coefficient of discharge|drag equation|lift coefficient|carburetor|exhaust diameter|fan calculator|pump horsepower/.test(text)) return 'fluids-materials';
  if (/aerospace|aircraft|aviation|rocket|propulsion|vehicle|car jump|carburetor|crawl ratio|engine displacement|exhaust diameter|gas turbine|jet engine|lift coefficient|oblique shock|prandtl meyer|prop pitch|prop slip|quarter mile|wind correction|wing loading|delta v|space travel|ufo travel|transmission calculator|blast radius|tnt equivalent|twist rate|factor of safety|diametral pitch|shaft size|helical coil|impact test|stiffness matrix|moisture content/.test(text)) return 'engineering';
  if (/angular|rotation|rotational|torque|centripetal|centrifugal|moment of inertia|pendulum|oscillat|circular motion|spin|revolution|rpm|gyroscopic|gravitational force|gravity calculator|g.force|angle of twist|critical damping|damping ratio|natural frequency|torsional stiffness|rolling resistance|fulcrum|displacement calculator|reaction time|suvat|quarter mile|car jump distance/.test(text)) return 'rotation';
  if (/motion|acceleration|velocity|speed|force|friction|momentum|impulse|collision|projectile|stopping distance|kinetic|potential energy|work calculator|mechanical power|energy|spring|hooke|ballistic|free fall|freefall|kinemat|newton.?s law|inclined plane|lever|mass calculator|weight calculator|conservation of/.test(text)) return 'mechanics';
  if (/convert|conversion|converter|unit|units|constant|significant figure|measurement|uncertainty|error propagation|prefix|dimensional analysis|scientific notation|kg to newtons?|kilogram.*newton|pounds per minute|pounds per square inch|psi calculator|watts to/.test(text)) return 'units-measurement';
  return 'applied';
}

function physicsEntries() {
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  const byUrl = new Map();
  for (const item of index) {
    if (String(item.category || '').trim().toLowerCase() !== 'physics') continue;
    const url = String(item.url || '');
    if (!url.startsWith('/calculators/') || !url.endsWith('.html') || url.includes('..') || url.includes('?') || url.includes('#')) continue;
    if (!fs.existsSync(path.join(ROOT, url.slice(1)))) continue;
    const entry = {...item, url, section: classify(item)};
    const previous = byUrl.get(url);
    if (!previous || String(entry.description || '').length > String(previous.description || '').length) byUrl.set(url, entry);
  }

  const directory = fs.readFileSync(SITE_DIRECTORY_FILE, 'utf8');
  const anchors = new Map();
  for (const match of directory.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)) {
    const attrs = readAttributes(match[0].slice(0, match[0].indexOf('>') + 1));
    if (attrs.href) anchors.set(attrs.href, attrs);
  }
  for (const url of SUPPLEMENTAL_ROUTES) {
    const anchor = anchors.get(url);
    if (!anchor || !/\bphysics\b/i.test(anchor['data-search'] || '')) throw new Error(`Verified supplemental Physics entry is missing from the all-calculator directory: ${url}`);
    if (!fs.existsSync(path.join(ROOT, url.slice(1)))) throw new Error(`Missing supplemental Physics destination: ${url}`);
    if (byUrl.has(url)) continue;
    const metadata = pageMetadata(url);
    const name = metadata.name || url.split('/').pop().replace(/\.html$/i, '').replace(/-/g, ' ');
    byUrl.set(url, {...metadata, name, url, category: 'Physics', keywords: anchor['data-search'], section: classify({name, url, keywords: anchor['data-search'], description: metadata.description})});
  }

  return [...byUrl.values()].sort((a, b) => SECTION_ORDER.get(a.section) - SECTION_ORDER.get(b.section) ||
    String(a.name || '').localeCompare(String(b.name || ''), 'en') || a.url.localeCompare(b.url));
}

function build() {
  const entries = physicsEntries();
  const topicLinks = SECTIONS.map(([id, title]) => {
    const count = entries.filter(item => item.section === id).length;
    return count ? `      <a href="#physics-${id}">${escapeHtml(title)} <span>${count}</span></a>` : '';
  }).filter(Boolean).join('\n');
  const sections = SECTIONS.map(([id, title, description]) => {
    const members = entries.filter(item => item.section === id);
    if (!members.length) return '';
    const links = members.map(item => {
      const search = `${item.name || ''} ${item.category || 'Physics'} ${item.keywords || ''} ${item.description || ''}`.toLocaleLowerCase();
      const descriptionText = item.description || 'Physics-related calculator from the existing catalogue. Review its inputs, method and limits before relying on the result.';
      return `      <li class="physics-tool" data-search="${escapeHtml(search)}"><a href="${escapeHtml(item.url)}">${escapeHtml(item.name || item.url)}</a><p>${escapeHtml(descriptionText)}</p></li>`;
    }).join('\n');
    return `    <details class="physics-section" id="physics-${id}" data-section="${id}"><summary><span>${escapeHtml(title)}</span><span class="section-count">${members.length} tools</span></summary><p class="section-description">${escapeHtml(description)}</p><ul class="physics-tool-list">\n${links}\n    </ul></details>`;
  }).filter(Boolean).join('\n');
  const date = new Date().toISOString().slice(0, 10);
  const topicCount = SECTIONS.filter(([id]) => entries.some(item => item.section === id)).length;
  const description = `Search and browse ${entries.length} physics calculators grouped into ${topicCount} topics, including mechanics, thermodynamics, waves, optics, circuits, modern physics and astronomy.`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Physics Calculators | Friendly Calculator</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${PAGE_URL}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="website"><meta property="og:site_name" content="Friendly Calculator">
<meta property="og:title" content="Physics Calculators | Friendly Calculator">
<meta property="og:description" content="Browse searchable physics calculators across mechanics, energy, fluids, heat, waves, optics, electricity, modern physics and space.">
<meta property="og:url" content="${PAGE_URL}"><meta property="og:image" content="${SITE_ORIGIN}/og-friendly-calculator.png">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Physics Calculators | Friendly Calculator">
<meta name="twitter:description" content="Browse physics calculators grouped by topic.">
<meta property="og:image:alt" content="Friendly Calculator — online calculators and practical tools">
<meta name="twitter:image" content="${SITE_ORIGIN}/og-friendly-calculator.png"><meta name="twitter:image:alt" content="Friendly Calculator — online calculators and practical tools">
<link rel="stylesheet" href="/assets/site-shell.css"><link rel="stylesheet" href="/assets/site-chrome.css?v=1">
<style>
:root{--physics-ink:#172638;--physics-muted:#596b7c;--physics-line:#dce4eb;--physics-paper:#fff;--physics-wash:#f4f7f9;--physics-accent:#176b78}
*{box-sizing:border-box}body{margin:0;background:var(--physics-wash);color:var(--physics-ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
.physics-wrap{width:min(1100px,94%);margin:0 auto}.physics-nav{padding:16px 0;border-bottom:1px solid var(--physics-line);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.physics-brand{font-weight:850;text-decoration:none;color:var(--physics-ink);letter-spacing:.03em}.physics-nav nav{display:flex;gap:14px;flex-wrap:wrap}.physics-nav nav a{font-size:.9rem}
.physics-hero{padding:30px 0 18px}.physics-hero h1{font-size:clamp(1.9rem,4vw,2.8rem);line-height:1.12;margin:8px 0}.physics-hero p{max-width:850px;color:var(--physics-muted)}.physics-kicker{font-size:.78rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--physics-accent)}
.physics-topics{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 20px}.physics-topics a{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--physics-line);border-radius:999px;background:#fff;padding:7px 11px;text-decoration:none;font-size:.85rem}.physics-topics a span{font-weight:800;color:var(--physics-accent)}
.physics-search{background:var(--physics-paper);border:1px solid var(--physics-line);border-radius:12px;padding:18px;margin:10px 0 18px}.physics-search label{font-weight:750;display:block;margin-bottom:8px}.physics-search-row{display:flex;gap:9px}.physics-search input{flex:1;min-width:0;border:1px solid #aebbc7;border-radius:8px;padding:12px;font:inherit}.physics-search button{border:0;border-radius:8px;background:var(--physics-accent);color:#fff;padding:11px 17px;font:inherit;font-weight:750;cursor:pointer}.physics-search-status{font-size:.88rem;color:var(--physics-muted);margin:8px 0 0}
.physics-directory{display:grid;gap:12px}.physics-section{background:var(--physics-paper);border:1px solid var(--physics-line);border-radius:12px;overflow:hidden;scroll-margin-top:14px}.physics-section>summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer;padding:15px 18px;font-weight:800;font-size:1.05rem;background:#e8f3f4}.physics-section>summary::-webkit-details-marker{display:none}.physics-section>summary::before{content:"+";color:var(--physics-accent);font-size:1.2rem;margin-right:4px}.physics-section[open]>summary::before{content:"−"}.section-count{font-size:.78rem;font-weight:700;color:var(--physics-muted);white-space:nowrap}.section-description{color:var(--physics-muted);margin:0;padding:13px 18px 0}.physics-tool-list{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px;margin:0;padding:8px 18px 15px}.physics-tool{padding:12px 0;border-bottom:1px solid #edf0f3;min-width:0}.physics-tool a{font-weight:750;text-decoration:none}.physics-tool a:hover{text-decoration:underline}.physics-tool p{margin:4px 0 0;color:var(--physics-muted);font-size:.86rem}.physics-tool[hidden],.physics-section[hidden]{display:none!important}.physics-empty{display:none;background:white;border:1px solid var(--physics-line);border-radius:10px;padding:18px;color:var(--physics-muted)}.physics-note{margin:20px 0;background:#fff;border:1px solid var(--physics-line);border-radius:12px;padding:18px;color:var(--physics-muted);font-size:.9rem}.physics-note h2{font-size:1.1rem;margin:0 0 7px;color:var(--physics-ink)}.physics-note p:last-child{margin-bottom:0}.physics-footer{padding:24px 0 34px;color:var(--physics-muted);font-size:.88rem}.physics-footer a{margin-right:12px}
@media(max-width:650px){.physics-search-row{flex-direction:column}.physics-search button{width:100%}.physics-tool-list{grid-template-columns:1fr}.physics-section>summary{align-items:flex-start}.physics-nav{align-items:flex-start;flex-direction:column}}
</style>
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage','name':'Physics Calculators','url':PAGE_URL,'dateModified':date,'isAccessibleForFree':true,'numberOfItems':entries.length,'description':'A searchable directory of physics calculators from the Friendly Calculator catalogue.'})}</script>
</head>
<body>
<header class="physics-wrap physics-nav"><a class="physics-brand" href="/">FRIENDLY CALCULATOR</a><nav aria-label="Main navigation"><a href="/">Home</a><a href="/calculator/site-directory.html">All calculators</a><a href="/calculator/biology-calculators.html">Biology</a><a href="/calculator/chemistry-calculators.html">Chemistry</a><a href="/calculator/finance-calculators.html">Finance overview</a></nav></header>
<main class="physics-wrap">
<section class="physics-hero"><p class="physics-kicker">Physics toolkit · ${entries.length} listed calculators · ${topicCount} topics</p><h1>Physics Calculators</h1><p>Browse physics-focused calculators currently available in the Friendly Calculator catalogue, organized by subject. Search across mechanics, energy, fluids, heat, waves, acoustics, optics, electricity, magnetism, modern physics and astronomy.</p><p><a href="/calculator/site-directory.html">See the complete calculator directory →</a></p></section>
<nav class="physics-topics" aria-label="Physics topics">\n${topicLinks}\n</nav>
<section class="physics-search" aria-labelledby="physics-search-label"><label id="physics-search-label" for="physics-search-input">Search physics calculators</label><div class="physics-search-row"><input id="physics-search-input" type="search" autocomplete="off" placeholder="Try momentum, lens, capacitor, gas law…" aria-describedby="physics-search-status"><button id="physics-search-clear" type="button">Clear search</button></div><p class="physics-search-status" id="physics-search-status" role="status" aria-live="polite">Browse ${topicCount} topics or search all ${entries.length} listed calculators.</p></section>
<section class="physics-directory" aria-label="Physics calculator topics">\n${sections}\n</section><p id="physics-search-empty" class="physics-empty">No calculators match that search. Try another term or clear the search.</p>
<section class="physics-note"><h2>Scope, formula assumptions &amp; educational use</h2><p>This directory organizes physics-related calculator pages currently available in the Friendly Calculator catalogue; it does not claim to include every physics calculator worldwide. Coverage depends on the current catalogue. Each tool may use idealized models and assumptions—such as constant gravity, ideal gases, lossless components or small-angle approximations—so review the individual calculator's displayed method, units and limitations before using a result.</p><p>These calculators are for learning and general estimation, not a substitute for validated engineering analysis, laboratory safety procedures, medical or legal advice, or qualified professional judgment. Verify units, model assumptions and results independently, especially for safety-critical or high-stakes use.</p></section>
</main><footer class="physics-wrap physics-footer"><a href="/calculator/site-directory.html">All calculators</a><a href="/calculator/methodology.html">Methodology</a><a href="/calculator/disclaimer.html">Disclaimer</a><a href="/calculator/contact.html">Contact</a><p>© Friendly Calculator</p></footer>
<script>
(()=>{'use strict';const input=document.getElementById('physics-search-input'),clear=document.getElementById('physics-search-clear'),status=document.getElementById('physics-search-status'),empty=document.getElementById('physics-search-empty'),groups=[...document.querySelectorAll('.physics-section')],items=[...document.querySelectorAll('.physics-tool')];function filter(){const q=input.value.trim().toLocaleLowerCase();let visible=0;for(const item of items){const match=!q||(item.dataset.search||'').includes(q);item.hidden=!match;if(match)visible++;}for(const group of groups){const has=[...group.querySelectorAll('.physics-tool')].some(item=>!item.hidden);group.hidden=!has;if(q&&has)group.open=true;}empty.style.display=q&&visible===0?'block':'none';const groupCount=groups.filter(group=>!group.hidden).length;status.textContent=q?(visible+' matching calculators across '+groupCount+' topic groups.'):'Browse '+groups.length+' topics or search all '+items.length+' listed calculators.';}input.addEventListener('input',filter);clear.addEventListener('click',()=>{input.value='';filter();input.focus();});})();
</script><script src="/assets/site-shell.js" defer></script><script src="/assets/site-chrome.js?v=1" defer></script>
</body></html>
`;
}

function main() {
  const html = build();
  const count = (html.match(/class="physics-tool"/g) || []).length;
  if (process.argv.includes('--check')) {
    if (!html.includes('Physics Calculators</h1>') || count < 300) throw new Error('Generated physics directory is incomplete.');
    console.log(`Physics directory check passed: ${count} calculators.`);
    return;
  }
  fs.mkdirSync(path.dirname(OUTPUT_FILE), {recursive:true});
  fs.writeFileSync(OUTPUT_FILE, html);
  console.log(`Generated ${path.relative(ROOT, OUTPUT_FILE)} with ${count} verified calculator links.`);
}
if (require.main === module) main();
module.exports = {build, physicsEntries, classify};
