#!/usr/bin/env node
'use strict';

// Add only missing reciprocal hreflang links. Never remove, rewrite or deduplicate
// existing tags. Conflicting or invalid clusters are skipped for manual review.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = process.cwd();
const ORIGIN = 'https://friendlycalculator.in';
const EXCLUDED_CONTENT_PATH = /(?:alcohol|beer|wine|cocktail|cigarette|nicotine|tobacco|vape|liquor|cannabis|marijuana|cbd|thc|weed|meth|cocaine|opioid|drug|intoxicant|ethanol|vodka|whiskey|smoking|vaping|pesticide|poison|toxin)/i;
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
function isNoindex(html) {
  return /<meta\\b[^>]*\\bname=["'](?:robots|googlebot)["'][^>]*\\bcontent=["'][^"']*\\bnoindex\\b/i.test(html) ||
    /<meta\\b[^>]*\\bcontent=["'][^"']*\\bnoindex\\b[^"']*["'][^>]*\\bname=["'](?:robots|googlebot)["']/i.test(html);
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
  const stats = { pages: pages.length, linksExamined: 0, added: 0, alreadyPresent: 0, skippedMissingTarget: 0, skippedLanguageMismatch: 0, skippedCanonicalMismatch: 0, skippedConflict: 0, skippedNoHead: 0, skippedRestrictedContent: 0, skippedNoindex: 0 };

  for (const [sourceFile, sourceHtml] of cache) {
    if (EXCLUDED_CONTENT_PATH.test(path.relative(ROOT, sourceFile))) { stats.skippedRestrictedContent++; continue; }
    if (isNoindex(sourceHtml)) { stats.skippedNoindex++; continue; }
    const sourceLang = langOf(sourceHtml, sourceFile);
    const sourceCanonical = canonicalOf(sourceHtml);
    if (!sourceCanonical) continue;
    for (const link of linksOf(sourceHtml)) {
      stats.linksExamined++;
      if (link.lang === 'x-default') continue;
      const target = targetFile(link.href);
      if (!target) { stats.skippedMissingTarget++; continue; }
      if (EXCLUDED_CONTENT_PATH.test(path.relative(ROOT, target))) { stats.skippedRestrictedContent++; continue; }
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
