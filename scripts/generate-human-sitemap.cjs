#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const indexPath = path.join(ROOT, 'assets/calculator-search-index.json');
const sitemapPath = path.join(ROOT, 'sitemap.html');
const items = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
if (!Array.isArray(items) || !items.length) throw new Error('Calculator search index is empty or invalid.');
const escapeHtml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const slug = value => value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category';
const groups = new Map();
for (const item of items) {
  if (!item || typeof item.name !== 'string' || typeof item.url !== 'string' || !item.url.startsWith('/')) {
    throw new Error('Invalid calculator search entry.');
  }
  const category = typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'Other';
  if (!groups.has(category)) groups.set(category, []);
  groups.get(category).push(item);
}
const ordered = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const ids = new Map();
const makeId = (name, index) => {
  const base = slug(name);
  const count = (ids.get(base) || 0) + 1;
  ids.set(base, count);
  return base + '-' + (count === 1 ? index + 1 : count + '-' + (index + 1));
};
const nav = '<nav class="sitemap-category-index" aria-label="Jump to a calculator category">' +
  ordered.map(([name, entries], index) => '<a href="#' + makeId(name, index) + '">' + escapeHtml(name) + ' <span>' + entries.length.toLocaleString('en-US') + '</span></a>').join('\n') +
  '</nav>';
ids.clear();
const sections = '<div id="sitemap-categories">' + ordered.map(([name, entries], index) => {
  const id = makeId(name, index);
  const links = entries.slice().sort((a, b) => a.name.localeCompare(b.name)).map(item =>
    '<li class="sitemap-item" data-search="' + escapeHtml(item.name + ' ' + name) + '"><a href="' + escapeHtml(item.url) + '">' + escapeHtml(item.name) + '</a></li>'
  ).join('\n');
  return '<details class="sitemap-category" id="' + id + '" data-sitemap-category><summary><span>' + escapeHtml(name) + '</span><span class="sitemap-count">' + entries.length.toLocaleString('en-US') + ' pages</span></summary><ul>\n' + links + '\n</ul></details>';
}).join('\n') + '</div></section>';
let html = fs.readFileSync(sitemapPath, 'utf8');
html = html.replace(/<nav class="sitemap-category-index" aria-label="Jump to a calculator category">[\s\S]*?<\/nav>/, nav);
html = html.replace(/<div id="sitemap-categories">[\s\S]*?<\/div><\/section>/, sections);
html = html.replace(/data-sitemap-total="\d+"/, 'data-sitemap-total="' + items.length + '"');
html = html.replace(/<strong>[^<]*<\/strong> public catalogue entries/, '<strong>' + items.length.toLocaleString('en-US') + '</strong> public catalogue entries');
html = html.replace(/<strong>[^<]*<\/strong> calculator pages/, '<strong>' + items.filter(item => item.url.startsWith('/calculators/')).length.toLocaleString('en-US') + '</strong> calculator pages');
html = html.replace(/<strong>[^<]*<\/strong> catalogue categories/, '<strong>' + groups.size.toLocaleString('en-US') + '</strong> catalogue categories');
html = html.replace(/<strong>[^<]*<\/strong> international entry/, '<strong>' + items.filter(item => item.url.startsWith('/international/')).length.toLocaleString('en-US') + '</strong> international entries');
html = html.replace(/<p class="fc-sitemap-status" id="sitemap-status" role="status" aria-live="polite">[\s\S]*?<\/p>/, '<p class="fc-sitemap-status" id="sitemap-status" role="status" aria-live="polite">' + items.length.toLocaleString('en-US') + ' entries across ' + groups.size.toLocaleString('en-US') + ' categories.</p>');
fs.writeFileSync(sitemapPath, html);
console.log('Generated human sitemap with ' + items.length + ' calculator entries across ' + groups.size + ' categories.');
