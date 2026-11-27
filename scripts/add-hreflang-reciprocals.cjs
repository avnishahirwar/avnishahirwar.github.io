#!/usr/bin/env node
'use strict';

// Remove hreflang links that point to noindex pages, then add only missing valid reciprocals.
// Other existing tags are preserved; conflicting clusters are skipped for manual review.
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
  return /<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(html) ||
    /<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(html);
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
function selfCanonicalCandidates(file) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  const candidates = new Set([new URL('/' + relative, ORIGIN).href]);
  if (relative === 'index.html') candidates.add(new URL('/', ORIGIN).href);
  else if (relative.endsWith('/index.html')) candidates.add(new URL('/' + relative.slice(0, -'index.html'.length), ORIGIN).href);
  return candidates;
}
function linksOf(html) {
  return [...headOf(html).matchAll(/<link\b[^>]*>/gi)].map(match => match[0])
    .filter(tag => /\brel=["']alternate["']/i.test(tag))
    .map(tag => ({
      lang: (tag.match(/\bhreflang=["']([^"']+)["']/i) || [])[1]?.toLowerCase(),
      href: (tag.match(/\bhref=["']([^"']+)["']/i) || [])[1]
    })).filter(link => link.lang && link.href);
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
  const pages = walk(ROOT);
  const cache = new Map(pages.map(file => [file, fs.readFileSync(file, 'utf8')]));
  const additions = new Map();
  const stats = { pages: pages.length, linksExamined: 0, added: 0, removedNoindexTargets: 0, fallbackAdded: 0, alreadyPresent: 0, skippedMissingTarget: 0, skippedLanguageMismatch: 0, skippedCanonicalMismatch: 0, skippedNoncanonicalSource: 0, skippedConflict: 0, skippedNoHead: 0, skippedNoindex: 0 };

  // A page must not advertise a noindex translation as an hreflang alternate.
  // Remove only those invalid target links from indexable source pages; noindex pages
  // themselves remain untouched, and all other existing alternate tags are preserved.
  for (const [sourceFile, sourceHtml] of cache) {
    if (isNoindex(sourceHtml)) continue;
    const invalidTags = [...headOf(sourceHtml).matchAll(/<link\b[^>]*>/gi)].map(match => match[0])
      .filter(tag => /\brel=["']alternate["']/i.test(tag))
      .filter(tag => {
        const href = (tag.match(/\bhref=["']([^"']+)["']/i) || [])[1];
        if (!href) return false;
        const target = targetFile(href);
        if (!target) return false;
        const targetHtml = cache.get(target) || fs.readFileSync(target, 'utf8');
        return isNoindex(targetHtml);
      });
    if (!invalidTags.length) continue;
    let cleaned = sourceHtml;
    for (const tag of invalidTags) cleaned = cleaned.replace(tag, '');
    if (cleaned !== sourceHtml) {
      cache.set(sourceFile, cleaned);
      stats.removedNoindexTargets += invalidTags.length;
    }
  }

  for (const [sourceFile, sourceHtml] of cache) {
    if (isNoindex(sourceHtml)) { stats.skippedNoindex++; continue; }
    const sourceLang = langOf(sourceHtml, sourceFile);
    const sourceCanonical = canonicalOf(sourceHtml);
    if (!sourceCanonical) continue;
    if (!selfCanonicalCandidates(sourceFile).has(sourceCanonical)) { stats.skippedNoncanonicalSource++; continue; }
    for (const link of linksOf(sourceHtml)) {
      stats.linksExamined++;
      if (link.lang === 'x-default') continue;
      const target = targetFile(link.href);
      if (!target) { stats.skippedMissingTarget++; continue; }
      if (target === sourceFile) continue;
      const targetHtml = cache.get(target) || fs.readFileSync(target, 'utf8');
      if (isNoindex(targetHtml)) { stats.skippedNoindex++; continue; }
      if (langOf(targetHtml, target) !== link.lang) { stats.skippedLanguageMismatch++; continue; }
      if (canonicalOf(targetHtml) !== new URL(link.href, ORIGIN).href) { stats.skippedCanonicalMismatch++; continue; }
      const existing = linksOf(targetHtml).filter(item => item.lang === sourceLang);
      if (existing.some(item => new URL(item.href, ORIGIN).href === sourceCanonical)) { stats.alreadyPresent++; continue; }
      if (existing.length) { stats.skippedConflict++; continue; }
      if (!headOf(targetHtml)) { stats.skippedNoHead++; continue; }
      if (!additions.has(target)) additions.set(target, new Set());
      additions.get(target).add('<link rel="alternate" hreflang="' + sourceLang + '" href="' + sourceCanonical + '">');
    }
  }

  // Add x-default only for indexable localized pages that have an indexable,
  // self-canonical English counterpart at the matching route.
  const cataloguePath = path.join(ROOT, 'config/language-catalogue.json');
  // The reciprocal-link unit fixture intentionally contains only a tiny route set.
  // Skip the optional x-default pass when no language catalogue is supplied.
  if (fs.existsSync(cataloguePath)) {
    const languageCatalogue = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
    const localeCodes = new Set(languageCatalogue.locales.map(locale => locale.code));
    for (const [sourceFile, sourceHtml] of cache) {
      if (isNoindex(sourceHtml)) continue;
      const relative = path.relative(ROOT, sourceFile).split(path.sep).join('/');
      const parts = relative.split('/');
      if (parts.length < 2 || !localeCodes.has(parts[0]) || parts[0] === 'en') continue;
      const sourceCanonical = canonicalOf(sourceHtml);
      if (!sourceCanonical || !selfCanonicalCandidates(sourceFile).has(sourceCanonical)) continue;
      const defaultFile = path.join(ROOT, ...parts.slice(1));
      if (!cache.has(defaultFile)) continue;
      const defaultHtml = cache.get(defaultFile);
      if (isNoindex(defaultHtml)) { stats.skippedNoindex++; continue; }
      const defaultCanonical = canonicalOf(defaultHtml);
      if (!defaultCanonical || !selfCanonicalCandidates(defaultFile).has(defaultCanonical)) continue;
      const existingDefault = linksOf(sourceHtml).filter(item => item.lang === 'x-default');
      if (existingDefault.some(item => {
        try { return new URL(item.href, ORIGIN).href === defaultCanonical; } catch { return false; }
      })) continue;
      if (existingDefault.length) { stats.skippedConflict++; continue; }
      if (!additions.has(sourceFile)) additions.set(sourceFile, new Set());
      additions.get(sourceFile).add('<link rel="alternate" hreflang="x-default" href="' + defaultCanonical + '">');
      stats.fallbackAdded++;
    }
  }

  const changedFiles = new Set([...cache.keys()].filter(file => {
    const original = fs.readFileSync(file, 'utf8');
    return cache.get(file) !== original;
  }).concat([...additions.keys()]));
  for (const file of changedFiles) {
    const html = cache.get(file);
    const tags = additions.get(file) || new Set();
    const insertion = [...tags].filter(tag => !html.includes(tag));
    const next = insertion.length ? html.replace(/<\/head>/i, insertion.join('\n') + '\n</head>') : html;
    if (next === html) continue;
    stats.added += insertion.length;
    if (process.argv.includes('--write')) fs.writeFileSync(file, next);
  }
  stats.targetPagesChanged = changedFiles.size;
  console.log('Additive hreflang reciprocal repair: ' + JSON.stringify(stats));
  if (!process.argv.includes('--write')) console.log('Dry run only. No files were changed.');
}
main();
