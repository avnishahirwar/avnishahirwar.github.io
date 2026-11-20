#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://friendlycalculator.in';
const CALCULATORS_DIR = path.join(ROOT, 'calculators');
const ABOUT_PATH = path.join(ROOT, 'calculator', 'about.html');

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

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function main() {
  const pages = [];
  for (const file of walk(CALCULATORS_DIR)) {
    const html = fs.readFileSync(file, 'utf8');
    if (/\bnoindex\b/i.test((html.match(/<meta\b[^>]*\bname\s*=\s*(["'])robots\1[^>]*>/i) || [''])[0])) continue;
    const canonicalTag = html.match(/<link\b[^>]*\brel\s*=\s*(["'])canonical\1[^>]*>/i);
    const canonical = canonicalTag && canonicalTag[0].match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    if (!canonical) continue;
    let pathname;
    try {
      const url = new URL(canonical[2], ORIGIN);
      if (url.origin !== ORIGIN || !url.pathname.startsWith('/calculators/') || url.search || url.hash) continue;
      pathname = url.pathname;
    } catch {
      continue;
    }
    const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const name = decode((h1 && h1[1] || title && title[1] || path.basename(file, '.html')).replace(/<[^>]*>/g, ''))
      .replace(/\s*\|\s*Friendly Calculator$/i, '').trim();
    if (name) pages.push({ pathname, name });
  }

  const unique = new Map(pages.map(page => [page.pathname, page.name]));
  const sorted = [...unique.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const countLabel = sorted.length.toLocaleString('en-IN');
  const list = '<h2>Available calculators</h2>\n<ol>\n' +
    sorted.map(([url, name]) => '<li><a href="' + escapeHtml(url) + '">' + escapeHtml(name) + '</a></li>').join('\n') +
    '\n</ol>';
  const current = fs.readFileSync(ABOUT_PATH, 'utf8');
  const sectionPattern = /<h2>Available calculators(?:\s*\([^<]*\))?<\/h2>\s*<ol>[\s\S]*?<\/ol>/i;
  if (!sectionPattern.test(current)) throw new Error('Could not locate the About page calculator catalogue.');

  if (process.argv.includes('--write')) {
    let updated = current.replace(sectionPattern, list);
    updated = updated.replace(/\\b[\\d,]+ public calculators in the core catalogue\\b/, countLabel + ' public calculators in the core catalogue');
    updated = updated.replace(/(<strong>Platform:<\\/strong>\\s*)[\\d,]+ public calculators/, '$1' + countLabel + ' public calculators');
    fs.writeFileSync(ABOUT_PATH, updated);
  }

  const after = process.argv.includes('--write') ? fs.readFileSync(ABOUT_PATH, 'utf8') : current;
  const links = [...after.matchAll(/<li><a href="(\/calculators\/[^"]+)">([^<]+)<\/a><\/li>/g)].map(match => [match[1], decode(match[2])]);
  const expected = sorted;
  const countMatches = after.includes(countLabel + ' public calculators in the core catalogue') &&
    after.includes('<strong>Platform:</strong> ' + countLabel + ' public calculators');
  const matches = countMatches && links.length === expected.length && links.every((item, index) =>
    item[0] === expected[index][0] && item[1] === expected[index][1]);
  console.log('About page catalogue: ' + expected.length + ' canonical calculator links; ' +
    (matches ? 'complete' : 'repair required') + (process.argv.includes('--write') ? ' after write' : '') + '.');
  if (!matches) process.exitCode = 1;
}

main();
