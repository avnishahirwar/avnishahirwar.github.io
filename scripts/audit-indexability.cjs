#!/usr/bin/env node
'use strict';

// Guard public indexability while preserving explicit low-quality/private exclusions.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ALLOWED_NOINDEX_HEADER_RULES = new Set([
  'https://friendly-calculator.pages.dev/*',
  'https://:version.friendly-calculator.pages.dev/*',
  '/admin/*',
  '/calculator/admin.html',
  '/tests/*',
  '/map.html',
  '/maps.html',
  '/seo-meta-tags.html',
]);
const ALLOWED_NOINDEX_FILES = new Set([
  '404.html', 'offline.html', 'about.html', 'contact.html',
  'calculator/admin.html', 'calculator/dashboard.html', 'calculator/index.html',
  'calculator/payment-test.html', 'calculator/quote.html',
  'map.html', 'maps.html', 'seo-meta-tags.html',
  'schema/_homepage.html', 'schema/homepage.html',
  'google09d3278d6d57b1a4.html', 'api/index.html', 'embed/basic-calculator.html',
  'ae/index.html', 'au/index.html', 'ca/index.html', 'in/index.html',
  'sa/index.html', 'us/index.html',
  'hi/calculator/dashboard.html', 'hi/calculator/index.html',
  'hi/calculator/payment-test.html', 'hi/embed/basic-calculator.html',
  'de/calculator/business-calculators.html', 'de/calculator/free-tools-research.html',
  'de/calculator/languages.html', 'de/calculator/methodology.html', 'de/calculator/tax.html',
  'ja/calculator/business-calculators.html', 'ja/calculator/free-tools-research.html',
  'ja/calculator/languages.html', 'ja/calculator/methodology.html', 'ja/calculator/tax.html',
  'ja/international/index.html', 'ja/international/vat-calculator.html',
  'ru/calculator/business-calculators.html', 'ru/calculator/free-tools-research.html',
  'ru/calculator/languages.html', 'ru/calculator/methodology.html', 'ru/calculator/tax.html',
  'ru/international/index.html', 'ru/international/vat-calculator.html',
  // Redirects and deliberately unpublished/under-review locale pages.
  'calculators/emi-calculator.html', 'calculators/index.html', 'hi/calculators/emi-calculator.html',
  'de/calculators/basic-calculator.html', 'de/calculators/currency-converter-calculator.html',
  'de/calculators/percentage-calculator.html', 'de/calculators/unit-converter.html',
  'gu/calculators/basic-calculator.html', 'id/calculators/income-tax-calculator.html',
  'it/calculators/basic-calculator.html', 'it/calculators/percentage-calculator.html',
  'it/calculators/unit-converter.html', 'ja/calculators/basic-calculator.html',
  'ja/calculators/mortgage-calculator.html', 'ja/calculators/percentage-calculator.html',
  'kn/calculators/basic-calculator.html', 'ko/calculators/basic-calculator.html',
  'ko/calculators/percentage-calculator.html', 'ko/calculators/unit-converter.html',
  'ru/calculators/basic-calculator.html', 'ru/calculators/mortgage-calculator.html',
  'ru/calculators/percentage-calculator.html', 'te/calculators/basic-calculator.html',
  'tr/calculators/basic-calculator.html', 'tr/calculators/percentage-calculator.html',
  'tr/calculators/unit-converter.html', 'ur/calculators/basic-calculator.html',
  'ur/calculators/percentage-calculator.html', 'ur/calculators/unit-converter.html',
  'vi/calculators/basic-calculator.html', 'zh/calculators/basic-calculator.html',
  'zh/calculators/percentage-calculator.html', 'zh/calculators/unit-converter.html',
  'hi/calculator/admin.html', 'hi/map.html', 'hi/maps.html', 'hi/offline.html',
  'hi/seo-meta-tags.html',
]);
const PRIVATE_DIRS = new Set(['.git', '.github', 'node_modules', 'admin', 'tests', 'avnish-ai']);

function walk(dir, relative = '', files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = relative ? relative + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      if (!PRIVATE_DIRS.has(entry.name)) walk(path.join(dir, entry.name), rel, files);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      files.push(rel);
    }
  }
  return files;
}

function getNoindexMetaTags(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  return tags.filter(tag => {
    const name = tag.match(/\bname\s*=\s*(['"])(.*?)\1/i);
    const content = tag.match(/\bcontent\s*=\s*(['"])(.*?)\1/i);
    return name && /^(robots|googlebot)$/i.test(name[2].trim()) &&
      content && /\bnoindex\b/i.test(content[2]);
  });
}

function isApprovedNoindexPath(file) {
  return ALLOWED_NOINDEX_FILES.has(file) ||
    /^[a-z]{2,3}\/calculator\/(?:dashboard|index|payment-test)\.html$/i.test(file) ||
    /^[a-z]{2,3}\/embed\/basic-calculator\.html$/i.test(file);
}

function parseHeaderRules(text) {
  const rules = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^\s/.test(raw)) {
      if (current) current.directives.push(line);
      continue;
    }
    current = { selector: line, directives: [] };
    rules.push(current);
  }
  return rules;
}

function headerRuleMatchesPath(selector, pathname) {
  if (selector.startsWith('https://')) return false;
  const pattern = selector.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
  return new RegExp('^' + pattern + '$').test(pathname);
}

function main() {
  const failures = [];
  const rules = parseHeaderRules(fs.readFileSync(path.join(ROOT, '_headers'), 'utf8'));
  const noindexRules = rules.filter(rule =>
    rule.directives.some(value => /^X-Robots-Tag:\s*noindex\b/i.test(value)));

  for (const rule of noindexRules) {
    if (!ALLOWED_NOINDEX_HEADER_RULES.has(rule.selector)) {
      failures.push('Unreviewed X-Robots-Tag noindex rule: ' + rule.selector);
    }
  }

  const htmlFiles = walk(ROOT);
  let thinContentExclusions = 0;
  let approvedRouteExclusions = 0;
  const unclassified = [];
  for (const file of htmlFiles) {
    const tags = getNoindexMetaTags(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    if (!tags.length) continue;
    const explicitlyThin = tags.every(tag =>
      /\bdata-quality-pass\s*=\s*(['"])thin\1/i.test(tag));
    if (explicitlyThin) thinContentExclusions++;
    else if (isApprovedNoindexPath(file)) approvedRouteExclusions++;
    else unclassified.push(file);
  }
  for (const file of unclassified) {
    failures.push('Unclassified public HTML noindex (review before changing): ' + file);
  }

  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    const sitemap = fs.readFileSync(sitemapPath, 'utf8');
    const urls = [...sitemap.matchAll(/<loc>(https:\/\/friendlycalculator\.in[^<]*)<\/loc>/g)]
      .map(match => match[1].replace(/&amp;/g, '&'));
    for (const url of urls) {
      const pathname = new URL(url).pathname;
      for (const rule of noindexRules) {
        if (headerRuleMatchesPath(rule.selector, pathname)) {
          failures.push('Sitemap URL is covered by X-Robots-Tag noindex: ' + url);
        }
      }
      let relative = decodeURIComponent(pathname).replace(/^\//, '');
      if (!relative || relative.endsWith('/')) relative += 'index.html';
      const target = path.join(ROOT, relative);
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        const html = fs.readFileSync(target, 'utf8');
        if (getNoindexMetaTags(html).length) {
          failures.push('Sitemap URL has meta robots noindex: ' + url);
        }
      }
    }
  }

  console.log('Indexability guard: ' + htmlFiles.length + ' HTML files scanned; ' +
    thinContentExclusions + ' explicitly thin-content exclusions; ' +
    approvedRouteExclusions + ' approved utility/redirect exclusions; ' +
    noindexRules.length + ' intentional X-Robots-Tag rules.');
  if (failures.length) {
    console.error(failures.map(item => 'FAIL: ' + item).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Indexability guard passed. No unclassified public noindex directives or noindex sitemap URLs found.');
  }
}

main();
