#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_COMMIT = '6bec89958344d93eb0023377203e09921041cf4c';
const SOURCE_PARENT = 'ec8fdc294531660d5dfc6171c578172b5c841528';
const catalogue = require(path.join(ROOT, 'config/language-catalogue.json'));
const planned = new Set(catalogue.locales.filter(item => item.status === 'planned').map(item => item.code));
const SKIP = new Set(['.git', '.github', 'node_modules', 'tests', 'admin', 'avnish-ai', 'vendor', '_site']);

function walk(dir, rel = '') {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    const next = rel ? rel + '/' + entry.name : entry.name;
    if (entry.isDirectory()) files.push(...walk(absolute, next));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(next);
  }
  return files;
}

function findTag(html, expression) {
  return (html.match(expression) || [])[0] || '';
}
function attr(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp('\\b' + escaped + '\\s*=\\s*(["\\'])(.*?)\\1', 'i'));
  return match ? match[2] : '';
}
function replaceTag(html, current, replacement) {
  return current && replacement ? html.replace(current, replacement) : html;
}
function oldSource(rel) {
  try {
    return execFileSync('git', ['show', SOURCE_PARENT + ':' + rel], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}
function repairTruncatedMetadata(rel, html) {
  let updated = html;
  const currentTitle = findTag(updated, /<title\b[^>]*>[\s\S]*?<\/title>/i);
  const titleText = currentTitle.replace(/<\/?title\b[^>]*>/gi, '').trim();
  const titleNeedsRepair = /…|\.\.\./.test(titleText) ||
    (titleText.includes('| Friendly Calc') && !titleText.includes('| Friendly Calculator'));
  const currentDescription = findTag(updated, /<meta\b(?=[^>]*\bname\s*=\s*["']description["'])[^>]*>/i);
  const descriptionText = attr(currentDescription, 'content');
  const descriptionNeedsRepair = /…|\.\.\./.test(descriptionText) ||
    descriptionText.includes('Use your own inputs and review the method before relying on the estimate.');
  if (!titleNeedsRepair && !descriptionNeedsRepair) return updated;

  const previous = oldSource(rel);
  if (!previous) return updated;
  if (titleNeedsRepair) {
    const oldTitle = findTag(previous, /<title\b[^>]*>[\s\S]*?<\/title>/i);
    if (oldTitle) updated = replaceTag(updated, currentTitle, oldTitle);
  }
  if (descriptionNeedsRepair) {
    const oldDescription = findTag(previous, /<meta\b(?=[^>]*\bname\s*=\s*["']description["'])[^>]*>/i);
    if (oldDescription && attr(oldDescription, 'content') && !/[.…]{1,3}$/.test(attr(oldDescription, 'content').trim())) {
      updated = replaceTag(updated, currentDescription, oldDescription);
    }
  }
  return updated;
}
function markPlannedNoindex(rel, html) {
  const locale = rel.split('/')[0];
  if (!planned.has(locale)) return html;
  const tag = findTag(html, /<meta\b(?=[^>]*\bname\s*=\s*["']robots["'])[^>]*>/i);
  if (tag) {
    const value = attr(tag, 'content');
    if (/\bnoindex\b/i.test(value)) return html;
    const next = tag.replace(/\bcontent\s*=\s*(["']).*?\1/i, 'content="noindex,follow"');
    return html.replace(tag, next);
  }
  return html.replace(/<\/head>/i, '<meta name="robots" content="noindex,follow">\n</head>');
}

const write = process.argv.includes('--write');
let scanned = 0, metadataRepairs = 0, plannedNoindexRepairs = 0;
for (const rel of walk(ROOT)) {
  let html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const before = html;
  html = repairTruncatedMetadata(rel, html);
  if (html !== before) metadataRepairs++;
  const afterMeta = html;
  html = markPlannedNoindex(rel, html);
  if (html !== afterMeta) plannedNoindexRepairs++;
  scanned++;
  if (html !== before && write) fs.writeFileSync(path.join(ROOT, rel), html);
}
console.log('Scanned ' + scanned + ' HTML files; ' + metadataRepairs + ' truncated metadata repairs; ' + plannedNoindexRepairs + ' planned-locale noindex repairs' + (write ? ' applied' : ' required') + '.');
if (!write && (metadataRepairs || plannedNoindexRepairs)) process.exitCode = 1;
