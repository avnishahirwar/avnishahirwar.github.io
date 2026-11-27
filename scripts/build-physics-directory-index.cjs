#!/usr/bin/env node
'use strict';

// Preserve the full user-facing Physics directory independently from the
// narrower, search-engine-indexable calculator catalogue. No page is deleted.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCES = [
  path.join(ROOT, 'assets/calculator-search-index.json'),
  path.join(ROOT, 'assets/calculator-search-index-additions.json'),
  path.join(ROOT, 'assets/physics-directory-index.json')
];
const OUTPUT = SOURCES[2];

function readArray(file) {
  if (!fs.existsSync(file)) return [];
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(value)) throw new Error(path.basename(file) + ' must contain a JSON array');
  return value;
}
function validEntry(item) {
  if (!item || String(item.category || '').trim().toLowerCase() !== 'physics') return false;
  const url = String(item.url || '');
  if (!url.startsWith('/calculators/') || !url.endsWith('.html') ||
      url.includes('?') || url.includes('#') || url.split('/').includes('..')) return false;
  const file = path.resolve(ROOT, url.slice(1));
  return file.startsWith(ROOT + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile();
}
function build() {
  const byUrl = new Map();
  for (const file of SOURCES) {
    for (const item of readArray(file)) {
      if (!validEntry(item)) continue;
      const previous = byUrl.get(item.url);
      if (!previous || String(item.description || '').length > String(previous.description || '').length) {
        byUrl.set(item.url, {...item, category: 'Physics'});
      }
    }
  }
  return [...byUrl.values()].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), 'en') || a.url.localeCompare(b.url));
}
function main() {
  const output = build();
  if (output.length < 300) {
    throw new Error('Physics source catalogue is incomplete: expected at least 300 unique existing Physics pages, found ' + output.length + '.');
  }
  const serialized = JSON.stringify(output, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== serialized) {
      throw new Error('Physics directory index is stale. Run node scripts/build-physics-directory-index.cjs.');
    }
    console.log('Physics directory index check passed: ' + output.length + ' unique existing pages.');
    return;
  }
  fs.writeFileSync(OUTPUT, serialized);
  console.log('Built assets/physics-directory-index.json with ' + output.length + ' unique existing Physics pages.');
}
if (require.main === module) main();
module.exports = {build};
