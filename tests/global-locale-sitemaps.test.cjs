const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('additive locale sitemap generator validates all locale segments without writing files', () => {
  const output = execFileSync(process.execPath, ['scripts/generate-locale-sitemaps.cjs', '--check'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  assert.match(output, /Locale sitemap check passed:/);
  assert.match(output, /en=\d+/);
  assert.match(output, /hi=\d+/);
  assert.match(output, /ar=\d+/);
  assert.match(output, /ta=\d+/);
});

test('locale sitemap generator preserves the existing all-pages sitemap', () => {
  const fs = require('node:fs');
  const script = fs.readFileSync(path.join(root, 'scripts/generate-locale-sitemaps.cjs'), 'utf8');
  assert.match(script, /existing sitemap\.xml is intentionally/);
  assert.match(script, /sitemap-\x27 \+ locale \+ \x27\.xml/);
  assert.match(script, /existing sitemap\.xml was not modified/);
});

test('sitemaps exclude canonical aliases and do not publish the UK market hub as Ukrainian', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-sitemap-canonical-'));
  const write = (file, html) => {
    const target = path.join(temp, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html);
  };
  try {
    write('index.html', '<html lang="en"><head><link rel="canonical" href="https://friendlycalculator.in/"></head></html>');
    write('hi/index.html', '<html lang="hi"><head><link rel="canonical" href="https://friendlycalculator.in/hi/"></head></html>');
    write('calculators/demo.html', '<html lang="en"><head><link rel="canonical" href="https://friendlycalculator.in/calculators/demo.html"></head></html>');
    write('hi/calculators/demo.html', '<html lang="en"><head><link rel="canonical" href="https://friendlycalculator.in/calculators/demo.html"></head></html>');
    write('uk/index.html', '<html lang="en-GB"><head><link rel="canonical" href="https://friendlycalculator.in/uk/"></head></html>');

    execFileSync(process.execPath, [path.join(root, 'scripts/generate-sitemaps.cjs')], { cwd: temp, encoding: 'utf8' });
    const allPages = fs.readFileSync(path.join(temp, 'sitemap.xml'), 'utf8');
    assert.match(allPages, /<loc>https:\/\/friendlycalculator\.in\/calculators\/demo\.html<\/loc>/);
    assert.doesNotMatch(allPages, /<loc>https:\/\/friendlycalculator\.in\/hi\/calculators\/demo\.html<\/loc>/);
    assert.match(allPages, /<loc>https:\/\/friendlycalculator\.in\/uk\/<\/loc>/);
    assert.doesNotMatch(allPages, /hreflang="uk"/);

    execFileSync(process.execPath, [path.join(root, 'scripts/generate-locale-sitemaps.cjs')], { cwd: temp, encoding: 'utf8' });
    const hindi = fs.readFileSync(path.join(temp, 'sitemap-hi.xml'), 'utf8');
    assert.doesNotMatch(hindi, /\/hi\/calculators\/demo\.html/);
    assert.ok(!fs.existsSync(path.join(temp, 'sitemap-uk.xml')));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
