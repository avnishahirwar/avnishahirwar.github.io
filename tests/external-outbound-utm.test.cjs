'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'site-shell.js'), 'utf8');
const marker = '/* External outbound referral attribution: preserve existing campaign parameters. */';
const trackingScript = source.slice(source.indexOf(marker));
assert.notEqual(source.indexOf(marker), -1, 'shared site shell must contain the outbound UTM module');

class FakeAnchor {
  constructor(href) { this._href = href; }
  getAttribute(name) { return name === 'href' ? this._href : null; }
  get href() { return this._href; }
  set href(value) { this._href = value; }
}
class FakeObserver {
  constructor(callback) { this.callback = callback; FakeObserver.instance = this; }
  observe() {}
  trigger(records) { this.callback(records); }
}
function createHarness(links, readyState = 'complete') {
  const listeners = {};
  const document = {
    readyState,
    documentElement: {},
    addEventListener(name, callback) { listeners[name] = callback; },
    querySelectorAll() { return links.filter(link => link.getAttribute('href') !== null); }
  };
  vm.runInNewContext(trackingScript, {
    document,
    HTMLAnchorElement: FakeAnchor,
    MutationObserver: FakeObserver,
    URL,
    // The module has no dependency on browser globals beyond these APIs.
  });
  return { document, listeners };
}

test('adds referral source and medium while preserving query strings and fragments', () => {
  const link = new FakeAnchor('https://partner.example/path?item=42#details');
  createHarness([link]);
  const url = new URL(link.href);
  assert.equal(url.searchParams.get('item'), '42');
  assert.equal(url.searchParams.get('utm_source'), 'friendlycalculator.in');
  assert.equal(url.searchParams.get('utm_medium'), 'referral');
  assert.equal(url.hash, '#details');
});

test('attributes uppercase HTTP and HTTPS schemes too', () => {
  const http = new FakeAnchor('HTTP://partner.example/path');
  const https = new FakeAnchor('HTTPS://partner.example/path');
  createHarness([http, https]);
  assert.equal(new URL(http.href).searchParams.get('utm_source'), 'friendlycalculator.in');
  assert.equal(new URL(https.href).searchParams.get('utm_medium'), 'referral');
});

test('leaves relative, internal, subdomain and non-HTTP links unchanged', () => {
  const links = [
    new FakeAnchor('/calculator/'),
    new FakeAnchor('https://friendlycalculator.in/about/'),
    new FakeAnchor('https://www.friendlycalculator.in/privacy/'),
    new FakeAnchor('http://blog.friendlycalculator.in/post'),
    new FakeAnchor('mailto:help@example.com')
  ];
  const before = links.map(link => link.href);
  createHarness(links);
  assert.deepEqual(links.map(link => link.href), before);
});

test('does not overwrite any existing campaign source or medium', () => {
  const withSource = new FakeAnchor('https://partner.example/?utm_source=existing&utm_medium=email&x=1');
  const withMedium = new FakeAnchor('https://partner.example/?utm_medium=campaign');
  createHarness([withSource, withMedium]);
  assert.equal(withSource.href, 'https://partner.example/?utm_source=existing&utm_medium=email&x=1');
  const mediumUrl = new URL(withMedium.href);
  assert.equal(mediumUrl.searchParams.get('utm_source'), 'friendlycalculator.in');
  assert.equal(mediumUrl.searchParams.get('utm_medium'), 'campaign');
});

test('waits for DOMContentLoaded and handles links inserted later', () => {
  const first = new FakeAnchor('https://first.example/');
  const { listeners } = createHarness([first], 'loading');
  assert.equal(new URL(first.href).searchParams.has('utm_source'), false);
  listeners.DOMContentLoaded();
  assert.equal(new URL(first.href).searchParams.get('utm_source'), 'friendlycalculator.in');

  const added = new FakeAnchor('https://late.example/?q=1');
  FakeObserver.instance.trigger([{ type: 'childList', addedNodes: [added] }]);
  const addedUrl = new URL(added.href);
  assert.equal(addedUrl.searchParams.get('utm_source'), 'friendlycalculator.in');
  assert.equal(addedUrl.searchParams.get('utm_medium'), 'referral');
  assert.equal(addedUrl.searchParams.get('q'), '1');
});
