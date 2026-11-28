#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://friendlycalculator.in';
const DEFAULT_IMAGE = `${ORIGIN}/og-friendly-calculator.png`;
const EXCLUDED_PREFIXES = ['admin/', 'avnish-ai/', 'calculator/admin.html', 'calculator/dashboard.html', 'tests/'];

function walk(dir, relative = '') {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const absolute = path.join(dir, entry.name);
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...walk(absolute, rel));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(rel);
  }
  return files;
}

function getMeta(html, key, attribute = 'name') {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<meta\\b[^>]*\\b${attribute}\\s*=\\s*(["'])${escaped}\\1[^>]*>`, 'i');
  const match = html.match(re);
  if (!match) return null;
  const content = match[0].match(/\bcontent\s*=\s*(["'])(.*?)\1/i);
  return content ? { tag: match[0], value: content[2] } : { tag: match[0], value: '' };
}

function getLink(html, rel) {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<link\\b[^>]*\\brel\\s*=\\s*(["'])${escaped}\\1[^>]*>`, 'i');
  const match = html.match(re);
  if (!match) return null;
  const href = match[0].match(/\bhref\s*=\s*(["'])(.*?)\1/i);
  return href ? { tag: match[0], value: href[2] } : { tag: match[0], value: '' };
}

function attr(value) {
  return String(value).replace(/&(?!(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);)/gi, '&amp;')
    .replace(/"/g, '&quot;').replace(/[\r\n\t]+/g, ' ').trim();
}

function publicCanonical(relPath) {
  const pathname = `/${relPath.split(path.sep).join('/')}`;
  const normalized = pathname.endsWith('/index.html') ? pathname.slice(0, -'index.html'.length) : pathname;
  return `${ORIGIN}${encodeURI(normalized)}`;
}

function inspectAndRepair(relPath, html) {
  const robots = getMeta(html, 'robots');
  if ((robots && /\bnoindex\b/i.test(robots.value)) || EXCLUDED_PREFIXES.some(prefix => relPath.startsWith(prefix))) {
    return { html, skipped: true, changed: false };
  }

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const description = getMeta(html, 'description');
  if (!titleMatch || !titleMatch[1].trim() || !description || !description.value.trim()) {
    return { html, skipped: true, changed: false };
  }

  let updated = html;
  updated = updated.replace(/(<title\b[^>]*>[\s\S]*?)&amp;amp;([\s\S]*?<\/title>)/i, '$1&amp;$2');
  const canonical = getLink(updated, 'canonical');
  const canonicalUrl = canonical && canonical.value
    ? new URL(canonical.value, ORIGIN).href
    : publicCanonical(relPath);
  const title = updated.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)[1].replace(/[\r\n\t]+/g, ' ').trim();
  const desc = description.value.replace(/[\r\n\t]+/g, ' ').trim();
  const type = /(^|\/)blog(\/|$)/i.test(relPath) ? 'article' : 'website';
  const missing = [];

  if (!canonical || !canonical.value) missing.push(`<link rel="canonical" href="${attr(canonicalUrl)}">`);
  const meta = (key, value) => {
    const existing = getMeta(updated, key, 'property');
    if (!existing || !existing.value.trim()) missing.push(`<meta property="${key}" content="${attr(value)}">`);
  };
  const named = (key, value) => {
    const existing = getMeta(updated, key, 'name');
    if (!existing || !existing.value.trim()) missing.push(`<meta name="${key}" content="${attr(value)}">`);
  };

  meta('og:type', type);
  meta('og:site_name', 'Friendly Calculator');
  meta('og:title', title);
  meta('og:description', desc);
  meta('og:url', canonicalUrl);
  meta('og:image', DEFAULT_IMAGE);
  meta('og:image:alt', 'Friendly Calculator — online calculators and practical tools');
  named('twitter:card', 'summary_large_image');
  named('twitter:title', title);
  named('twitter:description', desc);
  named('twitter:image', DEFAULT_IMAGE);
  named('twitter:image:alt', 'Friendly Calculator — online calculators and practical tools');

  if (missing.length) {
    const block = `\n${missing.join('\n')}\n`;
    updated = updated.replace(/<\/head>/i, `${block}</head>`);
  }
  return { html: updated, skipped: false, changed: updated !== html };
}

const write = process.argv.includes('--write');
const check = process.argv.includes('--check') || !write;
let scanned = 0;
let changed = 0;
let skipped = 0;
for (const relPath of walk(ROOT)) {
  const absolute = path.join(ROOT, relPath);
  const html = fs.readFileSync(absolute, 'utf8');
  const result = inspectAndRepair(relPath, html);
  scanned++;
  if (result.skipped) skipped++;
  if (result.changed) {
    changed++;
    if (write) fs.writeFileSync(absolute, result.html);
    else if (changed <= 30) console.log(`needs repair: ${relPath}`);
  }
}
console.log(`Scanned ${scanned} HTML files; ${skipped} excluded or lacking public metadata; ${changed} need repair${write ? ' and were updated' : ''}.`);
if (check && changed > 0) process.exitCode = 1;
