#!/usr/bin/env node
'use strict';

// Rebuild hreflang clusters only where the repository contains an exact,
// language-matched route counterpart. Preserve page content and all non-SEO tags.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = process.cwd();
const ORIGIN = 'https://friendlycalculator.in';
const IGNORE = new Set(['.git', '.github', 'node_modules', 'tests', 'vendor', '_site', 'admin', 'avnish-ai']);
const catalogue = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/language-catalogue.json'), 'utf8'));
const LOCALES = new Set(catalogue.locales.map(item => item.code).filter(code => code && code !== 'en'));

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || IGNORE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(full);
  }
  return files;
}
function headEnd(html) { return html.toLowerCase().indexOf('</head>'); }
function declaredLanguage(html) {
  const head = html.slice(0, headEnd(html) < 0 ? html.length : headEnd(html));
  const match = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i);
  return match ? match[1].toLowerCase().split('-')[0] : null;
}
function routeInfo(file, html) {
  const relative = path.relative(ROOT, file).split(path.sep);
  const first = relative[0];
  if (LOCALES.has(first)) {
    const language = declaredLanguage(html);
    if (language !== first) return null;
    return { language: first, route: relative.slice(1).join('/') };
  }
  if (first === 'en' || declaredLanguage(html) !== 'en') return null;
  return { language: 'en', route: relative.join('/') };
}
function publicUrl(file) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  if (relative === 'index.html') return ORIGIN + '/';
  if (relative.endsWith('/index.html')) return ORIGIN + '/' + relative.slice(0, -'index.html'.length);
  return ORIGIN + '/' + relative;
}
function replaceCanonical(html, url) {
  const end = headEnd(html);
  if (end < 0) return { html, changed: false };
  const head = html.slice(0, end);
  const tagPattern = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i;
  const tag = head.match(tagPattern);
  if (tag) {
    const nextTag = /\bhref=["'][^"']*["']/i.test(tag[0])
      ? tag[0].replace(/\bhref=["'][^"']*["']/i, 'href="' + url + '"')
      : tag[0].replace(/>$/, ' href="' + url + '">');
    if (nextTag === tag[0]) return { html, changed: false };
    return { html: html.slice(0, end).replace(tagPattern, nextTag) + html.slice(end), changed: true };
  }
  const insertion = '<link rel="canonical" href="' + url + '">\n';
  return { html: html.slice(0, end) + insertion + html.slice(end), changed: true };
}
function rebuildAlternates(html, cluster) {
  const end = headEnd(html);
  if (end < 0) return { html, changed: false };
  const head = html.slice(0, end);
  const pattern = /<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=)[^>]*\/?\s*>/gi;
  const cleaned = head.replace(pattern, '');
  const tags = cluster.map(item => '  <link rel="alternate" hreflang="' + item.language + '" href="' + item.url + '">');
  tags.push('  <link rel="alternate" hreflang="x-default" href="' + cluster.find(item => item.language === 'en').url + '">');
  const trimmed = cleaned.replace(/[ \t]*\n*$/, '');
  const nextHead = trimmed + '\n' + tags.join('\n') + '\n';
  if (nextHead === head) return { html, changed: false };
  return { html: nextHead + html.slice(end), changed: true };
}

function main() {
  const pages = walk(ROOT);
  const cache = new Map(pages.map(file => [file, fs.readFileSync(file, 'utf8')]));
  const groups = new Map();
  for (const [file, html] of cache) {
    const info = routeInfo(file, html);
    if (!info) continue;
    if (!groups.has(info.route)) groups.set(info.route, new Map());
    const group = groups.get(info.route);
    if (!group.has(info.language)) group.set(info.language, file);
  }

  const updates = new Map();
  const stats = { pagesScanned: pages.length, routeGroups: groups.size, clustersRebuilt: 0, changedPages: 0, canonicalsCorrected: 0, alternateSetsRebuilt: 0, skippedGroups: 0 };
  for (const [route, group] of groups) {
    if (!group.has('en') || group.size < 2) { stats.skippedGroups++; continue; }
    const cluster = [...group.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([language, file]) => ({ language, file, url: publicUrl(file) }));
    if (cluster.some(item => !cache.has(item.file))) { stats.skippedGroups++; continue; }
    stats.clustersRebuilt++;
    for (const item of cluster) {
      let html = cache.get(item.file);
      const canonical = replaceCanonical(html, item.url);
      if (canonical.changed) stats.canonicalsCorrected++;
      html = canonical.html;
      const alternates = rebuildAlternates(html, cluster);
      if (alternates.changed) stats.alternateSetsRebuilt++;
      html = alternates.html;
      if (html !== cache.get(item.file)) {
        updates.set(item.file, html);
        stats.changedPages++;
      }
    }
  }

  for (const [file, content] of updates) {
    if (process.argv.includes('--write')) fs.writeFileSync(file, content);
    else console.log('Locale metadata candidate: ' + path.relative(ROOT, file));
  }
  console.log('Verified locale metadata repair: ' + JSON.stringify(stats));
  if (!process.argv.includes('--write')) console.log('Dry run only. No files were changed.');
}
main();
