#!/usr/bin/env node
'use strict';

/**
 * Rebuild hreflang metadata from indexable, self-canonical language pages.
 * Noindex directives, canonical tags, page content and all non-hreflang links
 * are preserved. Pages with ambiguous duplicate-language siblings are left
 * without alternates rather than pointing search engines at an arbitrary page.
 *
 * Usage:
 *   node scripts/normalize-hreflang.cjs          # dry-run report
 *   node scripts/normalize-hreflang.cjs --write  # write only hreflang changes
 *   node scripts/normalize-hreflang.cjs --check  # fail if any change is needed
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const ORIGIN = 'https://friendlycalculator.in';
const IGNORE = new Set([
  '.git', '.github', 'node_modules', 'tests', 'vendor', '_site',
  'admin', 'avnish-ai', 'artifacts'
]);
const FALLBACK_LOCALES = new Set(['hi', 'de', 'es', 'fr', 'pt', 'ar', 'id', 'bn', 'ta', 'ja', 'ru']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || IGNORE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(full);
  }
  return files;
}

function headOf(html) {
  const end = html.toLowerCase().indexOf('</head>');
  return end < 0 ? '' : html.slice(0, end);
}
function isNoindex(html) {
  const head = headOf(html);
  return /<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(head) ||
    /<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(head);
}
function attribute(tag, name) {
  const pattern = /([a-z][a-z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let match;
  while ((match = pattern.exec(tag))) {
    if (match[1].toLowerCase() === name.toLowerCase()) return match[2] ?? match[3] ?? '';
  }
  return '';
}
function canonicalOf(html) {
  const tags = [...headOf(html).matchAll(/<link\b[^>]*>/gi)].map(match => match[0]);
  const tag = tags.find(item => /(?:^|\s)canonical(?:\s|$)/i.test(attribute(item, 'rel')));
  if (!tag) return null;
  try {
    const url = new URL(attribute(tag, 'href'), ORIGIN);
    if (url.origin !== ORIGIN || url.search || url.hash) return null;
    return url.href;
  } catch {
    return null;
  }
}
function normalizeLanguageTag(value) {
  return String(value || '').trim().split('-').map((part, index) => {
    if (index === 0) return part.toLowerCase();
    if (part.length === 2 && /^[a-z]{2}$/i.test(part)) return part.toUpperCase();
    if (part.length === 4 && /^[a-z]{4}$/i.test(part)) return part[0].toUpperCase() + part.slice(1).toLowerCase();
    return part.toLowerCase();
  }).join('-');
}
function langOf(html, relative) {
  const match = html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i);
  if (match) return normalizeLanguageTag(match[1]);
  const first = relative.split('/')[0].toLowerCase();
  return FALLBACK_LOCALES.has(first) ? first : 'en';
}
function hasUntranslatedLocalePlaceholder(html) {
  const head = headOf(html);
  const descriptionTag = [...head.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0])
    .find(tag => attribute(tag, 'name').toLowerCase() === 'description');
  const description = descriptionTag ? attribute(descriptionTag, 'content') : '';
  return /^\s*\[[^\]]{2,40}\]\s*/.test(description);
}
function normalizedPathname(value) {
  if (value === '/') return '/';
  return value.endsWith('/index.html') ? value.slice(0, -'index.html'.length) :
    value.endsWith('/') ? value : value;
}
function selfCanonical(relative, canonical) {
  const filePath = relative === 'index.html' ? '/' :
    relative.endsWith('/index.html') ? '/' + relative.slice(0, -'index.html'.length) :
    '/' + relative;
  try {
    return normalizedPathname(new URL(canonical).pathname) === normalizedPathname(filePath);
  } catch {
    return false;
  }
}
function groupKey(relative, lang) {
  const parts = relative.split('/');
  const primary = lang.split('-')[0];
  // Strip a locale directory only when it agrees with the page's declared language.
  // This avoids misclassifying country hubs such as /uk/ whose homepage is en-GB,
  // while correctly grouping Ukrainian calculator pages under /uk/calculators/.
  if (parts.length > 1 && /^[a-z]{2,3}$/i.test(parts[0]) && parts[0].toLowerCase() === primary) {
    return parts.slice(1).join('/');
  }
  return relative;
}
function alternateTags(html) {
  return [...headOf(html).matchAll(/<link\b[^>]*>/gi)].map(match => match[0])
    .filter(tag => /(?:^|\s)alternate(?:\s|$)/i.test(attribute(tag, 'rel')) && attribute(tag, 'hreflang'));
}
function renderTags(entries) {
  const ordered = [...entries].sort((a, b) => a.lang.localeCompare(b.lang));
  const tags = ordered.map(entry =>
    '<link rel="alternate" hreflang="' + entry.lang + '" href="' + entry.canonical + '">'
  );
  const english = ordered.find(entry => entry.lang === 'en') ||
    ordered.find(entry => entry.lang.startsWith('en-'));
  if (english) tags.push('<link rel="alternate" hreflang="x-default" href="' + english.canonical + '">');
  return tags;
}

function build() {
  const files = walk(ROOT);
  const cache = new Map();
  const candidates = new Map();
  const groups = new Map();
  const stats = {
    htmlPages: files.length,
    noindexPages: 0,
    placeholderLocalePages: 0,
    selfCanonicalIndexablePages: 0,
    pagesWithExistingAlternates: 0,
    alternateTagsRemoved: 0,
    alternateTagsAdded: 0,
    pagesChanged: 0,
    languageGroups: 0,
    ambiguousGroups: 0,
    singleLanguagePages: 0
  };

  for (const file of files) {
    const relative = path.relative(ROOT, file).split(path.sep).join('/');
    const html = fs.readFileSync(file, 'utf8');
    cache.set(file, { relative, html });
    if (alternateTags(html).length) stats.pagesWithExistingAlternates++;
    if (isNoindex(html)) {
      stats.noindexPages++;
      continue;
    }
    const lang = langOf(html, relative);
    // Some staged locale files still contain a literal [Language] placeholder in
    // their meta description. Keep their current robots/canonical state untouched,
    // but do not advertise them as translated alternates until localized metadata is complete.
    if (lang !== 'en' && hasUntranslatedLocalePlaceholder(html)) {
      stats.placeholderLocalePages++;
      continue;
    }
    const canonical = canonicalOf(html);
    if (!canonical || !selfCanonical(relative, canonical) || !headOf(html)) continue;
    if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(lang)) continue;
    stats.selfCanonicalIndexablePages++;
    const key = groupKey(relative, lang);
    const entry = { file, relative, canonical, lang, key };
    candidates.set(file, entry);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  const validGroups = new Map();
  for (const [key, entries] of groups) {
    if (entries.length < 2) {
      stats.singleLanguagePages += entries.length;
      continue;
    }
    const langs = entries.map(entry => entry.lang);
    const urls = entries.map(entry => entry.canonical);
    if (new Set(langs).size !== langs.length || new Set(urls).size !== urls.length) {
      stats.ambiguousGroups++;
      continue;
    }
    validGroups.set(key, entries);
  }
  stats.languageGroups = validGroups.size;

  const outputs = new Map();
  for (const [file, record] of cache) {
    const existing = alternateTags(record.html);
    const eligible = candidates.get(file);
    const entries = eligible ? validGroups.get(eligible.key) : null;
    const desired = entries ? renderTags(entries) : [];
    stats.alternateTagsRemoved += existing.length;
    stats.alternateTagsAdded += desired.length;
    const head = headOf(record.html);
    let nextHead = head.replace(/<link\b[^>]*>/gi, tag => {
      if (/(?:^|\s)alternate(?:\s|$)/i.test(attribute(tag, 'rel')) && attribute(tag, 'hreflang')) return '';
      return tag;
    });
    // Canonicalize the insertion boundary so write/check is idempotent. Without
    // trimming this suffix, each pass accumulates another blank line before tags.
    if (desired.length) nextHead = nextHead.replace(/\s*$/, '') + '\n' + desired.join('\n') + '\n';
    const closeIndex = record.html.toLowerCase().indexOf('</head>');
    if (closeIndex < 0) continue;
    const next = nextHead + record.html.slice(closeIndex);
    if (next !== record.html) {
      stats.pagesChanged++;
      outputs.set(file, next);
    }
  }
  return { outputs, stats };
}

function main() {
  const { outputs, stats } = build();
  if (process.argv.includes('--check')) {
    if (outputs.size) throw new Error('hreflang metadata needs normalization on ' + outputs.size + ' HTML pages. Run node scripts/normalize-hreflang.cjs --write.');
    console.log('Hreflang normalization check passed: ' + JSON.stringify(stats));
    return;
  }
  if (process.argv.includes('--write')) {
    for (const [file, content] of outputs) fs.writeFileSync(file, content);
    console.log('Normalized indexable hreflang metadata: ' + JSON.stringify(stats));
    return;
  }
  console.log('[dry run] Hreflang normalization preview: ' + JSON.stringify(stats));
  console.log('No files changed. Add --write to apply the scoped metadata repair.');
}

main();
