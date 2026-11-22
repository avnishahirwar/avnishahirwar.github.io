'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {build, physicsEntries} = require('../scripts/generate-physics-calculator-directory.cjs');

const root = path.join(__dirname, '..');
const pagePath = path.join(root, 'calculator/physics-calculators.html');
const generated = build();
const entries = physicsEntries();
const urls = new Set(entries.map(entry => entry.url));
const supplementalRoutes = [
  '/calculators/current-divider-calculator.html',
  '/calculators/elastic-constants-calculator.html',
  '/calculators/impulse-and-momentum-calculator.html',
  '/calculators/light-year-conversion.html',
  '/calculators/projectile-time-of-flight-calculator.html'
];

function directoryEntriesFromIndex() {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const expected = new Set(index.filter(item => String(item.category || '').trim().toLowerCase() === 'physics')
    .map(item => String(item.url || ''))
    .filter(url => url.startsWith('/calculators/') && url.endsWith('.html') &&
      !url.includes('..') && !url.includes('?') && !url.includes('#') &&
      fs.existsSync(path.join(root, url.slice(1)))));
  for (const url of supplementalRoutes) expected.add(url);
  return expected;
}

test('physics directory covers Physics-tagged catalogue tools plus verified directory-only physics pages', () => {
  const expected = directoryEntriesFromIndex();
  assert.ok(entries.length >= 300, `expected a broad physics directory, got ${entries.length}`);
  assert.equal(urls.size, entries.length, 'directory URLs should be unique');
  assert.deepEqual(new Set(urls), expected, 'directory should include the verified catalog set without adding unrelated pages');
  for (const entry of entries) {
    assert.ok(fs.existsSync(path.join(root, entry.url.slice(1))), `missing destination: ${entry.url}`);
    assert.ok(generated.includes(`href="${entry.url}"`), `directory omitted ${entry.url}`);
  }
});

test('supplemental routes are physics-related and unrelated general-math pages are excluded', () => {
  for (const url of supplementalRoutes) assert.ok(urls.has(url), `missing verified physics route ${url}`);
  for (const url of [
    '/calculators/simplify-cube-root-calculator.html',
    '/calculators/compound-interest-calculator.html',
    '/calculators/bmi-calculator.html'
  ]) assert.ok(!urls.has(url), `unexpected non-physics route ${url}`);
});

test('topic coverage includes core classical, thermal, wave, optical, electrical, modern and space tools', () => {
  const byUrl = new Map(entries.map(entry => [entry.url, entry]));
  const expected = new Map([
    ['/calculators/projectile-time-of-flight-calculator.html', 'mechanics'],
    ['/calculators/angular-velocity-calculator.html', 'rotation'],
    ['/calculators/archimedes-principle-calculator.html', 'fluids-materials'],
    ['/calculators/ideal-gas-law-calculator.html', 'thermal'],
    ['/calculators/sound-wavelength-calculator.html', 'waves-sound'],
    ['/calculators/angle-of-refraction-calculator.html', 'optics'],
    ['/calculators/current-divider-calculator.html', 'electricity-magnetism'],
    ['/calculators/photon-energy-calculator.html', 'modern'],
    ['/calculators/light-year-conversion.html', 'astronomy-space'],
    ['/calculators/rocket-thrust-calculator.html', 'engineering'],
    ['/calculators/kg-to-newtons-calculator.html', 'units-measurement']
  ]);
  for (const [url, section] of expected) {
    assert.ok(byUrl.has(url), `missing topic example ${url}`);
    assert.equal(byUrl.get(url).section, section, `${url} should be classified as ${section}`);
  }
});

test('edge-case physics terms map to useful topics rather than the fallback group', () => {
  const byUrl = new Map(entries.map(entry => [entry.url, entry]));
  const expected = new Map([
    ['/calculators/angle-of-incidence-calculator.html', 'optics'],
    ['/calculators/cv-flow-calculator.html', 'fluids-materials'],
    ['/calculators/debye-length-calculator.html', 'modern'],
    ['/calculators/frequency-calculator.html', 'waves-sound'],
    ['/calculators/helmholtz-resonator-calculator.html', 'waves-sound'],
    ['/calculators/internal-resistance-calculator.html', 'electricity-magnetism']
  ]);
  for (const [url, section] of expected) assert.equal(byUrl.get(url)?.section, section, `${url} should be classified as ${section}`);
});

test('checked-in physics directory is reproducible and includes canonical SEO, live search, topic navigation and use cautions', () => {
  const checkedIn = fs.readFileSync(pagePath, 'utf8');
  const normalizeDate = html => html.replace(/("dateModified":")\d{4}-\d{2}-\d{2}("[,}])/g, '$1DATE$2');
  assert.equal(normalizeDate(checkedIn), normalizeDate(generated));
  assert.match(generated, /<link rel="canonical" href="https:\/\/friendlycalculator\.in\/calculator\/physics-calculators\.html">/);
  assert.match(generated, /<meta name="description" content="Search and browse/);
  assert.match(generated, /<label id="physics-search-label" for="physics-search-input">Search physics calculators<\/label>/);
  assert.match(generated, /role="status" aria-live="polite"/);
  assert.match(generated, /Mechanics, motion &amp; energy/);
  assert.match(generated, /Heat, gases &amp; thermodynamics/);
  assert.match(generated, /Electricity, circuits &amp; magnetism/);
  assert.match(generated, /Aerospace, vehicles &amp; engineering applications/);
  assert.match(generated, /not claim to include every physics calculator worldwide/);
  assert.match(generated, /No calculators match that search/);
});

test('homepage, all-calculator directory and both sitemap files link to the physics directory', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const siteDirectory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  assert.match(homepage, /href="\/calculator\/physics-calculators\.html"/);
  assert.match(siteDirectory, /href="\/calculator\/physics-calculators\.html"/);
  for (const sitemapFile of ['sitemap.xml', 'sitemap-en.xml']) {
    const sitemap = fs.readFileSync(path.join(root, sitemapFile), 'utf8');
    assert.ok(sitemap.includes('https://friendlycalculator.in/calculator/physics-calculators.html'), `${sitemapFile} is missing the physics directory`);
  }
});
