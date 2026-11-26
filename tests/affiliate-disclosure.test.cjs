const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('affiliate disclosure is public, indexable and canonical', () => {
  const html = fs.readFileSync(path.join(ROOT, 'affiliate-disclosure.html'), 'utf8');
  assert.match(html, /<meta name="robots" content="index,follow">/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/friendlycalculator\.in\/affiliate-disclosure\.html">/i);
  assert.match(html, /Current status:/);
  assert.match(html, /Affiliate recommendations are not activated/i);
});

test('shared footer links to the affiliate disclosure', () => {
  const shell = fs.readFileSync(path.join(ROOT, 'assets/site-shell.js'), 'utf8');
  assert.match(shell, /\['Affiliate Disclosure','\/affiliate-disclosure\.html'\]/);
});

test('disclosure does not invent a partner, tracking ID or affiliate destination', () => {
  const html = fs.readFileSync(path.join(ROOT, 'affiliate-disclosure.html'), 'utf8');
  assert.doesNotMatch(html, /YOUR_AFFILIATE_LINK_HERE|amazon\.in\/|tag=[A-Za-z0-9-]+/i);
  assert.match(html, /Partner-specific wording will be added only after/i);
});
