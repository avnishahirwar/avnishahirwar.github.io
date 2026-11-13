const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const shell = fs.readFileSync(path.join(__dirname, '..', 'assets', 'site-shell.js'), 'utf8');

test('global language selector supports all configured locales', () => {
  for (const locale of ['en','hi','es','fr','pt','ar','id','bn','ta']) {
    assert.ok(shell.includes(locale + ':'));
  }
  assert.match(shell, /fc-language-select/);
  assert.match(shell, /fc-language-preference/);
});

test('language switching preserves the current route when its translation exists', () => {
  assert.match(shell, /const buildLocaleTarget=next=>/);
  assert.match(shell, /currentLocale==='en'\?p:p\.replace/);
  assert.match(shell, /fetch\(target,\{method:'HEAD',cache:'no-store'\}\)/);
  assert.match(shell, /if\(response\.ok\)\{location\.href=target;return;\}/);
  assert.match(shell, /location\.href=localeHome\[next\]/);
  assert.match(shell, /fc-language-notice/);
});

test('language routing does not force a browser-language redirect', () => {
  assert.doesNotMatch(shell, /location\.replace\(localeHome\[navigator\.language/);
  assert.doesNotMatch(shell, /navigator\.language[^;]{0,120}location\.(?:replace|href)/);
});

test('Hindi Bigha and Stamp Duty calculator routes have localized documents', () => {
  for (const file of ['bigha-to-sq-ft-calculator.html', 'stamp-duty-calculator.html']) {
    const target = path.join(__dirname, '..', 'hi', 'calculators', file);
    assert.ok(fs.existsSync(target), `Missing Hindi calculator page: ${file}`);
    const html = fs.readFileSync(target, 'utf8');
    assert.match(html, /<html lang="hi">/);
    assert.match(html, new RegExp('https://friendlycalculator\\.in/hi/calculators/' + file.replaceAll('.', '\\\\.') + '"'));
  }
});
