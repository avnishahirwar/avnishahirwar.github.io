'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const T = require('../assets/home-top20.js');
const root = path.resolve(__dirname, '..');
const close = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, a + ' vs ' + b);
const byId = id => T.CALCS.find(c => c.id === id);
const defaults = c => Object.fromEntries(c.fields.map(f => [f.k, f.type === 'date' ? (f.today ? '2026-11-25' : f.v) : (f.type === 'select' && !isNaN(Number(f.v)) ? Number(f.v) : f.v)]));

test('there are exactly 20 distinct calculators, each linking to an existing full page', () => {
  assert.equal(T.CALCS.length, 20);
  assert.equal(new Set(T.CALCS.map(c => c.id)).size, 20);
  for (const c of T.CALCS) assert.ok(fs.existsSync(path.join(root, c.url.slice(1))), c.url + ' must exist');
});

test('every calculator returns finite, non-error results with its default inputs', () => {
  for (const c of T.CALCS) {
    const r = c.calc(defaults(c));
    assert.ok(!r.error, c.id + ': ' + r.error);
    assert.ok(r.rows.length >= 2 && r.rows.every(row => row[1] && !/NaN|Infinity/.test(row[1])), c.id + ' has a bad result row');
  }
});

test('EMI matches the standard formula (₹10 lakh, 8.5%, 20 years = ₹8,678.23)', () => {
  close(T.emi(1000000, 8.5, 20), 8678.23);
  close(T.emi(120000, 0, 1), 10000);
});

test('SIP future value uses start-of-month instalments (₹5,000, 12%, 10 years)', () => {
  close(T.sipFV(5000, 12, 10), 1161695.38, 1);
  close(T.sipFV(1000, 0, 1), 12000);
});

test('RD maturity matches the closed-form quarterly-compounding formula', () => {
  const m = 5000, rate = 6.5, months = 60, i = rate / 400, n = months / 3;
  const closed = m * (Math.pow(1 + i, n) - 1) / (1 - Math.pow(1 + i, -1 / 3));
  close(T.rdMaturity(m, rate, months), closed, 0.5);
});

test('PPF 15-year maturity for the maximum deposit at 7.1%', () => {
  let bal = 0; for (let y = 0; y < 15; y++) bal = (bal + 150000) * 1.071;
  close(T.ppfMaturity(150000, 7.1, 15), bal, 0.01);
  assert.ok(byId('ppf').calc({dep: 200000, rate: 7.1, years: 15}).error);
  assert.ok(byId('ppf').calc({dep: 100000, rate: 7.1, years: 10}).error);
});

test('FD, lumpsum, simple and compound interest agree with hand calculations', () => {
  const fd = byId('fd').calc({P: 100000, rate: 8, years: 1});
  close(Number(fd.rows[0][1].replace(/[₹,]/g, '')), 108243.22, 0.01);
  assert.equal(byId('si').calc({P: 100000, rate: 8, years: 3}).rows[0][1], '₹24,000');
  assert.equal(byId('ci').calc({P: 100000, rate: 10, years: 2, n: 1}).rows[0][1], '₹21,000');
  assert.equal(byId('lumpsum').calc({P: 100000, rate: 10, years: 2}).rows[0][1], '₹1,21,000');
});

test('GST adds and removes tax correctly', () => {
  assert.equal(byId('gst').calc({amt: 10000, rate: 18, mode: 'excl'}).rows[0][1], '₹1,800');
  assert.equal(byId('gst').calc({amt: 11800, rate: 18, mode: 'incl'}).rows[0][1], '₹1,800');
});

test('income tax follows the Tax Year 2026-27 new-regime logic used by the full calculator', () => {
  assert.equal(T.newRegimeTax(1275000).total, 0, '₹12.75 lakh salary gets full rebate (taxable ₹12 lakh)');
  const t = T.newRegimeTax(1500000); // taxable 14,25,000: 20,000 + 40,000 + 15% of 2,25,000
  close(t.taxable, 1425000);
  close(t.before, 93750);
  close(t.rebate, 0, 0.001);
  close(t.total, 97500);
  assert.ok(byId('tax').calc({gross: 6000000}).error, 'surcharge range is redirected to the full calculator');
  const high = T.newRegimeTax(3000000);
  close(high.before, 400000 * .05 + 400000 * .10 + 400000 * .15 + 400000 * .20 + 400000 * .25 + (3000000 - 75000 - 2400000) * .30);
});

test('HRA exemption is the least of the three statutory limbs', () => {
  assert.equal(T.hraExemption(50000, 20000, 18000, true), 13000);
  assert.equal(T.hraExemption(50000, 10000, 18000, true), 10000);
  assert.equal(T.hraExemption(50000, 20000, 18000, false), 13000);
  assert.equal(T.hraExemption(50000, 20000, 4000, true), 0);
});

test('gratuity uses wages × 15 ÷ 26 × completed years and needs five years', () => {
  assert.equal(byId('gratuity').calc({salary: 26000, years: 10}).rows[0][1], '₹1,50,000');
  assert.ok(byId('gratuity').calc({salary: 26000, years: 4}).error);
});

test('percentage, CAGR, BMI, discount and hike calculators', () => {
  assert.equal(byId('percentage').calc({a: 20, b: 500}).rows[0][1], '100');
  assert.equal(byId('cagr').calc({start: 100, end: 200, years: 1}).rows[0][1], '100%');
  assert.equal(byId('bmi').calc({w: 70, h: 175}).rows[1][1], 'Normal weight');
  assert.equal(byId('bmi').calc({w: 100, h: 170}).rows[1][1], 'Obese');
  assert.equal(byId('discount').calc({price: 2000, off: 25}).rows[0][1], '₹1,500');
  assert.equal(byId('hike').calc({cur: 50000, pct: 10}).rows[0][1], '₹55,000');
});

test('age calculation handles month borrow and leap years', () => {
  const p = T.ageParts(new Date('1995-06-15T00:00:00'), new Date('2026-11-25T00:00:00'));
  assert.deepEqual(p, {years: 31, months: 5, days: 10});
  const q = T.ageParts(new Date('2000-02-29T00:00:00'), new Date('2001-03-01T00:00:00'));
  assert.equal(q.years, 1);
  assert.ok(byId('age').calc({dob: '2030-01-01', asof: '2026-01-01'}).error);
});

test('SWP and loan eligibility', () => {
  const s = T.swp(1000000, 10000, 0, 5);
  close(s.balance, 400000, 0.01); close(s.withdrawn, 600000, 0.01);
  const dead = T.swp(100000, 50000, 0, 10);
  assert.equal(dead.balance, 0);
  const e = T.eligibility(100000, 10000, 8.5, 20, 50);
  close(e.maxEmi, 40000);
  close(e.loan, 40000 * (1 - Math.pow(1 + 8.5 / 1200, -240)) / (8.5 / 1200), 0.5);
});


test('homepage widget reads an already-initialized locale preference, not only future locale events', () => {
  const source = fs.readFileSync(path.join(root, 'assets/home-top20.js'), 'utf8');
  const listeners = source.indexOf("window.addEventListener('fc:locale-ready', loadDisplayCurrency);");
  const initialRead = source.indexOf('loadDisplayCurrency();', listeners);
  assert.ok(listeners >= 0 && initialRead > listeners, 'the widget must read FCLocale after registering listeners because site-shell injects global-locale.js dynamically');
});

test('currency display converts INR-based homepage calculator amounts without changing formula inputs', () => {
  assert.deepEqual(T.getDisplayCurrency(), {currency: 'INR', rate: 1, locale: 'en-IN'});
  assert.equal(T.configureDisplayCurrency('USD', 0.012, 'en-US'), true);
  const sip = byId('sip').calc({m: 10000, rate: 12, years: 10});
  assert.match(sip.rows[0][1], /^\$/);
  assert.equal(T.formatCurrencyText('Monthly investment (₹)'), 'Monthly investment ($)');
  assert.equal(T.formatCurrencyText('Investment limit ₹1,00,000'), 'Investment limit $1,200');
  close(Number(sip.rows[0][1].replace(/[$,]/g, '')), T.sipFV(10000, 12, 10) * 0.012, 0.02);
  assert.equal(T.configureDisplayCurrency('INR', 1, 'en-IN'), true);
  assert.match(byId('sip').calc({m: 10000, rate: 12, years: 10}).rows[0][1], /^₹/);
});

test('homepage currency inputs are marked for display conversion while non-currency inputs remain unchanged', () => {
  for (const calculator of T.CALCS) {
    for (const field of calculator.fields) {
      if (String(field.label).includes('₹')) assert.equal(field.currency, true, calculator.id + ':' + field.k);
      else assert.notEqual(field.currency, true, calculator.id + ':' + field.k);
    }
  }
});

test('homepage places the Top 20 section above the catalogue search and keeps a crawlable link list', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const top = html.indexOf('id="top-20-calculators"');
  assert.ok(top > 0, 'Top 20 section is present');
  assert.ok(top < html.indexOf('id="home-tool-search-title"'), 'Top 20 comes before the search block');
  assert.ok(html.includes('data-top20'));
  assert.ok(html.includes('/assets/home-top20.js'));
  const section = html.slice(top, html.indexOf('</section>', top));
  for (const c of T.CALCS) assert.ok(section.includes('href="' + c.url + '"'), c.id + ' link in static list');
});
