#!/usr/bin/env node
'use strict';

// Remove only hreflang alternate tags that point to non-indexable or invalid
// targets. Noindex pages must not advertise hreflang clusters. All other page
// content, canonical tags, URLs, and robots directives are preserved.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = process.cwd();
const ORIGIN = 'https://friendlycalculator.in';
const IGNORE = new Set(['.git', '.github', 'node_modules', 'tests', 'vendor', '_site', 'admin', 'avnish-ai']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || IGNORE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(full);
  }
  return files;
}
function headOf(html) {
  const end = html.toLowerCase().indexOf('</head>');
  return end < 0 ? '' : html.slice(0, end);
}
function isNoindex(html) {
  const head = headOf(html);
  return /<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(head) ||
    /<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(head);
}
function langOf(html, file) {
  const match = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i);
  if (match) return match[1].toLowerCase();
  const first = path.relative(ROOT, file).split(path.sep)[0];
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i.test(first) ? first.toLowerCase() : 'en';
}
function canonicalOf(html) {
  const tag = headOf(html).match(/<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i);
  if (!tag) return null;
  try {
    const url = new URL(tag[1], ORIGIN);
    return url.origin === ORIGIN && !url.search && !url.hash ? url.href : null;
  } catch { return null; }
}
function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return result;
}
function alternateTags(html) {
  return [...headOf(html).matchAll(/<link\b[^>]*>/gi)]
    .filter(match => String(attributes(match[0]).rel || '').toLowerCase().split(/\s+/).includes('alternate'))
    .map(match => ({ tag: match[0], attrs: attributes(match[0]) }))
    .filter(item => item.attrs.hreflang && item.attrs.href);
}
function targetFile(href) {
  try {
    const url = new URL(href, ORIGIN);
    if (url.origin !== ORIGIN || url.search || url.hash) return null;
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    else if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(ROOT, '.' + pathname);
    if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) return null;
    return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
  } catch { return null; }
}
function main() {
  const files = walk(ROOT);
  const cache = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
  const remove = new Map();
  const stats = { pages: files.length, noindexPagesCleaned: 0, removedFromNoindexPages: 0, removedNoindexTargets: 0, removedMissingOrOffsiteTargets: 0, removedLanguageMismatches: 0, removedCanonicalMismatches: 0, removedNonReciprocalLinks: 0, removedDuplicateLanguages: 0, filesChanged: 0 };
  for (const [file, html] of cache) {
    const tags = alternateTags(html);
    if (!tags.length) continue;
    const doomed = new Set();
    if (isNoindex(html)) {
      stats.noindexPagesCleaned++;
      for (const item of tags) { doomed.add(item.tag); stats.removedFromNoindexPages++; }
      remove.set(file, doomed);
      continue;
    }
    const canonical = canonicalOf(html);
    const sourceLang = langOf(html, file);
    const seen = new Set();
    for (const item of tags) {
      const hreflang = String(item.attrs.hreflang).toLowerCase();
      const href = new URL(item.attrs.href, ORIGIN).href;
      if (seen.has(hreflang)) {
        doomed.add(item.tag); stats.removedDuplicateLanguages++; continue;
      }
      seen.add(hreflang);
      const target = targetFile(href);
      if (!target) { doomed.add(item.tag); stats.removedMissingOrOffsiteTargets++; continue; }
      const targetHtml = cache.get(target) || fs.readFileSync(target, 'utf8');
      if (isNoindex(targetHtml)) { doomed.add(item.tag); stats.removedNoindexTargets++; continue; }
      if (hreflang === 'x-default') continue;
      if (langOf(targetHtml, target) !== hreflang) { doomed.add(item.tag); stats.removedLanguageMismatches++; continue; }
      if (canonicalOf(targetHtml) !== href) { doomed.add(item.tag); stats.removedCanonicalMismatches++; continue; }
      if (!canonical || !alternateTags(targetHtml).some(link =>
        String(link.attrs.hreflang).toLowerCase() === sourceLang &&
        new URL(link.attrs.href, ORIGIN).href === canonical)) {
        doomed.add(item.tag); stats.removedNonReciprocalLinks++;
      }
    }
    if (doomed.size) remove.set(file, doomed);
  }
  const write = process.argv.includes('--write');
  for (const [file, tags] of remove) {
    let html = cache.get(file);
    for (const tag of tags) html = html.replace(tag, '');
    if (html !== cache.get(file)) {
      stats.filesChanged++;
      if (write) fs.writeFileSync(file, html);
    }
  }
  console.log('Invalid hreflang cleanup: ' + JSON.stringify(stats));
  if (!write) console.log('Dry run only. No files were changed.');
}
main();
