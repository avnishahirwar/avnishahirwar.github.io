#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ORIGIN = 'https://friendlycalculator.in';
const LANGUAGE_PREFIXES = new Set(['zh','hi','es','ar','fr','bn','pt','id','ur','ru','de','ja','pcm','arz','mr','vi','te','sw','ha','tr','pa','fil','ta','yue','wuu','fa','ko','am','th','jv','it','gu','kn','yo','bho','nl','pl','ml','or','ne','si','uz','ps','so','he','my','ro','sd']);
const FALLBACK_LANGUAGE_PREFIXES = new Set(['hi','de','es','fr','pt','ar','id','bn','ta','ja','ru']);
const IGNORED_DIRS = new Set(['.git','.github','node_modules','vendor','_site','tests','admin','avnish-ai']);

function walk(dir, root, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute, root, files);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      files.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  }
  return files;
}

function getHead(html) {
  const index = html.toLowerCase().indexOf('</head>');
  return index < 0 ? null : html.slice(0, index);
}

function getLanguage(html, relativePath) {
  const head = getHead(html);
  const source = head === null ? html : head;
  const match = source.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i);
  if (match) return match[1].trim().toLowerCase();
  const first = relativePath.split('/')[0];
  return FALLBACK_LANGUAGE_PREFIXES.has(first) ? first : 'en';
}

function isNoindex(html) {
  const head = getHead(html);
  if (head === null) return false;
  return /<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(head) ||
    /<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(head);
}

function getCanonical(html) {
  const head = getHead(html);
  if (head === null) return null;
  const tag = head.match(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])(?=[^>]*\bhref\s*=\s*["']([^"']+)["'])[^>]*>/i);
  if (!tag) return null;
  try {
    const url = new URL(tag[1], ORIGIN);
    if (url.origin !== ORIGIN || url.search || url.hash) return null;
    return url.href;
  } catch {
    return null;
  }
}

function fileRoute(relativePath) {
  if (relativePath === 'index.html') return '/';
  if (relativePath.endsWith('/index.html')) return '/' + relativePath.slice(0, -'index.html'.length);
  return '/' + relativePath;
}

function normalizedRoute(route) {
  return route.endsWith('index.html') ? route.slice(0, -'index.html'.length) : route;
}

function routeKey(relativePath) {
  const parts = relativePath.split('/');
  if (parts.length > 1 && LANGUAGE_PREFIXES.has(parts[0])) return parts.slice(1).join('/');
  return relativePath;
}

function hasSelfCanonical(relativePath, canonical) {
  if (!canonical) return false;
  try {
    const actual = new URL(canonical);
    return actual.origin === ORIGIN &&
      normalizedRoute(actual.pathname) === normalizedRoute(fileRoute(relativePath));
  } catch {
    return false;
  }
}

function alternateTags(head) {
  return [...head.matchAll(/<link\b(?=[^>]*\brel\s*=\s*["']alternate["'])(?=[^>]*\bhreflang\s*=\s*["'][^"']+["'])[^>]*>/gi)];
}

function renderTags(members) {
  const sorted = [...members.entries()].sort(([a], [b]) => a.localeCompare(b));
  const tags = sorted.map(([lang, url]) =>
    '<link rel="alternate" hreflang="' + lang + '" href="' + url + '">'
  );
  const english = members.get('en');
  if (english) tags.push('<link rel="alternate" hreflang="x-default" href="' + english + '">');
  return tags;
}

function normalizeDirectory(root, { write = false } = {}) {
  const files = walk(root, root);
  const pages = new Map();
  const groups = new Map();
  const stats = {
    pagesScanned: files.length,
    indexableSelfCanonicalPages: 0,
    noindexPages: 0,
    missingOrNoncanonicalPages: 0,
    invalidLanguagePages: 0,
    languageConflictGroups: 0,
    translatedRouteGroups: 0,
    oldAlternateTags: 0,
    newAlternateTags: 0,
    changedPages: 0
  };

  for (const relativePath of files) {
    const absolute = path.join(root, relativePath);
    const html = fs.readFileSync(absolute, 'utf8');
    const head = getHead(html);
    if (head === null) {
      pages.set(relativePath, { absolute, html, eligible: false, tags: [] });
      stats.missingOrNoncanonicalPages++;
      continue;
    }
    const existing = alternateTags(head);
    stats.oldAlternateTags += existing.length;
    const noindex = isNoindex(html);
    const canonical = getCanonical(html);
    const lang = getLanguage(html, relativePath);
    const validLanguage = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(lang);
    const eligible = !noindex && validLanguage && hasSelfCanonical(relativePath, canonical);

    const page = {
      absolute, html, head, lang, canonical, eligible,
      tags: [], routeKey: routeKey(relativePath)
    };
    pages.set(relativePath, page);

    if (noindex) stats.noindexPages++;
    if (!validLanguage) stats.invalidLanguagePages++;
    if (!noindex && validLanguage && !hasSelfCanonical(relativePath, canonical)) stats.missingOrNoncanonicalPages++;
    if (eligible) {
      stats.indexableSelfCanonicalPages++;
      if (!groups.has(page.routeKey)) groups.set(page.routeKey, new Map());
      const members = groups.get(page.routeKey);
      if (members.has(lang)) {
        members.set(lang, null);
      } else {
        members.set(lang, { relativePath, canonical });
      }
    }
  }

  for (const [key, members] of groups) {
    if ([...members.values()].some(value => value === null)) {
      stats.languageConflictGroups++;
      continue;
    }
    if (members.size < 2) continue;
    stats.translatedRouteGroups++;
    const canonicalMembers = new Map([...members.entries()].map(([lang, item]) => [lang, item.canonical]));
    for (const item of members.values()) {
      pages.get(item.relativePath).tags = renderTags(canonicalMembers);
    }
  }

  for (const page of pages.values()) {
    const cleanHead = page.head.replace(
      /<link\b(?=[^>]*\brel\s*=\s*["']alternate["'])(?=[^>]*\bhreflang\s*=\s*["'][^"']+["'])[^>]*>\s*/gi,
      ''
    );
    const trimmedHead = cleanHead.replace(/[ \t]+\n/g, '\n').trimEnd();
    const nextHead = trimmedHead + (page.tags.length ? '\n' + page.tags.join('\n') + '\n' : '\n');
    const headEnd = page.html.toLowerCase().indexOf('</head>');
    const nextHtml = page.html.slice(0, headEnd) + nextHead + page.html.slice(headEnd);
    if (nextHtml !== page.html) {
      stats.changedPages++;
      stats.newAlternateTags += page.tags.length;
      if (write) fs.writeFileSync(page.absolute, nextHtml);
    }
  }

  return stats;
}

function main() {
  const write = process.argv.includes('--write');
  const check = process.argv.includes('--check');
  const root = process.cwd();
  const stats = normalizeDirectory(root, { write });
  console.log('Hreflang cluster normalization: ' + JSON.stringify(stats));
  if (!write) console.log('Dry run only. No files were changed.');
  if (check && stats.changedPages > 0) process.exitCode = 1;
}

if (require.main === module) main();
module.exports = { normalizeDirectory };
