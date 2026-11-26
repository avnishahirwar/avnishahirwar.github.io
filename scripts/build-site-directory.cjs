'use strict';
// Source of truth: rebuild the public alphabetical directory from every current HTML page in /calculators.
// The main-branch workflow regenerates and commits this file after catalogue changes.
/**
 * Rebuild calculator/site-directory.html from the calculators/ catalogue.
 * Usage: node scripts/build-site-directory.cjs [--check]
 * --check exits 1 when the committed file would change (used in CI).
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CALC_DIR = path.join(ROOT, 'calculators');

// Category hub pages linked from the directory hero so crawlers and visitors can reach every subject hub.
const HUBS = [
  ['physics-calculators', 'Physics'],
  ['chemistry-calculators', 'Chemistry'],
  ['biology-calculators', 'Biology'],
  ['science-calculators', 'Science'],
  ['economic-calculators', 'Economics'],
  ['money-calculators', 'Money'],
  ['finance-calculators', 'Finance'],
  ['math-calculators', 'Math'],
  ['tax-calculators', 'Tax']
];

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function collect() {
  const pages = [];
  for (const f of fs.readdirSync(CALC_DIR)) {
    if (!f.endsWith('.html')) continue;
    const full = path.join(CALC_DIR, f);
    const html = fs.readFileSync(full, 'utf8');
    const rawTitle = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
    let title = rawTitle.split('|')[0].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
    if (!title) title = f.replace(/\.html$/, '').replace(/-/g, ' ');
    const rawDesc = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || '';
    const desc = rawDesc.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().slice(0, 180);
    pages.push({ slug: f.replace(/\.html$/, ''), title, desc });
  }
  pages.sort((a, b) => a.slug.localeCompare(b.slug));
  return pages;
}

function bucket(slug) {
  const c = slug[0].toLowerCase();
  return /[a-z]/.test(c) ? c : 'num';
}

function build(pages) {
  const total = pages.length.toLocaleString('en-US');
  const buckets = new Map();
  for (const p of pages) {
    const b = bucket(p.slug);
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b).push(p);
  }
  const keys = Array.from(buckets.keys()).sort((a, b) => (a === 'num' ? 1 : 0) - (b === 'num' ? 1 : 0) || a.localeCompare(b));
  let sections = '';
  for (const k of keys) {
    sections += '<section class="group" id="group-' + k + '"><h2>' + (k === 'num' ? '0-9' : k.toUpperCase()) + '</h2><div class="cards">';
    for (const p of buckets.get(k)) {
      const search = esc((p.title + ' ' + p.desc).toLowerCase());
      sections += '<a class="card" href="/calculators/' + esc(p.slug) + '.html" data-search="' + search + '"><strong>' + esc(p.title) + '</strong>' + (p.desc ? '<span>' + esc(p.desc) + '</span>' : '') + '</a>';
    }
    sections += '</div></section>';
  }
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Site Directory - ' + total + ' Calculators | Friendly Calculator</title><meta name="description" content="Browse all ' + total + ' free online calculators on Friendly Calculator, organised alphabetically. Finance, tax, health, math, business and everyday tools."><link rel="canonical" href="https://friendlycalculator.in/calculator/site-directory.html"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:site_name" content="Friendly Calculator"><meta property="og:title" content="Site Directory - ' + total + ' Calculators | Friendly Calculator"><meta property="og:description" content="Browse all ' + total + ' free online calculators on Friendly Calculator, organised alphabetically. Finance, tax, health, math, business and everyday tools."><meta property="og:url" content="https://friendlycalculator.in/calculator/site-directory.html"><meta property="og:image" content="https://friendlycalculator.in/og-friendly-calculator.png"><meta property="og:image:alt" content="Friendly Calculator — online calculators and practical tools"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Site Directory - ' + total + ' Calculators | Friendly Calculator"><meta name="twitter:description" content="Browse all ' + total + ' free online calculators on Friendly Calculator, organised alphabetically. Finance, tax, health, math, business and everyday tools."><meta name="twitter:image" content="https://friendlycalculator.in/og-friendly-calculator.png"><meta name="twitter:image:alt" content="Friendly Calculator — online calculators and practical tools"><link rel="stylesheet" href="/assets/site-shell.css"><style>*{box-sizing:border-box}body{margin:0;background:#f5f6f8;color:#172638;font:16px/1.7 system-ui,sans-serif}.wrap{width:min(1100px,94%);margin:24px auto}.hero,.panel{background:#fff;border:1px solid #dfe5eb;border-radius:14px;padding:22px;margin:16px 0}.hero{background:#101c2c;color:#fff}#q{width:100%;padding:12px;border:1px solid #b8c4cf;border-radius:8px;font:inherit}.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}.card{display:grid;gap:4px;background:#edf3f7;border-radius:9px;padding:12px;text-decoration:none;color:#172638;border:1px solid transparent}.card strong{font-size:.98rem}.card span{color:#596b7c;font-size:.85rem;line-height:1.5}.group h2{margin:22px 0 10px;font-size:1.2rem;text-transform:uppercase;letter-spacing:.05em;color:#596b7c}.card:hover{border-color:#101c2c}.hidden{display:none}.fc-footer{background:#101c2c;color:#fff;margin-top:24px;padding:24px}.fc-footer a{color:#bfd4e3}.fc-footer-links{display:grid;gap:4px;margin-top:8px}@media(max-width:650px){.cards{grid-template-columns:1fr}}</style></head><body><main class="wrap"><header class="hero"><p>Directory</p><h1>All ' + total + ' calculators</h1><p>Every free calculator on Friendly Calculator, alphabetically. Use the box below to filter instantly.</p><nav aria-label="Browse calculators by category"><h2>Browse calculators by category</h2><p>' + HUBS.map(function (h) { return '<a href="/calculator/' + h[0] + '.html">' + h[1] + ' Calculators</a>'; }).join(' &middot; ') + '</p><p>Search calculators by topic in the Physics directory.</p></nav></header><section class="panel"><label for="q" class="sr-only" style="position:absolute;left:-9999px">Filter calculators</label><input id="q" type="search" placeholder="Type to filter calculators..." autocomplete="off"></section>' + sections + '</main><footer class="fc-footer"><div class="wrap"><strong>FRIENDLY CALCULATOR</strong><nav class="fc-footer-links"><a href="/">Home</a><a href="/calculator/about.html">About</a><a href="/calculator/privacy.html">Privacy</a><a href="/calculator/terms.html">Terms</a><a href="/calculator/contact.html">Contact</a></nav></div></footer><script>(document.addEventListener("DOMContentLoaded",function(){var q=document.getElementById("q");if(!q)return;q.addEventListener("input",function(){var v=q.value.trim().toLowerCase(),c=document.querySelectorAll(".card");for(var i=0;i<c.length;i++){c[i].classList.toggle("hidden",v!==""&&c[i].getAttribute("data-search").indexOf(v)===-1);}});}));</script><script src="/assets/site-shell.js" defer></script></body></html>';
}

function main() {
  const pages = collect();
  if (pages.length < 3000) {
    console.error('Unexpected catalogue size: ' + pages.length + ' calculator pages found.');
    process.exit(1);
  }
  const out = build(pages);
  const target = path.join(ROOT, 'calculator', 'site-directory.html');
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    if (current !== out) {
      console.error('site-directory.html is out of date (' + pages.length.toLocaleString('en-US') + ' entries). Run: node scripts/build-site-directory.cjs');
      process.exit(1);
    }
    console.log('site-directory.html is up to date: ' + pages.length.toLocaleString('en-US') + ' entries.');
    return;
  }
  fs.writeFileSync(target, out);
  console.log('site-directory.html rebuilt with ' + pages.length.toLocaleString('en-US') + ' entries.');
}

main();
