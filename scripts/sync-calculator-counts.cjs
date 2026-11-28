#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'assets/calculator-search-index.json');
const DIRECTORY_FILES = ['calculator/site-directory.html', 'hi/calculator/site-directory.html'];

function publishedCalculatorEntries() {
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  const entries = new Map();
  for (const item of index) {
    const url = String(item.url || '');
    if (!url.startsWith('/') || !url.endsWith('.html') || url.includes('?') || url.includes('#') || url.split('/').includes('..')) continue;
    const absolute = path.resolve(ROOT, url.slice(1));
    if (!absolute.startsWith(ROOT + path.sep) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
    const html = fs.readFileSync(absolute, 'utf8');
    const noindex = /<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(html) ||
      /<meta\b[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(html);
    // Thin pages set to noindex by scripts/adsense-quality-pass.cjs stay in the public catalogue
    // (search, directory, About, counts); only the sitemap and robots meta change.
    if (noindex && !html.includes('data-quality-pass="thin"')) continue;
    const canonicalTag = html.match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i);
    const canonicalHref = canonicalTag && canonicalTag[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
    let canonicalPath = url;
    if (canonicalHref) {
      try {
        const canonical = new URL(canonicalHref[1], 'https://friendlycalculator.in');
        if (canonical.origin !== 'https://friendlycalculator.in' || canonical.search || canonical.hash) continue;
        canonicalPath = canonical.pathname;
      } catch {
        continue;
      }
    }
    if (canonicalPath !== url) continue;
    if (!entries.has(url)) entries.set(url, item);
  }
  return [...entries.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), 'en'));
}

function catalogueStats() {
  const entries = publishedCalculatorEntries();
  const urls = new Set(entries.map(item => item.url));
  // Core catalogue counts published canonical calculator pages, including quality-pass pages;
  // sitemap eligibility is a separate SEO signal and must not be substituted for this UI count.
  const core = [...urls].filter(url => url.startsWith('/calculators/')).length;
  return {total: urls.size, core, international: urls.size - core, entries};
}
function catalogueCount() { return catalogueStats().total; }

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function updateAboutCatalogue(html, entries) {
  const list = entries.filter(item => item.url.startsWith('/calculators/'))
    .map(item => '<li><a href="' + escapeHtml(item.url) + '">' + escapeHtml(item.name) + '</a></li>')
    .join('\n');
  const pattern = /(<h2>Available calculators \([\d,]+ tools\)<\/h2>\s*)<ol>[\s\S]*?<\/ol>/i;
  if (!pattern.test(html)) throw new Error('Could not locate the complete Available calculators list in calculator/about.html');
  return html.replace(pattern, (_, heading) => heading + '<ol>\n' + list + '\n</ol>');
}

function sectionCardCounts(html) {
  const counts = new Map();
  const markers = [...html.matchAll(/<section\b[^>]*\bclass="[^"]*calculator-category[^"]*"[^>]*\bid="([^"]+)"[^>]*>/g)];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index;
    const sectionEnd = html.indexOf('</section>', start);
    const end = sectionEnd >= 0 ? sectionEnd + '</section>'.length : html.length;
    const section = html.slice(start, end);
    const routes = new Set([...section.matchAll(/href="((?:\/[a-z]{2,3})?\/calculators\/[^\"]+)"/g)].map(match => match[1]));
    counts.set(markers[i][1], routes.size);
  }
  return counts;
}

function updateDirectoryCounters(html, total) {
  const counts = sectionCardCounts(html);
  const groupedTotal = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const starts = [...html.matchAll(/<section\b[^>]*\bclass="[^"]*calculator-category[^"]*"[^>]*\bid="([^"]+)"[^>]*>/g)];
  for (let i = starts.length - 1; i >= 0; i--) {
    const start = starts[i].index;
    const sectionEnd = html.indexOf('</section>', start);
    const end = sectionEnd >= 0 ? sectionEnd + '</section>'.length : html.length;
    let section = html.slice(start, end);
    const count = counts.get(starts[i][1]) || 0;
    section = section.replace(/<strong>[\d,]+\s+tools?<\/strong>/i,
      `<strong>${count.toLocaleString('en-US')} ${count === 1 ? 'tool' : 'tools'}</strong>`);
    html = html.slice(0, start) + section + html.slice(end);
  }
  for (const [id, count] of counts) {
    const re = new RegExp(`(<a\\b[^>]*href="#${id}"[^>]*>[\\s\\S]*?<span>)[\\d,]+(\\s+calculators?<\\/span>)`, 'i');
    html = html.replace(re, (_, a, b) => `${a}${count.toLocaleString('en-US')} ${count === 1 ? 'calculator' : 'calculators'}</span>`);
  }
  html = html.replace(/(Browse\s+)[\d,]+(\s+calculators?\s+across\s+\d+\s+categories)/i, (_, a, b) => `${a}${groupedTotal.toLocaleString('en-US')}${b}`);
  html = html.replace(/(Browse\s+all\s+)[\d,]+(\s+calculator\s+tools)/i, (_, a, b) => `${a}${total.toLocaleString('en-US')}${b}`);
  html = html.replace(/(Search\s+)[\d,]+(\s+calculators?\s+by\s+name)/i, (_, a, b) => `${a}${groupedTotal.toLocaleString('en-US')}${b}`);
  html = html.replace(/Showing\s+[\d,]+\s+(?:core calculator pages and selected international tools|calculator tools, including international VAT|core calculator pages|calculator links listed below), plus website resources\./gi,
    `Showing ${groupedTotal.toLocaleString('en-US')} calculator links listed below, plus website resources.`);
  html = html.replace(/The\s+catalogue\s+(?:currently\s+)?contains\s+[\d,]+\s+(?:core calculator pages and selected international tools|verified calculator pages);\s*this directory lists\s+[\d,]+\s+calculator links\. Search by tool name or topic\./i,
    `The catalogue contains ${total.toLocaleString('en-US')} verified calculator pages; this directory lists ${groupedTotal.toLocaleString('en-US')} calculator links. Search by tool name or topic.`);
  html = html.replace(/Browse all\s+[\d,]+\s+calculator tools, business services and website information from one organized directory\. Search by tool name or topic\./i,
    `The catalogue contains ${total.toLocaleString('en-US')} verified calculator pages; this directory lists ${groupedTotal.toLocaleString('en-US')} calculator links, alongside business services and website information.`);
  return html;
}

function updateHomepage(html, total, localized = false, core = total, categoryCounts = null) {
  if (localized) {
    const validation = html.match(/items\.length\s*!==\s*(\d+)/);
    if (!validation) return html;
    const oldCount = validation[1];
    return html.replace(new RegExp(`\\b${oldCount}\\b`, 'g'), String(total));
  }
  const formatted = total.toLocaleString('en-US');
  html = html.replace(/(offering\s+)[\d,]+(\s+public\s+calculators)/i, (_, a, b) => `${a}${formatted}${b}`);
  html = html.replace(/(Search\s+all\s+)[\d,]+(\s+calculator\s+entries)/i, (_, a, b) => `${a}${formatted}${b}`);
  html = html.replace(/(All\s+\d+\s+categories\s+·\s+)[\d,]+(\s+calculators)/i, (_, a, b) => `${a}${core.toLocaleString('en-US')}${b}`);
  html = html.replace(/Catalogue:\s*[\d,]+\s+core calculators;\s*[\d,]+\s+total searchable entries across languages/i,
    `Catalogue: ${core.toLocaleString('en-US')} core calculators; ${formatted} total searchable entries across languages`);
  html = html.replace(/Total\s+catalogue:\s*[\d,]+\s+calculators/i,
    `Catalogue: ${core.toLocaleString('en-US')} core calculators; ${formatted} total searchable entries across languages`);
  if (categoryCounts) {
    for (const [id, count] of categoryCounts) {
      const re = new RegExp(`(<a\\b[^>]*href="/calculator/site-directory\\.html#${id}"[^>]*>[\\s\\S]*?<span>)[\\d,]+(\\s+calculators?<\\/span>)`, 'i');
      html = html.replace(re, (_, a, b) => `${a}${count.toLocaleString('en-US')}${b}`);
    }
  }
  return html;
}

function updateGlobalText(html, total, core = total, international = Math.max(0, total - core)) {
  const formatted = total.toLocaleString('en-US');
  const coreFormatted = core.toLocaleString('en-US');
  const internationalFormatted = international.toLocaleString('en-US');
  html = html.replace(/(brings together\s*(?:<strong>)?)[\d,]+(\s+public calculators in the core (?:sitemap )?catalogue)/i,
    (_, a, b) => a + coreFormatted + b.replace(/ sitemap/, ''));
  html = html.replace(/([\d,]+)(\s+core catalogue entries are indexed for search)/i,
    (_, count, suffix) => coreFormatted + suffix);
  html = html.replace(/[\d,]+ public calculator pages, including international tools/gi,
    `${coreFormatted} public calculators in the core catalogue plus ${internationalFormatted} international calculators (${formatted} calculator pages total)`);
  // The About-page directory count is intentionally distinct from XML-sitemap core routes.
  html = html.replace(/(\b(?:Available\s+)?calculators\s*\()[\d,]+(\s+tools?\))/gi, (_, a, b) => `${a}${coreFormatted}${b}`);
  html = html.replace(/(offering\s+)[\d,]+(\s+public\s+calculators)/gi, (_, a, b) => `${a}${formatted}${b}`);
  html = html.replace(/(contains\s+)[\d,]+(\s+core\s+calculator\s+pages)/gi, (_, a, b) => `${a}${coreFormatted}${b}`);
  html = html.replace(/full website directory contains\s+[\d,]+(?: core calculator pages plus the international VAT calculator| calculator pages, including international tools| core calculator pages plus\s+[\d,]+ international calculator pages)/gi,
    `full website directory contains ${coreFormatted} core calculator pages plus ${internationalFormatted} international calculator pages`);
  html = html.replace(/(Explore\s+all\s+)[\d,]+(\s+calculators?\s+(?:on\s+Friendly\s+Calculator)?)/gi, (_, a, b) => `${a}${formatted}${b}`);
  return html;
}

function transformedFiles() {
  const {total, core, international, entries} = catalogueStats();
  const result = new Map();
  const englishFiles = [
    'index.html', 'calculator/about.html', 'calculator/api.html',
    'calculator/site-directory.html', 'calculators/gst-calculator.html', 'calculators/salary-calculator.html',
    'hi/calculator/about.html', 'hi/calculator/site-directory.html'
  ];
  for (const relative of englishFiles) {
    const absolute = path.join(ROOT, relative);
    if (!fs.existsSync(absolute)) continue;
    let html = fs.readFileSync(absolute, 'utf8');
    if (relative === 'index.html') html = updateHomepage(html, total, false, core, sectionCardCounts(fs.readFileSync(path.join(ROOT, 'calculator/site-directory.html'), 'utf8')));
    else if (DIRECTORY_FILES.includes(relative)) html = updateDirectoryCounters(html, total);
    else if (relative === 'calculator/about.html') html = updateAboutCatalogue(updateGlobalText(html, total, core, international), entries);
    else html = updateGlobalText(html, total, core, international);
    result.set(relative, html);
  }
  const localizedHomes = fs.readdirSync(ROOT, {withFileTypes:true})
    .filter(entry => entry.isDirectory() && /^[a-z]{2,3}$/i.test(entry.name))
    .map(entry => `${entry.name}/index.html`);
  for (const relative of localizedHomes) {
    const absolute = path.join(ROOT, relative);
    if (!fs.existsSync(absolute)) continue;
    const html = fs.readFileSync(absolute, 'utf8');
    if (/items\.length\s*!==\s*\d+/.test(html)) result.set(relative, updateHomepage(html, total, true));
  }
  for (const relative of ['calculators/gst-calculator.html','calculators/salary-calculator.html']) {
    const absolute = path.join(ROOT, relative);
    if (fs.existsSync(absolute)) result.set(relative, updateGlobalText(fs.readFileSync(absolute, 'utf8'), total, core, international));
  }
  return {total, files: result};
}

function sync({check = false} = {}) {
  const {total, files} = transformedFiles();
  const changed = [];
  for (const [relative, expected] of files) {
    const absolute = path.join(ROOT, relative);
    const current = fs.readFileSync(absolute, 'utf8');
    if (current === expected) continue;
    if (check) throw new Error(`Calculator counts are stale in ${relative}. Run node scripts/sync-calculator-counts.cjs`);
    fs.writeFileSync(absolute, expected);
    changed.push(relative);
  }
  return {total, changed, checked: files.size};
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  const {total, changed, checked} = sync({check});
  console.log(check
    ? `Calculator counts are synchronized: ${total.toLocaleString('en-US')} catalog calculators across ${checked} public count surfaces.`
    : `Synchronized ${total.toLocaleString('en-US')} catalog calculators across ${changed.length} updated pages (${checked} checked).`);
}
module.exports = {catalogueCount, catalogueStats, sectionCardCounts, transformedFiles, sync, updateDirectoryCounters, updateHomepage};
