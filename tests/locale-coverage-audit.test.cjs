const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { auditLocaleCoverage, renderMarkdown } = require('../scripts/audit-locale-coverage.cjs');
const languageCatalogue = require('../config/language-catalogue.json');

function write(root, file, html = '<!doctype html><html lang="en"><head><link rel="canonical" href="https://friendlycalculator.in/' + file + '"><script src="/assets/site-shell.js"></script></head><body></body></html>') {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
}

test('audit compares equivalent public paths and excludes noindex/private pages', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-locales-'));
  try {
    write(root, 'index.html', '<html lang="en"><head><link rel="canonical" href="https://friendlycalculator.in/"></head></html>');
    write(root, 'calculators/emi.html');
    write(root, 'about.html');
    write(root, 'hi/index.html', '<html lang="hi"><head><link rel="canonical" href="https://friendlycalculator.in/hi/"></head><script src="/assets/site-shell.js"></script></html>');
    write(root, 'hi/calculators/emi.html', '<html lang="hi"><head><link rel="canonical" href="https://friendlycalculator.in/hi/calculators/emi.html"><link rel="alternate" hreflang="en" href="https://friendlycalculator.in/calculators/emi.html"></head><script src="/assets/site-shell.js"></script></html>');
    write(root, 'fr/index.html', '<html lang="fr"><head><link rel="canonical" href="https://friendlycalculator.in/fr/"></head><script src="/assets/site-shell.js"></script></html>');
    write(root, 'noindex.html', '<html lang="en"><head><meta name="robots" content="noindex"></head></html>');
    write(root, 'admin/private.html');
    const report = auditLocaleCoverage(root, ['hi', 'fr', 'de']);
    assert.equal(report.publicIndexableEnglishPageCount, 3);
    assert.equal(report.excludedNoindexPageCount, 1);
    assert.equal(report.locales.hi.translatedPageCount, 2);
    assert.equal(report.locales.hi.missingCount, 1);
    assert.deepEqual(report.locales.hi.missingPages, ['about.html']);
    assert.equal(report.locales.fr.coveragePercent, 33.3);
    assert.equal(report.locales.de.coveragePercent, 0);
    assert.equal(report.locales.hi.missingLangCount, 0);
    assert.equal(report.locales.hi.missingSiteShellCount, 0);
    assert.equal(report.locales.hi.missingHreflangCount, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('audit report distinguishes route coverage from translation quality', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-locales-'));
  try {
    write(root, 'index.html');
    const report = auditLocaleCoverage(root, []);
    const markdown = renderMarkdown(report);
    assert.match(markdown, /does not certify that visible copy/);
    assert.match(markdown, /Public indexable English\/root HTML pages/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});


test('canonical language catalogue defines 50 unique locales, 17 available editions and correct writing directions', () => {
  const { DEFAULT_LOCALES } = require('../scripts/audit-locale-coverage.cjs');
  const locales = languageCatalogue.locales;
  const codes = locales.map(locale => locale.code);
  assert.equal(languageCatalogue.total, 50);
  assert.equal(locales.length, 50);
  assert.equal(new Set(codes).size, 50);
  assert.equal(codes[0], 'en');
  assert.equal(locales.filter(locale => locale.status === 'available').length, 17);
  assert.equal(locales.filter(locale => locale.status === 'planned').length, 33);
  assert.equal(DEFAULT_LOCALES.length, 49);
  assert.deepEqual(DEFAULT_LOCALES, codes.filter(code => code !== 'en'));
  for (const locale of locales) {
    assert.ok(locale.name && locale.nativeName, 'Missing language label: ' + locale.code);
    assert.ok(['ltr', 'rtl'].includes(locale.direction), 'Invalid writing direction: ' + locale.code);
  }
  for (const code of ['ar', 'arz', 'ur', 'fa', 'ps', 'he', 'sd']) {
    assert.equal(locales.find(locale => locale.code === code).direction, 'rtl');
  }
});
