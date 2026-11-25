#!/usr/bin/env node
'use strict';
/**
 * AdSense quality pass: keep only substantive pages indexable.
 *
 * Calculator pages whose main content is shorter than --threshold words (default 150) get
 * <meta name="robots" content="noindex,follow">. They stay online and usable, and are
 * excluded from the XML sitemap automatically (scripts/generate-sitemaps.cjs skips noindex).
 * Localized twins follow the page they point to: a locale page canonicalised to a noindex
 * English page is noindexed too, and a thin self-canonical locale page is noindexed.
 *
 * Idempotent. Usage: node scripts/adsense-quality-pass.cjs [--threshold=150] [--dry-run] [--restore]
 *   --restore removes only the noindex meta this script added (marked data-quality-pass).
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const arg = (name, dflt) => {
  const hit = process.argv.find(a => a.startsWith('--' + name + '='));
  return hit ? hit.split('=')[1] : dflt;
};
const THRESHOLD = Number(arg('threshold', 150));
const DRY = process.argv.includes('--dry-run');
const RESTORE = process.argv.includes('--restore');
const MARK = 'data-quality-pass="thin"';
const TAG = '<meta name="robots" content="noindex,follow" ' + MARK + '>';

const read = f => fs.readFileSync(f, 'utf8');
const hasNoindex = html => /<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(html) ||
  /<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(html);

function mainWords(html) {
  let s = html.replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, ' ');
  const m = s.match(/<main[\s\S]*?<\/main>/i);
  if (m) s = m[0];
  return s.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

function applyNoindex(html) {
  // Replace any existing robots meta, otherwise insert before </head>.
  const robotsRe = /<meta\b[^>]*\bname\s*=\s*["']robots["'][^>]*>/i;
  if (robotsRe.test(html)) return html.replace(robotsRe, TAG);
  return html.replace(/<\/head>/i, TAG + '</head>');
}

// Pages the repository deliberately treats as indexable priority pages stay indexable:
// any calculator slug named anywhere in the tests, and any English page in a real multi-language hreflang cluster.
const protectedSlugs = new Set();
const testsDir = path.join(ROOT, 'tests');
const testTokens = new Set();
for (const t of fs.readdirSync(testsDir)) {
  if (!/\.(cjs|js)$/.test(t)) continue;
  for (const m of read(path.join(testsDir, t)).toLowerCase().matchAll(/[a-z0-9][a-z0-9-]*/g)) testTokens.add(m[0]);
}
for (const f of fs.readdirSync(path.join(ROOT, 'calculators'))) {
  const slug = f.replace(/\.html$/, '');
  if (f.endsWith('.html') && (testTokens.has(slug) || testTokens.has(slug.replace(/-calculator$/, '')))) protectedSlugs.add(slug);
}
// Real multi-language clusters only: alternates beyond en / x-default / hi (Hindi twins are
// canonicalised duplicates of the English page, so they do not count as a cluster).
const inHreflangCluster = html => {
  const langs = new Set();
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/rel=["']alternate["']/i.test(m[0])) continue;
    const h = (m[0].match(/hreflang=["']([^"']+)["']/i) || [])[1];
    if (h) langs.add(h.toLowerCase());
  }
  for (const base of ['en', 'x-default', 'hi', 'en-in', 'hi-in']) langs.delete(base);
  return langs.size > 0;
};
const canonicalOf = html => (html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [])[1] || '';
const stats = {english: 0, locale: 0, restored: 0, kept: 0};
const touched = [];

function setNoindex(file, html) {
  if (DRY) { touched.push(file); return; }
  fs.writeFileSync(file, applyNoindex(html));
  touched.push(file);
}

if (RESTORE) {
  const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.name === '.git' || e.name === 'node_modules') return [];
    return e.isDirectory() ? walk(p) : (e.name.endsWith('.html') ? [p] : []);
  });
  for (const f of walk(ROOT)) {
    const html = read(f);
    if (!html.includes(MARK)) continue;
    fs.writeFileSync(f, html.replace(TAG, '<meta name="robots" content="index,follow,max-image-preview:large">'));
    stats.restored++;
  }
  console.log('Restored ' + stats.restored + ' pages.');
  process.exit(0);
}

// 1. English calculators
const enDir = path.join(ROOT, 'calculators');
const noindexEn = new Set();
for (const name of fs.readdirSync(enDir)) {
  if (!name.endsWith('.html')) continue;
  const file = path.join(enDir, name);
  const html = read(file);
  if (hasNoindex(html) && !html.includes(MARK)) { noindexEn.add(name); continue; }
  const slug = name.replace(/\.html$/, '');
  if (protectedSlugs.has(slug) || inHreflangCluster(html)) { protectedSlugs.add(slug); stats.kept++; continue; }
  if (mainWords(html) < THRESHOLD) {
    noindexEn.add(name);
    if (!html.includes(MARK)) { setNoindex(file, html); stats.english++; }
  } else {
    stats.kept++;
  }
}

// 2. Localized calculators
for (const entry of fs.readdirSync(ROOT, {withFileTypes: true})) {
  if (!entry.isDirectory() || !/^[a-z]{2,3}(-[a-z]+)?$/i.test(entry.name)) continue;
  const dir = path.join(ROOT, entry.name, 'calculators');
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.html')) continue;
    const file = path.join(dir, name);
    const html = read(file);
    if (hasNoindex(html) && !html.includes(MARK)) continue;
    const canon = canonicalOf(html);
    const m = canon.match(/^https:\/\/friendlycalculator\.in\/calculators\/([^/?#]+)$/);
    const pointsToNoindexEnglish = m && noindexEn.has(m[1]);
    const selfSlug = path.basename(name, '.html');
    const thinSelf = !m && !protectedSlugs.has(selfSlug) && mainWords(html) < THRESHOLD;
    if ((pointsToNoindexEnglish || thinSelf) && !html.includes(MARK)) { setNoindex(file, html); stats.locale++; }
  }
}

console.log((DRY ? '[dry run] ' : '') + 'Threshold ' + THRESHOLD + ' words. English noindexed: ' + stats.english +
  ' (indexable kept: ' + stats.kept + '); localized noindexed: ' + stats.locale + '.');
