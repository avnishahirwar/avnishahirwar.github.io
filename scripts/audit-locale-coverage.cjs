#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const languageCatalogue = require('../config/language-catalogue.json');

const DEFAULT_LOCALES = languageCatalogue.locales
  .map(locale => locale.code)
  .filter(code => code !== languageCatalogue.defaultLocale);
const SKIP_DIRS = new Set([
  '.git', '.github', 'node_modules', 'vendor', 'dist', 'coverage',
  'artifacts', 'admin', 'avnish-ai', 'tests'
]);
const SKIP_FILES = new Set(['404.html', 'offline.html']);

function walkHtml(root, relative = '') {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) return [];
      return walkHtml(root, path.join(relative, entry.name));
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.html') ||
        SKIP_FILES.has(entry.name.toLowerCase())) return [];
    return [path.join(relative, entry.name).split(path.sep).join('/')];
  });
}

function readPublicPages(root, files) {
  const pages = [];
  let excludedNoindexPageCount = 0;
  let excludedCanonicalAliasPageCount = 0;
  for (const file of files) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const noindex = /<meta\b[^>]*(?:name\s*=\s*["'](?:robots|googlebot)["'][^>]*content\s*=\s*["'][^"']*\bnoindex\b|content\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*name\s*=\s*["'](?:robots|googlebot)["'])/i.test(html);
    if (noindex) {
      excludedNoindexPageCount++;
      continue;
    }
    if (!canonicalMatchesFile(file, html)) {
      excludedCanonicalAliasPageCount++;
      continue;
    }
    pages.push({ file, html });
  }
  return { pages, excludedNoindexPageCount, excludedCanonicalAliasPageCount };
}

function canonicalMatchesFile(file, html) {
  const tag = html.match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i);
  const href = tag && tag[0].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!href) return true;
  try {
    const url = new URL(href, 'https://friendlycalculator.in');
    if (url.origin !== 'https://friendlycalculator.in' || url.search || url.hash) return true;
    const filePath = file === 'index.html' ? '/' :
      file.endsWith('/index.html') ? '/' + file.slice(0, -'index.html'.length) : '/' + file;
    const normalize = value => value.endsWith('index.html')
      ? value.slice(0, -'index.html'.length) : value;
    return normalize(url.pathname) === normalize(filePath);
  } catch {
    return true;
  }
}

function localePrefix(file, localeSet) {
  const first = file.split('/')[0];
  return localeSet.has(first) ? first : null;
}

function hasHreflang(html, locale, urlPath) {
  const tags = html.match(/<link\b[^>]*\brel\s*=\s*["']alternate["'][^>]*>/gi) || [];
  const expectedPath = urlPath === 'index.html'
    ? '/'
    : '/' + urlPath.replace(/index\.html$/, '');
  return tags.some(tag => {
    const lang = tag.match(/\bhreflang\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (lang !== locale) return false;
    try {
      const url = new URL(href, 'https://friendlycalculator.in');
      const actualPath = url.pathname.endsWith('index.html')
        ? url.pathname.slice(0, -'index.html'.length)
        : url.pathname;
      return url.origin === 'https://friendlycalculator.in' && actualPath === expectedPath;
    } catch {
      return false;
    }
  });
}

function auditLocaleCoverage(root, locales = DEFAULT_LOCALES) {
  const allHtml = walkHtml(root);
  const { pages, excludedNoindexPageCount, excludedCanonicalAliasPageCount } = readPublicPages(root, allHtml);
  const localeSet = new Set(locales);
  const englishPages = pages.filter(page => {
    const prefix = localePrefix(page.file, localeSet);
    const lang = page.html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    return !prefix || (lang && lang.split('-')[0] !== prefix);
  });
  const byLocale = {};

  for (const locale of locales) {
    const present = pages.filter(page => {
      const prefix = localePrefix(page.file, localeSet);
      const lang = page.html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
      return prefix === locale && (!lang || lang.split('-')[0] === locale);
    });
    const presentPaths = new Set(present.map(page => page.file.slice(locale.length + 1)));
    const missing = englishPages.filter(page => !presentPaths.has(page.file));
    let missingLangCount = 0;
    let missingSiteShellCount = 0;
    let missingHreflangCount = 0;

    for (const page of present) {
      const lang = page.html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
      if (lang !== locale.toLowerCase()) missingLangCount++;
      if (!/\/assets\/site-shell\.js(?:[?#"'])/i.test(page.html)) missingSiteShellCount++;
      const englishPath = page.file.slice(locale.length + 1);
      if (!hasHreflang(page.html, 'en', englishPath)) missingHreflangCount++;
    }

    byLocale[locale] = {
      translatedPageCount: present.length,
      englishPageCount: englishPages.length,
      coveragePercent: englishPages.length
        ? Number(((englishPages.length - missing.length) / englishPages.length * 100).toFixed(1))
        : 0,
      missingCount: missing.length,
      missingPages: missing.map(page => page.file).sort(),
      missingLangCount,
      missingSiteShellCount,
      missingHreflangCount
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    englishPageCount: englishPages.length,
    publicIndexableEnglishPageCount: englishPages.length,
    excludedNoindexPageCount,
    excludedCanonicalAliasPageCount,
    htmlPageCount: allHtml.length,
    locales: byLocale
  };
}

function renderMarkdown(report) {
  const rows = Object.entries(report.locales).map(([locale, data]) =>
    `| ${locale} | ${data.translatedPageCount} | ${data.englishPageCount} | ${data.coveragePercent}% | ${data.missingCount} | ${data.missingLangCount} | ${data.missingSiteShellCount} | ${data.missingHreflangCount} |`
  );
  return [
    '# Locale page coverage audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `Public indexable English/root HTML pages: **${report.publicIndexableEnglishPageCount}**. Total HTML files: **${report.htmlPageCount}**. Excluded noindex pages: **${report.excludedNoindexPageCount}**. Excluded canonical aliases: **${report.excludedCanonicalAliasPageCount}**.`,
    '',
    '| Locale | Existing locale pages | English pages | Path coverage | Missing paths | Missing lang | Missing site shell | Missing English hreflang |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...rows,
    '',
    'This audit measures route coverage and technical locale signals only. It does not certify that visible copy is translated accurately or that jurisdiction-specific content is correct.',
    'A matching HTML path may still contain untranslated text. Review page language, metadata, labels, FAQs, structured data and jurisdiction-specific assumptions before marking a locale complete.',
    ''
  ].join('\n');
}

if (require.main === module) {
  const root = path.resolve(process.argv[2] || process.cwd());
  const report = auditLocaleCoverage(root);
  process.stdout.write(renderMarkdown(report));
}

module.exports = { DEFAULT_LOCALES, auditLocaleCoverage, renderMarkdown };
