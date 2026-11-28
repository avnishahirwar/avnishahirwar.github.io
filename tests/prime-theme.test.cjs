const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'assets/prime-theme.css'), 'utf8');

test('shared shell loads the unified Prime theme stylesheet', () => {
  assert.match(shell, /data-fc-prime-theme/);
  assert.match(shell, /\/assets\/prime-theme\.css/);
});

test('Prime theme defines the shared brand tokens and readable dark hero headings', () => {
  assert.match(theme, /--fc-brand-navy:#101c2c/);
  assert.match(theme, /--fc-brand-gold:#d8bd82/);
  assert.match(theme, /\.hero[\s\S]*h1,h2,h3,strong\)\{color:#fff!important\}/);
});

test('Prime theme preserves responsive and reduced-motion behavior', () => {
  assert.match(theme, /@media\(max-width:700px\)/);
  assert.match(theme, /prefers-reduced-motion:reduce/);
});
