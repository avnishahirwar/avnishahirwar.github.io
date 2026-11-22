#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { site, hubPath, groups, seo, related, routeToGroup } = require('./manufacturing-seo-config.cjs');
const root = path.resolve(__dirname, '..');
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const text = (value) => String(value).replace(/&amp;/g, '&');
const normalizeTitle = (value) => { const withoutBrand = String(value).replace(/\s*\| Friendly Calculator$/, ''); return withoutBrand.length >= 30 ? withoutBrand : String(value); };
const normalizeDescription = (value) => { const clean = String(value); if (clean.length <= 160) return clean; return `${clean.slice(0, 157).replace(/\s+\S*$/, '')}...`; };
const byRoute = new Map();
for (const group of groups) for (const file of group.routes) byRoute.set(`/calculators/${file}`, { file, group: group.key, groupTitle: group.title });
let changed = 0;
for (const [url, info] of byRoute) {
  const filePath = path.join(root, url.slice(1));
  let html = fs.readFileSync(filePath, 'utf8');
  const entry = seo[info.file];
  if (!entry) throw new Error(`Missing SEO metadata for ${info.file}`);
  const [rawTitle, rawDescription] = entry;
  const title = normalizeTitle(rawTitle);
  const description = normalizeDescription(rawDescription);
  const replacements = [
    [/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`],
    [/<meta\s+name="description"\s+content="[^"]*">/i, `<meta name="description" content="${esc(description)}">`],
    [/<meta\s+property="og:title"\s+content="[^"]*">/i, `<meta property="og:title" content="${esc(title)}">`],
    [/<meta\s+property="og:description"\s+content="[^"]*">/i, `<meta property="og:description" content="${esc(description)}">`],
    [/<meta\s+name="twitter:title"\s+content="[^"]*">/i, `<meta name="twitter:title" content="${esc(title)}">`],
    [/<meta\s+name="twitter:description"\s+content="[^"]*">/i, `<meta name="twitter:description" content="${esc(description)}">`]
  ];
  for (const [pattern, replacement] of replacements) {
    if (!pattern.test(html)) throw new Error(`Metadata tag missing in ${url}: ${pattern}`);
    html = html.replace(pattern, replacement);
  }
  html = html.replace(/\/assets\/generated-equation-calculator\.js(?:\?v=[^"]+)?/g, '/assets/generated-equation-calculator.js?v=2');
  const appUrl = `${site}${url}`;
  const name = title.replace(/\s*\| Friendly Calculator$/, '');
  const schema = { '@context':'https://schema.org', '@graph': [
    { '@type':'WebApplication', name, description, url:appUrl, applicationCategory:'BusinessApplication', operatingSystem:'Any', isPartOf:{ '@type':'WebSite', name:'Friendly Calculator', url:`${site}/` } },
    { '@type':'BreadcrumbList', itemListElement:[
      { '@type':'ListItem', position:1, name:'Home', item:`${site}/` },
      { '@type':'ListItem', position:2, name:'Manufacturing Calculators', item:`${site}${hubPath}` },
      { '@type':'ListItem', position:3, name, item:appUrl }
    ] }
  ] };
  if (!html.includes('id="manufacturing-seo-schema"')) html = html.replace('</head>', `<script id="manufacturing-seo-schema" type="application/ld+json">${JSON.stringify(schema)}</script></head>`);
  if (!html.includes('id="manufacturing-related-links"')) {
    const candidates = related[info.group].filter((route) => route !== info.file).slice(0, 3);
    const links = [`<a href="${hubPath}">Manufacturing calculator hub</a>`, ...candidates.map((route) => `<a href="/calculators/${route}">${esc(text(seo[route][0].replace(/\s*\| Friendly Calculator$/, '')))}</a>`)].join(' · ');
    const section = `<section id="manufacturing-related-links" class="content" aria-labelledby="manufacturing-related-heading"><h2 id="manufacturing-related-heading">Related manufacturing calculators</h2><p>${links}</p></section>`;
    if (!html.includes('</main>')) throw new Error(`Main element missing in ${url}`);
    html = html.replace('</main>', `${section}</main>`);
  }
  fs.writeFileSync(filePath, html);
  changed++;
}
console.log(`Optimized ${changed} manufacturing calculator pages with route-specific metadata, JSON-LD and related links.`);
