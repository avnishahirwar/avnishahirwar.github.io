const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { auditLocaleCoverage, renderMarkdown } = require('../scripts/audit-locale-coverage.cjs');

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


test('default locale coverage audit tracks all 49 non-English languages in the 50-language catalogue',()=>{
 const {DEFAULT_LOCALES}=require('../scripts/audit-locale-coverage.cjs');
 assert.equal(DEFAULT_LOCALES.length,49);
 assert.equal(new Set(DEFAULT_LOCALES).size,49);
 for(const locale of ['zh','hi','es','ar','fr','bn','pt','id','ur','ru','de','ja','pcm','arz','mr','vi','te','sw','ha','tr','pa','fil','ta','yue','wuu','fa','ko','am','th','jv','it','gu','kn','yo','bho','nl','pl','ml','or','ne','si','uk','uz','ps','so','he','my','ro','sd']) assert.ok(DEFAULT_LOCALES.includes(locale),'Missing locale: '+locale);
});
