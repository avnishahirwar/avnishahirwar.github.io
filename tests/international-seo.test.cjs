const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const origin = 'https://friendlycalculator.in';
const localeCodes = new Set(['hi','de','es','fr','pt','ar','id','bn','ta','ja','ru']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['node_modules','vendor','_site','tests'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(full);
  }
  return files;
}
function localeFor(file) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  const first = relative.split('/')[0];
  return localeCodes.has(first) ? first : 'en';
}
function canonicalFor(file, html) {
  const head = html.slice(0, html.indexOf('</head>') < 0 ? html.length : html.indexOf('</head>'));
  const match = head.match(/<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i);
  return match ? new URL(match[1], origin).href : null;
}
function localFileFor(url) {
  const parsed = new URL(url);
  if (parsed.origin !== origin || parsed.search || parsed.hash) return null;
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';
  else if (pathname.endsWith('/')) pathname += 'index.html';
  const candidate = path.resolve(root, '.' + pathname);
  if (!candidate.startsWith(root + path.sep) && candidate !== path.join(root,'index.html')) return null;
  return fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : null;
}
function alternates(html) {
  const head = html.slice(0, html.indexOf('</head>') < 0 ? html.length : html.indexOf('</head>'));
  return [...head.matchAll(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["']([^"']+)["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi)]
    .map(match => ({ lang: match[1].toLowerCase(), href: new URL(match[2], origin).href }));
}

test('all HTML hreflang alternates resolve to real same-domain pages and reciprocal language links', () => {
  const pages = walk(root);
  const cache = new Map();
  for (const file of pages) cache.set(file, fs.readFileSync(file, 'utf8'));
  const errors = [];
  let checked = 0;
  for (const [file, html] of cache) {
    const sourceCanonical = canonicalFor(file, html);
    const links = alternates(html);
    if (!links.length) continue;
    const sourceLocale = localeFor(file);
    const unique = new Set();
    for (const link of links) {
      checked++;
      if (unique.has(link.lang)) errors.push(file + ': duplicate hreflang ' + link.lang);
      unique.add(link.lang);
      const targetFile = localFileFor(link.href);
      if (!targetFile) { errors.push(file + ': ' + link.lang + ' target missing/off-domain: ' + link.href); continue; }
      if (link.lang === 'x-default') continue;
      const targetHtml = cache.get(targetFile) || fs.readFileSync(targetFile, 'utf8');
      const targetLinks = alternates(targetHtml);
      if (!targetLinks.some(item => item.lang === sourceLocale && item.href === sourceCanonical)) {
        errors.push(file + ': ' + link.lang + ' target does not reciprocate ' + sourceLocale + ' -> ' + sourceCanonical);
      }
    }
  }
  console.log('International hreflang audit: ' + pages.length + ' HTML pages, ' + checked + ' alternate references.');
  assert.equal(errors.length, 0, 'Found ' + errors.length + ' hreflang defects:\n' + errors.slice(0, 50).join('\n'));
});
