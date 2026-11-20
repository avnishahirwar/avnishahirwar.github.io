#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://friendlycalculator.in';
const catalogue = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'language-catalogue.json'), 'utf8'));
const available = catalogue.locales.filter(locale => locale.status === 'available');
const planned = catalogue.locales.filter(locale => locale.status !== 'available');
const homepageFiles = [{ code: 'en', file: 'index.html' }, ...catalogue.locales.filter(locale => locale.code !== 'en' && locale.code !== 'uk').map(locale => ({ code: locale.code, file: locale.code + '/index.html' }))];
function alternateLinks() {
  const links = available.map(locale => {
    const href = locale.code === 'en' ? ORIGIN + '/' : ORIGIN + '/' + locale.code + '/index.html';
    return '<link rel="alternate" hreflang="' + locale.code + '" href="' + href + '">';
  });
  links.push('<link rel="alternate" hreflang="x-default" href="' + ORIGIN + '/">');
  return links.join('\n');
}
function removeAlternates(html) {
  return html.replace(/<link\b(?=[^>]*\brel\s*=\s*["']alternate["'])(?=[^>]*\bhreflang\s*=)[^>]*>\s*/gi, '');
}
function normalizeHomepage(file, isAvailable) {
  const absolute = path.join(ROOT, file);
  if (!fs.existsSync(absolute)) throw new Error('Missing locale homepage: ' + file);
  const original = fs.readFileSync(absolute, 'utf8');
  const clean = removeAlternates(original);
  const canonical = /<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/i;
  if (!canonical.test(clean)) throw new Error('Missing canonical link: ' + file);
  const updated = isAvailable ? clean.replace(canonical, match => match + '\n' + alternateLinks()) : clean;
  if (updated !== original) {
    if (process.argv.includes('--write')) fs.writeFileSync(absolute, updated);
    return true;
  }
  return false;
}
function normalizeUkHub() {
  const file = path.join(ROOT, 'uk', 'index.html');
  if (!fs.existsSync(file)) throw new Error('Missing UK country hub.');
  const original = fs.readFileSync(file, 'utf8');
  const clean = removeAlternates(original);
  const self = '<link rel="alternate" hreflang="en-GB" href="' + ORIGIN + '/uk/index.html">';
  const canonical = /<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/i;
  if (!canonical.test(clean)) throw new Error('Missing UK hub canonical link.');
  const langFixed = clean.replace(/<html\b([^>]*)\blang=["']uk["']/i, '<html$1lang="en-GB"');
  const updated = langFixed.replace(canonical, match => match + '\n' + self);
  if (updated !== original) {
    if (process.argv.includes('--write')) fs.writeFileSync(file, updated);
    return true;
  }
  return false;
}
function main() {
  let changed = 0;
  for (const page of homepageFiles) {
    const locale = catalogue.locales.find(item => item.code === page.code);
    changed += normalizeHomepage(page.file, locale.status === 'available') ? 1 : 0;
  }
  const ukChanged = normalizeUkHub();
  console.log('Checked ' + homepageFiles.length + ' locale homepages: ' + available.length +
    ' indexable editions receive reciprocal hreflang clusters; ' + planned.length +
    ' planned noindex editions have no hreflang alternates. UK country hub self-declares en-GB. Files needing changes: ' +
    (changed + (ukChanged ? 1 : 0)) + (process.argv.includes('--write') ? ' (written).' : '.'));
  if ((process.argv.includes('--check') || !process.argv.includes('--write')) && changed + (ukChanged ? 1 : 0) > 0) process.exitCode = 1;
}
main();
