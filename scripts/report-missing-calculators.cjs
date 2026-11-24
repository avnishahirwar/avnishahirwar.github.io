#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const files = ['assets/calculator-search-index.json', 'assets/calculator-search-index-additions.json'];
const seen = new Set();
const missing = [];
for (const f of files) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const item of JSON.parse(fs.readFileSync(p, 'utf8'))) {
    const url = String(item.url || '');
    if (seen.has(url)) continue;
    seen.add(url);
    if (!path.join(ROOT, url.slice(1))) continue;
    if (!fs.existsSync(path.join(ROOT, url.slice(1)))) missing.push({url, from: f});
  }
}
console.log('unique', seen.size, 'missing', missing.length);
fs.mkdirSync(path.join(ROOT, 'reports'), {recursive: true});
fs.writeFileSync(path.join(ROOT, 'reports/count-audit.json'), JSON.stringify({unique: seen.size, missing}, null, 2));
