#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'assets', 'calculator-search-index.json');
const PAGE = path.join(ROOT, 'sitemap.html');

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function categoryId(value, used) {
  const base = String(value).toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'other';
  let id = base, n = 2;
  while (used.has(id)) id = base + '-' + n++;
  used.add(id);
  return id;
}
function build() {
  const entries = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
  const byUrl = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry.name !== 'string' || typeof entry.url !== 'string' ||
        !entry.url.startsWith('/calculators/') && entry.url !== '/international/vat-calculator.html') {
      throw new Error('Invalid public calculator search entry.');
    }
    if (byUrl.has(entry.url)) throw new Error('Duplicate sitemap URL: ' + entry.url);
    byUrl.set(entry.url, entry);
  }
  const groups = new Map();
  for (const entry of byUrl.values()) {
    let category = String(entry.category || 'Other').trim();
    if (!category || category.length > 80 || /^updated:/i.test(category)) category = 'Other';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(entry);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'));
  const used = new Set();
  const nav = sortedGroups.map(([category, items]) => {
    const id = categoryId(category, used);
    return '<a href="#' + id + '">' + escapeHtml(category) + ' <span>' + items.length + '</span></a>';
  }).join('\n');
  const sections = sortedGroups.map(([category, items], index) => {
    const id = [...used][index];
    const list = items.slice().sort((a, b) => a.name.localeCompare(b.name, 'en')).map(item => {
      const searchable = escapeHtml(item.name + ' ' + category);
      return '<li class="sitemap-item" data-search="' + searchable + '"><a href="' +
        escapeHtml(item.url) + '">' + escapeHtml(item.name) + '</a></li>';
    }).join('\n');
    return '<details class="sitemap-category" id="' + id + '" data-sitemap-category><summary><span>' +
      escapeHtml(category) + '</span><span class="sitemap-count">' + items.length +
      ' pages</span></summary><ul>\n' + list + '\n</ul></details>';
  }).join('\n');
  return { entries: byUrl.size, categories: sortedGroups.length, nav, sections };
}
function main() {
  const { entries, categories, nav, sections } = build();
  const original = fs.readFileSync(PAGE, 'utf8');
  let html = original.replace(/data-sitemap-total="\d+"/, 'data-sitemap-total="' + entries + '"');
  html = html.replace(/<span><strong>[\d,]+<\/strong> public catalogue entries<\/span>/,
    '<span><strong>' + entries.toLocaleString('en-US') + '</strong> public catalogue entries</span>');
  html = html.replace(/<span><strong>[\d,]+<\/strong> calculator pages<\/span>/,
    '<span><strong>' + (entries - 1).toLocaleString('en-US') + '</strong> calculator pages</span>');
  html = html.replace(/<span><strong>\d+<\/strong> catalogue categories<\/span>/,
    '<span><strong>' + categories + '</strong> catalogue categories</span>');
  html = html.replace(/\d[\d,]* entries across \d+ categories\./,
    entries.toLocaleString('en-US') + ' entries across ' + categories + ' categories.');
  const navStart = html.indexOf('<nav class="sitemap-category-index"');
  const navEnd = html.indexOf('</nav>', navStart);
  if (navStart < 0 || navEnd < 0) throw new Error('Could not find sitemap category navigation.');
  html = html.slice(0, navStart) + '<nav class="sitemap-category-index" aria-label="Jump to a calculator category">\n' +
    nav + '\n</nav>' + html.slice(navEnd + '</nav>'.length);
  const groupStart = html.indexOf('<div id="sitemap-categories">');
  const sectionEnd = html.indexOf('</section>', groupStart);
  const groupEnd = html.lastIndexOf('</div>', sectionEnd);
  if (groupStart < 0 || sectionEnd < 0 || groupEnd < 0) throw new Error('Could not find sitemap category container.');
  html = html.slice(0, groupStart) + '<div id="sitemap-categories">\n' + sections +
    '\n</div>' + html.slice(groupEnd + '</div>'.length);
  if (process.argv.includes('--write')) fs.writeFileSync(PAGE, html);
  const current = fs.readFileSync(PAGE, 'utf8');
  const changed = current !== html;
  console.log('Human sitemap: ' + entries + ' entries across ' + categories + ' categories; ' +
    (changed ? 'update required' : 'up to date') + (process.argv.includes('--write') ? ' (written).' : '.'));
  if ((process.argv.includes('--check') || !process.argv.includes('--write')) && changed) process.exitCode = 1;
}
main();
