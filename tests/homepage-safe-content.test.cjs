'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('homepage highlights 16 safe, general-purpose calculators from the published catalogue', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const start = html.indexOf('<nav class="home-popular-tools"');
  const end = html.indexOf('</nav>', start);
  assert.ok(start >= 0 && end > start, 'popular calculator navigation exists');
  const section = html.slice(start, end);
  const routes = [...section.matchAll(/<a href="([^"]+)">/g)].map(match => match[1]);
  assert.equal(routes.length, 16);
  assert.equal(new Set(routes).size, 16);
  for (const route of routes) assert.ok(index.some(item => item.url === route), 'popular route exists in catalogue: ' + route);
  assert.match(section, /Compound Interest Calculator/);
  assert.match(section, /Simple Interest Calculator/);
});

test('language selector enables exactly the locale catalogue editions marked available', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'config/language-catalogue.json'), 'utf8'));
  const line = shell.match(/const supportedUiLocales=\{([^}]+)\};/);
  assert.ok(line, 'supported locale set exists');
  const enabled = [...line[1].matchAll(/([a-z]{2,3}):1/g)].map(match => match[1]).sort();
  const expected = catalogue.locales.filter(item => item.status === 'available').map(item => item.code).sort();
  assert.deepEqual(enabled, expected);
  assert.equal(enabled.length, 17);
});

test('homepage discloses the 17 published editions and the planned 50-language rollout', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const language of ['English', 'Hindi', 'German', 'Spanish', 'French', 'Portuguese', 'Arabic', 'Indonesian', 'Bengali', 'Tamil', 'Japanese', 'Russian', 'Marathi', 'Vietnamese', 'Telugu', 'Gujarati', 'Kannada']) {
    assert.ok(html.includes(language), 'Homepage should name the published language edition: ' + language);
  }
  assert.match(html, /17 language editions are currently published/);
  assert.match(html, /planned 50-language rollout is still in progress/);
  assert.match(html, /Coverage varies by language and page/);
});

test('homepage keeps its shared header and fallback footer entry point', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const footer = fs.readFileSync(path.join(root, 'assets/homepage-shell.js'), 'utf8');
  assert.match(html, /<header class="fc-global-header">/);
  assert.ok(html.includes('src="/assets/homepage-shell.js" defer'));
  assert.ok(footer.includes("document.createElement('footer')"));
  assert.ok(footer.includes("footer.className = 'fc-global-footer'"));
  assert.ok(footer.includes("['Sitemap', '/sitemap.html']"));
});
