const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/adsense-curate.js'), 'utf8');

function makeMeta(name, content) {
  const attributes = { name, content };
  return {
    getAttribute(key) { return attributes[key] ?? null; },
    setAttribute(key, value) { attributes[key] = String(value); },
    attributes
  };
}

function runPolicy(pathname, initialMetas = []) {
  const metas = [...initialMetas];
  const document = {
    head: { appendChild(meta) { metas.push(meta); } },
    querySelectorAll(selector) {
      assert.match(selector, /name="robots" i/);
      assert.match(selector, /name="googlebot" i/);
      assert.match(selector, /name="bingbot" i/);
      const allowed = new Set(['robots', 'googlebot', 'bingbot']);
      return metas.filter(meta => allowed.has(String(meta.getAttribute('name') || '').toLowerCase()));
    },
    createElement(tag) {
      assert.equal(tag, 'meta');
      return makeMeta('', '');
    }
  };
  vm.runInNewContext(source, { window: { location: { pathname } }, document }, { timeout: 1000 });
  return metas;
}

test('allowlisted calculator overrides static noindex and standalone none', () => {
  const robots = makeMeta('ROBOTS', 'noindex,none,max-image-preview:none');
  const metas = runPolicy('/calculators/gst-calculator.html', [robots]);
  assert.equal(metas.length, 1);
  assert.equal(robots.getAttribute('content'), 'index,follow,max-image-preview:none');
});

test('non-allowlisted substantive page preserves explicit static indexability', () => {
  const robots = makeMeta('robots', 'index,follow,max-image-preview:large');
  const metas = runPolicy('/calculators/activation-energy-calculator.html', [robots]);
  assert.equal(metas.length, 1);
  assert.equal(robots.getAttribute('content'), 'index,follow,max-image-preview:large');
});

test('non-allowlisted page with static noindex remains noindex', () => {
  const robots = makeMeta('robots', 'noindex,follow');
  const metas = runPolicy('/calculators/obscure-calculator.html', [robots]);
  assert.equal(metas.length, 1);
  assert.equal(robots.getAttribute('content'), 'noindex,follow');
});

test('non-allowlisted page with no generic robots tag receives generic noindex', () => {
  const bingbot = makeMeta('BINGBOT', 'index,follow');
  const metas = runPolicy('/calculators/obscure-calculator.html', [bingbot]);
  const generic = metas.find(meta => String(meta.getAttribute('name')).toLowerCase() === 'robots');
  assert.ok(generic, 'A generic robots meta tag must always exist');
  assert.equal(generic.getAttribute('content'), 'noindex,follow');
  assert.equal(bingbot.getAttribute('content'), 'noindex,follow');
});

test('crawler-specific directives are normalized while unrelated directives survive', () => {
  const robots = makeMeta('robots', 'noindex,nofollow,max-snippet:-1,max-image-preview:large');
  const googlebot = makeMeta('GoogleBot', 'noindex,none,max-video-preview:-1');
  const metas = runPolicy('/calculators/loan-emi-calculator.html', [robots, googlebot]);
  assert.equal(metas.length, 2);
  assert.equal(robots.getAttribute('content'), 'index,follow,max-snippet:-1,max-image-preview:large');
  assert.equal(googlebot.getAttribute('content'), 'index,follow,max-video-preview:-1');
});

test('non-calculator and localized calculator routes remain untouched', () => {
  for (const route of ['/calculator/finance-calculators.html', '/hi/calculators/gst-calculator.html', '/']) {
    const existing = makeMeta('robots', 'noindex,follow');
    const metas = runPolicy(route, [existing]);
    assert.equal(metas.length, 1);
    assert.equal(existing.getAttribute('content'), 'noindex,follow');
  }
});
