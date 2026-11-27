'use strict';
const fs = require('node:fs');
const path = require('node:path');
module.exports = function getCatalogueCounts(root) {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const sitemapUrls = [...sitemap.matchAll(/<loc>(https:\/\/friendlycalculator\.in[^<]*)<\/loc>/g)].map(m => m[1]);
  const sitemapCalculatorUrls = [...new Set(sitemapUrls.map(url => new URL(url).pathname).filter(url => url.startsWith('/calculators/') && url.endsWith('.html')))].sort();
  const selfCanonical = url => {
    if (!url.startsWith('/calculators/') || !url.endsWith('.html') ||
        url.includes('?') || url.includes('#') || url.split('/').includes('..')) return false;
    const absolute = path.resolve(root, url.slice(1));
    const calculatorRoot = path.join(root, 'calculators') + path.sep;
    if (!absolute.startsWith(calculatorRoot) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return false;
    const html = fs.readFileSync(absolute, 'utf8');
    const tag = html.match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i);
    const href = tag && tag[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!href) return false;
    try {
      const canonical = new URL(href[1], 'https://friendlycalculator.in');
      return canonical.origin === 'https://friendlycalculator.in' && canonical.pathname === url &&
        !canonical.search && !canonical.hash;
    } catch { return false; }
  };
  // The on-site catalogue intentionally includes self-canonical noindex pages.
  // Robots directives control search-engine indexing; they do not hide useful tools from site visitors.
  const canonicalCalculatorUrls = fs.readdirSync(path.join(root, 'calculators'))
    .filter(name => name.endsWith('.html'))
    .map(name => '/calculators/' + name)
    .filter(selfCanonical)
    .sort();
  const searchableInternationalPaths = [
    '/international/vat-calculator.html',
    '/international/uk-student-loan-calculator.html',
    '/international/us-home-affordability-calculator.html'
  ];
  const expectedSearchIndexUrls = [...new Set([
    ...canonicalCalculatorUrls,
    ...searchableInternationalPaths.filter(route =>
      sitemapUrls.some(url => new URL(url).pathname === route))
  ])].sort();
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const sections = [...directory.matchAll(/<section class="section calculator-category" id="([^"]+)"[^>]*>([\s\S]*?)(?=<section class="section calculator-category"|<section class="section"|<footer|<\/main>)/g)];
  const coreCalculatorUrls = [...new Set(sections.flatMap(s => [...s[2].matchAll(/<a class="card" href="(\/calculators\/[^"]+)"/g)].map(m => m[1])))].sort();
  const biologySection = sections.find(section => section[1] === 'biology-chemistry');
  const biologyChemistryCount = biologySection ? [...biologySection[2].matchAll(/<a class="card" href="\/calculators\//g)].length : 0;
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const start = homepage.indexOf('<nav class="home-category-index"');
  const nav = homepage.slice(start, homepage.indexOf('</nav>', start));
  const homepageCoreCalculatorCount = [...nav.matchAll(/<span>(\d+) calculator(?:s)?<\/span>/g)].reduce((sum, m) => sum + Number(m[1]), 0);
  return { sitemapCalculatorUrls, qualityPassUrls, canonicalCalculatorUrls, expectedSearchIndexUrls, expectedSearchIndexLength: expectedSearchIndexUrls.length, coreCalculatorUrls, expectedCoreCalculatorCount: canonicalCalculatorUrls.length, biologyChemistryCount, homepageCoreCalculatorCount };
};
