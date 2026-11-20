#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://friendlycalculator.in';
const INDEX_PATH = path.join(ROOT, 'assets', 'calculator-search-index.json');
const CALCULATORS_DIR = path.join(ROOT, 'calculators');
const STOP_WORDS = new Set(['this','with','from','using','into','your','will','that','are','the','and','for','to','of','in','a','an','on','by','as','is','it','or','be','back','up','our','can','you','use','used','how','what']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(full);
  }
  return files;
}

function decode(value) {
  return String(value)
    .replace(/&amp;#39;/gi, "'").replace(/&amp;#x27;/gi, "'")
    .replace(/&#39;|&#x27;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function getMetaDescription(html) {
  const match = html.match(/<meta\b[^>]*\bname\s*=\s*(["'])description\1[^>]*>/i);
  if (!match) return '';
  const content = match[0].match(/\bcontent\s*=\s*(["'])(.*?)\1/i);
  return content ? decode(content[2]) : '';
}

function getCanonical(html) {
  const match = html.match(/<link\b[^>]*\brel\s*=\s*(["'])canonical\1[^>]*>/i);
  if (!match) return '';
  const href = match[0].match(/\bhref\s*=\s*(["'])(.*?)\1/i);
  return href ? href[2] : '';
}

function getName(html, relativePath) {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return decode(h1[1].replace(/<[^>]*>/g, ''));
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (title) return decode(title[1]).replace(/\s*\|\s*Friendly Calculator$/i, '').trim();
  return path.basename(relativePath, '.html').replace(/[-_]+/g, ' ');
}

function getCategory(html) {
  const match = html.match(/<(?:p|div|span)\b[^>]*class\s*=\s*(["'])[^"']*(?:muted|eyebrow|category)[^"']*\1[^>]*>([^<]*?)\s*[·•|]\s*(?:LOCAL CALCULATOR|CALCULATOR)\s*<\/(?:p|div|span)>/i);
  if (!match) return 'OTHER';
  const label = decode(match[2]).trim();
  return label || 'OTHER';
}

function getKeywords(relativePath, name, description) {
  const slug = path.basename(relativePath, '.html').replace(/[-_]+/g, ' ');
  const words = (slug + ' ' + name + ' ' + description)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
  const unique = [...new Set(words)];
  if (!unique.includes('calculator')) unique.push('calculator');
  return unique.slice(0, 24).join(' ');
}

function main() {
  const entries = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const existing = new Map(entries.map(item => [item.url, item]));
  const added = [];
  const corrected = [];
  const skipped = [];
  const files = walk(CALCULATORS_DIR).sort();

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    if (/\bnoindex\b/i.test((html.match(/<meta\b[^>]*\bname\s*=\s*(["'])robots\1[^>]*>/i) || [''])[0])) continue;
    const canonical = getCanonical(html);
    if (!canonical) continue;
    let url;
    try {
      const parsed = new URL(canonical, ORIGIN);
      if (parsed.origin !== ORIGIN || !parsed.pathname.startsWith('/calculators/') || parsed.search || parsed.hash) continue;
      url = parsed.pathname;
    } catch {
      continue;
    }
    const category = getCategory(html);
    if (existing.has(url)) {
      const current = existing.get(url);
      if (!current.category || /^Updated:/i.test(current.category)) {
        current.category = category;
        corrected.push(url);
      }
      continue;
    }
    const relativePath = path.relative(ROOT, file).split(path.sep).join('/');
    const name = getName(html, relativePath);
    const description = getMetaDescription(html);
    if (!name || !description) {
      skipped.push(relativePath);
      continue;
    }
    const item = {
      name,
      url,
      category,
      keywords: getKeywords(relativePath, name, description),
      description
    };
    added.push(item);
    existing.set(url, item);
  }

  if (process.argv.includes('--write')) {
    entries.push(...added);
    fs.writeFileSync(INDEX_PATH, JSON.stringify(entries, null, 2) + '\n');
  }

  const invalidCategories = entries.filter(item => !item.category || /^Updated:/i.test(item.category));
  console.log('Scanned ' + files.length + ' calculator HTML files; ' +
    added.length + ' missing search entries and ' + corrected.length + ' category corrections' +
    (process.argv.includes('--write') ? ' were applied' : ' are required') +
    '; ' + invalidCategories.length + ' invalid category labels remain; ' +
    skipped.length + ' pages lacked a usable title or description.');
  if (skipped.length) console.log('Skipped: ' + skipped.join(', '));
  if ((process.argv.includes('--check') || !process.argv.includes('--write')) &&
      (added.length > 0 || corrected.length > 0 || invalidCategories.length > 0)) {
    process.exitCode = 1;
  }
}

main();
