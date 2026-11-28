#!/usr/bin/env node
'use strict';
/**
 * Reconcile the homepage search index with the current canonical public sitemap.
 * The raw additions file is retained as source history, but only public,
 * self-canonical calculator routes are exposed in the primary search index.
 * Selected international calculators are included explicitly.
 *
 * Usage: node scripts/merge-search-index.cjs [--check]
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'assets', 'calculator-search-index.json');
const ADDITIONS = path.join(ROOT, 'assets', 'calculator-search-index-additions.json');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const SITE_ORIGIN = 'https://friendlycalculator.in';
const CHECK = process.argv.includes('--check');
const INTERNATIONAL_ROUTES = new Set([
  '/international/vat-calculator.html',
  '/international/uk-student-loan-calculator.html',
  '/international/us-home-affordability-calculator.html'
]);

function sitemapPublicRoutes(xml) {
  const routes = new Set();
  for (const match of xml.matchAll(/<loc>\s*(https:\/\/friendlycalculator\.in[^<]*)<\/loc>/gi)) {
    let url;
    try {
      url = new URL(match[1].replace(/&amp;/g, '&'));
    } catch {
      continue;
    }
    if (url.origin !== SITE_ORIGIN || url.search || url.hash) continue;
    const route = url.pathname;
    if (route.startsWith('/calculators/') && route.endsWith('.html')) routes.add(route);
  }
  for (const route of INTERNATIONAL_ROUTES) {
    if (xml.includes('<loc>' + SITE_ORIGIN + route + '</loc>')) routes.add(route);
  }
  return routes;
}

function main() {
  const existingIndex = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
  const additions = JSON.parse(fs.readFileSync(ADDITIONS, 'utf8'));
  const sitemap = fs.readFileSync(SITEMAP, 'utf8');
  if (!Array.isArray(existingIndex) || !Array.isArray(additions)) {
    throw new Error('Expected search index and additions to be JSON arrays');
  }

  const publicRoutes = sitemapPublicRoutes(sitemap);
  if (!publicRoutes.size) throw new Error('No canonical public calculator routes were found in sitemap.xml.');

  const byUrl = new Map();
  let removed = 0;
  let duplicateEntries = 0;
  let deferredAdditions = 0;
  let missingPages = 0;

  for (const entry of existingIndex) {
    if (!entry || typeof entry.url !== 'string' || !publicRoutes.has(entry.url)) {
      removed += 1;
      continue;
    }
    if (byUrl.has(entry.url)) {
      duplicateEntries += 1;
      continue;
    }
    byUrl.set(entry.url, entry);
  }

  for (const entry of additions) {
    if (!entry || typeof entry.name !== 'string' || !entry.name.trim() ||
        typeof entry.url !== 'string' || !entry.url.startsWith('/calculators/') ||
        !entry.url.endsWith('.html') || entry.url.includes('?') ||
        entry.url.includes('#') || entry.url.split('/').includes('..')) {
      throw new Error('Addition must have a valid name and local /calculators/*.html URL');
    }
    if (!publicRoutes.has(entry.url)) {
      deferredAdditions += 1;
      continue;
    }
    if (byUrl.has(entry.url)) {
      duplicateEntries += 1;
      continue;
    }
    const page = path.resolve(ROOT, entry.url.slice(1));
    const calculatorRoot = path.join(ROOT, 'calculators') + path.sep;
    if (!page.startsWith(calculatorRoot) || !fs.existsSync(page) || !fs.statSync(page).isFile()) {
      missingPages += 1;
      continue;
    }
    byUrl.set(entry.url, {
      name: entry.name.trim(),
      url: entry.url,
      category: entry.category || 'Everyday Life',
      keywords: entry.keywords || entry.name.toLowerCase(),
      description: entry.description || ''
    });
  }

  const missingPublicRoutes = [...publicRoutes].filter(route => !byUrl.has(route));
  if (missingPages || missingPublicRoutes.length) {
    throw new Error(
      'Search index cannot be reconciled: ' + missingPages + ' sitemap-listed addition(s) have no HTML file; ' +
      missingPublicRoutes.length + ' canonical sitemap route(s) have no search entry. ' +
      missingPublicRoutes.slice(0, 20).join(', ')
    );
  }

  // Preserve the current deterministic source ordering; additions remain appended
  // in their committed order so --check is stable across runners and locales.
  const nextIndex = [...byUrl.values()];
  const nextText = JSON.stringify(nextIndex, null, 2) + '\n';
  const currentText = fs.readFileSync(INDEX, 'utf8');
  const changed = currentText !== nextText;

  console.log(
    'calculator-search-index: ' + existingIndex.length + ' -> ' + nextIndex.length +
    ' canonical public entries; removed ' + removed + ', deferred ' + deferredAdditions +
    ' non-sitemap additions, duplicates ' + duplicateEntries + '.'
  );

  if (CHECK) {
    if (changed) throw new Error('Public search index is stale. Run node scripts/merge-search-index.cjs.');
    console.log('Public search index matches the canonical sitemap.');
    return;
  }
  if (changed) fs.writeFileSync(INDEX, nextText);
}

main();
