'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'site-shell.js'), 'utf8');
const marker = '/* Outbound UTM attribution for external links.';
const start = source.indexOf(marker);
const end = source.lastIndexOf(String.fromCharCode(10) + '})();');
assert.notEqual(start, -1, 'shared site shell must contain the outbound UTM module');
assert.ok(end > start, 'outbound UTM module must remain inside the shared site shell');
const trackingScript = source.slice(start, end);

class FakeAnchor {
  constructor(href, options = {}) {
    this._href = href;
    this.dataset = {};
    this.nodeType = 1;
    this.download = Boolean(options.download);
    this.children = options.children || [];
  }
  getAttribute(name) { return name === 'href' ? this._href : null; }
  get href() { return this._href; }
  setAttribute(name, value) { if (name === 'href') this._href = value; }
  hasAttribute(name) { return name === 'download' && this.download; }
  matches(selector) { return selector === 'a[href]' && Boolean(this._href); }
  querySelectorAll(selector) { return selector === 'a[href]' ? this.children : []; }
}
class FakeObserver {
  constructor(callback) { this.callback = callback; FakeObserver.instance = this; }
  observe(target, options) { this.target = target; this.options = options; }
  trigger(records) { this.callback(records); }
}
function createHarness(links, readyState = 'complete', production = true) {
  const listeners = {};
  const events = [];
  const document = {
    readyState,
    documentElement: {},
    addEventListener(name, callback) { listeners[name] = callback; },
    querySelectorAll(selector) { return selector === 'a[href]' ? links : []; }
  };
  const window = { gtag: (...args) => events.push(args) };
  FakeObserver.instance = null;
  vm.runInNewContext(trackingScript, {
    document,
    window,
    location: { href: 'https://friendlycalculator.in/', hostname: 'friendlycalculator.in' },
    URL,
    MutationObserver: FakeObserver,
    isProductionAnalyticsHost: production
  });
  return { document, listeners, events };
}

test('adds source and medium while preserving query strings and fragments', () => {
  const link = new FakeAnchor('https://partner.example/path?item=42#details');
  createHarness([link]);
  const url = new URL(link.href);
  assert.equal(url.searchParams.get('item'), '42');
  assert.equal(url.searchParams.get('utm_source'), 'friendlycalculator.in');
  assert.equal(url.searchParams.get('utm_medium'), 'referral');
  assert.equal(url.hash, '#details');
});

test('leaves relative, Friendly Calculator domains, mailto and downloads unchanged', () => {
  const links = [
    new FakeAnchor('/calculator/'),
    new FakeAnchor('https://friendlycalculator.in/about/'),
    new FakeAnchor('https://www.friendlycalculator.in/privacy/'),
    new FakeAnchor('http://blog.friendlycalculator.in/post'),
    new FakeAnchor('mailto:help@example.com'),
    new FakeAnchor('https://partner.example/file.pdf', { download: true })
  ];
  const before = links.map(link => link.getAttribute('href'));
  createHarness(links);
  assert.deepEqual(links.map(link => link.getAttribute('href')), before);
});

test('preserves existing UTM values and fills only missing fields', () => {
  const both = new FakeAnchor('https://partner.example/?utm_source=existing&utm_medium=email&x=1');
  const sourceOnly = new FakeAnchor('https://partner.example/?utm_source=partner');
  const mediumOnly = new FakeAnchor('https://partner.example/?utm_medium=campaign');
  createHarness([both, sourceOnly, mediumOnly]);
  assert.equal(new URL(both.href).searchParams.get('utm_source'), 'existing');
  assert.equal(new URL(both.href).searchParams.get('utm_medium'), 'email');
  assert.equal(new URL(sourceOnly.href).searchParams.get('utm_source'), 'partner');
  assert.equal(new URL(sourceOnly.href).searchParams.get('utm_medium'), 'referral');
  assert.equal(new URL(mediumOnly.href).searchParams.get('utm_source'), 'friendlycalculator.in');
  assert.equal(new URL(mediumOnly.href).searchParams.get('utm_medium'), 'campaign');
});

test('waits for DOMContentLoaded and tags dynamically inserted links', () => {
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

test('records outbound click domain only without sending query values', () => {
  const link = new FakeAnchor('https://partner.example/?customer_ref=private-value');
  const { listeners, events } = createHarness([link]);
  listeners.click({ target: { closest: () => link } });
  assert.equal(events.length, 1);
  assert.equal(events[0][0], 'event');
  assert.equal(events[0][1], 'outbound_click');
  assert.deepEqual({ ...events[0][2] }, { link_domain: 'partner.example', outbound: true });
  assert.equal('link_url' in events[0][2], false);
});

test('does not modify preview or non-production pages', () => {
  const link = new FakeAnchor('https://partner.example/');
  const before = link.href;
  createHarness([link], 'complete', false);
  assert.equal(link.href, before);
});
