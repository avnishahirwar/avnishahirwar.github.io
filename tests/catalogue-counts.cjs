'use strict';
const fs = require('node:fs');
const path = require('node:path');
module.exports = function getCatalogueCounts(root) {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const sitemapUrls = [...sitemap.matchAll(/<loc>(https:\/\/friendlycalculator\.in[^<]*)<\/loc>/g)].map(m => m[1]);
  const sitemapCalculatorUrls = [...new Set(sitemapUrls.map(url => new URL(url).pathname).filter(url => url.startsWith('/calculators/')))].sort();
  // Thin pages marked by scripts/adsense-quality-pass.cjs are published (searchable, listed) but kept out of the sitemap.
  const qualityPassUrls = fs.readdirSync(path.join(root, 'calculators')).filter(name => name.endsWith('.html') &&
    fs.readFileSync(path.join(root, 'calculators', name), 'utf8').includes('data-quality-pass="thin"')).map(name => '/calculators/' + name);
  const canonicalCalculatorUrls = [...new Set([...sitemapCalculatorUrls, ...qualityPassUrls])].sort();
  const actualSearchIndex = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const expectedSearchIndexUrls = [...new Set(actualSearchIndex.map(item => String(item.url || '')).filter(Boolean))].sort();
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
