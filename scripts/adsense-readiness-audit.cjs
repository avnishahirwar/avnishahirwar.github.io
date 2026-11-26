#!/usr/bin/env node
'use strict';

// Read-only AdSense readiness inventory. This script NEVER edits, deletes,
// redirects, noindexes, or publishes site content.
const fs = require('node:fs');
const path = require('node:path');

const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', 'vendor', 'dist', 'coverage', 'tests', 'admin', 'avnish-ai']);
const REQUIRED_DOCS = [
  'calculator/about.html',
  'calculator/contact.html',
  'calculator/privacy.html',
  'calculator/terms.html',
  'calculator/disclaimer.html',
  'calculator/cookies.html',
  'calculator/methodology.html',
  'calculator/editorial-policy.html'
];

function walkHtml(root, relative = '') {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const rel = path.posix.join(relative.split(path.sep).join('/'), entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) return [];
      return walkHtml(root, rel);
    }
    return entry.isFile() && entry.name.toLowerCase().endsWith('.html') ? [rel] : [];
  });
}

function isNoindex(html) {
  return /<meta\b[^>]*(?:name\s*=\s*["'](?:robots|googlebot)["'][^>]*content\s*=\s*["'][^"']*\bnoindex\b|content\s*=\s*["'][^"']*\bnoindex\b[^>]*name\s*=\s*["'](?:robots|googlebot)["'])/i.test(html);
}

function extractPublisherIds(html) {
  return [...html.matchAll(/<meta\b[^>]*name\s*=\s*["']google-adsense-account["'][^>]*content\s*=\s*["'](ca-pub-\d+)["'][^>]*>/gi)].map(m => m[1]);
}

function countWords(html) {
  return html
    .replace(/<(script|style|svg|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi, ' ')
    .split(/\s+/).filter(Boolean).length;
}

function audit(root) {
  const files = walkHtml(root);
  const pageRecords = files.map(file => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    return { file, html, noindex: isNoindex(html), words: countWords(html) };
  });
  const adsTxtPath = path.join(root, 'ads.txt');
  const adsTxtExists = fs.existsSync(adsTxtPath);
  const adsTxt = adsTxtExists ? fs.readFileSync(adsTxtPath, 'utf8') : '';
  const adsTxtIds = [...adsTxt.matchAll(/^\s*google\.com\s*,\s*(pub-\d+)\s*,\s*DIRECT\s*,\s*([a-f0-9]+)\s*$/gim)].map(m => m[1]);
  const publisherIds = [...new Set(pageRecords.flatMap(p => extractPublisherIds(p.html)))];
  const loaderCount = pageRecords.reduce((n, p) => n + (p.html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g) || []).length, 0);
  const privacy = pageRecords.find(p => p.file === 'calculator/privacy.html')?.html || '';
  const cookies = pageRecords.find(p => p.file === 'calculator/cookies.html')?.html || '';
  const findings = [];
  if (!adsTxtExists) findings.push({ severity: 'high', code: 'ADS_TXT_MISSING', detail: 'Root ads.txt file is missing.' });
  if (adsTxtExists && adsTxtIds.length === 0) findings.push({ severity: 'high', code: 'ADS_TXT_ENTRY_MISSING_OR_INVALID', detail: 'No valid Google DIRECT seller line was detected in root ads.txt.' });
  if (publisherIds.length === 0) findings.push({ severity: 'medium', code: 'PUBLISHER_META_MISSING', detail: 'No google-adsense-account publisher association meta tag was detected in HTML.' });
  if (publisherIds.some(id => !adsTxtIds.includes(id.replace(/^ca-/, '')))) findings.push({ severity: 'high', code: 'PUBLISHER_ID_MISMATCH', detail: 'A homepage/site publisher ID does not match the Google seller ID in ads.txt.' });
  if (loaderCount === 0) findings.push({ severity: 'info', code: 'ADS_LOADER_NOT_FOUND', detail: 'No standard AdSense loader was found in repository HTML. Confirm intended account integration; do not infer approval or ad serving from the publisher meta tag.' });
  if (/message[^.]{0,100}(?:unpublished|not yet been published)|remains unpublished/i.test(cookies)) findings.push({ severity: 'high', code: 'CMP_PUBLICATION_NOT_VERIFIED', detail: 'Cookie Policy states the European regulations consent message is unpublished or untested.' });
  if (!/AdSense|advertis|Google/i.test(privacy)) findings.push({ severity: 'medium', code: 'ADVERTISING_PRIVACY_DISCLOSURE_NOT_FOUND', detail: 'Privacy Policy does not appear to mention advertising technologies.' });
  const missingDocs = REQUIRED_DOCS.filter(file => !fs.existsSync(path.join(root, file)));
  if (missingDocs.length) findings.push({ severity: 'high', code: 'REQUIRED_TRUST_PAGES_MISSING', detail: missingDocs.join(', ') });
  const indexable = pageRecords.filter(p => !p.noindex);
  const thinCandidates = indexable.filter(p => p.words < 150).map(p => ({ file: p.file, words: p.words }));
  if (thinCandidates.length) findings.push({ severity: 'review', code: 'LOW_TEXT_PAGE_REVIEW', detail: thinCandidates.length + ' indexable HTML pages have fewer than 150 raw visible-text words; this is a review queue, NOT an automatic noindex/removal recommendation.' });
  return {
    generatedAt: new Date().toISOString(),
    mode: 'read-only',
    totals: { htmlFiles: files.length, indexableHtml: indexable.length, noindexHtml: pageRecords.length - indexable.length, thinTextReviewCandidates: thinCandidates.length },
    adsTxt: { exists: adsTxtExists, googleDirectPublisherIds: adsTxtIds },
    publisher: { ids: publisherIds, standardAdLoaderOccurrences: loaderCount },
    requiredTrustPages: { expected: REQUIRED_DOCS.length, present: REQUIRED_DOCS.length - missingDocs.length, missing: missingDocs },
    thinTextReviewCandidates: thinCandidates,
    findings
  };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const report = audit(root);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

module.exports = { audit, countWords, extractPublisherIds, isNoindex, walkHtml };
