#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = process.cwd();
const SITE_ORIGIN = 'https://friendlycalculator.in';
const MAX_URLS_PER_SITEMAP = 45000;
const LOCALES = new Set(['hi', 'es', 'fr', 'pt', 'ar', 'id', 'bn', 'ta']);
const EXCLUDED_DIRS = new Set([
  '.git', '.github', 'node_modules', 'tests', 'admin', 'avnish-ai'
]);
const EXCLUDED_FILES = new Set([
  '404.html', 'offline.html'
]);
const EXCLUDED_PATHS = new Set([
  'calculator/admin.html'
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

function readPage(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function getCanonical(file, html) {
  const match = html.match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i);
  const href = match && match[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
  const fallbackPath = file.endsWith('/index.html')
    ? '/' + file.slice(0, -'index.html'.length)
    : file === 'index.html' ? '/' : '/' + file;
  const candidate = href ? href[1] : SITE_ORIGIN + fallbackPath;
  try {
    const url = new URL(candidate, SITE_ORIGIN);
    if (url.origin !== SITE_ORIGIN || url.search || url.hash) return null;
    return url.href;
  } catch {
    return null;
  }
}

function isNoindex(html) {
  return /<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(html) ||
    /<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(html);
}

function getLastmod(file) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

function classify(file) {
  const parts = file.split('/');
  const locale = LOCALES.has(parts[0]) ? parts[0] : 'en';
  const rest = LOCALES.has(parts[0]) ? parts.slice(1) : parts;
  if (rest[0] === 'calculators') return 'calculators-' + locale;
  if (rest[0] === 'blog') return 'blog-' + locale;
  if (rest[0] === 'guides') return 'guides-' + locale;
  return 'pages';
}

function xmlEscape(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function urlset(entries) {
  const body = entries.map(entry =>
    '  <url><loc>' + xmlEscape(entry.loc) + '</loc>' +
    (entry.lastmod ? '<lastmod>' + entry.lastmod + '</lastmod>' : '') +
    '</url>'
  ).join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body + '\n</urlset>\n';
}

function build() {
  const groups = new Map();
  const seen = new Set();
  const candidates = walk(ROOT);

  for (const file of candidates) {
    const html = readPage(file);
    if (isNoindex(html)) continue;
    const loc = getCanonical(file, html);
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    const key = classify(file);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ loc, lastmod: getLastmod(file) });
  }

  if (!seen.has(SITE_ORIGIN + '/')) {
    throw new Error('The homepage was not found as an indexable canonical URL.');
  }
  if (seen.size > 50000 * 100) {
    throw new Error('Unexpectedly large URL inventory; review sitemap sharding.');
  }

  const outputs = new Map();
  const sitemapNames = [];
  for (const [group, entries] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    entries.sort((a, b) => a.loc.localeCompare(b.loc));
    for (let offset = 0, shard = 1; offset < entries.length; offset += MAX_URLS_PER_SITEMAP, shard++) {
      const suffix = entries.length > MAX_URLS_PER_SITEMAP ? '-' + shard : '';
      const name = 'sitemap-' + group + suffix + '.xml';
      outputs.set(name, urlset(entries.slice(offset, offset + MAX_URLS_PER_SITEMAP)));
      sitemapNames.push(name);
    }
  }

  const indexEntries = sitemapNames.map(name =>
    '  <sitemap><loc>' + SITE_ORIGIN + '/' + name + '</loc></sitemap>'
  ).join('\n');
  outputs.set('sitemap.xml',
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    indexEntries + '\n</sitemapindex>\n'
  );
  return { outputs, urlCount: seen.size, pageCount: candidates.length };
}

function main() {
  const { outputs, urlCount, pageCount } = build();
  if (process.argv.includes('--check')) {
    if (!outputs.has('sitemap.xml') || outputs.size < 2) {
      throw new Error('Sitemap index or child sitemap output is missing.');
    }
    for (const [name, content] of outputs) {
      if (!content.startsWith('<?xml') || !content.includes('<' + (name === 'sitemap.xml' ? 'sitemapindex' : 'urlset'))) {
        throw new Error('Invalid XML envelope: ' + name);
      }
    }
    console.log('Sitemap check passed: ' + urlCount + ' unique canonical URLs from ' +
      pageCount + ' HTML files across ' + outputs.size + ' sitemap files.');
    return;
  }

  for (const [name, content] of outputs) fs.writeFileSync(path.join(ROOT, name), content);
  console.log('Generated ' + outputs.size + ' sitemap files for ' + urlCount +
    ' unique canonical URLs from ' + pageCount + ' HTML files.');
}

main();
