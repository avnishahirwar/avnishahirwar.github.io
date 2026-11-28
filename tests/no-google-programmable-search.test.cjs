const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const shellJs = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
const shellCss = fs.readFileSync(path.join(root, 'assets/site-shell.css'), 'utf8');

test('shared site shell does not load Google Programmable Search', () => {
  assert.doesNotMatch(shellJs, /cse\.google\.com|gcse-search|data-fc-google-cse|Google Programmable Search/i);
  assert.doesNotMatch(shellCss, /gsc-control-cse|gsc-search-box|Google Programmable Search/i);
});

test('native Friendly Calculator catalogue search remains available', () => {
  assert.match(shellJs, /FriendlyCalculatorSearchMatcher/);
  assert.match(shellJs, /fc-header-search/);
  assert.match(shellJs, /calculator-search-index/);
});
