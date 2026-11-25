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
  'calculator/admin.html',
  'map.html',
  'maps.html',
  'seo-meta-tags.html',
  'schema/_homepage.html',
  'google09d3278d6d57b1a4.html',
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
    if (!/^\S+\s/.test(line)) {
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
  const noindexPublic = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (hasNoindexMeta(html) && !isAllowedNoindexFile(file)) {
      noindexPublic.push(file);
    }
    if (!isAllowedNoindexFile(file) && !PRIVATE_DIRS.has(file.split('/')[0])) checkedPublic++;
  }
  for (const file of noindexPublic) failures.push('Public HTML has meta robots noindex: ' + file);

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
    }
  }

  console.log('Indexability guard: ' + htmlFiles.length + ' HTML files scanned; ' +
    checkedPublic + ' public candidates checked; ' + noindexRules.length +
    ' intentional X-Robots-Tag noindex rules found.');
  if (failures.length) {
    console.error(failures.map(item => 'FAIL: ' + item).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Indexability guard passed. Intentional private, preview and utility exclusions are preserved.');
  }
}

main();
