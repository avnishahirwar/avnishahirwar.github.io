#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'assets/calculator-search-index.json');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.html');

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function slug(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function displayCategory(value) {
  const label = String(value || 'Other').trim() || 'Other';
  if (label === label.toLocaleUpperCase('en')) {
    return label.toLocaleLowerCase('en').replace(/\b[a-z]/g, letter => letter.toLocaleUpperCase('en'));
  }
  return label;
}

function buildCategoryGroups(entries) {
  const grouped = new Map();
  for (const entry of entries) {
    const original = String(entry.category || 'Other').trim() || 'Other';
    const key = original.toLocaleLowerCase('en');
    if (!grouped.has(key)) grouped.set(key, { labels: [], items: [] });
    const group = grouped.get(key);
    if (!group.labels.includes(original)) group.labels.push(original);
    group.items.push(entry);
  }
  return [...grouped.values()].map(group => {
    const preferred = group.labels.find(label => label !== label.toLocaleUpperCase('en')) || group.labels[0];
    return { label: displayCategory(preferred), items: group.items };
  }).sort((a, b) => a.label.localeCompare(b.label, 'en'));
}

function renderCategoryNavigation(groups) {
  return '<nav class="sitemap-category-index" aria-label="Jump to a calculator category">' +
    groups.map((group, index) => {
      const id = slug(group.label) + '-' + (index + 1);
      return '<a href="#' + id + '">' + escapeHtml(group.label) +
        ' <span>' + group.items.length.toLocaleString('en-US') + '</span></a>';
    }).join('\n') + '</nav>';
}

function renderCategoryGroups(groups) {
  return '<div id="sitemap-categories">\n' + groups.map((group, index) => {
    const id = slug(group.label) + '-' + (index + 1);
    const items = [...group.items].sort((a, b) =>
      String(a.name).localeCompare(String(b.name), 'en') || String(a.url).localeCompare(String(b.url), 'en'));
    const rows = items.map(item => {
      const name = String(item.name || '').trim();
      const url = String(item.url || '').trim();
      return '<li class="sitemap-item" data-search="' + escapeHtml(name + ' ' + group.label) +
        '"><a href="' + escapeHtml(url) + '">' + escapeHtml(name) + '</a></li>';
    }).join('\n');
    return '<details class="sitemap-category" id="' + id + '" data-sitemap-category><summary><span>' +
      escapeHtml(group.label) + '</span><span class="sitemap-count">' +
      items.length.toLocaleString('en-US') + ' pages</span></summary><ul>\n' + rows +
      '\n</ul></details>';
  }).join('\n') + '\n</div>';
}

function renderHumanSitemap(template, entries) {
  const groups = buildCategoryGroups(entries);
  const calculatorCount = entries.filter(entry => String(entry.url).startsWith('/calculators/')).length;
  const internationalCount = entries.length - calculatorCount;
  let html = template.replace(/<div class="fc-sitemap-stats">[\s\S]*?<\/div>/,
    '<div class="fc-sitemap-stats"><span><strong>' + entries.length.toLocaleString('en-US') +
    '</strong> public catalogue entries</span><span><strong>' + calculatorCount.toLocaleString('en-US') +
    '</strong> calculator pages</span><span><strong>' + groups.length.toLocaleString('en-US') +
    '</strong> catalogue categories</span><span><strong>' + internationalCount.toLocaleString('en-US') +
    '</strong> international entries</span></div>');
  const navStart = html.indexOf('<nav class="sitemap-category-index"');
  const navEnd = navStart < 0 ? -1 : html.indexOf('</nav>', navStart) + '</nav>'.length;
  if (navStart < 0 || navEnd < '</nav>'.length) throw new Error('Could not locate sitemap category navigation.');
  html = html.slice(0, navStart) + renderCategoryNavigation(groups) + html.slice(navEnd);

  const categoriesStart = html.indexOf('<div id="sitemap-categories">');
  const categoriesEnd = categoriesStart < 0 ? -1 : html.indexOf('</div></section>', categoriesStart);
  if (categoriesStart < 0 || categoriesEnd < 0) throw new Error('Could not locate sitemap category content.');
  html = html.slice(0, categoriesStart) + renderCategoryGroups(groups) + html.slice(categoriesEnd + '</div>'.length);
  html = html.replace(/data-sitemap-total="\d+"/, 'data-sitemap-total="' + entries.length + '"');
  html = html.replace(/(<p class="fc-sitemap-status"[^>]*>)[\s\S]*?(<\/p>)/, '$1' + entries.length.toLocaleString('en-US') + ' entries across ' + groups.length.toLocaleString('en-US') + ' categories.$2');
  return html;
}

function build() {
  const entries = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  if (!Array.isArray(entries) || entries.some(entry =>
    !entry || typeof entry.name !== 'string' || typeof entry.url !== 'string' ||
    !entry.name.trim() || !entry.url.startsWith('/'))) {
    throw new Error('Calculator search index contains invalid sitemap entries.');
  }
  const urls = entries.map(entry => entry.url);
  if (new Set(urls).size !== urls.length) throw new Error('Calculator search index contains duplicate URLs.');
  const template = fs.readFileSync(SITEMAP_PATH, 'utf8');
  return { html: renderHumanSitemap(template, entries), entries };
}

function main() {
  const { html, entries } = build();
  const current = fs.readFileSync(SITEMAP_PATH, 'utf8');
  if (process.argv.includes('--check')) {
    if (html !== current) throw new Error('Human sitemap is out of date. Run node scripts/generate-human-sitemap.cjs.');
    console.log('Human sitemap check passed: ' + entries.length + ' unique catalogue entries.');
    return;
  }
  fs.writeFileSync(SITEMAP_PATH, html);
  console.log('Generated human sitemap with ' + entries.length + ' unique catalogue entries.');
}

if (require.main === module) main();

module.exports = { buildCategoryGroups, renderHumanSitemap };
