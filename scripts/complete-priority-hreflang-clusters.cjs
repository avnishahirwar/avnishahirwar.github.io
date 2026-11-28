#!/usr/bin/env node
'use strict';

// Complete only explicitly reviewed, indexable locale clusters. Additive-only:
// conflicting existing destinations, noindex pages, missing files or bad canonicals abort a cluster.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = process.cwd();
const ORIGIN = 'https://friendlycalculator.in';
const LOCALES = ['en', 'hi', 'es', 'fr', 'pt', 'ar', 'id', 'bn', 'ta'];
const FULL_CLUSTERS = [
  'lumpsum-investment-calculator.html',
  'profit-loss-calculator.html',
  'fuel-cost-calculator.html',
  'square-root-calculator.html',
  'dividend-yield-calculator.html',
  'markup-margin-calculator.html'
];
const HINDI_PAIRS = [
  'aspect-ratio-calculator.html', 'words-per-minute-calculator.html',
  'weighted-average-calculator.html', 'median-calculator.html',
  'mode-calculator.html', 'percentage-change-calculator.html',
  'fraction-to-percent-calculator.html', 'cube-root-calculator.html',
  'percentage-increase-calculator.html', 'percentage-decrease-calculator.html',
  'percentage-difference-calculator.html', 'percentage-point-calculator.html',
  'average-percentage-calculator.html', 'percentage-of-percentage-calculator.html',
  'percent-error-calculator.html', 'digital-root-calculator.html',
  'divisibility-test-calculator.html', 'reciprocal-calculator.html',
  'percentile-rank-calculator.html', 'prime-number-calculator.html',
  'scientific-notation-calculator.html', 'completing-the-square-calculator.html',
  'quartile-calculator.html', 'coefficient-of-variation-calculator.html',
  'complex-conjugate-calculator.html', 'discriminant-calculator.html',
  'appliance-energy-cost-calculator.html'
];

const read = file => fs.readFileSync(file, 'utf8');
const noindex = html => /<meta\b(?=[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'])(?=[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b)[^>]*>/i.test(html) ||
  /<meta\b(?=[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b)(?=[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'])[^>]*>/i.test(html);
const attr = (tag, name) => (tag.match(new RegExp('\\b' + name + '\\s*=\\s*["\\']([^"\\']*)["\\']', 'i')) || [])[1] || '';
const pagePath = (locale, route) => path.join(ROOT, locale === 'en' ? 'calculators' : path.join(locale, 'calculators'), route);
const canonical = (locale, route) => ORIGIN + '/' + (locale === 'en' ? '' : locale + '/') + 'calculators/' + route;
const langOf = html => ((html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i) || [])[1] || '').toLowerCase();

function addCluster(route, locales, report) {
  const pages = [];
  for (const locale of locales) {
    const file = pagePath(locale, route);
    if (!fs.existsSync(file)) return report.skipped.push({route, reason:'missing page', locale}), false;
    const html = read(file);
    if (noindex(html)) return report.skipped.push({route, reason:'noindex page', locale}), false;
    if (langOf(html) !== locale) return report.skipped.push({route, reason:'language attribute mismatch', locale, actual:langOf(html)}), false;
    const canonicalTag = (html.match(/<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["'][^"']+["'])[^>]*>/i) || [])[0] || '';
    if (attr(canonicalTag, 'href') !== canonical(locale, route)) return report.skipped.push({route, reason:'non-self canonical', locale, canonical:attr(canonicalTag,'href')}), false;
    pages.push({locale,file,html});
  }

  const expected = new Map(locales.map(locale => [locale, canonical(locale, route)]));
  expected.set('x-default', canonical('en', route));
  const staged = [];
  for (const page of pages) {
    const tags = [...page.html.slice(0, page.html.toLowerCase().indexOf('</head>')).matchAll(/<link\b[^>]*>/gi)]
      .map(match => match[0])
      .filter(tag => attr(tag,'rel').toLowerCase() === 'alternate' && attr(tag,'hreflang'));
    const byLang = new Map();
    for (const tag of tags) {
      const lang = attr(tag,'hreflang').toLowerCase();
      const href = attr(tag,'href');
      if (!expected.has(lang)) continue;
      if (byLang.has(lang) && byLang.get(lang) !== href) {
        report.skipped.push({route,reason:'duplicate conflicting alternate',locale:page.locale,alternate:lang});
        return false;
      }
      byLang.set(lang, href);
    }
    for (const [lang, href] of expected) {
      if (byLang.has(lang) && byLang.get(lang) !== href) {
        report.skipped.push({route,reason:'conflicting alternate destination',locale:page.locale,alternate:lang,existing:byLang.get(lang),expected:href});
        return false;
      }
    }
    const missing = [...expected].filter(([lang]) => !byLang.has(lang))
      .map(([lang, href]) => '<link rel="alternate" hreflang="' + lang + '" href="' + href + '">');
    if (missing.length) {
      const headEnd = page.html.toLowerCase().indexOf('</head>');
      if (headEnd < 0) return report.skipped.push({route,reason:'missing head',locale:page.locale}), false;
      staged.push({file:page.file,html:page.html.slice(0,headEnd) + missing.join('\n') + '\n' + page.html.slice(headEnd),count:missing.length});
    }
  }

  for (const item of staged) {
    if (process.argv.includes('--write')) fs.writeFileSync(item.file, item.html);
    report.filesChanged.add(path.relative(ROOT,item.file).split(path.sep).join('/'));
    report.tagsAdded += item.count;
  }
  report.clustersCompleted++;
  return true;
}

function main() {
  const report = {mode:process.argv.includes('--write')?'write':'dry-run',clustersCompleted:0,tagsAdded:0,filesChanged:new Set(),skipped:[]};
  for (const route of FULL_CLUSTERS) addCluster(route, LOCALES, report);
  for (const route of HINDI_PAIRS) addCluster(route, ['en','hi'], report);
  const output = {...report,filesChanged:[...report.filesChanged].sort()};
  console.log(JSON.stringify(output,null,2));
  if (!process.argv.includes('--write')) console.log('Dry run only; no files modified.');
}
main();
