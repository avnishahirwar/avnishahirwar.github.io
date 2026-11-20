#!/usr/bin/env node
'use strict';

// Correct only three verified hreflang mismatches from the repository's SEO audit:
// 1) "uk" is not a valid language tag for the en-GB page.
// 2) The SIP example pages declare en-IN / hi-IN and must use those hreflang tags.
// 3) The legacy EMI URL is a noindex redirect alias and must not advertise itself
//    as an indexable alternate page.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['.git', '.github', 'node_modules', 'tests', 'vendor', '_site', 'admin', 'avnish-ai']);
const write = process.argv.includes('--write');
const stats = { homepageUkTagsCorrected: 0, sipEnTagsCorrected: 0, sipHiTagsCorrected: 0, emiRedirectAlternateTagsRemoved: 0, filesChanged: 0 };

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(full);
  }
  return files;
}

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const original = fs.readFileSync(file, 'utf8');
  let html = original;

  const ukTag = '<link rel="alternate" hreflang="uk" href="https://friendlycalculator.in/uk/index.html">';
  if (html.includes(ukTag)) {
    html = html.replaceAll(ukTag, '<link rel="alternate" hreflang="en-GB" href="https://friendlycalculator.in/uk/index.html">');
    stats.homepageUkTagsCorrected += (original.split(ukTag).length - 1);
  }

  if (rel === 'calculators/sip-5000-monthly-calculator.html' || rel === 'hi/calculators/sip-5000-monthly-calculator.html') {
    const enTag = '<link rel="alternate" hreflang="en" href="https://friendlycalculator.in/calculators/sip-5000-monthly-calculator.html">';
    const hiTag = '<link rel="alternate" hreflang="hi" href="https://friendlycalculator.in/hi/calculators/sip-5000-monthly-calculator.html">';
    if (html.includes(enTag)) { html = html.replace(enTag, enTag.replace('hreflang="en"', 'hreflang="en-IN"')); stats.sipEnTagsCorrected++; }
    if (html.includes(hiTag)) { html = html.replace(hiTag, hiTag.replace('hreflang="hi"', 'hreflang="hi-IN"')); stats.sipHiTagsCorrected++; }
  }

  if (rel === 'calculators/emi-calculator.html' && /<meta name="robots" content="noindex/i.test(html) && /http-equiv="refresh"[^>]*loan-emi-calculator/i.test(html)) {
    const before = html;
    html = html.replace(/^<link rel="alternate" hreflang="(?:en|x-default)" href="https:\/\/friendlycalculator\.in\/calculators\/emi-calculator\.html">\n?/gm, '');
    stats.emiRedirectAlternateTagsRemoved += (before.split('<link rel="alternate" hreflang=').length - html.split('<link rel="alternate" hreflang=').length);
  }

  if (html !== original) {
    stats.filesChanged++;
    if (write) fs.writeFileSync(file, html);
    else console.log('needs verified hreflang correction: ' + rel);
  }
}
console.log('Verified hreflang mismatch repair: ' + JSON.stringify(stats) + (write ? ' (written)' : ' (dry run; no files changed)'));
if (!write && stats.filesChanged) process.exitCode = 1;
