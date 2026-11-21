const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function loadCalculators() {
  const window = {};
  const document = { readyState: 'complete', querySelector() { return null; } };
  const context = { window, document, Number, Math, Intl };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/public-program-data.js'), 'utf8'), context);
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/public-program-calculators.js'), 'utf8'), context);
  return window.FCPublicProgramCalculators;
}

test('Québec GST/QST calculator applies 5% GST and 9.975% QST on the net amount', () => {
  const r = loadCalculators().gstQst({ amount: 100, mode: 'add' });
  assert.equal(r.gst, 5);
  assert.equal(r.qst, 9.98);
  assert.equal(r.total, 114.98);
  const reverse = loadCalculators().gstQst({ amount: 114.975, mode: 'remove' });
  assert.equal(reverse.net, 100);
});

test('Australia 2020–21 income tax applies resident brackets, LITO and LMITO', () => {
  const r = loadCalculators().australia2020({ taxableIncome: 50000 });
  assert.equal(r.baseTax, 6717);
  assert.equal(r.lito, 250);
  assert.equal(r.lmito, 1080);
  assert.equal(r.taxAfterOffsets, 5387);
  assert.equal(loadCalculators().australia2020({ taxableIncome: 18200 }).taxAfterOffsets, 0);
});

test('2026 RMD uses the IRS Table III divisor and rejects unsupported spouse exception', () => {
  const r = loadCalculators().rmd2026({ age: 75, priorYearEndBalance: 100000 });
  assert.equal(r.divisor, 24.6);
  assert.equal(r.rmd, 4065.04);
  assert.equal(loadCalculators().rmd2026({ age: 72, priorYearEndBalance: 50000 }).rmd, 0);
  assert.throws(() => loadCalculators().rmd2026({ age: 75, priorYearEndBalance: 100000, youngerSpouseSoleBeneficiary: true }), /Table II/);
});

test('California GSS II calculator reproduces supported historical categories only', () => {
  const calc = loadCalculators().californiaGss2;
  const base = { caAgi: 50000, wages: 50000, filedByDeadline: true, residentHalfYear: true, residentOnPaymentDate: true, canBeDependent: false };
  assert.equal(calc({ ...base, identifier: 'SSN', qualifiedGss1: false, claimedDependentCredit: true }).amount, 1100);
  assert.equal(calc({ ...base, identifier: 'SSN', qualifiedGss1: true, claimedDependentCredit: true }).amount, 500);
  assert.equal(calc({ ...base, identifier: 'ITIN', qualifiedGss1: true, claimedDependentCredit: true }).amount, 1000);
  assert.equal(calc({ ...base, identifier: 'SSN', qualifiedGss1: false, claimedDependentCredit: false }).amount, 600);
  assert.equal(calc({ ...base, identifier: 'SSN', qualifiedGss1: true, claimedDependentCredit: false }).eligible, false);
});

test('unemployment-rate statistic is unemployed divided by labor force', () => {
  const r = loadCalculators().unemploymentRate({ unemployed: 6, employed: 294 });
  assert.equal(r.laborForce, 300);
  assert.equal(r.rate, 2);
  assert.throws(() => loadCalculators().unemploymentRate({ unemployed: 0, employed: 0 }), /greater than zero/);
});

test('UK SDLT applies progressive ordinary residential bands and blocks unsupported cases', () => {
  const r = loadCalculators().sdlt2025({ price: 300000, completionDate: '2025-04-01', location: 'England' });
  assert.equal(r.tax, 5000);
  assert.equal(loadCalculators().sdlt2025({ price: 100000, completionDate: '2025-04-01', location: 'Northern Ireland' }).tax, 0);
  assert.throws(() => loadCalculators().sdlt2025({ price: 300000, completionDate: '2025-03-31', location: 'England' }), /on or after 1 April 2025/);
  assert.throws(() => loadCalculators().sdlt2025({ price: 300000, completionDate: '2025-04-01', location: 'Scotland' }), /Scotland and Wales/);
});

test('APY uses the exact PFRDA table entry and screens current new-enrolment conditions', () => {
  const calc = loadCalculators().apyContribution;
  const base = { age: 18, pension: 5000, frequency: 'monthly', indianCitizen: true, savingsAccount: true, incomeTaxPayer: false };
  assert.equal(calc(base).contribution, 210);
  assert.equal(calc({ ...base, age: 40, pension: 1000, frequency: 'monthly' }).contribution, 291);
  assert.equal(calc({ ...base, age: 18, pension: 5000, frequency: 'quarterly' }).contribution, 626);
  assert.equal(calc({ ...base, incomeTaxPayer: true }).eligible, false);
  assert.equal(calc({ ...base, age: 41 }).eligible, false);
});

test('APY page parses boolean select options and renders the prescribed amount', () => {
  const values = {
    age: { value: '18' }, pension: { value: '5000' }, frequency: { value: 'monthly' },
    indianCitizen: { value: 'true' }, savingsAccount: { value: 'true' }, incomeTaxPayer: { value: 'false' }
  };
  const result = { textContent: '' }, error = { textContent: '' }, listeners = {};
  const form = {
    dataset: { publicCalculator: 'apy' },
    querySelector(selector) { const name = selector.match(/\[name="([^"]+)"\]/)[1]; return values[name]; },
    addEventListener(name, fn) { listeners[name] = fn; }
  };
  const window = {};
  const document = {
    readyState: 'complete',
    querySelector() { return form; },
    getElementById(id) { return id === 'public-result' ? result : error; }
  };
  const context = { window, document, Number, Math, Intl };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/public-program-data.js'), 'utf8'), context);
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/public-program-calculators.js'), 'utf8'), context);
  listeners.submit({ preventDefault() {} });
  assert.match(result.textContent, /₹210/);
  assert.equal(error.textContent, '');
});

test('all new pages have canonical metadata, calculation explanation, official sources and scope notices', () => {
  const pages = [
    'gst-qst-calculator-canada.html',
    'income-tax-cuts-calculator-australia-2020-21.html',
    'rmd-calculator-required-minimum-distributions.html',
    'california-stimulus-check-ii-calculator.html',
    'unemployment-calculator-unemployment-rate.html',
    'uk-stamp-duty-land-tax-calculator.html',
    'atal-pension-yojana-calculator.html'
  ];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, 'calculators', page), 'utf8');
    assert.match(html, /<title>[^<]+<\/title>/, page);
    assert.match(html, /rel="canonical"/, page);
    assert.match(html, /Formula and step-by-step calculation/, page);
    assert.match(html, /checked against official sources/, page);
    assert.match(html, /<details>/, page);
    assert.match(html, /https?:\/\//, page);
  }
});
