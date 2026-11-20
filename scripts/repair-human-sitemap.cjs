#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'assets', 'calculator-search-index.json');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.html');

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(value) {
  return String(value).toLowerCase().replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'other';
}

function build(entries) {
  const seen = new Set();
  for (const entry of entries) {
    if (!entry.url || seen.has(entry.url)) throw new Error('Duplicate or missing sitemap URL: ' + entry.url);
    seen.add(entry.url);
  }
  const groups = new Map();
  for (const entry of entries) {
    const category = entry.category || 'OTHER';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(entry);
  }
  const categories = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  const ids = new Map();
  const nav = [];
  const details = [];

  categories.forEach((category, index) => {
    const id = slugify(category) + '-' + (index + 1);
    ids.set(category, id);
    const items = groups.get(category).slice().sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
    nav.push('<a href="#' + id + '">' + escapeHtml(category) + ' <span>' + items.length + '</span></a>');
    const list = items.map(item => {
      const search = escapeHtml(item.name + ' ' + category);
      return '<li class="sitemap-item" data-search="' + search + '"><a href="' +
        escapeHtml(item.url) + '">' + escapeHtml(item.name) + '</a></li>';
    }).join('\n');
    details.push('<details class="sitemap-category" id="' + id + '" data-sitemap-category><summary><span>' +
      escapeHtml(category) + '</span><span class="sitemap-count">' + items.length +
      ' pages</span></summary><ul>\n' + list + '\n</ul></details>');
  });

  const calculatorCount = entries.filter(entry => entry.url.startsWith('/calculators/')).length;
  const internationalCount = entries.length - calculatorCount;
  const stats = '<div class="fc-sitemap-stats"><span><strong>' + entries.length.toLocaleString('en-US') +
    '</strong> public catalogue entries</span><span><strong>' + calculatorCount.toLocaleString('en-US') +
    '</strong> calculator pages</span><span><strong>' + categories.length +
    '</strong> catalogue categories</span><span><strong>' + internationalCount +
    '</strong> international entry</span></div>';
  return { nav: '<nav class="sitemap-category-index" aria-label="Jump to a calculator category">\n' +
    nav.join('\n') + '\n</nav>', details: details.join('\n'), stats, total: entries.length, categoryCount: categories.length };
}

function main() {
  const entries = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const generated = build(entries);
  const original = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const navPattern = /<nav class="sitemap-category-index" aria-label="Jump to a calculator category">[\s\S]*?<\/nav>/;
  const statsPattern = /<div class="fc-sitemap-stats">[\s\S]*?<\/div>/;
  const containerStart = original.indexOf('<div id="sitemap-categories"');
  if (!navPattern.test(original) || !statsPattern.test(original) || containerStart < 0) {
    throw new Error('Could not locate the human sitemap category structures.');
  }
  const containerOpenEnd = original.indexOf('>', containerStart) + 1;
  const containerEnd = original.indexOf('</div></section>', containerOpenEnd);
  if (containerEnd < 0) throw new Error('Could not locate the end of the human sitemap categories.');

  let output = original.replace(navPattern, generated.nav).replace(statsPattern, generated.stats);
  const updatedStart = output.indexOf('<div id="sitemap-categories"');
  const updatedOpenEnd = output.indexOf('>', updatedStart) + 1;
  const updatedEnd = output.indexOf('</div></section>', updatedOpenEnd);
  output = output.slice(0, updatedStart) +
    '<div id="sitemap-categories" data-sitemap-total="' + generated.total + '">' +
    '\n' + generated.details + '\n' +
    output.slice(updatedEnd);

  if (process.argv.includes('--write')) fs.writeFileSync(SITEMAP_PATH, output);
  const finalHtml = process.argv.includes('--write') ? fs.readFileSync(SITEMAP_PATH, 'utf8') : original;
  const urls = [...finalHtml.matchAll(/<li class="sitemap-item" data-search="[^"]*"><a href="([^"]+)">/g)].map(m => m[1]);
  const categoryCount = (finalHtml.match(/<details class="sitemap-category"/g) || []).length;
  const complete = urls.length === entries.length && new Set(urls).size === urls.length &&
    [...urls].sort().every((url, index) => url === entries.map(entry => entry.url).sort()[index]) &&
    categoryCount === generated.categoryCount &&
    finalHtml.includes('data-sitemap-total="' + generated.total + '"');
  console.log('Human sitemap: ' + urls.length + '/' + entries.length + ' unique links across ' +
    categoryCount + '/' + generated.categoryCount + ' categories; ' + (complete ? 'complete' : 'repair required') + '.');
  if (!complete) process.exitCode = 1;
}

main();
