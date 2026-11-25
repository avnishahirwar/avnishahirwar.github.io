#!/usr/bin/env node
'use strict';

// Fail CI when a public HTML page is accidentally marked noindex or when a
// new X-Robots-Tag exclusion is added without an explicit, reviewed exception.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SITE_ORIGIN = 'https://friendlycalculator.in';
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
  '404.html',
  'offline.html',
  'about.html',
  'contact.html',
  'calculator/admin.html',
  'calculator/dashboard.html',
  'calculator/index.html',
  'calculator/payment-test.html',
  'calculator/quote.html',
  'map.html',
  'maps.html',
  'seo-meta-tags.html',
  'schema/_homepage.html',
  'schema/homepage.html',
  'google09d3278d6d57b1a4.html',
  'ae/index.html',
  'au/index.html',
  'ca/index.html',
  'in/index.html',
  'sa/index.html',
  'us/index.html',
  'api/index.html',
  'embed/basic-calculator.html',
  'hi/calculator/dashboard.html',
  'hi/calculator/index.html',
  'hi/calculator/payment-test.html',
  'hi/embed/basic-calculator.html',
  'de/calculator/business-calculators.html',
  'de/calculator/free-tools-research.html',
  'de/calculator/languages.html',
  'de/calculator/methodology.html',
  'de/calculator/tax.html',
  'ja/calculator/business-calculators.html',
  'ja/calculator/free-tools-research.html',
  'ja/calculator/languages.html',
  'ja/calculator/methodology.html',
  'ja/calculator/tax.html',
  'ja/international/index.html',
  'ja/international/vat-calculator.html',
  'ru/calculator/business-calculators.html',
  'ru/calculator/free-tools-research.html',
  'ru/calculator/languages.html',
  'ru/calculator/methodology.html',
  'ru/calculator/tax.html',
  'ru/international/index.html',
  'ru/international/vat-calculator.html',
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

function normalizedPublicPath(file) {
  return file.replace(/^[a-z]{2,3}\//i, '');
}

function isAllowedNoindexFile(file) {
  const normalized = normalizedPublicPath(file);
  return ALLOWED_NOINDEX_FILES.has(normalized);
}

function hasNoindexMeta(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  return tags.some(tag => {
    const name = tag.match(/\bname\s*=\s*(['"])(.*?)\1/i);
    const content = tag.match(/\bcontent\s*=\s*(['"])(.*?)\1/i);
    return name && /^(robots|googlebot)$/i.test(name[2].trim()) &&
      content && /\bnoindex\b/i.test(content[2]);
  });
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
  if (selector.startsWith('https://')) return false; // Preview host rules cannot match production.
  const pattern = selector.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
  return new RegExp('^' + pattern + '$').test(pathname);
}

function main() {
  const failures = [];
  const headersPath = path.join(ROOT, '_headers');
  const headersText = fs.readFileSync(headersPath, 'utf8');
  const rules = parseHeaderRules(headersText);
  const noindexRules = rules.filter(rule =>
    rule.directives.some(value => /^X-Robots-Tag:\s*noindex\b/i.test(value)));

  for (const rule of noindexRules) {
    if (!ALLOWED_NOINDEX_HEADER_RULES.has(rule.selector)) {
      failures.push('Unreviewed X-Robots-Tag noindex rule: ' + rule.selector);
    }
  }

  const htmlFiles = walk(ROOT);
  let checkedPublic = 0;
  let thinContentExclusions = 0;
  let approvedRouteExclusions = 0;
  const noindexPublic = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const noindexTags = getNoindexMetaTags(html);
    if (noindexTags.length) {
      const explicitlyThin = noindexTags.every(tag => /\\bdata-quality-pass\\s*=\\s*(['"])thin\\1/i.test(tag));
      if (explicitlyThin) thinContentExclusions++;
      else if (isApprovedNoindexPath(file)) approvedRouteExclusions++;
      else noindexPublic.push(file);
    }
    if (!isApprovedNoindexPath(file) && !PRIVATE_DIRS.has(file.split('/')[0])) checkedPublic++;
  }
  for (const file of noindexPublic) failures.push('Unclassified public HTML noindex (review content/route before changing): ' + file);

  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    const sitemap = fs.readFileSync(sitemapPath, 'utf8');
    const urls = [...sitemap.matchAll(/<loc>(https:\/\/friendlycalculator\.in[^<]*)<\/loc>/g)]
      .map(match => match[1].replace(/&amp;/g, '&'));
    for (const url of urls) {
      const pathname = new URL(url).pathname;
      for (const rule of noindexRules) {
        if (headerRuleMatchesPath(rule.selector, pathname)) {
          failures.push('Sitemap contains a URL covered by X-Robots-Tag noindex: ' + url);
        }
      }
      const relative = pathname === '/' ? 'index.html' :
        decodeURIComponent(pathname).replace(/^\\//, '');
      const file = path.join(ROOT, relative);
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        const html = fs.readFileSync(file, 'utf8');
        if (hasNoindexMeta(html)) failures.push('Sitemap URL has meta robots noindex: ' + url);
      }
    }
  }

  console.log('Indexability guard: ' + htmlFiles.length + ' HTML files scanned; ' +
    checkedPublic + ' public candidates checked; ' + thinContentExclusions +
    ' thin-content exclusions and ' + approvedRouteExclusions +
    ' approved route exclusions found; ' + noindexRules.length +
    ' intentional X-Robots-Tag noindex rules found.');
  if (failures.length) {
    console.error(failures.map(item => 'FAIL: ' + item).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Indexability guard passed. Intentional private, preview and utility exclusions are preserved.');
  }
}

main();
