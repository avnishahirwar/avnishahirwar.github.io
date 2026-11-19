#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_LOCALES = ['hi', 'es', 'fr', 'pt', 'ar', 'id', 'bn', 'ta', 'de', 'ja', 'ru', 'mr', 'vi', 'te'];
const SKIP_DIRS = new Set([
  '.git', '.github', 'node_modules', 'tests', 'vendor', 'dist', 'coverage',
  'admin', 'avnish-ai', '_site'
]);
const SKIP_FILES = new Set(['404.html', 'offline.html']);
const SKIP_PATHS = new Set([
  'calculator/admin.html',
  'google09d3278d6d57b1a4.html',
  'map.html',
  'maps.html',
  'schema/_homepage.html',
  'seo-meta-tags.html'
]);

function walkHtml(root, relative = '') {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) return [];
      return walkHtml(root, path.join(relative, entry.name));
    }
    const file = path.join(relative, entry.name).split(path.sep).join('/');
    return entry.isFile() && entry.name.toLowerCase().endsWith('.html') &&
      !SKIP_FILES.has(entry.name.toLowerCase()) && !SKIP_PATHS.has(file) ? [file] : [];
  });
}

function isNoindex(html) {
  return /<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(html) ||
    /<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(html);
}

function readPage(root, file) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const lang = (html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i) || [])[1] || '';
  const canonicalTag = (html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i) || [])[0] || '';
  const canonical = (canonicalTag.match(/\bhref=["']([^"']+)["']/i) || [])[1] || '';
  const hreflangCount = [...html.matchAll(/<link\b(?=[^>]*\brel=["']alternate["'])[^>]*\bhreflang=["'][^"']+["']/gi)].length;
  return {
    html, lang: lang.toLowerCase(), canonical,
    hasCanonical: Boolean(canonical),
    hasSiteShell: /assets\/site-shell\.js/i.test(html),
    hreflangCount,
    indexable: !isNoindex(html)
  };
}

function routeForLocale(file, localeSet) {
  const first = file.split('/')[0];
  return localeSet.has(first) ? file.slice(first.length + 1) : file;
}

function auditLocaleCoverage(root, locales = DEFAULT_LOCALES) {
  const localeSet = new Set(locales);
  const files = walkHtml(root);
  const pages = files.map(file => ({ file, ...readPage(root, file) }));
  const indexable = pages.filter(page => page.indexable);
  const englishPages = indexable.filter(page => !localeSet.has(page.file.split('/')[0]));
  const englishPaths = new Set(englishPages.map(page => page.file));
  const byLocale = {};

  for (const locale of locales) {
    const localized = indexable.filter(page => page.file.startsWith(locale + '/'));
    const byRoute = new Map(localized.map(page => [routeForLocale(page.file, localeSet), page]));
    const missing = [...englishPaths].filter(route => !byRoute.has(route)).sort();
    const invalidLang = localized.filter(page => page.lang && page.lang.split('-')[0] !== locale).map(page => page.file);
    const missingLang = localized.filter(page => !page.lang).map(page => page.file);
    const missingCanonical = localized.filter(page => !page.hasCanonical).map(page => page.file);
    const missingShell = localized.filter(page => !page.hasSiteShell).map(page => page.file);
    const missingHreflang = localized.filter(page => page.hreflangCount === 0).map(page => page.file);
    byLocale[locale] = {
      translatedPageCount: localized.length,
      englishPageCount: englishPages.length,
      coveragePercent: englishPages.length
        ? Number(((englishPages.length - missing.length) / englishPages.length * 100).toFixed(1)) : 0,
      missingCount: missing.length,
      missingPages: missing,
      missingLangCount: missingLang.length,
      missingLangPages: missingLang,
      invalidLangCount: invalidLang.length,
      invalidLangPages: invalidLang,
      missingCanonicalCount: missingCanonical.length,
      missingCanonicalPages: missingCanonical,
      missingSiteShellCount: missingShell.length,
      missingSiteShellPages: missingShell,
      missingHreflangCount: missingHreflang.length,
      missingHreflangPages: missingHreflang
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    publicIndexableEnglishPageCount: englishPages.length,
    publicIndexableHtmlPageCount: indexable.length,
    excludedNoindexPageCount: pages.filter(page => !page.indexable).length,
    locales: byLocale
  };
}

function renderMarkdown(report) {
  const rows = Object.entries(report.locales).map(([locale, data]) =>
    '| ' + locale + ' | ' + data.translatedPageCount + ' | ' + data.englishPageCount +
    ' | ' + data.coveragePercent + '% | ' + data.missingCount + ' | ' +
    data.missingLangCount + ' | ' + data.invalidLangCount + ' | ' +
    data.missingCanonicalCount + ' | ' + data.missingSiteShellCount + ' | ' +
    data.missingHreflangCount + ' |'
  );
  return [
    '# Locale page coverage audit',
    '',
    'Generated: ' + report.generatedAt,
    '',
    'Public indexable English/root HTML pages: **' + report.publicIndexableEnglishPageCount +
      '**. Public indexable HTML pages: **' + report.publicIndexableHtmlPageCount +
      '**. Excluded noindex HTML pages: **' + report.excludedNoindexPageCount + '**.',
    '',
    '| Locale | Existing pages | English pages | Route coverage | Missing routes | Missing lang | Invalid lang | Missing canonical | Missing site shell | Missing hreflang |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...rows,
    '',
    'Route coverage only confirms that a corresponding locale HTML path exists. It does not certify that visible copy, calculator labels/results, formulas, examples, FAQs, metadata, structured data, or jurisdiction-specific rules are translated correctly.',
    'Missing hreflang is a review signal, not an automatic instruction to add tags: alternate clusters must be reciprocal and point to canonical URLs.',
    ''
  ].join('\n');
}

if (require.main === module) {
  const root = path.resolve(process.argv[2] || process.cwd());
  const report = auditLocaleCoverage(root);
  process.stdout.write(renderMarkdown(report));
}

module.exports = { DEFAULT_LOCALES, auditLocaleCoverage, renderMarkdown, isNoindex, walkHtml };
