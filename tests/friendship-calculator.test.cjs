const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'calculators/friendship-calculator.html'), 'utf8');

test('Friendship Calculator has crawlable metadata and shared site navigation', () => {
  assert.ok(html.includes('<title>Friendship Calculator'));
  assert.ok(html.includes('rel="canonical" href="https://friendlycalculator.in/calculators/friendship-calculator.html"'));
  assert.ok(html.includes('name="description"'));
  assert.ok(html.includes('application/ld+json'));
  assert.ok(html.includes('/calculator/site-directory.html'));
  assert.ok(html.includes('/assets/site-shell.js'));
});

test('Friendship Calculator validates two names and presents the entertainment-only disclaimer', () => {
  assert.ok(html.includes('id="friendOne"'));
  assert.ok(html.includes('id="friendTwo"'));
  assert.ok(html.includes('maxlength="40"'));
  assert.ok(html.includes('Just for fun'));
  assert.ok(html.includes('not scientific'));
  assert.ok(html.includes('does not assess your relationship'));
});

test('Friendship score is repeatable, symmetric and calculated locally without submitting names', () => {
  assert.ok(html.includes('function scoreFor(a,b)'));
  assert.ok(html.includes('.sort().join'));
  assert.ok(html.includes('Math.imul(hash,16777619)'));
  assert.ok(html.includes('scoreFor(a,b)'));
  assert.ok(!html.includes('fetch('));
  assert.ok(!html.includes('XMLHttpRequest'));
  assert.ok(!html.includes('localStorage'));
});

test('Friendship Calculator exposes accessible result and copy feedback', () => {
  assert.ok(html.includes('aria-live="polite"'));
  assert.ok(html.includes('id="shareResult"'));
  assert.ok(html.includes('id="copyStatus"'));
  assert.ok(html.includes('role="status"'));
});
