#!/usr/bin/env node
'use strict';

// Normalize known region-language hreflang values without changing page copy.
// Only safe, indexable general-audience pages are considered.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = process.cwd();
const IGNORE = new Set(['.git', '.github', 'node_modules', 'tests', 'vendor', '_site', 'admin', 'avnish-ai']);
const EXCLUDED_CONTENT_PATH = /(?:alcohol|beer|wine|cocktail|cigarette|nicotine|tobacco|vape|liquor|cannabis|marijuana|cbd|thc|weed|meth|cocaine|opioid|drug|intoxicant|ethanol|vodka|whiskey|smoking|vaping|pesticide|poison|toxin)/i;
const write = process.argv.includes('--write');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || IGNORE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(full);
  }
  return files;
}
function isNoindex(html) {
  return /<meta\b[^>]*\bname=[\"'](?:robots|googlebot)[\"'][^>]*\bcontent=[\"'][^\"']*\bnoindex\b/i.test(html) ||
    /<meta\b[^>]*\bcontent=[\"'][^\"']*\bnoindex\b[^\"']*[\"'][^>]*\bname=[\"'](?:robots|googlebot)[\"']/i.test(html);
}
function normalizeTag(tag) {
  if (!/\brel=[\"']alternate[\"']/i.test(tag) || !/\bhreflang=/i.test(tag)) return tag;
  const lang = (tag.match(/\bhreflang=[\"']([^\"']+)[\"']/i) || [])[1]?.toLowerCase();
  const href = (tag.match(/\bhref=[\"']([^\"']+)[\"']/i) || [])[1];
  if (!lang || !href) return tag;
  let pathname;
  try { pathname = new URL(href, 'https://friendlycalculator.in').pathname; } catch { return tag; }
  let next = lang;
  if (lang === 'uk' && /^\/uk(?:\/|$)/i.test(pathname)) next = 'en-gb';
  if (pathname === '/calculators/sip-5000-monthly-calculator.html' && lang === 'en') next = 'en-in';
  if (pathname === '/hi/calculators/sip-5000-monthly-calculator.html' && lang === 'hi') next = 'hi-in';
  return next === lang ? tag : tag.replace(/(\bhreflang=[\"'])[^\"']+([\"'])/i, '$1' + next + '$2');
}
let scanned = 0, changed = 0, skipped = 0;
for (const file of walk(ROOT)) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  if (EXCLUDED_CONTENT_PATH.test(relative)) { skipped++; continue; }
  const html = fs.readFileSync(file, 'utf8');
  if (isNoindex(html)) { skipped++; continue; }
  scanned++;
  const updated = html.replace(/<link\b[^>]*>/gi, normalizeTag);
  if (updated !== html) {
    changed++;
    if (write) fs.writeFileSync(file, updated);
  }
}
console.log('Hreflang language normalization: ' + scanned + ' indexable pages scanned; ' + changed + ' pages changed; ' + skipped + ' excluded.');
if (!write) console.log('Dry run only. No files were changed.');
