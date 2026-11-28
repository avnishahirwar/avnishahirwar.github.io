#!/usr/bin/env node
'use strict';

/**
 * Rebuild the public calculator search index from the same canonical page set
 * used by the XML sitemap and curated directory. No HTML pages are deleted.
 * Thin quality-pass pages stay searchable/listed but remain excluded from XML
 * sitemaps; other noindex pages are deliberately omitted from public discovery.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'assets', 'calculator-search-index.json');
const ADDITIONS = path.join(ROOT, 'assets', 'calculator-search-index-additions.json');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const CHECK = process.argv.includes('--check');
const SITE_ORIGIN = 'https://friendlycalculator.in';
const SEARCHABLE_INTERNATIONAL = [
  '/international/vat-calculator.html',
  '/international/uk-student-loan-calculator.html',
  '/international/us-home-affordability-calculator.html'
];

function attr(tag, name) {
  const re = /([a-z][a-z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let match;
  while ((match = re.exec(tag))) {
    if (match[1].toLowerCase() === name.toLowerCase()) return match[2] ?? match[3] ?? '';
  }
  return '';
}
function hasNoindex(html) {
  const head = html.slice(0, Math.max(0, html.toLowerCase().indexOf('</head>')));
  return /<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(head) ||
    /<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(head);
}
function canonicalPath(html, fallbackPath) {
  const head = html.slice(0, Math.max(0, html.toLowerCase().indexOf('</head>')));
  const tags = [...head.matchAll(/<link\b[^>]*>/gi)].map(match => match[0]);
  const tag = tags.find(item => attr(item, 'rel').toLowerCase().split(/\s+/).includes('canonical'));
  if (!tag) return fallbackPath;
  try {
    const url = new URL(attr(tag, 'href'), SITE_ORIGIN);
    if (url.origin !== SITE_ORIGIN || url.search || url.hash) return null;
    return url.pathname;
  } catch {
    return null;
  }
}
function decode(value) {
  return String(value || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function stripTags(value) {
  return decode(String(value || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ').trim();
}
function pageMetadata(route, previous, addition) {
  const file = path.resolve(ROOT, route.slice(1));
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  const html = fs.readFileSync(file, 'utf8');
  if (hasNoindex(html) && !html.includes('data-quality-pass="thin"')) return null;
  if (canonicalPath(html, route) !== route) return null;

  const h1 = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
  const titleTag = (html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const metaDescription = attr(
    (html.match(/<meta\b[^>]*>/gi) || []).find(tag => attr(tag, 'name').toLowerCase() === 'description') || '',
    'content'
  );
  // Values already stored in JSON are plain text, not HTML. Do not decode entities
  // or strip angle-bracket sequences from them on repeat rebuilds; only sanitize
  // values extracted from page markup.
  const plainText = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const storedName = previous?.name || addition?.name;
  const name = storedName
    ? plainText(storedName)
    : stripTags(h1 || titleTag.split('|')[0] || path.basename(route, '.html').replace(/-/g, ' '));
  const storedDescription = previous?.description || addition?.description;
  const description = storedDescription ? plainText(storedDescription) : stripTags(metaDescription);
  const storedCategory = previous?.category || addition?.category;
  const category = storedCategory ? plainText(storedCategory) : 'Everyday Life';
  const storedKeywords = previous?.keywords || addition?.keywords;
  const keywords = storedKeywords ? plainText(storedKeywords) : plainText((name + ' ' + description).toLowerCase());
  if (!name) return null;
  return { name, url: route, category, keywords, description };
}

function buildExpectedIndex() {
  const sitemap = fs.readFileSync(SITEMAP, 'utf8');
  if (!sitemap.startsWith('<?xml') || !sitemap.includes('<urlset')) {
    throw new Error('sitemap.xml must be generated before rebuilding the calculator search index.');
  }
  const sitemapPaths = [...new Set(
    [...sitemap.matchAll(/<loc>(https:\/\/friendlycalculator\.in[^<]*)<\/loc>/g)]
      .map(match => {
        try { return new URL(match[1]).pathname; } catch { return ''; }
      })
      .filter(Boolean)
  )];
  const sitemapCalculatorPaths = sitemapPaths.filter(route => route.startsWith('/calculators/') && route.endsWith('.html'));

  const qualityPassPaths = fs.readdirSync(path.join(ROOT, 'calculators'))
    .filter(name => name.endsWith('.html') &&
      fs.readFileSync(path.join(ROOT, 'calculators', name), 'utf8').includes('data-quality-pass="thin"'))
    .map(name => '/calculators/' + name);

  const allowed = new Set([...sitemapCalculatorPaths, ...qualityPassPaths]);
  for (const route of SEARCHABLE_INTERNATIONAL) {
    if (sitemapPaths.includes(route)) allowed.add(route);
  }

  const current = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
  const additions = JSON.parse(fs.readFileSync(ADDITIONS, 'utf8'));
  if (!Array.isArray(current) || !Array.isArray(additions)) {
    throw new Error('Expected search index and additions files to contain JSON arrays.');
  }
  const existingByUrl = new Map();
  for (const item of current) {
    if (item && typeof item.url === 'string' && !existingByUrl.has(item.url)) existingByUrl.set(item.url, item);
  }
  const additionsByUrl = new Map();
  for (const item of additions) {
    if (item && typeof item.url === 'string' && !additionsByUrl.has(item.url)) additionsByUrl.set(item.url, item);
  }

  const entries = [];
  const skippedInvalid = [];
  for (const route of [...allowed].sort()) {
    const item = pageMetadata(route, existingByUrl.get(route), additionsByUrl.get(route));
    if (!item) {
      skippedInvalid.push(route);
      continue;
    }
    entries.push(item);
  }
  if (skippedInvalid.length) {
    throw new Error('Canonical catalogue contains routes that cannot be indexed in search: ' + skippedInvalid.slice(0, 20).join(', ') +
      (skippedInvalid.length > 20 ? ' ... (' + skippedInvalid.length + ' total)' : ''));
  }
  return { entries, previousCount: current.length, sitemapCalculatorCount: sitemapCalculatorPaths.length,
    qualityPassCount: qualityPassPaths.length, internationalCount: entries.length - sitemapCalculatorPaths.length - qualityPassPaths.length };
}

function main() {
  const { entries, previousCount, sitemapCalculatorCount, qualityPassCount, internationalCount } = buildExpectedIndex();
  const output = JSON.stringify(entries, null, 2) + '\n';
  const current = fs.readFileSync(INDEX, 'utf8');
  if (CHECK) {
    if (current !== output) throw new Error('Search index is not synchronized with the sitemap and quality-pass catalogue. Run node scripts/merge-search-index.cjs.');
    console.log('Search index check passed: ' + entries.length + ' unique public entries (' +
      sitemapCalculatorCount + ' sitemap calculator pages, ' + qualityPassCount +
      ' quality-pass pages, ' + internationalCount + ' selected international tools).');
    return;
  }
  fs.writeFileSync(INDEX, output);
  console.log('Rebuilt calculator search index: ' + previousCount + ' -> ' + entries.length +
    ' public entries (' + sitemapCalculatorCount + ' sitemap calculator pages, ' +
    qualityPassCount + ' quality-pass pages, ' + internationalCount + ' selected international tools).');
}

main();
