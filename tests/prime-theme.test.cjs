const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'assets/prime-theme.css'), 'utf8');
const directoryBuilder = fs.readFileSync(path.join(root, 'scripts/build-site-directory.cjs'), 'utf8');
const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');

test('shared shell loads the unified Prime theme stylesheet', () => {
  assert.match(shell, /data-fc-prime-theme/);
  assert.match(shell, /\/assets\/prime-theme\.css/);
});

test('Prime theme keeps main hero copy readable and nested light cards intact', () => {
  assert.match(theme, /--fc-brand-navy:#101c2c/);
  assert.match(theme, /--fc-brand-gold:#d8bd82/);
  assert.ok(theme.includes('.hero > :is(h1,h2,h3,strong)'));
  assert.ok(theme.includes('.hero > p'));
  assert.ok(theme.includes(':not(.card)'));
  assert.ok(theme.includes('body :where(.hero,.page-hero,.fc-hero,.hero-section,.directory-hero) .card a{color:var(--fc-link)}'));
  assert.ok(theme.includes('body :where(h1,h2,h3,h4){color:var(--fc-text)'));
});

test('Prime theme preserves responsive and reduced-motion behavior', () => {
  assert.match(theme, /@media\(max-width:700px\)/);
  assert.match(theme, /prefers-reduced-motion:reduce/);
});

test('directory builder and published HTML include the measured LCP hero image preload', () => {
  const preload = '<link rel="preload" as="image" href="/assets/friendly-calculator-brand-illustration.svg" type="image/svg+xml" fetchpriority="high">';
  const head = directory.slice(0, directory.indexOf('</head>'));
  assert.ok(directoryBuilder.includes(preload));
  assert.ok(head.includes(preload));
  const imageTag = directory.match(/<img[^>]*friendly-calculator-brand-illustration\.svg[^>]*>/);
  assert.ok(imageTag, 'directory hero illustration should be present');
  assert.match(imageTag[0], /fetchpriority="high"/);
  assert.match(imageTag[0], /loading="eager"/);
  assert.match(imageTag[0], /decoding="async"/);
});
