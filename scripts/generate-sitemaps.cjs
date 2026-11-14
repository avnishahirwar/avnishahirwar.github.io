#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = process.cwd();
const SITE_ORIGIN = 'https://friendlycalculator.in';
const MAX_URLS = 50000;
const MAX_BYTES = 50 * 1024 * 1024;
const EXCLUDED_DIRS = new Set([
  '.git', '.github', 'node_modules', 'tests', 'admin', 'avnish-ai'
]);
const EXCLUDED_FILES = new Set(['404.html', 'offline.html']);
const EXCLUDED_PATHS = new Set(['calculator/admin.html']);

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

function xmlEscape(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function build() {
  const seen = new Set();
  const entries = [];
  const candidates = walk(ROOT);

  for (const file of candidates) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (isNoindex(html)) continue;
    const loc = getCanonical(file, html);
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    entries.push({ loc, lastmod: getLastmod(file) });
  }

  if (!seen.has(SITE_ORIGIN + '/')) {
    throw new Error('The homepage was not found as an indexable canonical URL.');
  }
  if (entries.length > MAX_URLS) {
    throw new Error('Single sitemap limit exceeded: ' + entries.length + ' URLs (maximum ' + MAX_URLS + ').');
  }

  entries.sort((a, b) => a.loc.localeCompare(b.loc));
  const body = entries.map(entry =>
    '  <url><loc>' + xmlEscape(entry.loc) + '</loc>' +
    (entry.lastmod ? '<lastmod>' + entry.lastmod + '</lastmod>' : '') +
    '</url>'
  ).join('\n');
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body + '\n</urlset>\n';

  if (Buffer.byteLength(xml, 'utf8') > MAX_BYTES) {
    throw new Error('Single sitemap exceeds the 50 MB uncompressed limit.');
  }
  return { xml, urlCount: entries.length, pageCount: candidates.length };
}

function main() {
  const { xml, urlCount, pageCount } = build();
  if (process.argv.includes('--check')) {
    if (!xml.startsWith('<?xml') || !xml.includes('<urlset')) {
      throw new Error('Invalid sitemap XML envelope.');
    }
    console.log('Single sitemap check passed: ' + urlCount +
      ' unique canonical URLs from ' + pageCount + ' HTML files.');
    return;
  }
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
  console.log('Generated one sitemap.xml with ' + urlCount +
    ' unique canonical URLs from ' + pageCount + ' HTML files.');
}

main();
