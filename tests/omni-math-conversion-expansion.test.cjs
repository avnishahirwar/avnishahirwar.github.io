const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const cases = [
  { slug: 'doubling-time-calculator', values: { initial: '100', final: '200', elapsed: '8', unit: 'days' }, expected: /8 days/ },
  { slug: 'absolute-value-calculator', values: { number: '-18.5' }, expected: /18\.5/ },
  { slug: 'addition-calculator', values: { numbers: '125, 250, 375' }, expected: /750/ },
  { slug: 'proportion-calculator', values: { a: '2', b: '5', c: '8' }, expected: /20/ },
  { slug: 'temperature-conversion-calculator', values: { amount: '25', from: 'C', to: 'F' }, expected: /77 °F/ },
  { slug: 'length-converter', values: { amount: '1', from: 'm', to: 'ft' }, expected: /3\.28084 ft/ },
  { slug: 'weight-converter', values: { amount: '1', from: 'kg', to: 'lb' }, expected: /2\.20462262 lb/ },
  { slug: 'time-unit-converter', values: { amount: '48', from: 'h', to: 'd' }, expected: /2 d/ },
  { slug: 'area-converter', values: { amount: '1', from: 'ha', to: 'acre' }, expected: /2\.47105/ },
  { slug: 'volume-converter', values: { amount: '1', from: 'L', to: 'gal' }, expected: /0\.264171/ }
];

function executeCalculator(slug, values) {
  const html = fs.readFileSync(path.join(root, 'calculators', slug + '.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script, slug + ' must contain a browser-side calculator script');
  const elements = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, { value }]));
  elements.result = { textContent: '' };
  elements.status = { textContent: '' };
  let submit;
  elements.calcForm = {
    addEventListener(name, callback) { if (name === 'submit') submit = callback; },
    requestSubmit() { submit({ preventDefault() {} }); }
  };
  vm.runInNewContext(script[1], {
    document: { getElementById(id) { return elements[id] || (elements[id] = { value: '' }); } },
    Intl, Math, Number
  }, { timeout: 1000 });
  return { result: elements.result.textContent, status: elements.status.textContent };
}

test('ten new safe Omni-inspired math and conversion calculators are indexed and discoverable', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  assert.equal(index.length, 333);
  for (const item of cases) {
    const url = '/calculators/' + item.slug + '.html';
    const html = fs.readFileSync(path.join(root, url.slice(1)), 'utf8');
    assert.ok(index.some(entry => entry.url === url), 'Search index missing ' + url);
    assert.ok(directory.includes('href="' + url + '"'), 'Directory missing ' + url);
    assert.ok(about.includes('href="' + url + '"'), 'About catalogue missing ' + url);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /"@type":"SoftwareApplication"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /<section class="panel"><h2>Formula<\/h2>/);
    assert.match(html, /<section class="panel faq">/);
  }
  assert.match(directory, /Showing all 333 calculators in 20 categories/);
  assert.match(about, /333 public calculators/);
});

test('all ten calculator scripts execute and return representative expected results', () => {
  for (const item of cases) {
    const result = executeCalculator(item.slug, item.values);
    assert.match(result.result, item.expected, item.slug + ' returned ' + result.result);
    assert.match(result.status, /complete/i);
  }
});

test('conversion calculators enforce physical and input boundaries', () => {
  const temperature = executeCalculator('temperature-conversion-calculator', { amount: '-300', from: 'C', to: 'K' });
  assert.equal(temperature.result, '—');
  assert.match(temperature.status, /absolute zero/i);
  const proportion = executeCalculator('proportion-calculator', { a: '0', b: '5', c: '8' });
  assert.equal(proportion.result, '—');
  assert.match(proportion.status, /must not be zero/i);
});
