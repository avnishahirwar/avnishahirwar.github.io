const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');

// This focused suite validates additive-only reciprocity; full hreflang cluster validity
// (including noindex and language-mismatch exclusions) remains covered by the main SEO tests.

test('additive hreflang repair has no remaining unambiguous reciprocal additions', () => {
  const output = execFileSync(process.execPath, ['scripts/add-hreflang-reciprocals.cjs'], {
    cwd: root, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024
  });
  const match = output.match(/Additive hreflang reciprocal repair: (\{[^\n]+\})/);
  assert.ok(match, 'repair script must report a JSON summary');
  const summary = JSON.parse(match[1]);
  assert.equal(summary.added, 0, 'all unambiguous additive reciprocal tags should already be present');
  assert.ok(summary.alreadyPresent > 0, 'existing reciprocal tags should be recognized');
  assert.match(output, /Dry run only\. No files were changed\./);
});

test('additive hreflang repair never adds alternates to noindex pages', () => {
  const os = require('node:os');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-hreflang-noindex-'));
  const write = (file, html) => {
    const target = path.join(temp, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html);
  };
  try {
    write('calculators/basic-calculator.html', '<html lang="en"><head><link rel="canonical" href="https://friendlycalculator.in/calculators/basic-calculator.html"><link rel="alternate" hreflang="hi" href="https://friendlycalculator.in/hi/calculators/basic-calculator.html"></head></html>');
    const noindex = '<html lang="hi"><head><meta name="robots" content="noindex,follow"><link rel="canonical" href="https://friendlycalculator.in/hi/calculators/basic-calculator.html"></head></html>';
    write('hi/calculators/basic-calculator.html', noindex);
    const output = execFileSync(process.execPath, [path.join(root, 'scripts/add-hreflang-reciprocals.cjs')], {
      cwd: temp, encoding: 'utf8'
    });
    const summary = JSON.parse(output.match(/Additive hreflang reciprocal repair: (\{[^\n]+\})/)[1]);
    assert.equal(summary.added, 0);
    assert.ok(summary.skippedNoindex > 0);
    assert.equal(fs.readFileSync(path.join(temp, 'hi/calculators/basic-calculator.html'), 'utf8'), noindex);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('additive hreflang repair skips sources whose canonical points elsewhere', () => {
  const os = require('node:os');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-hreflang-canonical-alias-'));
  const write = (file, html) => {
    const target = path.join(temp, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html);
  };
  try {
    const source = '<html lang="en"><head><link rel="canonical" href="https://friendlycalculator.in/legacy-home/"><link rel="alternate" hreflang="hi" href="https://friendlycalculator.in/hi/"></head></html>';
    const target = '<html lang="hi"><head><link rel="canonical" href="https://friendlycalculator.in/hi/"></head></html>';
    write('calculators/basic-calculator.html', source);
    write('hi/calculators/basic-calculator.html', target);
    const output = execFileSync(process.execPath, [path.join(root, 'scripts/add-hreflang-reciprocals.cjs')], {
      cwd: temp, encoding: 'utf8'
    });
    const summary = JSON.parse(output.match(/Additive hreflang reciprocal repair: (\{[^\n]+\})/)[1]);
    assert.equal(summary.added, 0);
    assert.ok(summary.skippedNoncanonicalSource > 0);
    assert.equal(fs.readFileSync(path.join(temp, 'hi/index.html'), 'utf8'), target);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('hreflang page edits preserve every original byte except the inserted alternate tags', t => {
  if (process.env.CHECK_HREFLANG_ADDITIVE_REPAIR !== 'true') { t.skip('Historical byte-preservation check was verified on PR #453; do not compare unrelated future page edits against the current main branch.'); return; }
  const baseRef = process.env.GITHUB_BASE_REF;
  if (!baseRef) { t.skip('byte-preservation comparison is a pull-request-only check'); return; }
  const changed = execFileSync('git', ['diff', '--name-only', 'origin/' + baseRef, '--', '*.html'], {
    cwd: root, encoding: 'utf8'
  }).trim().split('\n').filter(Boolean);
  assert.ok(changed.length > 0, 'expected repaired HTML pages');

  for (const file of changed) {
    const original = execFileSync('git', ['show', 'origin/main:' + file], { cwd: root, encoding: 'utf8' });
    let current = fs.readFileSync(path.join(root, file), 'utf8');
    const originalCounts = new Map();
    const alternateTag = /<link\b[^>]*\brel=["']alternate["'][^>]*>/gi;
    for (const match of original.matchAll(alternateTag)) {
      originalCounts.set(match[0], (originalCounts.get(match[0]) || 0) + 1);
    }
    const seenCounts = new Map();
    for (const match of [...current.matchAll(alternateTag)]) {
      const tag = match[0];
      const count = (seenCounts.get(tag) || 0) + 1;
      seenCounts.set(tag, count);
      if (count > (originalCounts.get(tag) || 0)) current = current.replace(tag, '');
    }

    const originalHead = original.indexOf('</head>');
    const currentHead = current.indexOf('</head>');
    if (originalHead >= 0 && currentHead >= 0) {
      const originalPrefix = original.slice(0, originalHead);
      const currentPrefix = current.slice(0, currentHead);
      const newlineCount = value => (value.match(/\n+$/) || [''])[0].length;
      const extra = newlineCount(currentPrefix) - newlineCount(originalPrefix);
      if (extra > 0) {
        const closing = current.indexOf('</head>');
        current = current.slice(0, closing - extra) + current.slice(closing);
      }
    }
    assert.equal(current, original, 'unexpected non-additive page change: ' + file);
  }
});

test('additive repair skips malformed percent-encoded alternate URLs', () => {
  const os = require('node:os');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-hreflang-malformed-href-'));
  try {
    fs.mkdirSync(path.join(temp, 'calculators'), { recursive: true });
    fs.writeFileSync(path.join(temp, 'calculators/basic-calculator.html'),
      '<html lang="en"><head><link rel="canonical" href="https://friendlycalculator.in/calculators/basic-calculator.html"><link rel="alternate" hreflang="fr" href="https://friendlycalculator.in/fr/calculators/%ZZ.html"></head></html>');
    const output = execFileSync(process.execPath, [path.join(root, 'scripts/add-hreflang-reciprocals.cjs')], {
      cwd: temp, encoding: 'utf8'
    });
    const summary = JSON.parse(output.match(/Additive hreflang reciprocal repair: (\{[^\n]+\})/)[1]);
    assert.equal(summary.added, 0);
    assert.ok(summary.skippedMissingTarget > 0);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('additive repair skips unsupported codes and known untranslated destinations', () => {
  const os = require('node:os');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-hreflang-safe-additions-'));
  const write = (file, html) => {
    const target = path.join(temp, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html);
  };
  try {
    write('ar/calculators/basic-calculator.html',
      '<html lang="ar"><head><link rel="canonical" href="https://friendlycalculator.in/ar/calculators/basic-calculator.html"><link rel="alternate" hreflang="am" href="https://friendlycalculator.in/am/calculators/rd-calculator.html"><link rel="alternate" hreflang="de" href="https://friendlycalculator.in/de/calculators/rd-calculator.html"><link rel="alternate" hreflang="ja" href="https://friendlycalculator.in/ja/calculators/loan-emi-calculator.html"><link rel="alternate" hreflang="fa" href="https://friendlycalculator.in/fa/calculators/loan-emi-calculator.html"><link rel="alternate" hreflang="vi" href="https://friendlycalculator.in/vi/calculators/loan-emi-calculator.html"><link rel="alternate" hreflang="arz" href="https://friendlycalculator.in/arz/calculators/basic-calculator.html"><link rel="alternate" hreflang="en-GB" href="https://friendlycalculator.in/en-gb/"></head></html>');
    for (const locale of ['am', 'de']) {
      write(locale + '/calculators/rd-calculator.html',
        '<html lang="' + locale + '"><head><link rel="canonical" href="https://friendlycalculator.in/' + locale + '/calculators/rd-calculator.html"><link rel="alternate" hreflang="ar" href="https://friendlycalculator.in/ar/calculators/rd-calculator.html"></head></html>');
    }
    for (const locale of ['ja', 'fa', 'vi']) {
      write(locale + '/calculators/loan-emi-calculator.html',
        '<html lang="' + locale + '"><head><link rel="canonical" href="https://friendlycalculator.in/' + locale + '/calculators/loan-emi-calculator.html"><link rel="alternate" hreflang="ar" href="https://friendlycalculator.in/ar/calculators/loan-emi-calculator.html"></head></html>');
    }
    write('ar/calculators/rd-calculator.html',
      '<html lang="ar"><head><link rel="canonical" href="https://friendlycalculator.in/ar/calculators/rd-calculator.html"></head></html>');
    write('ar/calculators/loan-emi-calculator.html',
      '<html lang="ar"><head><link rel="canonical" href="https://friendlycalculator.in/ar/calculators/loan-emi-calculator.html"></head></html>');
    write('arz/calculators/basic-calculator.html',
      '<html lang="arz"><head><link rel="canonical" href="https://friendlycalculator.in/arz/calculators/basic-calculator.html"></head></html>');
    write('en-gb/calculators/basic-calculator.html',
      '<html lang="en-GB"><head><link rel="canonical" href="https://friendlycalculator.in/en-gb/calculators/basic-calculator.html"></head></html>');
    write('arz/calculators/basic-calculator.html',
      '<html lang="arz"><head><link rel="canonical" href="https://friendlycalculator.in/arz/calculators/basic-calculator.html"><link rel="alternate" hreflang="ar" href="https://friendlycalculator.in/ar/calculators/basic-calculator.html"></head></html>');

    const output = execFileSync(process.execPath, [path.join(root, 'scripts/add-hreflang-reciprocals.cjs'), '--write'], {
      cwd: temp, encoding: 'utf8'
    });
    const summary = JSON.parse(output.match(/Additive hreflang reciprocal repair: (\{[^\n]+\})/)[1]);
    assert.equal(summary.added, 1, 'only the verified en-GB target should receive a reciprocal');
    assert.ok(summary.skippedKnownUntranslatedTarget >= 5);
    assert.ok(summary.skippedKnownUntranslatedSource >= 5);
    assert.ok(summary.skippedUnsupportedLanguageCode >= 2);
    const enGb = fs.readFileSync(path.join(temp, 'en-gb/calculators/basic-calculator.html'), 'utf8');
    assert.match(enGb, /hreflang="ar"/);
    const arRd = fs.readFileSync(path.join(temp, 'ar/calculators/rd-calculator.html'), 'utf8');
    assert.doesNotMatch(arRd, /hreflang="am"|hreflang="de"/);
    const arEmi = fs.readFileSync(path.join(temp, 'ar/calculators/loan-emi-calculator.html'), 'utf8');
    assert.doesNotMatch(arEmi, /hreflang="ja"|hreflang="fa"|hreflang="vi"/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
