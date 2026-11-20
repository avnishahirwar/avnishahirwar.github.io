#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://friendlycalculator.in';
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/language-catalogue.json'), 'utf8'));
const locales = config.locales.filter(item => item.status === 'available').map(item => item.code);
const defaultLocale = config.defaultLocale || 'en';
function walk(dir, rel = '', out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'tests' || entry.name === 'admin') continue;
    const abs = path.join(dir, entry.name);
    const next = rel ? rel + '/' + entry.name : entry.name;
    if (entry.isDirectory()) walk(abs, next, out);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) out.push(next);
  }
  return out;
}
function readPage(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  if (!head || /<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*\bnoindex\b/i.test(head[1])) return null;
  const canonical = head[1].match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i);
  if (!canonical) return null;
  let url;
  try { url = new URL(canonical[1], ORIGIN); } catch { return null; }
  if (url.origin !== ORIGIN || url.search || url.hash) return null;
  return { html, canonical: url.href };
}
const localeSet = new Set(locales.filter(code => code !== defaultLocale));
const files = walk(ROOT);
const pageMap = new Map();
for (const file of files) {
  const parts = file.split('/');
  const locale = parts.length > 1 && localeSet.has(parts[0]) ? parts[0] : defaultLocale;
  if (locale !== defaultLocale && !localeSet.has(locale)) continue;
  const route = locale === defaultLocale ? file : parts.slice(1).join('/');
  if (!pageMap.has(route)) pageMap.set(route, new Map());
  const page = readPage(file);
  if (page) pageMap.get(route).set(locale, { file, ...page });
}
let updated = 0;
let needsRepair = 0;
let clusters = 0;
const check = process.argv.includes('--check');
for (const [route, pages] of pageMap) {
  if (pages.size < 2 || !pages.has(defaultLocale)) continue;
  clusters++;
  for (const [locale, page] of pages) {
    const preferredByRoute = {
      'calculators/percentage-calculator.html': 'hi',
      'calculators/simple-interest-calculator.html': 'bn'
    };
    const priorityOrder = ['en','hi','es','fr','pt','ar','id','bn','ta','de','ja','ru','vi','te','gu','kn'];
    const preferred = preferredByRoute[route] || (locale === defaultLocale ? 'hi' : locale);
    let order;
    if (route === 'calculators/percentage-calculator.html') {
      order = ['en','hi','x-default','ar','bn','es','fr','id','pt','ta'].filter(code => code === 'x-default' || pages.has(code));
    } else if (route === 'calculators/simple-interest-calculator.html') {
      order = ['en','bn','x-default','ar','es','fr','hi','id','pt','ta'].filter(code => code === 'x-default' || pages.has(code));
    } else if (['calculators/basic-calculator.html','calculators/bike-loan-calculator.html','calculators/business-loan-emi-calculator.html','calculators/car-loan-calculator.html','calculators/discount-calculator.html','calculators/ppf-calculator.html'].includes(route)) {
      order = priorityOrder.filter(code => pages.has(code));
      order.push('x-default');
    } else {
      order = [defaultLocale];
      if (pages.has(preferred) && preferred !== defaultLocale) order.push(preferred);
      order.push('x-default');
      for (const code of [...pages.keys()].filter(code => code !== defaultLocale && code !== preferred).sort()) order.push(code);
    }
    const tags = order.map(code => {
      const target = code === 'x-default' ? pages.get(defaultLocale) : pages.get(code);
      return '<link rel="alternate" hreflang="' + code + '" href="' + target.canonical + '">';
    }).join('\n');
    const next = page.html.replace(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["'][^"']+["'])[^>]*>\s*/gi, '')
      .replace(/<\/head>/i, '\n' + tags + '\n</head>');
    if (next !== page.html) {
      if (check) {
        needsRepair++;
        if (needsRepair <= 30) console.log('needs hreflang repair: ' + page.file);
      } else {
        fs.writeFileSync(path.join(ROOT, page.file), next);
        updated++;
      }
    }
  }
}
console.log((check ? 'Checked' : 'Generated') + ' reciprocal hreflang for ' + clusters + ' route clusters; ' + (check ? needsRepair + ' pages need repair.' : updated + ' indexable pages updated.') + ' Locales: ' + locales.join(', ') + '.');
if (check && needsRepair > 0) process.exitCode = 1;
