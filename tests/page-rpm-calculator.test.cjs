const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const pagePath = path.join(root, 'calculators', 'page-rpm-calculator.html');
const page = fs.readFileSync(pagePath, 'utf8');

function createElement(value = '') {
  const listeners = {};
  const element = {
    value,
    hidden: false,
    style: {},
    innerHTML: '',
    textContent: '',
    attributes: {},
    selectedOptions: [{ dataset: { symbol: '₹' } }],
    addEventListener(type, callback) { listeners[type] = callback; },
    setAttribute(name, val) { this.attributes[name] = val; },
    removeAttribute(name) { delete this.attributes[name]; },
    dispatch(type, event = {}) {
      const callback = listeners[type];
      assert.ok(callback, 'expected a ' + type + ' listener');
      callback({ preventDefault() {}, ...event });
    }
  };
  Object.defineProperty(element, 'valueAsNumber', {
    get() { return element.value.trim() === '' ? NaN : Number(element.value); }
  });
  return element;
}

function bootCalculator() {
  const ids = {
    'rpm-form': createElement(),
    mode: createElement('rpm'),
    currency: createElement('INR'),
    output: createElement(),
    'earnings-field': createElement(),
    'views-field': createElement(),
    'rpm-field': createElement(),
    'target-field': createElement(),
    earnings: createElement('120'),
    pageviews: createElement('30000'),
    rpm: createElement('4'),
    target: createElement('1000')
  };
  const document = { getElementById(id) { return ids[id]; } };
  const script = page.match(/<script>\s*([\s\S]*?)<\/script>/);
  assert.ok(script, 'calculator implementation script must exist');
  vm.runInNewContext(script[1], { document, Intl, Number, Math });
  return ids;
}

test('Page RPM page has unique indexable metadata and useful methodology', () => {
  assert.match(page, /<title>Page RPM Calculator \| Friendly Calculator<\/title>/);
  assert.match(page, /<meta name="robots" content="index,follow/);
  assert.match(page, /<link rel="canonical" href="https:\/\/friendlycalculator\.in\/calculators\/page-rpm-calculator\.html">/);
  assert.match(page, /Page RPM = \(Estimated earnings ÷ Page views\) × 1,000/);
  assert.match(page, /https:\/\/support\.google\.com\/adsense\/answer\/112030\?hl=en/);
  assert.match(page, /Worked examples/);
  assert.match(page, /Frequently asked questions/);
  assert.match(page, /Methodology reviewed: 27 November 2026/);
});

test('calculator computes Page RPM, estimated revenue and required page views', () => {
  const ids = bootCalculator();

  ids['rpm-form'].dispatch('submit');
  assert.match(ids.output.innerHTML, /Page RPM: ₹4\.00 INR/);

  ids.mode.value = 'revenue';
  ids.mode.dispatch('change');
  assert.equal(ids['earnings-field'].hidden, true);
  assert.equal(ids['rpm-field'].hidden, false);
  ids['rpm-form'].dispatch('submit');
  assert.match(ids.output.innerHTML, /Estimated revenue: ₹120\.00 INR/);

  ids.mode.value = 'views';
  ids.mode.dispatch('change');
  assert.equal(ids['target-field'].hidden, false);
  ids['rpm-form'].dispatch('submit');
  assert.match(ids.output.innerHTML, /Required page views: 250[,. ]?000/);
});

test('calculator rejects zero, fractional and negative page-view or RPM inputs', () => {
  const ids = bootCalculator();
  ids.pageviews.value = '0';
  ids['rpm-form'].dispatch('submit');
  assert.match(ids.output.textContent, /Page views must be a whole number greater than zero/);
  assert.equal(ids.pageviews.attributes['aria-invalid'], 'true');

  ids.mode.value = 'revenue';
  ids.mode.dispatch('change');
  ids.pageviews.value = '10.5';
  ids['rpm-form'].dispatch('submit');
  assert.match(ids.output.textContent, /Page views must be a whole number greater than zero/);

  ids.pageviews.value = '100';
  ids.rpm.value = '-1';
  ids['rpm-form'].dispatch('submit');
  assert.match(ids.output.textContent, /Page RPM must be a valid non-negative number/);
});
