#!/usr/bin/env node
'use strict';

// Additive locale sitemap index. The existing sitemap.xml is intentionally
// preserved and remains available as the original all-pages sitemap.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = process.cwd();
const ORIGIN = 'https://friendlycalculator.in';
const MAX_URLS = 50000;
const MAX_BYTES = 50 * 1024 * 1024;
const LOCALES = new Set(['hi', 'de', 'es', 'fr', 'pt', 'ar', 'id', 'bn', 'ta', 'ja', 'ru', 'mr']);
const EXCLUDED_DIRS = new Set(['.git', '.github', 'node_modules', 'tests', 'admin', 'avnish-ai']);
const EXCLUDED_FILES = new Set(['404.html', 'offline.html']);
const EXCLUDED_PATHS = new Set([
  'calculator/admin.html',
  'google09d3278d6d57b1a4.html',
  'map.html',
  'maps.html',
  'schema/_homepage.html',
  'seo-meta-tags.html'
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) walk(path.join(dir, entry.name), files);
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.html') &&
        !EXCLUDED_FILES.has(entry.name.toLowerCase())) {
      const relative = path.relative(ROOT, path.join(dir, entry.name)).split(path.sep).join('/');
      if (!EXCLUDED_PATHS.has(relative)) files.push(relative);
    }
  }
  return files;
}

function xmlEscape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function canonicalFor(file, html) {
  const tag = html.match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i);
  const href = tag && tag[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
  const fallback = file.endsWith('/index.html')
    ? '/' + file.slice(0, -'index.html'.length)
    : file === 'index.html' ? '/' : '/' + file;
  try {
    const url = new URL(href ? href[1] : fallback, ORIGIN);
    if (url.origin !== ORIGIN || url.search || url.hash) return null;
    return url.href;
  } catch {
    return null;
  }
}

function isNoindex(html) {
  return /<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(html) ||
    /<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(html);
}

function lastmodFor(file) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

function localeFor(file) {
  const first = file.split('/')[0];
  return file.includes('/') && LOCALES.has(first) ? first : 'en';
}

function build() {
  const groups = new Map();
  const seen = new Set();
  const files = walk(ROOT);
  for (const file of files) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (isNoindex(html)) continue;
    const loc = canonicalFor(file, html);
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    const locale = localeFor(file);
    if (!groups.has(locale)) groups.set(locale, []);
    groups.get(locale).push({ loc, lastmod: lastmodFor(file) });
  }

  if (!groups.has('en') || !groups.get('en').some(item => item.loc === ORIGIN + '/')) {
    throw new Error('The English locale sitemap must include the canonical homepage.');
  }

  const outputs = new Map();
  for (const [locale, entries] of groups) {
    entries.sort((a, b) => a.loc.localeCompare(b.loc));
    if (entries.length > MAX_URLS) throw new Error(locale + ' sitemap exceeds 50,000 URLs.');
    const body = entries.map(item =>
      '  <url><loc>' + xmlEscape(item.loc) + '</loc>' +
      (item.lastmod ? '<lastmod>' + item.lastmod + '</lastmod>' : '') +
      '</url>'
    ).join('\n');
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      body + '\n</urlset>\n';
    if (Buffer.byteLength(xml, 'utf8') > MAX_BYTES) throw new Error(locale + ' sitemap exceeds 50 MB.');
    outputs.set('sitemap-' + locale + '.xml', xml);
  }

  const indexEntries = [...outputs.keys()].sort().map(file => {
    const maxDate = groups.get(file.slice('sitemap-'.length, -'.xml'.length))
      .map(item => item.lastmod).filter(Boolean).sort().at(-1);
    return '  <sitemap><loc>' + ORIGIN + '/' + file + '</loc>' +
      (maxDate ? '<lastmod>' + maxDate + '</lastmod>' : '') + '</sitemap>';
  }).join('\n');
  const index = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    indexEntries + '\n</sitemapindex>\n';
  if (Buffer.byteLength(index, 'utf8') > MAX_BYTES) throw new Error('Locale sitemap index exceeds 50 MB.');
  outputs.set('sitemap-locales.xml', index);
  return { outputs, groups, fileCount: files.length };
}

function main() {
  const { outputs, groups, fileCount } = build();
  if (process.argv.includes('--check')) {
    for (const [name, xml] of outputs) {
      if (!xml.startsWith('<?xml') || !xml.includes('<urlset') && !xml.includes('<sitemapindex')) {
        throw new Error('Invalid sitemap XML: ' + name);
      }
    }
    const counts = [...groups.entries()].map(([locale, entries]) => locale + '=' + entries.length).join(', ');
    console.log('Locale sitemap check passed: ' + [...groups.values()].reduce((n, items) => n + items.length, 0) +
      ' unique canonical URLs from ' + fileCount + ' HTML files; ' + counts + '.');
    return;
  }
  for (const [name, xml] of outputs) fs.writeFileSync(path.join(ROOT, name), xml);
  console.log('Generated ' + outputs.size + ' additive locale sitemap files; existing sitemap.xml was not modified.');
}

main();
