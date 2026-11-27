'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const sourceScript = path.join(repoRoot, 'scripts/add-hreflang-reciprocals.cjs');

function writeFixture(root, relative, html) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  return file;
}

test('hreflang reciprocal repair adds only valid indexable targets and leaves noindex pages untouched', t => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'friendly-calculator-hreflang-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));

  const script = path.join(fixture, 'scripts/add-hreflang-reciprocals.cjs');
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.copyFileSync(sourceScript, script);

  const english = '<!doctype html><html lang="en"><head>' +
    '<link rel="canonical" href="https://friendlycalculator.in/calculators/demo.html">' +
    '<link rel="alternate" hreflang="fr" href="https://friendlycalculator.in/fr/calculators/demo.html">' +
    '<link rel="alternate" hreflang="ar" href="https://friendlycalculator.in/ar/calculators/demo.html">' +
    '</head><body>English</body></html>';
  const french = '<!doctype html><html lang="fr"><head>' +
    '<link rel="canonical" href="https://friendlycalculator.in/fr/calculators/demo.html">' +
    '</head><body>Français</body></html>';
  const arabicNoindex = '<!doctype html><html lang="ar"><head>' +
    '<meta name="robots" content="noindex,follow">' +
    '<link rel="canonical" href="https://friendlycalculator.in/ar/calculators/demo.html">' +
    '<link rel="alternate" hreflang="en" href="https://friendlycalculator.in/calculators/demo.html">' +
    '</head><body>Arabic draft</body></html>';

  const enFile = writeFixture(fixture, 'calculators/demo.html', english);
  const frFile = writeFixture(fixture, 'fr/calculators/demo.html', french);
  const arFile = writeFixture(fixture, 'ar/calculators/demo.html', arabicNoindex);

  const first = spawnSync(process.execPath, [script, '--write'], { cwd: fixture, encoding: 'utf8' });
  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.match(first.stdout, /"added":1/);
  assert.equal(fs.readFileSync(enFile, 'utf8'), english, 'Existing source tags must remain unchanged');
  assert.equal(fs.readFileSync(arFile, 'utf8'), arabicNoindex, 'Noindex pages must remain untouched');
  assert.match(fs.readFileSync(frFile, 'utf8'), /hreflang="en" href="https:\/\/friendlycalculator\.in\/calculators\/demo\.html"/);

  const afterFirst = [enFile, frFile, arFile].map(file => fs.readFileSync(file, 'utf8'));
  const second = spawnSync(process.execPath, [script, '--write'], { cwd: fixture, encoding: 'utf8' });
  assert.equal(second.status, 0, second.stderr || second.stdout);
  assert.match(second.stdout, /"added":0/);
  assert.deepEqual([enFile, frFile, arFile].map(file => fs.readFileSync(file, 'utf8')), afterFirst,
    'A second run must be idempotent');
});
