'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const shell = fs.readFileSync(path.join(__dirname, '..', 'assets', 'site-shell.js'), 'utf8');

test('embed mode isolates the calculator container from page content', () => {
  assert.match(shell, /new URLSearchParams\(location\.search\)\.get\('embed'\)==='1'/);
  assert.match(shell, /main>\*:not\(\.fc-embed-calculator\)/);
  assert.match(shell, /fc-embed-calculator/);
  assert.match(shell, /data-fc-native-calculator/);
  assert.match(shell, /section\.tool,section\.calculator,\.calculator,section#sip-tool/);
});

test('embed mode hides site chrome and editorial sections while preserving attribution', () => {
  assert.match(shell, /fc-global-header/);
  assert.match(shell, /fc-footer/);
  assert.match(shell, /fc-related-tools/);
  assert.match(shell, /fc-embed-attribution/);
  assert.match(shell, /Powered by Friendly Calculator/);
  assert.match(shell, /noopener noreferrer/);
});

test('unrecognised calculator markup fails open instead of blanking the widget', () => {
  assert.match(shell, /fc-embed-unmatched/);
});
