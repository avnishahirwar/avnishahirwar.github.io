#!/usr/bin/env node
'use strict';
/**
 * Merge pending additions into assets/calculator-search-index.json.
 * The committed additions file is retained as source history; this script is
 * deterministic and idempotent, and only indexes calculator pages that exist.
 * Usage: node scripts/merge-search-index.cjs [--check]
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'assets', 'calculator-search-index.json');
const ADDITIONS = path.join(ROOT, 'assets', 'calculator-search-index-additions.json');
const CHECK = process.argv.includes('--check');

const index = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
const additions = JSON.parse(fs.readFileSync(ADDITIONS, 'utf8'));

if (!Array.isArray(index) || !Array.isArray(additions)) {
  throw new Error('Expected both files to be JSON arrays');
}

const existing = new Set(index.map((entry) => entry && entry.url).filter(Boolean));
const missingPages = [];
let added = 0;
let duplicateEntries = 0;

for (const entry of additions) {
  if (!entry || typeof entry.name !== 'string' || !entry.name.trim() ||
      typeof entry.url !== 'string' || !entry.url.startsWith('/calculators/') ||
      !entry.url.endsWith('.html') || entry.url.includes('?') ||
      entry.url.includes('#') || entry.url.split('/').includes('..')) {
    throw new Error('Addition must have a valid calculator name and local /calculators/*.html URL');
  }

  if (existing.has(entry.url)) {
    duplicateEntries += 1;
    continue;
  }

  const page = path.resolve(ROOT, entry.url.slice(1));
  const calculatorRoot = path.join(ROOT, 'calculators') + path.sep;
  if (!page.startsWith(calculatorRoot) || !fs.existsSync(page) || !fs.statSync(page).isFile()) {
    missingPages.push(entry.url);
    continue;
  }

  index.push({
    name: entry.name.trim(),
    url: entry.url,
    category: entry.category || 'Everyday Life',
    keywords: entry.keywords || entry.name.toLowerCase(),
    description: entry.description || ''
  });
  existing.add(entry.url);
  added += 1;
}

if (missingPages.length) {
  console.warn('Skipped ' + missingPages.length + ' addition(s) without a published HTML page: ' + missingPages.join(', '));
}

console.log(
  'calculator-search-index: ' + (index.length - added) + ' -> ' + index.length +
  ' entries (added ' + added + ', already indexed ' + duplicateEntries +
  ', missing page ' + missingPages.length + ')'
);

if (CHECK) {
  if (added === 0 && missingPages.length === 0) {
    console.log('Search index is already up to date.');
  }
  process.exit(0);
}

if (added > 0) {
  fs.writeFileSync(INDEX, JSON.stringify(index, null, 2) + '\n');
}
