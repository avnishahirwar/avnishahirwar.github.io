#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://friendlycalculator.in';
const DEFAULT_IMAGE = ORIGIN + '/og-friendly-calculator.png';
const EXCLUDED_PREFIXES = ['admin/', 'avnish-ai/', 'calculator/admin.html', 'calculator/dashboard.html', 'tests/'];
const SOCIAL_PROPERTIES = [
  ['og:type', (ctx) => ctx.type],
  ['og:site_name', () => 'Friendly Calculator'],
  ['og:title', (ctx) => ctx.title],
  ['og:description', (ctx) => ctx.description],
  ['og:url', (ctx) => ctx.canonicalUrl],
  ['og:image', () => DEFAULT_IMAGE],
  ['og:image:alt', () => 'Friendly Calculator — online calculators and practical tools']
];
const TWITTER_PROPERTIES = [
  ['twitter:card', () => 'summary_large_image'],
  ['twitter:title', (ctx) => ctx.title],
  ['twitter:description', (ctx) => ctx.description],
  ['twitter:image', () => DEFAULT_IMAGE],
  ['twitter:image:alt', () => 'Friendly Calculator — online calculators and practical tools']
];

function walk(dir, relative = '') {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const absolute = path.join(dir, entry.name);
    const rel = relative ? relative + '/' + entry.name : entry.name;
    if (entry.isDirectory()) files.push(...walk(absolute, rel));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(rel);
  }
  return files;
}

function readAttribute(tag, name) {
  const pattern = new RegExp("\\b" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", 'i');
  const match = tag.match(pattern);
  return match ? (match[1] !== undefined ? match[1] : match[2]) : null;
}
function getMeta(html, key, attribute) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const tag = tags.find((candidate) => {
    const value = readAttribute(candidate, attribute);
    return value !== null && value.toLowerCase() === key.toLowerCase();
  });
  if (!tag) return null;
  return { tag, value: readAttribute(tag, 'content') || '' };
}

function getCanonicalUrl(html, relPath) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  const tag = links.find((candidate) => {
    const rel = readAttribute(candidate, 'rel');
    return rel !== null && rel.toLowerCase().split(/\s+/).includes('canonical');
  });
  const href = tag ? readAttribute(tag, 'href') : null;
  if (href) {
    try { return new URL(href, ORIGIN).href; } catch (_) { /* use path-derived fallback */ }
  }
  const pathname = '/' + relPath.split(path.sep).join('/');
  const normalized = pathname.endsWith('/index.html') ? pathname.slice(0, -'index.html'.length) : pathname;
  return ORIGIN + encodeURI(normalized);
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&(?!(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);)/gi, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
}

function inspectAndRepair(relPath, html) {
  const robots = getMeta(html, 'robots', 'name');
  if ((robots && /\bnoindex\b/i.test(robots.value)) ||
      EXCLUDED_PREFIXES.some((prefix) => relPath.startsWith(prefix))) {
    return { html, skipped: true, reason: 'excluded-or-noindex' };
  }

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const description = getMeta(html, 'description', 'name');
  if (!titleMatch || !titleMatch[1].trim() || !description || !description.value.trim() || !/<\/head>/i.test(html)) {
    return { html, skipped: true, reason: 'missing-source-metadata-or-head' };
  }

  const title = titleMatch[1].replace(/[\r\n\t]+/g, ' ').trim();
  const ctx = {
    title,
    description: description.value.replace(/[\r\n\t]+/g, ' ').trim(),
    canonicalUrl: getCanonicalUrl(html, relPath),
    type: /(^|\/)blog(\/|$)/i.test(relPath) ? 'article' : 'website'
  };

  const missing = [];
  const blankExisting = [];
  for (const [key, valueFor] of SOCIAL_PROPERTIES) {
    const existing = getMeta(html, key, 'property');
    if (!existing) missing.push('<meta property="' + key + '" content="' + escapeAttribute(valueFor(ctx)) + '">');
    else if (!existing.value.trim()) blankExisting.push('property:' + key);
  }
  for (const [key, valueFor] of TWITTER_PROPERTIES) {
    const existing = getMeta(html, key, 'name');
    if (!existing) missing.push('<meta name="' + key + '" content="' + escapeAttribute(valueFor(ctx)) + '">');
    else if (!existing.value.trim()) blankExisting.push('name:' + key);
  }

  if (!missing.length) return { html, skipped: true, reason: blankExisting.length ? 'pre-existing-empty-tags' : 'already-complete', blankExisting };
  const updated = html.replace(/<\/head>/i, '\n' + missing.join('\n') + '\n</head>');
  return { html: updated, changed: updated !== html, added: missing.length, blankExisting };
}

const write = process.argv.includes('--write');
const check = process.argv.includes('--check') || !write;
let scanned = 0;
let changedPages = 0;
let addedTags = 0;
let skipped = 0;
let pagesWithBlankTags = 0;
const changedFiles = [];

for (const relPath of walk(ROOT)) {
  const absolute = path.join(ROOT, relPath);
  const html = fs.readFileSync(absolute, 'utf8');
  const result = inspectAndRepair(relPath, html);
  scanned++;
  if (result.skipped) skipped++;
  if (result.blankExisting && result.blankExisting.length) pagesWithBlankTags++;
  if (result.changed) {
    changedPages++;
    addedTags += result.added;
    changedFiles.push(relPath);
    if (write) fs.writeFileSync(absolute, result.html);
  }
}

console.log('Scanned ' + scanned + ' HTML files; changed ' + changedPages + ' pages; added ' + addedTags + ' missing social tags; skipped ' + skipped + ' pages; ' + pagesWithBlankTags + ' pages contain pre-existing empty social tags.');
if (changedFiles.length && !write) {
  for (const file of changedFiles.slice(0, 30)) console.log('needs additive metadata: ' + file);
  if (changedFiles.length > 30) console.log('... and ' + (changedFiles.length - 30) + ' more pages');
}
if (check && (changedPages > 0 || pagesWithBlankTags > 0)) process.exitCode = 1;
