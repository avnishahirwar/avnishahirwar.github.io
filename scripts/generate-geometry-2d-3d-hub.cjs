#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'assets/calculator-search-index.json');
const outPath = path.join(root, 'calculator/geometry-2d-3d-calculators.html');
const site = 'https://friendlycalculator.in';
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const entries = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const geometryTerms = /(area|perimeter|circumference|triangle|circle|ellipse|polygon|rectangle|square|parallelogram|trapezoid|sector|angle|geometry|diagonal|pythag|cone|cylinder|sphere|cube|cuboid|pyramid|prism|polyhedron|tetrahedron|torus|ellipsoid|frustum|volume|surface[- ]area|3d|three[- ]dimensional|distance[- ]between[- ]two[- ]points|coordinate|centroid|circumcenter|circumradius|inradius|apothem|heron)/i;
const excluded = /(square[- ]root|sum[- ]of[- ]squares|square[- ]of[- ]a[- ]binomial|chi[- ]square|square[- ]kilometers?[- ]to[- ]acres?|square[- ]feet?[- ]to[- ]acres?)/i;
const selected = [];
const seen = new Set();
for (const item of entries) {
  const category = String(item.category || '');
  const haystack = `${item.name} ${item.url} ${item.keywords || ''} ${item.description || ''}`;
  const isGeometryCategory = /^(Geometry, Measurement & Construction|MATH|Math)$/.test(category);
  if ((!isGeometryCategory || !geometryTerms.test(haystack) || excluded.test(haystack)) && !/3d|three[- ]dimensional/i.test(haystack)) continue;
  if (seen.has(item.url) || !fs.existsSync(path.join(root, item.url.replace(/^\//, '')))) continue;
  seen.add(item.url);
  selected.push({...item, name: String(item.name).replace(/&amp;/g, '&')});
}
const is3d = (item) => /(3d|three[- ]dimensional|volume|surface[- ]area|cone|cylinder|sphere|cube|cuboid|pyramid|prism|polyhedron|tetrahedron|torus|ellipsoid|frustum|pipe|tank|well|hollow)/i.test(`${item.name} ${item.url} ${item.keywords || ''}`);
const is2d = (item) => /(area|perimeter|circumference|triangle|circle|ellipse|polygon|rectangle|square|parallelogram|trapezoid|sector|angle|diagonal|pythag|coordinate|centroid|circumcenter|circumradius|inradius|apothem|heron|2d)/i.test(`${item.name} ${item.url} ${item.keywords || ''}`) && !is3d(item);
const groups = [
  ['2D shapes, areas and perimeters', (item) => is2d(item)],
  ['3D solids, volume and surface area', (item) => is3d(item)],
  ['Coordinates, distance and supporting measurement', (item) => !is2d(item) && !is3d(item)]
];
const card = (item) => `<a class="card" href="${esc(item.url)}"><strong>${esc(item.name)}</strong><span>${esc(item.description || 'Use the existing calculator with your own measurements and units.')}</span><b>Open calculator →</b></a>`;
const sections = groups.map(([title, predicate]) => {
  const items = selected.filter(predicate).sort((a,b) => a.name.localeCompare(b.name));
  return `<section class="section"><h2>${esc(title)} <small>(${items.length})</small></h2><div class="grid">${items.map(card).join('')}</div></section>`;
}).join('');
const title = '2D & 3D Geometry Calculators | Area, Volume & Measurement';
const description = 'Explore Friendly Calculator’s worldwide 2D and 3D geometry toolkit: areas, perimeters, triangles, circles, polygons, coordinates, volumes, surface areas and construction measurements.';
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#101c2c"><link rel="canonical" href="${site}/calculator/geometry-2d-3d-calculators.html"><link rel="icon" type="image/png" href="/favicon-96.png"><link rel="stylesheet" href="/assets/site-shell.css"><link rel="stylesheet" href="/assets/site-chrome.css?v=1">
<meta property="og:type" content="website"><meta property="og:site_name" content="Friendly Calculator"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${site}/calculator/geometry-2d-3d-calculators.html"><meta property="og:image" content="${site}/og-friendly-calculator.png"><meta property="og:image:alt" content="Friendly Calculator 2D and 3D geometry calculator toolkit"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${site}/og-friendly-calculator.png"><meta name="twitter:image:alt" content="Friendly Calculator 2D and 3D geometry calculator toolkit">
<style>:root{--ink:#172638;--muted:#596b7c;--line:#dfe5eb;--paper:#f5f7f9;--navy:#101c2c;--gold:#d8bd82;--blue:#174d72}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}a{color:var(--blue)}.wrap{width:min(1120px,92%);margin:auto}.hero{padding:44px 0 24px}.eyebrow{color:#866a38;font-size:.75rem;letter-spacing:.14em;font-weight:850}h1{font-size:clamp(2.1rem,5vw,3.6rem);line-height:1.08;max-width:900px;margin:9px 0 14px}.lead,.muted{color:var(--muted);max-width:900px}.notice{background:#fff;border:1px solid var(--line);border-radius:14px;padding:17px;margin:20px 0}.section{margin:30px 0}.section h2{font-size:1.45rem;margin-bottom:10px}.section h2 small{font-size:.8em;color:var(--muted);font-weight:600}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.card{display:flex;flex-direction:column;gap:7px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px;text-decoration:none;color:inherit}.card strong{font-size:1.05rem;color:var(--blue)}.card span{font-size:.92rem;color:var(--muted);flex:1}.card b{font-size:.9rem;color:#866a38}.links{display:flex;gap:10px;flex-wrap:wrap}.links a{background:#fff;border:1px solid var(--line);border-radius:99px;padding:8px 13px;text-decoration:none;font-weight:750}@media(max-width:760px){.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:500px){.grid{grid-template-columns:1fr}}</style></head>
<body><header class="fc-global-header"><div class="fc-global-nav"><a class="fc-global-brand" href="/" aria-label="Friendly Calculator home"><img class="fc-brand-mark" src="/assets/friendly-calculator-logo.svg" width="34" height="34" alt="Friendly Calculator logo" decoding="async"> <span>FRIENDLY <b>CALCULATOR</b></span></a><nav id="fc-primary-navigation" class="fc-global-links" aria-label="Primary navigation"><a href="/">Home</a><a href="/calculator/finance-calculators.html">Finance</a><a href="/calculator/business-calculators.html">Business</a><a href="/calculator/site-directory.html">All Calculators</a><a href="/blog/">Blog</a></nav></div></header>
<main class="wrap"><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/calculator/site-directory.html">All Calculators</a> / 2D &amp; 3D Geometry</nav><section class="hero"><div class="eyebrow">WORLDWIDE · MATHEMATICS · MEASUREMENT · CONSTRUCTION</div><h1>2D &amp; 3D Geometry Calculators</h1><p class="lead">A centralized worldwide collection of existing Friendly Calculator tools for plane figures, solid geometry, coordinates, distance, volume, surface area and practical measurement. Use consistent units for every input.</p></section><div class="notice"><strong>${selected.length} existing calculators organized:</strong> This hub reuses the published calculator catalogue and does not create duplicate pages. Results are browser-side estimates based on the displayed formulas; measurement, engineering, building-code and surveying decisions should be checked against the relevant standards or a qualified professional.</div>${sections}<section class="section"><h2>Explore related calculator collections</h2><div class="links"><a href="/calculator/site-directory.html">All calculators</a><a href="/calculator/everyday-calculators.html">Everyday tools</a><a href="/calculator/real-estate-calculators.html">Real-estate tools</a><a href="/calculator/global-business-calculators.html">Global business tools</a></div></section></main><footer class="fc-global-footer"><div class="fc-global-footer-inner"><a href="/calculator/about.html">About</a><a href="/calculator/methodology.html">Methodology</a><a href="/calculator/contact.html">Contact</a><a href="/calculator/privacy.html">Privacy</a><a href="/calculator/terms.html">Terms</a><a href="/calculator/disclaimer.html">Disclaimer</a><a href="/calculator/site-directory.html">All pages</a></div></footer><script src="/assets/site-shell.js" defer></script><script src="/assets/site-chrome.js?v=1" defer></script></body></html>\n`;
fs.writeFileSync(outPath, html);
console.log(`Generated ${selected.length} links: ${groups.map(([title, predicate]) => `${title}=${selected.filter(predicate).length}`).join(', ')}`);
