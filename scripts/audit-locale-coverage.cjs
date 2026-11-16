#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_LOCALES = ['hi', 'es', 'fr', 'pt', 'ar', 'id', 'bn', 'ta', 'de', 'ja', 'ru'];
const SKIP_DIRS = new Set(['.git', 'node_modules', '.github', 'vendor', 'dist', 'coverage']);

function walkHtml(root, relative = '') {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) return [];
      return walkHtml(root, path.join(relative, entry.name));
    }
    return entry.isFile() && entry.name.toLowerCase().endsWith('.html')
      ? [path.join(relative, entry.name).split(path.sep).join('/')]
      : [];
  });
}

function auditLocaleCoverage(root, locales = DEFAULT_LOCALES) {
  const allHtml = walkHtml(root);
  const localeSet = new Set(locales);
  const englishPages = allHtml.filter((file) => !localeSet.has(file.split('/')[0]));
  const byLocale = {};
  for (const locale of locales) {
    const present = new Set(allHtml.filter((file) => file.startsWith(locale + '/'))
      .map((file) => file.slice(locale.length + 1)));
    const missing = englishPages.filter((file) => !present.has(file));
    byLocale[locale] = {
      translatedPageCount: present.size,
      englishPageCount: englishPages.length,
      coveragePercent: englishPages.length ? Number(((englishPages.length - missing.length) / englishPages.length * 100).toFixed(1)) : 0,
      missingCount: missing.length,
      missingPages: missing.sort()
    };
  }
  return {
    generatedAt: new Date().toISOString(),
    englishPageCount: englishPages.length,
    htmlPageCount: allHtml.length,
    locales: byLocale
  };
}

function renderMarkdown(report) {
  const rows = Object.entries(report.locales).map(([locale, data]) =>
    `| ${locale} | ${data.translatedPageCount} | ${data.englishPageCount} | ${data.coveragePercent}% | ${data.missingCount} |`
  );
  return [
    '# Locale page coverage audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `English/root HTML pages: **${report.englishPageCount}**. Total HTML files: **${report.htmlPageCount}**.`,
    '',
    '| Locale | Existing locale pages | English pages | Path coverage | Missing paths |',
    '|---|---:|---:|---:|---:|',
    ...rows,
    '',
    'This is a route-coverage audit, not a translation-quality or legal/financial accuracy certification.',
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
