#!/usr/bin/env node
'use strict';
/**
 * Merge pending additions into assets/calculator-search-index.json.
 * Read from a committed additions file so the merge is deterministic and
 * idempotent existing URLs are never duplicated.
 * Usage: node scripts/merge-search-index.cjs [--check]
 */
const fs = require('fs');
const path = require('path');

const INDEX = path.join(__dirname, '..', 'assets', 'calculator-search-index.json');
const ADDITIONS = path.join(__dirname, '..', 'assets', 'calculator-search-index-additions.json');
const CHECK = process.argv.includes('--check');

const index = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
const additions = JSON.parse(fs.readFileSync(ADDITIONS, 'utf8'));

if (!Array.isArray(index) || !Array.isArray(additions)) {
  throw new Error('Expected both files to be JSON arrays');
}

const existing = new Set(index.map((entry) => entry && entry.url));
const missingPages = [];
let added = 0;
for (const entry of additions) {
  if (!entry || !entry.url || !entry.name) throw new Error('Addition missing name or url');
  const slug = entry.url.replace('/calculators/', '').replace('.html', '');
  const page = path.join(__dirname, '..', 'calculators', slug + '.html');
  if (!fs.existsSync(page)) { missingPages.push(slug); continue; }
  if (existing.has(entry.url)) continue;
  index.push({
    name: entry.name,
    url: entry.url,
    category: entry.category || 'Everyday Life',
    keywords: entry.keywords || String(entry.name).toLowerCase(),
    description: entry.description || ''
  });
  added += 1;
}

if (missingPages.length) {
  throw new Error('Missing calculator pages for: ' + missingPages.join(', '));
}

console.log('calculator-search-index: ' + (index.length - added) + ' -> ' + index.length + ' entries (added ' + added + ')');

if (CHECK) {
  process.exit(0);
}

fs.writeFileSync(INDEX, JSON.stringify(index, null, 2) + '\n');
