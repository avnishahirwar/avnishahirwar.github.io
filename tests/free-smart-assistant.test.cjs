const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const assistant = fs.readFileSync('assets/friendly-ai-assistant.js', 'utf8');
const shell = fs.readFileSync('assets/site-shell.js', 'utf8');

test('free assistant is loaded by the shared site shell', () => {
  assert.match(shell, /friendly-ai-assistant\.js/);
  assert.match(shell, /data-fc-free-assistant/);
});

test('assistant uses the same-origin sitemap and local matching only', () => {
  assert.match(assistant, /fetch\('\/sitemap\.xml'/);
  assert.match(assistant, /const aliases=/);
  assert.match(assistant, /const search=async query/);
  assert.doesNotMatch(assistant, /api\.openai\.com|generativelanguage\.googleapis\.com|api\.anthropic\.com/);
});

test('assistant does not persist visitor prompts or request credentials', () => {
  assert.doesNotMatch(assistant, /localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(assistant, /Authorization|Bearer\s|api[_-]?key/i);
});

test('assistant exposes accessible controls and safe text rendering', () => {
  assert.match(assistant, /aria-expanded/);
  assert.match(assistant, /aria-hidden/);
  assert.match(assistant, /aria-live/);
  assert.match(assistant, /textContent\s*=/);
  assert.match(assistant, /addEventListener\('keydown'/);
});
