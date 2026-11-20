const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const read = file => fs.readFileSync(new URL('../' + file, 'file://' + __filename), 'utf8');

class Element {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.style = {};
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  querySelector(selector) {
    if (selector === 'span') return this.children[0];
    if (selector === 'strong') return this.children[1];
    return null;
  }
}

function runRuralTool(key, values) {
  const source = read('assets/rural-tools.js');
  const root = new Element();
  root.dataset.ruralTool = key;
  const form = new Element();
  const output = new Element();
  const chart = new Element();
  const sliderHost = new Element();
  const fields = new Map(Object.entries(values).map(([id, value]) => [id, { value: String(value), addEventListener() {} }]));
  const document = {
    documentElement: { lang: 'en' },
    querySelector: () => root,
    getElementById(id) {
      return ({
        ruralForm: form,
        ruralResult: output,
        ruralChart: chart,
        scenarioHost: sliderHost
      })[id] || fields.get(id) || null;
    },
    createElement: () => new Element()
  };
  vm.runInNewContext(source, {
    document,
    location: { pathname: '/calculators/' + key + '.html' },
    window: { print() {} },
    navigator: { clipboard: { writeText: async () => {} } },
    Number, Math, Intl, Date, Object, String, URL
  }, { timeout: 1000 });
  return output.children.map(card => ({
    label: card.children[0].textContent,
    value: card.children[1].textContent
  }));
}

test('Crop Yield & Sale Value uses its existing canonical page and calculates net sale proceeds', () => {
  const html = read('calculators/crop-yield-sale-value-calculator.html');
  assert.match(html, /data-rural-tool="crop-yield-value"/);
  assert.match(html, /rel="canonical" href="https:\/\/friendlycalculator\.in\/calculators\/crop-yield-sale-value-calculator\.html"/);
  assert.match(html, /Agriculture and Farmers Welfare resources/);
  const rows = runRuralTool('crop-yield-value', {
    acres: 2, yieldPerAcre: 18, price: 2200, transport: 2500, market: 1000
  });
  const result = Object.fromEntries(rows.map(row => [row.label, row.value]));
  assert.match(result['Total harvested quantity'], /36/);
  assert.match(result['Gross sale value'], /79,200/);
  assert.match(result['Estimated net sale proceeds'], /75,700/);
});

test('Livestock Cost & Profit uses the existing full operating-cost model', () => {
  const html = read('calculators/livestock-cost-profit-calculator.html');
  assert.match(html, /data-rural-tool="livestock-profit"/);
  assert.match(html, /Department of Animal Husbandry and Dairying/);
  const rows = runRuralTool('livestock-profit', {
    animals: 4, milk: 8, price: 40, days: 30,
    feed: 150, vet: 1500, labour: 3000, other: 1000
  });
  const result = Object.fromEntries(rows.map(row => [row.label, row.value]));
  assert.match(result['Estimated milk output'], /960/);
  assert.match(result['Gross milk revenue'], /38,400/);
  assert.match(result['Total operating cost'], /23,500/);
  assert.match(result['Estimated net operating surplus'], /14,900/);
});

test('Rent vs Buy Home keeps the more complete amortization and remaining-balance model', () => {
  const html = read('calculators/rent-vs-buy-home-calculator.html');
  const js = read('assets/extra-calculators.js');
  assert.match(html, /data-calc="rent-vs-buy-home-calculator"/);
  assert.match(html, /id="formula"/);
  assert.match(html, /id="worked-example"/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(js, /case'rentbuy':/);
  assert.match(js, /loanMonths=Math\.round\(v\.tenure\*12\)/);
  assert.match(js, /Estimated remaining home-loan balance/);
  assert.match(js, /const equity=v\.resale-remaining/);
});

test('Agriculture hub and all-calculator directory link to the existing canonical tools', () => {
  const hub = read('calculator/agriculture-calculators.html');
  const directory = read('calculator/site-directory.html');
  for (const slug of [
    'crop-cost-profit-calculator.html',
    'crop-yield-sale-value-calculator.html',
    'livestock-cost-profit-calculator.html',
    'kcc-interest-calculator.html'
  ]) {
    assert.ok(hub.includes('/calculators/' + slug), 'Agriculture hub is missing ' + slug);
  }
  assert.ok(directory.includes('/calculators/crop-yield-sale-value-calculator.html'));
  assert.ok(directory.includes('/calculators/livestock-cost-profit-calculator.html'));
  assert.ok(directory.includes('/calculators/rent-vs-buy-home-calculator.html'));
});
