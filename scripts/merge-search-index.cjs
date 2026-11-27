#!/usr/bin/env node
'use strict';
/**
 * Keep the deferred search index aligned with canonical, indexable calculator
 * pages. Explicitly quality-passed thin pages remain searchable by policy.
 * Merge pending additions only when their published page is eligible.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'assets', 'calculator-search-index.json');
const ADDITIONS = path.join(ROOT, 'assets', 'calculator-search-index-additions.json');
const CHECK = process.argv.includes('--check');
const ORIGIN = 'https://friendlycalculator.in';
const INTERNATIONAL = new Set([
  '/international/vat-calculator.html',
  '/international/uk-student-loan-calculator.html',
  '/international/us-home-affordability-calculator.html'
]);

const index = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
const additions = JSON.parse(fs.readFileSync(ADDITIONS, 'utf8'));
if (!Array.isArray(index) || !Array.isArray(additions)) {
  throw new Error('Expected both files to be JSON arrays');
}

function pageFor(url) {
  if (typeof url !== 'string' || !url.startsWith('/') || !url.endsWith('.html') ||
      url.includes('?') || url.includes('#') || url.split('/').includes('..')) return null;
  if (!url.startsWith('/calculators/') && !INTERNATIONAL.has(url)) return null;
  const absolute = path.resolve(ROOT, url.slice(1));
  if (!absolute.startsWith(ROOT + path.sep) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return null;
  const html = fs.readFileSync(absolute, 'utf8');
  const noindex = /<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(html) ||
    /<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(html);
  const qualityPassed = /data-quality-pass=["']thin["']/i.test(html);
  if (noindex && !qualityPassed) return null;
  const canonicalTag = html.match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i);
  const canonicalHref = canonicalTag && canonicalTag[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
  if (!canonicalHref) return null;
  try {
    const canonical = new URL(canonicalHref[1], ORIGIN);
    if (canonical.origin !== ORIGIN || canonical.search || canonical.hash || canonical.pathname !== url) return null;
  } catch { return null; }
  return { html, qualityPassed };
}

const filtered = [];
const existing = new Set();
let removedEntries = 0;
let duplicateEntries = 0;
for (const entry of index) {
  if (!entry || typeof entry.url !== 'string' || existing.has(entry.url)) {
    removedEntries++;
    if (entry && typeof entry.url === 'string' && existing.has(entry.url)) duplicateEntries++;
    continue;
  }
  if (!pageFor(entry.url)) {
    removedEntries++;
    continue;
  }
  filtered.push(entry);
  existing.add(entry.url);
}

const missingPages = [];
let added = 0;
for (const entry of additions) {
  if (!entry || typeof entry.name !== 'string' || !entry.name.trim() ||
      typeof entry.url !== 'string' || !entry.url.startsWith('/calculators/') ||
      !entry.url.endsWith('.html') || entry.url.includes('?') ||
      entry.url.includes('#') || entry.url.split('/').includes('..')) {
    throw new Error('Addition must have a valid calculator name and local /calculators/*.html URL');
  }
  if (existing.has(entry.url)) {
    duplicateEntries++;
    continue;
  }
  if (!pageFor(entry.url)) {
    const absolute = path.resolve(ROOT, entry.url.slice(1));
    if (!absolute.startsWith(path.join(ROOT, 'calculators') + path.sep) ||
        !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) missingPages.push(entry.url);
    else removedEntries++;
    continue;
  }
  filtered.push({
    name: entry.name.trim(),
    url: entry.url,
    category: entry.category || 'Everyday Life',
    keywords: entry.keywords || entry.name.toLowerCase(),
    description: entry.description || ''
  });
  existing.add(entry.url);
  added++;
}
filtered.sort((a, b) => a.url.localeCompare(b.url));

console.log(
  'calculator-search-index: ' + index.length + ' -> ' + filtered.length +
  ' entries (added ' + added + ', removed ineligible/duplicate ' + removedEntries +
  ', already indexed additions ' + duplicateEntries + ', missing page ' + missingPages.length + ')'
);
if (missingPages.length) {
  console.warn('Skipped ' + missingPages.length + ' addition(s) without a published HTML page: ' + missingPages.join(', '));
}
if (CHECK) {
  if (added || removedEntries || missingPages.length) {
    throw new Error('Search index is stale. Run node scripts/merge-search-index.cjs to synchronize eligible canonical pages.');
  }
  console.log('Search index is already up to date.');
} else if (added || removedEntries) {
  fs.writeFileSync(INDEX, JSON.stringify(filtered, null, 2) + '\n');
}
