'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('shared public shell does not load analytics or tag-manager scripts by default', () => {
  const shell = read('assets/site-shell.js');
  assert.doesNotMatch(shell, /googletagmanager\.com|G-QVWQSEDRGL|GTM-MGJQH4DB/);
});

test('homepage, terms and contact pages contain no direct GA4 loader', () => {
  for (const file of ['index.html', 'calculator/terms.html', 'calculator/contact.html']) {
    assert.doesNotMatch(read(file), /googletagmanager\.com|G-QVWQSEDRGL/);
  }
});

test('contact page does not embed a third-party form or collect form fields', () => {
  const contact = read('calculator/contact.html');
  assert.doesNotMatch(contact, /hsforms\.net|hs-form-frame|<form\b/i);
  assert.match(contact, /Optional email support/);
});

test('AdSense loader remains disabled until a verified CMP signal is present', () => {
  const gate = read('assets/adsense-domain-gate.js');
  assert.match(gate, /dataset\.fcCmpReady === 'true'/);
  assert.match(gate, /typeof window\.__tcfapi === 'function' \|\| !!window\.googlefc/);
  assert.match(gate, /window\.__fcPrivacyConsent && window\.__fcPrivacyConsent\.ads === true/);
  assert.match(gate, /if \(!consentPlatformVerified \|\| !consentApiAvailable \|\| !visitorOptedInToAds\) return/);
});

test('accessibility settings provide persistent text size, contrast and motion controls', () => {
  const shell = read('assets/site-shell.js');
  const css = read('assets/site-shell.css');
  for (const feature of ['fc-display-size', 'fc-display-contrast', 'fc-display-motion', 'textSizeHeading', 'highContrast', 'reduceMotion']) {
    assert.ok(shell.includes(feature), 'Missing accessibility feature: ' + feature);
  }
  assert.match(css, /data-fc-text-size="large"/);
  assert.match(css, /data-fc-contrast="high"/);
  assert.match(css, /fc-reduce-motion/);
  assert.doesNotMatch(shell, /removeItem\('fc-display-(?:size|contrast|motion)'\)/);
});

test('PWA manifest and service worker support installed, device-local public use without caching private routes', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  const worker = read('sw.js');
  assert.equal(manifest.display, 'standalone');
  assert.match(worker, /isPrivatePath/);
  assert.match(worker, /url\.origin !== self\.location\.origin/);
  assert.match(worker, /url\.search \|\| url\.hash/);
});

test('public HTML contains no executable or HTML-data link schemes', () => {
  const htmlFiles = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(full);
    }
  };
  walk(root);
  const unsafe = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    if (/(?:href|src|action)\\s*=\\s*["']\\s*(?:javascript:|vbscript:|data:text\\/html)/i.test(html)) {
      unsafe.push(path.relative(root, file));
    }
  }
  assert.deepEqual(unsafe, [], 'Remove executable or HTML-data URLs from public HTML: ' + unsafe.join(', '));
});

test('privacy and cookie policies explain browser-local inputs and infrastructure caveats', () => {
  const privacy = read('calculator/privacy.html');
  const cookies = read('calculator/cookies.html');
  assert.match(privacy, /calculator inputs and calculations are processed in the browser/);
  assert.match(privacy, /query strings and calculator input values are deliberately excluded/);
  assert.match(privacy, /IP address, request time/);
  assert.match(cookies, /disabled by default/);
});
