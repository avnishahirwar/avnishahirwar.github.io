#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/calculator-search-index.json'), 'utf8'));
const expected = [...new Set([...sitemap.matchAll(/<loc>(https:\/\/friendlycalculator\.in[^<]*)<\/loc>/g)]
  .map(match => new URL(match[1]).pathname)
  .filter(url => url.startsWith('/calculators/')))].sort();
const actual = new Set(index.map(item => item.url));
const missing = expected.filter(url => !actual.has(url));
const extra = index.map(item => item.url).filter(url => !expected.includes(url) && url !== '/international/vat-calculator.html');
console.log('Search-index coverage: ' + index.length + ' entries; sitemap calculator URLs: ' + expected.length + '; missing: ' + missing.length + '; extra: ' + extra.length + '.');
if (missing.length) {
  console.log('Missing from search index:');
  for (const url of missing) {
    const file = path.join(ROOT, url.replace(/^\//, ''));
    let title = '';
    let description = '';
    let category = '';
    if (fs.existsSync(file)) {
      const html = fs.readFileSync(file, 'utf8');
      title = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [,''])[1].replace(/<[^>]+>/g, '').trim();
      description = ((html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [,''])[1] || '').trim();
      category = ((html.match(/<a[^>]+href=["']\/calculator\/([^"']+)["'][^>]*>([^<]+)</i) || [,, 'Other'])[2] || 'Other').trim();
    }
    console.log(JSON.stringify({ url, title, category, description }));
  }
}
