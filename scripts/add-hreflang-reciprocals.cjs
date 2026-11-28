#!/usr/bin/env node
'use strict';

// Add only missing reciprocal hreflang links. Never remove, rewrite or deduplicate
// existing tags. Conflicting or invalid clusters are skipped for manual review.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = process.cwd();
const ORIGIN = 'https://friendlycalculator.in';
const SUPPORTED_HREFLANG = /^[a-z]{2}(?:-[a-z0-9]{2,8})*$/i;
const KNOWN_UNTRANSLATED_TARGETS = new Set([
  '/am/calculators/rd-calculator.html',
  '/de/calculators/rd-calculator.html',
  '/ja/calculators/loan-emi-calculator.html',
  '/fa/calculators/loan-emi-calculator.html',
  '/vi/calculators/loan-emi-calculator.html'
]);

// Only add reciprocal links for route-specific language sets that are already
// published and verified by the repository's locale-cluster tests. Expand a
// route only after its localized page is reviewed; do not infer translation
// from a folder name or <html lang> attribute alone.
const BASE_LOCALES = ['en', 'hi', 'es', 'fr', 'pt', 'ar', 'id', 'bn', 'ta'];
const TOP_HINDI_LOCALES = [...BASE_LOCALES, 'mr', 'te'];
const EXPANDED_BASIC_LOCALES = [...BASE_LOCALES, 'de', 'ja', 'ru', 'vi', 'te', 'gu', 'kn'];
const PUBLISHED_HREFLANG_LOCALES_BY_ROUTE = {
  'currency-converter-calculator.html': BASE_LOCALES,
  'percentage-calculator.html': ['en', 'hi', 'de', 'es', 'fr', 'pt', 'ar', 'id', 'bn', 'ta', 'ja', 'ru'],
  'simple-interest-calculator.html': ['en', 'bn', 'ar', 'es', 'fr', 'hi', 'id', 'pt', 'ta'],
  'basic-calculator.html': EXPANDED_BASIC_LOCALES,
  'bike-loan-calculator.html': BASE_LOCALES,
  'business-loan-emi-calculator.html': BASE_LOCALES,
  'car-loan-calculator.html': BASE_LOCALES,
  'discount-calculator.html': BASE_LOCALES,
  'ppf-calculator.html': BASE_LOCALES,
  'loan-emi-calculator.html': TOP_HINDI_LOCALES,
  'home-loan-emi-calculator.html': TOP_HINDI_LOCALES,
  'personal-loan-eligibility-calculator.html': TOP_HINDI_LOCALES,
  'sip-calculator.html': TOP_HINDI_LOCALES,
  'fd-calculator.html': TOP_HINDI_LOCALES,
  'rd-calculator.html': TOP_HINDI_LOCALES,
  'gst-calculator.html': TOP_HINDI_LOCALES,
  'income-tax-calculator.html': TOP_HINDI_LOCALES
};
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
function repositoryPath(file) {
  return '/' + path.relative(ROOT, file).split(path.sep).join('/');
}
function calculatorRoute(pathname) {
  const marker = '/calculators/';
  const index = pathname.lastIndexOf(marker);
  return index < 0 ? null : pathname.slice(index + marker.length).split('/')[0].toLowerCase();
}
function localeIsAllowed(allowed, locale) {
  if (!allowed) return false;
  const normalized = locale.toLowerCase();
  return allowed.includes(normalized) || allowed.includes(normalized.split('-')[0]);
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
  const stats = { pages: pages.length, linksExamined: 0, added: 0, alreadyPresent: 0, skippedMissingTarget: 0, skippedLanguageMismatch: 0, skippedCanonicalMismatch: 0, skippedNoncanonicalSource: 0, skippedConflict: 0, skippedNoHead: 0, skippedNoindex: 0, skippedUnsupportedLanguageCode: 0, skippedKnownUntranslatedTarget: 0, skippedKnownUntranslatedSource: 0, skippedUnreviewedRoute: 0, skippedLocaleNotPublishedForRoute: 0 };

  for (const [sourceFile, sourceHtml] of cache) {
    if (KNOWN_UNTRANSLATED_TARGETS.has(repositoryPath(sourceFile))) { stats.skippedKnownUntranslatedSource++; continue; }
    if (isNoindex(sourceHtml)) { stats.skippedNoindex++; continue; }
    const sourceLang = langOf(sourceHtml, sourceFile);
    if (!SUPPORTED_HREFLANG.test(sourceLang)) { stats.skippedUnsupportedLanguageCode++; continue; }
    const sourceCanonical = canonicalOf(sourceHtml);
    if (!sourceCanonical) continue;
    if (!selfCanonicalCandidates(sourceFile).has(sourceCanonical)) { stats.skippedNoncanonicalSource++; continue; }
    const sourceRoute = calculatorRoute(new URL(sourceCanonical).pathname);
    const allowedLocales = sourceRoute && PUBLISHED_HREFLANG_LOCALES_BY_ROUTE[sourceRoute];
    if (!allowedLocales) { stats.skippedUnreviewedRoute++; continue; }
    if (!localeIsAllowed(allowedLocales, sourceLang)) { stats.skippedLocaleNotPublishedForRoute++; continue; }
    for (const link of linksOf(sourceHtml)) {
      stats.linksExamined++;
      if (link.lang === 'x-default') continue;
      if (!SUPPORTED_HREFLANG.test(link.lang)) { stats.skippedUnsupportedLanguageCode++; continue; }
      let targetUrl;
      let decodedPath;
      try {
        targetUrl = new URL(link.href, ORIGIN);
        decodedPath = decodeURIComponent(targetUrl.pathname);
      } catch {
        stats.skippedMissingTarget++;
        continue;
      }
      if (KNOWN_UNTRANSLATED_TARGETS.has(decodedPath)) { stats.skippedKnownUntranslatedTarget++; continue; }
      if (calculatorRoute(decodedPath) !== sourceRoute || !localeIsAllowed(allowedLocales, link.lang)) {
        stats.skippedLocaleNotPublishedForRoute++;
        continue;
      }
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

  for (const [file, tags] of additions) {
    const html = cache.get(file);
    const insertion = [...tags].filter(tag => !html.includes(tag));
    if (!insertion.length) continue;
    const next = html.replace(/<\/head>/i, insertion.join('\n') + '\n</head>');
    if (next === html) continue;
    stats.added += insertion.length;
    if (process.argv.includes('--write')) fs.writeFileSync(file, next);
  }
  stats.targetPagesChanged = additions.size;
  console.log('Additive hreflang reciprocal repair: ' + JSON.stringify(stats));
  if (!process.argv.includes('--write')) console.log('Dry run only. No files were changed.');
}
main();
