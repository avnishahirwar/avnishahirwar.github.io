'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const script = path.join(repoRoot, 'scripts/clean-invalid-hreflang.cjs');

function write(root, relative, html) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  return file;
}

test('hreflang cleanup removes noindex, missing, mismatched and non-reciprocal alternates only', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-clean-hreflang-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const en = '<!doctype html><html lang="en"><head>' +
    '<title>English</title><link rel="canonical" href="https://friendlycalculator.in/calculators/demo.html">' +
    '<link rel="alternate" hreflang="fr" href="https://friendlycalculator.in/fr/calculators/demo.html">' +
    '<link rel="alternate" hreflang="ar" href="https://friendlycalculator.in/ar/calculators/demo.html">' +
    '<link rel="alternate" hreflang="de" href="https://friendlycalculator.in/de/calculators/missing.html">' +
    '</head><body>Keep this content.</body></html>';
  const fr = '<!doctype html><html lang="fr"><head>' +
    '<link rel="canonical" href="https://friendlycalculator.in/fr/calculators/demo.html">' +
    '<link rel="alternate" hreflang="en" href="https://friendlycalculator.in/calculators/demo.html">' +
    '</head><body>Français</body></html>';
  const ar = '<!doctype html><html lang="ar"><head><meta name="robots" content="noindex,follow">' +
    '<link rel="canonical" href="https://friendlycalculator.in/ar/calculators/demo.html">' +
    '<link rel="alternate" hreflang="en" href="https://friendlycalculator.in/calculators/demo.html">' +
    '</head><body>Arabic draft remains.</body></html>';
  const enFile = write(root, 'calculators/demo.html', en);
  const frFile = write(root, 'fr/calculators/demo.html', fr);
  const arFile = write(root, 'ar/calculators/demo.html', ar);

  const dry = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  assert.equal(dry.status, 0, dry.stderr || dry.stdout);
  assert.match(dry.stdout, /"removedFromNoindexPages":1/);
  assert.match(dry.stdout, /"removedNoindexTargets":1/);
  assert.match(dry.stdout, /"removedMissingOrOffsiteTargets":1/);
  assert.match(dry.stdout, /Dry run only/);
  assert.equal(fs.readFileSync(enFile, 'utf8'), en, 'dry run must not edit the page');

  const run = spawnSync(process.execPath, [script, '--write'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const enAfter = fs.readFileSync(enFile, 'utf8');
  const arAfter = fs.readFileSync(arFile, 'utf8');
  assert.match(enAfter, /hreflang="fr"/);
  assert.doesNotMatch(enAfter, /hreflang="ar"|hreflang="de"/);
  assert.match(arAfter, /name="robots" content="noindex,follow"/);
  assert.match(arAfter, /rel="canonical"/);
  assert.doesNotMatch(arAfter, /rel="alternate"/);
  assert.match(arAfter, /Arabic draft remains\./);
  assert.match(fs.readFileSync(frFile, 'utf8'), /hreflang="en"/);
  assert.match(enAfter, /Keep this content\./);

  const second = spawnSync(process.execPath, [script, '--write'], { cwd: root, encoding: 'utf8' });
  assert.equal(second.status, 0, second.stderr || second.stdout);
  assert.match(second.stdout, /"filesChanged":0/);
});

test('hreflang cleanup rejects non-reciprocal, wrong-language and noncanonical targets', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-clean-hreflang-invalid-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = '<html lang="en"><head><link rel="canonical" href="https://friendlycalculator.in/calculators/source.html">' +
    '<link rel="alternate" hreflang="fr" href="https://friendlycalculator.in/fr/calculators/no-reciprocal.html">' +
    '<link rel="alternate" hreflang="de" href="https://friendlycalculator.in/de/calculators/wrong-language.html">' +
    '<link rel="alternate" hreflang="es" href="https://friendlycalculator.in/es/calculators/wrong-canonical.html">' +
    '</head><body>Source stays.</body></html>';
  write(root, 'calculators/source.html', source);
  write(root, 'fr/calculators/no-reciprocal.html',
    '<html lang="fr"><head><link rel="canonical" href="https://friendlycalculator.in/fr/calculators/no-reciprocal.html"></head><body>French</body></html>');
  write(root, 'de/calculators/wrong-language.html',
    '<html lang="it"><head><link rel="canonical" href="https://friendlycalculator.in/de/calculators/wrong-language.html"></head><body>Italian</body></html>');
  write(root, 'es/calculators/wrong-canonical.html',
    '<html lang="es"><head><link rel="canonical" href="https://friendlycalculator.in/es/calculators/other.html"></head><body>Spanish</body></html>');

  const run = spawnSync(process.execPath, [script, '--write'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /"removedNonReciprocalLinks":1/);
  assert.match(run.stdout, /"removedLanguageMismatches":1/);
  assert.match(run.stdout, /"removedCanonicalMismatches":1/);
  const after = fs.readFileSync(path.join(root, 'calculators/source.html'), 'utf8');
  assert.doesNotMatch(after, /rel="alternate"/);
  assert.match(after, /Source stays\./);
});
