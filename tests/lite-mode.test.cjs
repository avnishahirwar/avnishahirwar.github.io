'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('Lite mode honours explicit Save-Data and slow-network browser signals', () => {
  assert.match(shell, /connection\?\.saveData===true/);
  assert.match(shell, /slow-2g.*2g/);
  assert.match(shell, /connection\?\.downlink\)\&\&connection\.downlink<1\.5/);
  assert.match(shell, /connection\?\.rtt\)\&\&connection\.rtt>=1200/);
  assert.match(shell, /prefers-reduced-data: reduce/);
});

test('Lite mode offers automatic, always-on and full-version user choices', () => {
  assert.match(shell, /fc-lite-mode-select/);
  assert.match(shell, /\['auto',liteCopy\.auto\],\['on',liteCopy\.on\],\['off',liteCopy\.off\]/);
  assert.match(shell, /localStorage\.setItem\(key,value\)/);
  assert.match(shell, /fc:litechange/);
});

test('Lite mode reduces decorative effects without hiding calculator content', () => {
  assert.match(shell, /data-fc-lite-decorative="true"/);
  assert.match(shell, /fc-lite-mode-styles/);
  assert.match(shell, /animation:none!important/);
  assert.match(home, /data-fc-lite-decorative="true" loading="lazy"/);
  assert.doesNotMatch(shell, /html\[data-fc-lite-mode="on"\] body\s*\{[^}]*display\s*:\s*none/i);
});

test('Lite mode defers decorative image downloads and restores them when disabled', () => {
  assert.match(shell, /data-fc-lite-decorative="true"/);
  assert.match(shell, /setAttribute\('data-fc-lite-src',source\)/);
  assert.match(shell, /removeAttribute\('src'\)/);
  assert.match(shell, /setAttribute\('src',source\)/);
  assert.match(shell, /removeAttribute\('data-fc-lite-src'\)/);
});
