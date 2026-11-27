#!/usr/bin/env node
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const scriptPath = path.resolve(__dirname, '../scripts/add-hreflang-reciprocals.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friendly-calculator-hreflang-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'config/language-catalogue.json'),
    JSON.stringify({ locales: [{ code: 'en' }, { code: 'hi' }] })
  );
  return {
    root,
    writePage(relativePath, { lang, canonical, noindex = false, alternates = [] }) {
      const file = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const robots = noindex ? '<meta name="robots" content="noindex,follow">' : '';
      const links = alternates.map(({ lang: code, href }) =>
        '<link rel="alternate" hreflang="' + code + '" href="' + href + '">'
      ).join('\n');
      fs.writeFileSync(file,
        '<!doctype html><html lang="' + lang + '"><head>' +
        '<link rel="canonical" href="' + canonical + '">' + robots + links +
        '</head><body>Fixture</body></html>');
      return file;
    }
  };
}

function runRepair(root) {
  const result = spawnSync(process.execPath, [scriptPath, '--write'], {
    cwd: root,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const line = result.stdout.split('\n').find(value =>
    value.startsWith('Additive hreflang reciprocal repair: ')
  );
  assert.ok(line, 'repair script should print its stats');
  return JSON.parse(line.slice('Additive hreflang reciprocal repair: '.length));
}

test('noindex hreflang targets are pruned from indexable and noindex source pages on disk', t => {
  const f = fixture(t);
  const english = f.writePage('calculators/sample.html', {
    lang: 'en',
    canonical: 'https://friendlycalculator.in/calculators/sample.html',
    alternates: [{ lang: 'hi', href: 'https://friendlycalculator.in/hi/calculators/sample.html' }]
  });
  const hindi = f.writePage('hi/calculators/sample.html', {
    lang: 'hi',
    canonical: 'https://friendlycalculator.in/hi/calculators/sample.html',
    noindex: true,
    alternates: [{ lang: 'en', href: 'https://friendlycalculator.in/calculators/sample.html' }]
  });

  const stats = runRepair(f.root);
  const englishAfter = fs.readFileSync(english, 'utf8');
  const hindiAfter = fs.readFileSync(hindi, 'utf8');

  assert.doesNotMatch(englishAfter, /rel="alternate"/);
  assert.doesNotMatch(hindiAfter, /rel="alternate"/);
  assert.equal(stats.removedNoindexTargets, 2);
  assert.equal(stats.targetPagesChanged, 2);
});

test('noindex hreflang pruning is idempotent on a second write run', t => {
  const f = fixture(t);
  f.writePage('calculators/sample.html', {
    lang: 'en',
    canonical: 'https://friendlycalculator.in/calculators/sample.html',
    alternates: [{ lang: 'hi', href: 'https://friendlycalculator.in/hi/calculators/sample.html' }]
  });
  f.writePage('hi/calculators/sample.html', {
    lang: 'hi',
    canonical: 'https://friendlycalculator.in/hi/calculators/sample.html',
    noindex: true
  });

  runRepair(f.root);
  const second = runRepair(f.root);
  assert.equal(second.removedNoindexTargets, 0);
  assert.equal(second.targetPagesChanged, 0);
});

test('valid indexable language alternates are preserved and missing reciprocals are added', t => {
  const f = fixture(t);
  const english = f.writePage('calculators/sample.html', {
    lang: 'en',
    canonical: 'https://friendlycalculator.in/calculators/sample.html',
    alternates: [{ lang: 'hi', href: 'https://friendlycalculator.in/hi/calculators/sample.html' }]
  });
  const hindi = f.writePage('hi/calculators/sample.html', {
    lang: 'hi',
    canonical: 'https://friendlycalculator.in/hi/calculators/sample.html'
  });

  runRepair(f.root);
  const englishAfter = fs.readFileSync(english, 'utf8');
  const hindiAfter = fs.readFileSync(hindi, 'utf8');

  assert.match(englishAfter, /hreflang="hi" href="https:\/\/friendlycalculator\.in\/hi\/calculators\/sample\.html"/);
  assert.match(hindiAfter, /hreflang="en" href="https:\/\/friendlycalculator\.in\/calculators\/sample\.html"/);
  assert.match(hindiAfter, /hreflang="x-default" href="https:\/\/friendlycalculator\.in\/calculators\/sample\.html"/);
});
