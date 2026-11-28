'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const sourceScript = path.join(repoRoot, 'scripts/normalize-hreflang.cjs');

function write(root, relative, html) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  return file;
}
function read(root, relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('normalizer rebuilds reciprocal language groups and preserves noindex/canonical page state', t => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-normalize-hreflang-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const script = path.join(fixture, 'scripts/normalize-hreflang.cjs');
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.copyFileSync(sourceScript, script);
  const configDir = path.join(fixture, 'config');
  fs.mkdirSync(configDir, {recursive: true});
  fs.copyFileSync(path.join(repoRoot, 'config/supported-locale-prefixes.json'), path.join(configDir, 'supported-locale-prefixes.json'));

  const english = '<!doctype html><html lang="en"><head>' +
    '<link rel="canonical" href="https://friendlycalculator.in/calculators/demo.html">' +
    '<link rel="alternate" hreflang="fr" href="https://friendlycalculator.in/fr/calculators/demo.html">' +
    '<link rel="alternate" hreflang="ar" href="https://friendlycalculator.in/ar/calculators/demo.html">' +
    '<link rel="alternate" hreflang="fr" href="https://friendlycalculator.in/fr/calculators/demo.html">' +
    '</head><body><h1>Demo Calculator</h1><p>Keep this content.</p></body></html>';
  const french = '<!doctype html><html lang="fr"><head>' +
    '<link href="https://friendlycalculator.in/fr/calculators/demo.html" rel="canonical">' +
    '<link href="https://friendlycalculator.in/calculators/demo.html" hreflang="en" rel="alternate">' +
    '</head><body><h1>Calculatrice de démonstration</h1></body></html>';
  const arabic = '<!doctype html><html lang="ar"><head>' +
    '<meta name="robots" content="noindex,follow">' +
    '<link rel="canonical" href="https://friendlycalculator.in/ar/calculators/demo.html">' +
    '<link rel="alternate" hreflang="en" href="https://friendlycalculator.in/calculators/demo.html">' +
    '</head><body><h1>صفحة مسودة</h1></body></html>';
  const alias = '<!doctype html><html lang="es"><head>' +
    '<link rel="canonical" href="https://friendlycalculator.in/calculators/demo.html">' +
    '<link rel="alternate" hreflang="en" href="https://friendlycalculator.in/calculators/demo.html">' +
    '</head><body><h1>Alias, not a canonical locale page</h1></body></html>';
  const ukHub = '<!doctype html><html lang="en-GB"><head>' +
    '<link rel="canonical" href="https://friendlycalculator.in/uk/">' +
    '<link rel="alternate" hreflang="uk" href="https://friendlycalculator.in/uk/">' +
    '</head><body>United Kingdom hub</body></html>';
  const ukrainian = '<!doctype html><html lang="uk"><head>' +
    '<link rel="canonical" href="https://friendlycalculator.in/uk/calculators/uk-only.html">' +
    '</head><body>Ukrainian calculator</body></html>';
  const placeholder = '<!doctype html><html lang="fa"><head>' +
    '<link rel="canonical" href="https://friendlycalculator.in/fa/calculators/demo.html">' +
    '<meta name="description" content="[فارسی] Calculate a demo result with untranslated English metadata.">' +
    '</head><body><h1>Demo Calculator</h1></body></html>';
  const regional = '<!doctype html><html lang="en-US"><head>' +
    '<link rel="canonical" href="https://friendlycalculator.in/international/us-mortgage-calculator.html">' +
    '</head><body><h1>US Mortgage Calculator</h1></body></html>';
  const englishFallback = '<!doctype html><html lang="en"><head>' +
    '<link rel="canonical" href="https://friendlycalculator.in/calculators/locale-fallback-demo.html">' +
    '</head><body><h1>Locale fallback demo</h1></body></html>';
  const ukFallback = '<!doctype html><head>' +
    '<link rel="canonical" href="https://friendlycalculator.in/uk/calculators/locale-fallback-demo.html">' +
    '</head><body><h1>Locale fallback demo</h1></body></html>';

  write(fixture, 'calculators/demo.html', english);
  write(fixture, 'fr/calculators/demo.html', french);
  write(fixture, 'ar/calculators/demo.html', arabic);
  write(fixture, 'es/calculators/demo.html', alias);
  write(fixture, 'uk/index.html', ukHub);
  write(fixture, 'uk/calculators/uk-only.html', ukrainian);
  write(fixture, 'fa/calculators/demo.html', placeholder);
  write(fixture, 'international/us-mortgage-calculator.html', regional);
  write(fixture, 'calculators/locale-fallback-demo.html', englishFallback);
  write(fixture, 'uk/calculators/locale-fallback-demo.html', ukFallback);

  const run = spawnSync(process.execPath, [script, '--write'], { cwd: fixture, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);

  const en = read(fixture, 'calculators/demo.html');
  const fr = read(fixture, 'fr/calculators/demo.html');
  const ar = read(fixture, 'ar/calculators/demo.html');
  const es = read(fixture, 'es/calculators/demo.html');
  const ukHome = read(fixture, 'uk/index.html');
  const ukTool = read(fixture, 'uk/calculators/uk-only.html');
  const faPlaceholder = read(fixture, 'fa/calculators/demo.html');
  const usMortgage = read(fixture, 'international/us-mortgage-calculator.html');
  const enFallback = read(fixture, 'calculators/locale-fallback-demo.html');
  const ukFallbackPage = read(fixture, 'uk/calculators/locale-fallback-demo.html');

  for (const html of [en, fr]) {
    assert.match(html, /hreflang="en"/);
    assert.match(html, /hreflang="fr"/);
    assert.match(html, /hreflang="x-default"/);
    assert.doesNotMatch(html, /hreflang="ar"/);
    assert.doesNotMatch(html, /hreflang="es"/);
  }
  assert.equal((en.match(/hreflang="fr"/g) || []).length, 1);
  assert.equal((fr.match(/hreflang="en"/g) || []).length, 1);
  assert.doesNotMatch(ar, /hreflang=/);
  assert.match(ar, /name="robots" content="noindex,follow"/);
  assert.match(ar, /<h1>صفحة مسودة<\/h1>/);
  assert.doesNotMatch(es, /hreflang=/);
  assert.match(es, /rel="canonical"/);
  assert.match(ukHome, /lang="en-GB"/);
  assert.doesNotMatch(ukHome, /hreflang=/);
  assert.match(ukTool, /lang="uk"/);
  assert.doesNotMatch(ukTool, /hreflang=/);
  assert.match(faPlaceholder, /\[فارسی\]/);
  assert.doesNotMatch(faPlaceholder, /hreflang=/);
  assert.doesNotMatch(usMortgage, /hreflang=/);
  assert.match(enFallback, /hreflang="uk"/);
  assert.match(ukFallbackPage, /hreflang="en"/);
  assert.match(ukFallbackPage, /hreflang="x-default"/);
  assert.match(en, /<h1>Demo Calculator<\/h1>/);
  assert.match(en, /Keep this content/);

  const check = spawnSync(process.execPath, [script, '--check'], { cwd: fixture, encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr || check.stdout);
});

test('normalizer dry run reports required changes but does not mutate files', t => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-normalize-hreflang-dry-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const script = path.join(fixture, 'scripts/normalize-hreflang.cjs');
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.copyFileSync(sourceScript, script);
  const html = '<html lang="en"><head><link rel="canonical" href="https://friendlycalculator.in/"></head><body></body></html>';
  const file = write(fixture, 'index.html', html);
  const dry = spawnSync(process.execPath, [script], { cwd: fixture, encoding: 'utf8' });
  assert.equal(dry.status, 0, dry.stderr || dry.stdout);
  assert.match(dry.stdout, /\[dry run\]/);
  assert.equal(fs.readFileSync(file, 'utf8'), html);
});
