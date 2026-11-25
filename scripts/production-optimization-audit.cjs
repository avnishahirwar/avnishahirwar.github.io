'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'reports', 'production-optimization');
const ORIGIN = 'https://friendlycalculator.in';
const SKIP = new Set(['.git', 'node_modules', 'vendor', 'dist', 'coverage']);
const PRIVATE = /^(?:admin\/|tests\/|avnish-ai\/)/i;

function walk(dir, rel = '') {
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.isDirectory()) { if (!SKIP.has(item.name)) out.push(...walk(path.join(dir, item.name), path.join(rel, item.name))); }
    else if (item.isFile() && item.name.toLowerCase().endsWith('.html')) out.push(path.join(rel, item.name).split(path.sep).join('/'));
  }
  return out;
}
function attr(tag, name) {
  const m = tag.match(new RegExp('\\\\b' + name + '\\\\s*=\\\\s*(?:"([^"]*)"|\\\\'([^\\\\']*)\\\\'|([^\\\\s>]+))', 'i'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '').trim() : '';
}
function meta(html, name) {
  const head = (html.match(/<head\\b[^>]*>([\\s\\S]*?)<\\/head>/i) || [])[1] || '';
  for (const tag of head.match(/<meta\\b[^>]*>/gi) || []) if (attr(tag, 'name').toLowerCase() === name) return attr(tag, 'content');
  return '';
}
function auditHtmlDocument(file, html) {
  const findings = [];
  const add = (severity, code, detail) => findings.push({ severity, code, path: file, detail });
  const head = (html.match(/<head\\b[^>]*>([\\s\\S]*?)<\\/head>/i) || [])[1] || '';
  const title = ((head.match(/<title\\b[^>]*>([\\s\\S]*?)<\\/title>/i) || [])[1] || '').replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim();
  const description = meta(html, 'description');
  const robots = meta(html, 'robots').toLowerCase();
  const canonicalTag = (head.match(/<link\\b(?=[^>]*\\brel\\s*=\\s*["']canonical["'])[^>]*>/i) || [])[0] || '';
  const canonical = attr(canonicalTag, 'href');
  const lang = attr((html.match(/<html\\b[^>]*>/i) || [''])[0], 'lang');
  const viewport = /<meta\\b(?=[^>]*\\bname\\s*=\\s*["']viewport["'])/i.test(head);
  const noindex = /\\bnoindex\\b/.test(robots);
  if (!title) add('error', 'missing-title', 'Missing title element.');
  else if (title.length < 30 || title.length > 60) add('warning', 'title-length', 'Title length: ' + title.length + ' characters.');
  if (!description) add('error', 'missing-description', 'Missing meta description.');
  else if (description.length < 70 || description.length > 160) add('warning', 'description-length', 'Description length: ' + description.length + ' characters.');
  if (!canonical) add('error', 'missing-canonical', 'Missing canonical URL.');
  else {
    try {
      const u = new URL(canonical, ORIGIN);
      const expected = file === 'index.html' ? '/' : '/' + file;
      if (u.origin !== ORIGIN || u.pathname !== expected || u.search || u.hash) add('warning', 'canonical-mismatch', 'Canonical does not match expected production path ' + expected + '.');
    } catch { add('error', 'invalid-canonical', 'Invalid canonical URL.'); }
  }
  if (!lang) add('error', 'missing-html-lang', 'Missing html lang attribute.');
  if (!viewport) add('error', 'missing-viewport', 'Missing responsive viewport meta.');
  const alternates = [...head.matchAll(/<link\\b(?=[^>]*\\brel\\s*=\\s*["']alternate["'])[^>]*>/gi)].map(x => x[0]).filter(x => attr(x, 'hreflang'));
  if (alternates.length) {
    const locales = alternates.map(x => attr(x, 'hreflang').toLowerCase());
    if (new Set(locales).size !== locales.length) add('error', 'duplicate-hreflang', 'Duplicate hreflang locale.');
    const selfPath = file === 'index.html' ? '/' : '/' + file;
    if (!alternates.some(x => { try { return new URL(attr(x, 'href'), ORIGIN).pathname === selfPath; } catch { return false; } })) add('warning', 'hreflang-no-self', 'No self-reference in hreflang cluster.');
    for (const x of alternates) {
      const locale = attr(x, 'hreflang');
      if (locale !== 'x-default' && !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(locale)) add('error', 'invalid-hreflang-code', 'Invalid hreflang: ' + locale);
      try { if (new URL(attr(x, 'href'), ORIGIN).origin !== ORIGIN) add('warning', 'external-hreflang', 'Alternate URL is outside canonical host.'); }
      catch { add('error', 'invalid-hreflang-url', 'Invalid hreflang URL.'); }
    }
  }
  for (const block of html.matchAll(/<script\\b[^>]*type\\s*=\\s*["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi)) {
    try { JSON.parse(block[1].trim()); } catch { add('error', 'invalid-json-ld', 'Invalid JSON-LD JSON.'); }
  }
  for (const x of html.match(/<img\\b[^>]*>/gi) || []) if (!/\\balt\\s*=/i.test(x)) add('warning', 'image-missing-alt', 'Image has no alt attribute.');
  for (const x of html.match(/<a\\b[^>]*>[\\s\\S]*?<\\/a>/gi) || []) {
    const label = attr(x, 'aria-label') || attr(x, 'title') || x.replace(/<[^>]+>/g, '').trim();
    if (!label) add('warning', 'link-no-name', 'Anchor has no accessible name.');
    if (attr(x, 'target').toLowerCase() === '_blank' && !/\\brel\\s*=\\s*["'][^"']*\\bnoopener\\b/i.test(x)) add('warning', 'blank-link-noopener', 'New-tab link should include rel=noopener.');
  }
  for (const x of html.match(/<button\\b[^>]*>[\\s\\S]*?<\\/button>/gi) || []) if (!(attr(x, 'aria-label') || attr(x, 'title') || x.replace(/<[^>]+>/g, '').trim())) add('warning', 'button-no-name', 'Button has no accessible name.');
  if (noindex && file === 'index.html') add('error', 'homepage-noindex', 'Homepage is marked noindex.');
  return { title, description, canonical, noindex, findings };
}
function parseSitemap(xml) { return [...xml.matchAll(/<loc>\\s*([^<]+?)\\s*<\\/loc>/gi)].map(x => x[1].trim()); }
function resolveLocalPath(href, from) {
  if (!href || /^(?:#|mailto:|tel:|javascript:|data:|blob:|https?:|\\/\\/)/i.test(href)) return null;
  let u; try { u = new URL(href, ORIGIN + '/' + from); } catch { return null; }
  if (u.origin !== ORIGIN) return null;
  let p; try { p = decodeURIComponent(u.pathname); } catch { return null; }
  if (p === '/') p = '/index.html';
  const rel = p.replace(/^\\/+/, '');
  return rel.endsWith('/') ? rel + 'index.html' : rel;
}
function runAudit(root = ROOT) {
  const files = walk(root), findings = [], titles = new Map(), descriptions = new Map(), pages = [];
  let indexable = 0, noindex = 0;
  for (const file of files) {
    const r = auditHtmlDocument(file, fs.readFileSync(path.join(root, file), 'utf8'));
    findings.push(...r.findings);
    if (r.noindex) noindex++;
    else if (!PRIVATE.test(file)) {
      indexable++;
      if (r.title) { const k = r.title.toLowerCase(); if (titles.has(k)) findings.push({ severity: 'warning', code: 'duplicate-title', path: file, detail: 'Duplicates ' + titles.get(k) }); else titles.set(k, file); }
      if (r.description) { const k = r.description.toLowerCase(); if (descriptions.has(k)) findings.push({ severity: 'warning', code: 'duplicate-description', path: file, detail: 'Duplicates ' + descriptions.get(k) }); else descriptions.set(k, file); }
    }
    pages.push({ path: file, title: r.title, canonical: r.canonical, noindex: r.noindex, findings: r.findings.length });
  }
  const sitemapPath = path.join(root, 'sitemap.xml'); let urls = [];
  if (fs.existsSync(sitemapPath)) {
    const xml = fs.readFileSync(sitemapPath, 'utf8'); urls = parseSitemap(xml);
    if (!xml.trim().startsWith('<?xml')) findings.push({ severity: 'error', code: 'sitemap-invalid-envelope', path: 'sitemap.xml', detail: 'Missing XML declaration.' });
    if (new Set(urls).size !== urls.length) findings.push({ severity: 'error', code: 'sitemap-duplicate-url', path: 'sitemap.xml', detail: 'Duplicate sitemap URL.' });
    for (const url of urls) {
      try {
        if (new URL(url).origin !== ORIGIN) findings.push({ severity: 'error', code: 'sitemap-wrong-host', path: 'sitemap.xml', detail: url });
        const target = resolveLocalPath(url, 'sitemap.xml');
        if (target && !fs.existsSync(path.join(root, target))) findings.push({ severity: 'error', code: 'sitemap-missing-target', path: 'sitemap.xml', detail: url });
      } catch { findings.push({ severity: 'error', code: 'sitemap-invalid-url', path: 'sitemap.xml', detail: url }); }
    }
  } else findings.push({ severity: 'error', code: 'sitemap-missing', path: 'sitemap.xml', detail: 'Primary sitemap missing.' });
  const headerFile = path.join(root, '_headers'), headers = fs.existsSync(headerFile) ? fs.readFileSync(headerFile, 'utf8') : '';
  const security = { nosniff: /X-Content-Type-Options:\\s*nosniff/i.test(headers), referrerPolicy: /Referrer-Policy:/i.test(headers), permissionsPolicy: /Permissions-Policy:/i.test(headers), csp: /Content-Security-Policy:/i.test(headers), hsts: /Strict-Transport-Security:/i.test(headers) };
  for (const [name, ok] of Object.entries(security)) if (!ok) findings.push({ severity: 'warning', code: 'header-config-' + name.toLowerCase(), path: '_headers', detail: 'Not declared in source; production response headers require separate verification.' });
  return { generatedAt: new Date().toISOString(), origin: ORIGIN, counts: { htmlFiles: files.length, indexablePages: indexable, noindexPages: noindex, sitemapUrls: urls.length, errors: findings.filter(x => x.severity === 'error').length, warnings: findings.filter(x => x.severity === 'warning').length }, securityHeaderSourceChecks: security, findings, pages };
}
function markdownReport(r) {
  const out = ['# Friendly Calculator — Production Optimization Audit', '', 'Generated: ' + r.generatedAt, 'Source-only inspection; this is not a browser-rendered or live response-header audit.', '', '| Metric | Count |', '|---|---:|', '| HTML files | ' + r.counts.htmlFiles + ' |', '| Indexable pages (heuristic) | ' + r.counts.indexablePages + ' |', '| Noindex pages | ' + r.counts.noindexPages + ' |', '| Sitemap URLs | ' + r.counts.sitemapUrls + ' |', '| Errors | ' + r.counts.errors + ' |', '| Warnings | ' + r.counts.warnings + ' |', '', '## Security source checks', '', 'These inspect _headers only and do not prove what production serves.', '', '| Header | Declared |', '|---|---|', ...Object.entries(r.securityHeaderSourceChecks).map(([k,v]) => '| ' + k + ' | ' + (v ? 'Yes' : 'No') + ' |'), '', '## Findings', ''];
  if (!r.findings.length) out.push('No findings from the checks that ran.');
  else { out.push('| Severity | Check | File | Detail |', '|---|---|---|---|'); for (const f of r.findings) out.push('| ' + f.severity + ' | ' + f.code + ' | ' + f.path + ' | ' + f.detail.replace(/\\|/g, '\\\\|') + ' |'); }
  out.push('', '## Limits', '', '- LCP, INP and CLS require Lighthouse and/or CrUX; source inspection cannot measure them.', '- Formula accuracy requires executable regression and browser interaction tests.', '- Search Console, GA4 hostname-filtered data and AdSense account status require verified connected properties.', '- GitHub Pages does not automatically enforce Cloudflare Pages _headers syntax.', '');
  return out.join('\\n');
}
function main() {
  const r = runAudit();
  if (process.argv.includes('--write-report')) { fs.mkdirSync(REPORT_DIR, { recursive: true }); fs.writeFileSync(path.join(REPORT_DIR, 'audit.json'), JSON.stringify(r, null, 2) + '\\n'); fs.writeFileSync(path.join(REPORT_DIR, 'audit.md'), markdownReport(r)); }
  console.log(JSON.stringify(r.counts, null, 2));
  if (process.argv.includes('--strict') && r.counts.errors) process.exitCode = 1;
}
if (require.main === module) main();
module.exports = { auditHtmlDocument, parseSitemap, resolveLocalPath, runAudit, markdownReport };
