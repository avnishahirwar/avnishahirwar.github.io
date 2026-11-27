'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { normalizeDirectory } = require('../scripts/normalize-hreflang-clusters.cjs');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-hreflang-normalizer-'));
  const write = (file, html) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html);
  };
  const page = (lang, canonical, extra = '') =>
    '<!doctype html><html lang="' + lang + '"><head><link rel="canonical" href="' + canonical + '">' +
    extra + '</head><body><main>Preserved body ' + lang + '</main></body></html>';
  return { root, write, page };
}

test('normalizer creates a reciprocal self-inclusive cluster and x-default only for indexable canonical translations', () => {
  const f = fixture();
  try {
    const en = 'https://friendlycalculator.in/calculators/demo.html';
    const hi = 'https://friendlycalculator.in/hi/calculators/demo.html';
    const fr = 'https://friendlycalculator.in/fr/calculators/demo.html';
    f.write('calculators/demo.html', f.page('en', en,
      '<link rel="alternate" hreflang="xx" href="https://example.com/wrong">'));
    f.write('hi/calculators/demo.html', f.page('hi', hi,
      '<link rel="alternate" hreflang="en" href="' + en + '">'));
    f.write('fr/calculators/demo.html', f.page('fr', fr,
      '<meta name="robots" content="noindex,follow"><link rel="alternate" hreflang="en" href="' + en + '">'));

    const written = normalizeDirectory(f.root, { write: true });
    assert.equal(written.translatedRouteGroups, 1);
    assert.equal(written.changedPages, 3);

    const enHtml = fs.readFileSync(path.join(f.root, 'calculators/demo.html'), 'utf8');
    const hiHtml = fs.readFileSync(path.join(f.root, 'hi/calculators/demo.html'), 'utf8');
    const frHtml = fs.readFileSync(path.join(f.root, 'fr/calculators/demo.html'), 'utf8');
    for (const html of [enHtml, hiHtml]) {
      assert.match(html, /hreflang="en" href="https:\/\/friendlycalculator\.in\/calculators\/demo\.html"/);
      assert.match(html, /hreflang="hi" href="https:\/\/friendlycalculator\.in\/hi\/calculators\/demo\.html"/);
      assert.match(html, /hreflang="x-default" href="https:\/\/friendlycalculator\.in\/calculators\/demo\.html"/);
    }
    assert.doesNotMatch(frHtml, /hreflang=/);
    assert.match(frHtml, /<main>Preserved body fr<\/main>/);
    assert.equal(normalizeDirectory(f.root).changedPages, 0);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('normalizer drops ambiguous duplicate-language clusters instead of inventing translations', () => {
  const f = fixture();
  try {
    const en = 'https://friendlycalculator.in/calculators/duplicate.html';
    f.write('calculators/duplicate.html', f.page('en', en,
      '<link rel="alternate" hreflang="hi" href="https://friendlycalculator.in/hi/calculators/duplicate.html">'));
    f.write('te/calculators/duplicate.html', f.page('en', 'https://friendlycalculator.in/te/calculators/duplicate.html',
      '<link rel="alternate" hreflang="en" href="' + en + '">'));
    const result = normalizeDirectory(f.root, { write: true });
    assert.equal(result.languageConflictGroups, 1);
    assert.equal(result.newAlternateTags, 0);
    assert.doesNotMatch(fs.readFileSync(path.join(f.root, 'calculators/duplicate.html'), 'utf8'), /hreflang=/);
    assert.doesNotMatch(fs.readFileSync(path.join(f.root, 'te/calculators/duplicate.html'), 'utf8'), /hreflang=/);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('normalizer never changes body content or adds alternates to canonical aliases', () => {
  const f = fixture();
  try {
    const canonical = 'https://friendlycalculator.in/calculators/original.html';
    f.write('calculators/original.html', f.page('en', canonical));
    f.write('hi/calculators/original.html', f.page('hi', 'https://friendlycalculator.in/legacy/old.html',
      '<link rel="alternate" hreflang="en" href="' + canonical + '">'));
    const result = normalizeDirectory(f.root, { write: true });
    assert.equal(result.changedPages, 1);
    const alias = fs.readFileSync(path.join(f.root, 'hi/calculators/original.html'), 'utf8');
    assert.doesNotMatch(alias, /hreflang=/);
    assert.match(alias, /<main>Preserved body hi<\/main>/);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
