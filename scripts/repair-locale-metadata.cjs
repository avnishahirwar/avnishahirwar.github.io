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
  const match = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i);
  return match ? match[1].trim() : null;
}
function routeInfo(file, html) {
  const relative = path.relative(ROOT, file).split(path.sep);
  const first = relative[0];
  const declared = declaredLanguage(html);
  if (LOCALES.has(first)) {
    if (!declared || declared.split('-')[0].toLowerCase() !== first) return null;
    return { language: declared, route: relative.slice(1).join('/'), isDefault: false };
  }
  if (first === 'en' || !declared || declared.split('-')[0].toLowerCase() !== 'en') return null;
  return { language: declared, route: relative.join('/'), isDefault: true };
}
function publicUrl(file) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  if (relative === 'index.html') return ORIGIN + '/';
  if (relative.endsWith('/index.html')) return ORIGIN + '/' + relative.slice(0, -'index.html'.length);
  return ORIGIN + '/' + relative;
}
function localFile(href) {
  try {
    const url = new URL(href, ORIGIN);
    if (url.origin !== ORIGIN || url.search || url.hash) return null;
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    else if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(ROOT, '.' + pathname);
    if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) return null;
    return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
  } catch { return null; }
}
function canonicalHref(html) {
  const end = headEnd(html);
  const head = html.slice(0, end < 0 ? html.length : end);
  const tag = head.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i);
  const match = tag && tag[0].match(/\bhref=["']([^"']+)["']/i);
  return match ? match[1] : null;
}
function canonicalFor(file, html) {
  const current = canonicalHref(html);
  return current && localFile(current) === file ? new URL(current, ORIGIN).href : publicUrl(file);
}
function replaceCanonical(html, file, url) {
  const current = canonicalHref(html);
  if (current && localFile(current) === file) return { html, changed: false };
  const end = headEnd(html);
  if (end < 0) return { html, changed: false };
  const head = html.slice(0, end);
  const tagPattern = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i;
  const tag = head.match(tagPattern);
  if (tag) {
    const nextTag = /\bhref=["'][^"']*["']/i.test(tag[0])
      ? tag[0].replace(/\bhref=["'][^"']*["']/i, 'href="' + url + '"')
      : tag[0].replace(/>$/, ' href="' + url + '">');
    return { html: html.slice(0, end).replace(tagPattern, nextTag) + html.slice(end), changed: true };
  }
  const insertion = '<link rel="canonical" href="' + url + '">\n';
  return { html: html.slice(0, end) + insertion + html.slice(end), changed: true };
}
function validExtraAlternates(file, html, cluster, cache) {
  const end = headEnd(html);
  const head = html.slice(0, end < 0 ? html.length : end);
  const clusterLanguages = new Set(cluster.map(item => item.language.toLowerCase()));
  const sourceCanonical = canonicalFor(file, html);
  const extras = new Map();
  for (const match of head.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\brel=["']alternate["']/i.test(tag)) continue;
    const language = (tag.match(/\bhreflang=["']([^"']+)["']/i) || [])[1];
    const href = (tag.match(/\bhref=["']([^"']+)["']/i) || [])[1];
    if (!language || !href || language.toLowerCase() === 'x-default' || clusterLanguages.has(language.toLowerCase())) continue;
    const targetFile = localFile(href);
    if (!targetFile || targetFile === file) continue;
    const targetHtml = cache.get(targetFile);
    if (!targetHtml || (declaredLanguage(targetHtml) || '').toLowerCase() !== language.toLowerCase()) continue;
    const targetCanonical = canonicalFor(targetFile, targetHtml);
    if (targetCanonical !== new URL(href, ORIGIN).href || targetCanonical === sourceCanonical) continue;
    extras.set(language.toLowerCase(), { language, url: targetCanonical });
  }
  return [...extras.values()].sort((a, b) => a.language.toLowerCase().localeCompare(b.language.toLowerCase()));
}
function rebuildAlternates(html, cluster, extras = []) {
  const end = headEnd(html);
  if (end < 0) return { html, changed: false };
  const head = html.slice(0, end);
  const tagPattern = /<link\b[^>]*>/gi;
  const existing = [...head.matchAll(tagPattern)].map(match => match[0])
    .filter(tag => /\brel=["']alternate["']/i.test(tag) && /\bhreflang=["'][^"']+["']/i.test(tag))
    .map(tag => {
      const language = (tag.match(/\bhreflang=["']([^"']+)["']/i) || [])[1];
      const href = (tag.match(/\bhref=["']([^"']+)["']/i) || [])[1];
      try { return language && href ? [language.toLowerCase(), new URL(href, ORIGIN).href] : null; }
      catch { return null; }
    }).filter(Boolean);
  const links = [...cluster, ...extras];
  const desired = links.map(item => [item.language.toLowerCase(), item.url]);
  desired.push(['x-default', cluster.find(item => item.isDefault).url]);
  const same = existing.length === desired.length && desired.every(([language, url]) =>
    existing.some(([currentLanguage, currentUrl]) => currentLanguage === language && currentUrl === url));
  if (same) return { html, changed: false };

  const pattern = /<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=)[^>]*\/?\s*>/gi;
  const cleaned = head.replace(pattern, '');
  const tags = links.map(item => '  <link rel="alternate" hreflang="' + item.language + '" href="' + item.url + '">');
  tags.push('  <link rel="alternate" hreflang="x-default" href="' + cluster.find(item => item.isDefault).url + '">');
  const trimmed = cleaned.replace(/(?:[ \t]*\n)*[ \t]*$/, '');
  const nextHead = trimmed + '\n' + tags.join('\n') + '\n';
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
    const key = info.language.toLowerCase();
    if (!group.has(key)) group.set(key, { language: info.language, file, isDefault: info.isDefault });
  }

  const updates = new Map();
  const stats = { pagesScanned: pages.length, routeGroups: groups.size, clustersRebuilt: 0, changedPages: 0, canonicalsCorrected: 0, alternateSetsRebuilt: 0, skippedGroups: 0 };
  for (const [route, group] of groups) {
    const entries = [...group.values()];
    const defaultEntry = entries.find(item => item.isDefault);
    if (!defaultEntry || group.size < 2) { stats.skippedGroups++; continue; }
    const cluster = entries
      .sort((a, b) => a.language.toLowerCase().localeCompare(b.language.toLowerCase()))
      .map(item => ({ ...item, url: canonicalFor(item.file, cache.get(item.file)) }));
    if (cluster.some(item => !cache.has(item.file))) { stats.skippedGroups++; continue; }
    stats.clustersRebuilt++;
    for (const item of cluster) {
      let html = cache.get(item.file);
      const canonical = replaceCanonical(html, item.file, item.url);
      if (canonical.changed) stats.canonicalsCorrected++;
      html = canonical.html;
      const extras = validExtraAlternates(item.file, html, cluster, cache);
      const alternates = rebuildAlternates(html, cluster, extras);
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
