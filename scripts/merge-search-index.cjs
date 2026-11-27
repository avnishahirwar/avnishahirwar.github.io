#!/usr/bin/env node
'use strict';
/**
 * Reconcile the public calculator search index with the canonical XML sitemap
 * plus deliberately retained AdSense-quality-pass pages. The sitemap is the
 * source of truth for indexable routes; existing labels/keywords are preserved.
 * Usage: node scripts/merge-search-index.cjs [--check]
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'assets', 'calculator-search-index.json');
const ADDITIONS_PATH = path.join(ROOT, 'assets', 'calculator-search-index-additions.json');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const CHECK = process.argv.includes('--check');
const SITE_ORIGIN = 'https://friendlycalculator.in';
const INTERNATIONAL_SEARCH_PATHS = [
  '/international/vat-calculator.html',
  '/international/uk-student-loan-calculator.html',
  '/international/us-home-affordability-calculator.html'
];

function readJson(file) {
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(value)) throw new Error(path.basename(file) + ' must contain a JSON array');
  return value;
}
function pageFor(url) {
  if (typeof url !== 'string' || !url.startsWith('/') || !url.endsWith('.html') ||
      url.includes('?') || url.includes('#') || url.split('/').includes('..')) return null;
  const absolute = path.resolve(ROOT, url.slice(1));
  if (!absolute.startsWith(ROOT + path.sep) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return null;
  return absolute;
}
function canonicalPath(html) {
  const tag = html.match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i);
  const href = tag && tag[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
  if (!href) return null;
  try {
    const url = new URL(href[1], SITE_ORIGIN);
    return url.origin === SITE_ORIGIN && !url.search && !url.hash ? url.pathname : null;
  } catch { return null; }
}
function isNoindex(html) {
  return /<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(html) ||
    /<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(html);
}
function textFrom(html, pattern, fallback = '') {
  const match = html.match(pattern);
  return match ? match[1].replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim() : fallback;
}
function buildAllowedUrls() {
  if (!fs.existsSync(SITEMAP_PATH)) throw new Error('sitemap.xml is required; generate it before reconciling the search index.');
  const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const allowed = new Set([...sitemap.matchAll(/<loc>(https:\/\/friendlycalculator\.in[^<]*)<\/loc>/g)]
    .map(match => {
      try { return new URL(match[1]).pathname; } catch { return null; }
    })
    .filter(url => url && url.startsWith('/calculators/')));
  for (const url of INTERNATIONAL_SEARCH_PATHS) {
    if (sitemap.includes(SITE_ORIGIN + url)) allowed.add(url);
  }
  const calculatorDir = path.join(ROOT, 'calculators');
  for (const name of fs.readdirSync(calculatorDir)) {
    if (!name.endsWith('.html')) continue;
    const url = '/calculators/' + name;
    const absolute = path.join(calculatorDir, name);
    const html = fs.readFileSync(absolute, 'utf8');
    if (html.includes('data-quality-pass="thin"') && canonicalPath(html) === url) allowed.add(url);
  }
  return [...allowed].sort();
}
function normalizedIndex(existingEntries, additions, allowedUrls) {
  const existingByUrl = new Map();
  for (const entry of existingEntries) {
    if (entry && typeof entry.url === 'string' && !existingByUrl.has(entry.url)) existingByUrl.set(entry.url, entry);
  }
  const additionsByUrl = new Map();
  for (const entry of additions) {
    if (!entry || typeof entry.name !== 'string' || !entry.name.trim() ||
        typeof entry.url !== 'string' || !entry.url.startsWith('/calculators/') ||
        !entry.url.endsWith('.html') || entry.url.includes('?') || entry.url.includes('#') ||
        entry.url.split('/').includes('..')) {
      throw new Error('Addition must have a valid calculator name and local /calculators/*.html URL');
    }
    if (!additionsByUrl.has(entry.url)) additionsByUrl.set(entry.url, entry);
  }
  const allowed = new Set(allowedUrls);
  const output = [];
  for (const url of allowedUrls) {
    const absolute = pageFor(url);
    if (!absolute) continue;
    const html = fs.readFileSync(absolute, 'utf8');
    const thin = html.includes('data-quality-pass="thin"');
    if (canonicalPath(html) !== url || (isNoindex(html) && !thin)) continue;
    const previous = existingByUrl.get(url);
    const addition = additionsByUrl.get(url);
    const title = textFrom(html, /<title[^>]*>([\s\S]*?)<\/title>/i, path.basename(url, '.html').replace(/-/g, ' '));
    const h1 = textFrom(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i, title);
    const description = textFrom(html, /<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']*)["']/i, '');
    output.push({
      ...(previous || {}),
      name: previous?.name || addition?.name || h1,
      url,
      category: previous?.category || addition?.category || 'Other',
      keywords: previous?.keywords || addition?.keywords || h1.toLowerCase(),
      description: previous?.description || addition?.description || description
    });
  }
  const skippedAdditions = [...additionsByUrl.keys()].filter(url => !allowed.has(url));
  return { output, skippedAdditions };
}
function main() {
  const existing = readJson(INDEX_PATH);
  const additions = readJson(ADDITIONS_PATH);
  const allowedUrls = buildAllowedUrls();
  const { output, skippedAdditions } = normalizedIndex(existing, additions, allowedUrls);
  const before = JSON.stringify(existing);
  const after = JSON.stringify(output);
  const removed = existing.length - existing.filter(entry => entry && output.some(next => next.url === entry.url)).length;
  const duplicateRows = existing.length - new Set(existing.map(entry => entry && entry.url).filter(Boolean)).size;
  const changed = before !== after;
  console.log('calculator-search-index: ' + existing.length + ' -> ' + output.length +
    ' canonical entries (removed ' + Math.max(0, removed) + ' stale/duplicate rows; ' +
    duplicateRows + ' duplicate source rows; ' + skippedAdditions.length + ' additions not yet in sitemap).');
  if (skippedAdditions.length) {
    console.warn('Additions not in the generated sitemap yet: ' + skippedAdditions.join(', '));
  }
  if (CHECK) {
    if (changed) throw new Error('Search index is not synchronized with the canonical sitemap. Run node scripts/merge-search-index.cjs.');
    console.log('Search index check passed: ' + output.length + ' unique canonical entries.');
    return;
  }
  if (changed) fs.writeFileSync(INDEX_PATH, JSON.stringify(output, null, 2) + '\n');
}
if (require.main === module) main();
module.exports = { buildAllowedUrls, normalizedIndex };
