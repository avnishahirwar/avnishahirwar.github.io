/* Top 20 calculators for India: lightweight homepage widget.
 * Pure formula functions are exported for tests (CommonJS); the UI mounts on [data-top20]. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    var api = factory();
    root.FCTop20 = api;
    var start = function () { api.mount(document); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var displayCurrency = 'INR', displayRate = 1, displayLocale = 'en-IN';
  var currencySymbol = function (code) { try { return new Intl.NumberFormat(displayLocale, {style: 'currency', currency: code}).formatToParts(0).filter(function (p) { return p.type === 'currency'; })[0].value; } catch (_) { return code; } };
  var INR = function (n) { var value = Number(n) * displayRate; try { return new Intl.NumberFormat(displayLocale, {style: 'currency', currency: displayCurrency, maximumFractionDigits: 2, minimumFractionDigits: 0}).format(value); } catch (_) { return currencySymbol(displayCurrency) + value.toLocaleString(); } };
  var configureDisplayCurrency = function (code, rate, locale) { if (!/^[A-Z]{3}$/.test(code) || !(Number(rate) > 0) || !isFinite(Number(rate))) return false; displayCurrency = code; displayRate = Number(rate); if (locale) displayLocale = locale; return true; };
  var NUM = function (n, d) { return Number(n).toLocaleString('en-IN', {maximumFractionDigits: d == null ? 2 : d}); };
  var PCT = function (n) { return NUM(n, 2) + '%'; };
  var bad = function (m) { return {error: m}; };
  var finite = function () { for (var i = 0; i < arguments.length; i++) if (!isFinite(arguments[i])) return false; return true; };

  function emi(P, rate, years) {
    var n = Math.round(years * 12), r = rate / 1200;
    return r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  }
  function sipFV(m, rate, years) { // instalment at start of each month
    var i = rate / 1200, n = Math.round(years * 12);
    return i === 0 ? m * n : m * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  }
  function rdMaturity(m, rate, months) { // quarterly compounding, deposit at start of each month
    var q = Math.pow(1 + rate / 400, 1 / 3), sum = 0;
    for (var k = 1; k <= months; k++) sum += m * Math.pow(q, months - k + 1);
    return sum;
  }
  function ppfMaturity(dep, rate, years) { // deposit at start of each year, annual compounding
    var bal = 0;
    for (var y = 0; y < years; y++) bal = (bal + dep) * (1 + rate / 100);
    return bal;
  }
  function newRegimeTax(gross) {
    var std = 75000, taxable = Math.max(0, gross - std);
    var slabs = [[400000, 0], [800000, 0.05], [1200000, 0.10], [1600000, 0.15], [2000000, 0.20], [2400000, 0.25], [Infinity, 0.30]];
    var tax = 0, prev = 0;
    for (var i = 0; i < slabs.length; i++) {
      if (taxable > prev) tax += (Math.min(taxable, slabs[i][0]) - prev) * slabs[i][1];
      prev = slabs[i][0];
    }
    var rebate = taxable <= 1200000 ? Math.min(tax, 60000) : Math.min(tax, Math.max(0, tax - (taxable - 1200000)));
    var after = Math.max(0, tax - rebate), cess = after * 0.04;
    return {taxable: taxable, before: tax, rebate: rebate, cess: cess, total: after + cess};
  }
  function hraExemption(basic, hra, rent, metro) {
    var a = hra, b = Math.max(0, rent - 0.10 * basic), c = (metro ? 0.5 : 0.4) * basic;
    return Math.min(a, b, c);
  }
  function ageParts(dob, asOf) {
    var y = asOf.getFullYear() - dob.getFullYear(), m = asOf.getMonth() - dob.getMonth(), d = asOf.getDate() - dob.getDate();
    if (d < 0) { m--; d += new Date(asOf.getFullYear(), asOf.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    return {years: y, months: m, days: d};
  }
  function swp(corpus, withdraw, rate, years) {
    var bal = corpus, i = rate / 1200, n = Math.round(years * 12), total = 0, month = 0;
    for (month = 1; month <= n; month++) {
      bal = bal * (1 + i);
      if (bal <= withdraw) { total += bal; bal = 0; break; }
      bal -= withdraw; total += withdraw;
    }
    return {balance: bal, withdrawn: total, months: Math.min(month, n)};
  }
  function eligibility(income, existing, rate, years, foir) {
    var maxEmi = Math.max(0, income * foir / 100 - existing), r = rate / 1200, n = Math.round(years * 12);
    var loan = r === 0 ? maxEmi * n : maxEmi * (1 - Math.pow(1 + r, -n)) / r;
    return {maxEmi: maxEmi, loan: loan};
  }

  var F = function (k, label, v, extra) { var o = {k: k, label: label, v: v, currency: String(label).indexOf('₹') !== -1}; for (var x in (extra || {})) o[x] = extra[x]; return o; };

  var CALCS = [
    {id: 'emi', name: 'EMI', url: '/calculators/emi-calculator.html', fields: [F('P', 'Loan amount (₹)', 2500000), F('rate', 'Interest rate (% per year)', 8.5, {step: 0.01}), F('years', 'Tenure (years)', 20)],
      calc: function (v) {
        if (!(v.P > 0 && v.rate >= 0 && v.years > 0)) return bad('Enter a loan amount and tenure above zero.');
        var e = emi(v.P, v.rate, v.years), n = Math.round(v.years * 12);
        return {rows: [['Monthly EMI', INR(e), 1], ['Total interest', INR(e * n - v.P)], ['Total payment', INR(e * n)]]};
      }},
    {id: 'sip', name: 'SIP', url: '/calculators/sip-calculator.html', fields: [F('m', 'Monthly investment (₹)', 10000), F('rate', 'Expected return (% per year)', 12, {step: 0.1}), F('years', 'Period (years)', 10)],
      note: 'Returns are not guaranteed. Instalments are assumed at the start of each month.',
      calc: function (v) {
        if (!(v.m > 0 && v.rate >= 0 && v.years > 0)) return bad('Enter a monthly amount and period above zero.');
        var fv = sipFV(v.m, v.rate, v.years), inv = v.m * Math.round(v.years * 12);
        return {rows: [['Future value', INR(fv), 1], ['Amount invested', INR(inv)], ['Estimated gain', INR(fv - inv)]]};
      }},
    {id: 'lumpsum', name: 'Lumpsum', url: '/calculators/lumpsum-calculator.html', fields: [F('P', 'Investment (₹)', 500000), F('rate', 'Expected return (% per year)', 12, {step: 0.1}), F('years', 'Period (years)', 10)],
      note: 'Annual compounding. Returns are not guaranteed.',
      calc: function (v) {
        if (!(v.P > 0 && v.rate >= 0 && v.years > 0)) return bad('Enter an amount and period above zero.');
        var fv = v.P * Math.pow(1 + v.rate / 100, v.years);
        return {rows: [['Future value', INR(fv), 1], ['Amount invested', INR(v.P)], ['Estimated gain', INR(fv - v.P)]]};
      }},
    {id: 'fd', name: 'FD', url: '/calculators/fd-calculator.html', fields: [F('P', 'Deposit (₹)', 500000), F('rate', 'Interest rate (% per year)', 7, {step: 0.01}), F('years', 'Tenure (years)', 5)],
      note: 'Quarterly compounding, as most banks use. Your bank’s figure may differ slightly.',
      calc: function (v) {
        if (!(v.P > 0 && v.rate >= 0 && v.years > 0)) return bad('Enter a deposit and tenure above zero.');
        var a = v.P * Math.pow(1 + v.rate / 400, 4 * v.years);
        return {rows: [['Maturity amount', INR(a), 1], ['Interest earned', INR(a - v.P)], ['Deposit', INR(v.P)]]};
      }},
    {id: 'rd', name: 'RD', url: '/calculators/rd-calculator.html', fields: [F('m', 'Monthly deposit (₹)', 5000), F('rate', 'Interest rate (% per year)', 6.5, {step: 0.01}), F('months', 'Tenure (months)', 60)],
      note: 'Quarterly compounding with deposits at the start of each month. Bank quotes may differ slightly.',
      calc: function (v) {
        if (!(v.m > 0 && v.rate >= 0 && v.months >= 1)) return bad('Enter a monthly deposit and tenure above zero.');
        var months = Math.round(v.months), a = rdMaturity(v.m, v.rate, months);
        return {rows: [['Maturity amount', INR(a), 1], ['Total deposited', INR(v.m * months)], ['Interest earned', INR(a - v.m * months)]]};
      }},
    {id: 'ppf', name: 'PPF', url: '/calculators/ppf-calculator.html', fields: [F('dep', 'Yearly deposit (₹, max 1,50,000)', 150000), F('rate', 'Interest rate (% per year)', 7.1, {step: 0.01}), F('years', 'Years (minimum 15)', 15)],
      note: 'The government revises the PPF rate every quarter; check the current rate. Deposit assumed at the start of each year.',
      calc: function (v) {
        if (!(v.dep > 0 && v.dep <= 150000)) return bad('The yearly PPF deposit must be between ₹1 and ₹1,50,000.');
        if (!(v.years >= 15 && v.rate >= 0)) return bad('PPF runs for at least 15 years.');
        var a = ppfMaturity(v.dep, v.rate, Math.round(v.years));
        return {rows: [['Maturity amount', INR(a), 1], ['Total deposited', INR(v.dep * Math.round(v.years))], ['Interest earned', INR(a - v.dep * Math.round(v.years))]]};
      }},
    {id: 'gst', name: 'GST', url: '/calculators/gst-calculator.html', fields: [F('amt', 'Amount (₹)', 10000), F('rate', 'GST rate (%)', 18, {step: 0.01}), F('mode', 'Amount is', 'excl', {type: 'select', options: [['excl', 'Without GST (add GST)'], ['incl', 'With GST (remove GST)']]})],
      calc: function (v) {
        if (!(v.amt > 0 && v.rate >= 0)) return bad('Enter an amount above zero.');
        var base = v.mode === 'incl' ? v.amt / (1 + v.rate / 100) : v.amt, gst = base * v.rate / 100;
        return {rows: [['GST amount', INR(gst), 1], ['Amount without GST', INR(base)], ['Amount with GST', INR(base + gst)], ['CGST + SGST (each)', INR(gst / 2)]]};
      }},
    {id: 'tax', name: 'Income Tax', url: '/calculators/income-tax-calculator.html', fields: [F('gross', 'Annual salary income (₹)', 1500000)],
      note: 'New regime, Tax Year 2026–27, resident individual, salary income, ₹75,000 standard deduction. For the old regime, other income or surcharge, use the full calculator.',
      calc: function (v) {
        if (!(v.gross >= 0)) return bad('Enter your annual salary income.');
        if (v.gross - 75000 > 5000000) return bad('Surcharge applies above ₹50 lakh taxable income. Please use the full income tax calculator.');
        var t = newRegimeTax(v.gross);
        return {rows: [['Total tax payable', INR(t.total), 1], ['Taxable income', INR(t.taxable)], ['Tax before rebate', INR(t.before)], ['Section 87A rebate', INR(t.rebate)], ['Health & education cess (4%)', INR(t.cess)], ['Monthly tax', INR(t.total / 12)], ['Effective rate on gross', PCT(v.gross ? t.total / v.gross * 100 : 0)]]};
      }},
    {id: 'hra', name: 'HRA', url: '/calculators/hra-calculator.html', fields: [F('basic', 'Monthly basic + DA (₹)', 50000), F('hra', 'Monthly HRA received (₹)', 20000), F('rent', 'Monthly rent paid (₹)', 18000), F('metro', 'City', 'yes', {type: 'select', options: [['yes', 'Delhi, Mumbai, Kolkata, Chennai (50%)'], ['no', 'Other city (40%)']]})],
      note: 'Old tax regime only. Exemption is the least of HRA received, rent minus 10% of basic, and 50%/40% of basic.',
      calc: function (v) {
        if (!(v.basic > 0 && v.hra >= 0 && v.rent >= 0)) return bad('Enter basic salary, HRA and rent.');
        var e = hraExemption(v.basic, v.hra, v.rent, v.metro === 'yes');
        return {rows: [['Monthly HRA exemption', INR(e), 1], ['Yearly HRA exemption', INR(e * 12)], ['Taxable HRA per year', INR((v.hra - e) * 12)]]};
      }},
    {id: 'gratuity', name: 'Gratuity', url: '/calculators/gratuity-calculator.html', fields: [F('salary', 'Last drawn monthly basic + DA (₹)', 60000), F('years', 'Years of service (completed)', 10)],
      note: 'Formula: wages × 15 ÷ 26 × completed years, for employees covered by the Payment of Gratuity Act. Five years is normally required.',
      calc: function (v) {
        if (!(v.salary > 0 && v.years >= 5)) return bad('Enter wages and at least 5 completed years of service.');
        var g = v.salary * 15 / 26 * Math.floor(v.years);
        return {rows: [['Gratuity', INR(g), 1], ['Tax-exempt up to', INR(2000000)], ['Taxable portion', INR(Math.max(0, g - 2000000))]]};
      }},
    {id: 'percentage', name: 'Percentage', url: '/calculators/percentage-calculator.html', fields: [F('a', 'Value A', 20), F('b', 'Value B', 500)],
      calc: function (v) {
        if (!finite(v.a, v.b)) return bad('Enter both values.');
        var rows = [['A% of B', NUM(v.a / 100 * v.b, 4), 1]];
        if (v.b !== 0) rows.push(['A is what % of B', PCT(v.a / v.b * 100)]);
        if (v.a !== 0) rows.push(['Change from A to B', PCT((v.b - v.a) / Math.abs(v.a) * 100)]);
        return {rows: rows};
      }},
    {id: 'si', name: 'Simple Interest', url: '/calculators/simple-interest-calculator.html', fields: [F('P', 'Principal (₹)', 100000), F('rate', 'Rate (% per year)', 8, {step: 0.01}), F('years', 'Time (years)', 3, {step: 0.01})],
      calc: function (v) {
        if (!(v.P > 0 && v.rate >= 0 && v.years > 0)) return bad('Enter a principal and time above zero.');
        var si = v.P * v.rate * v.years / 100;
        return {rows: [['Simple interest', INR(si), 1], ['Total amount', INR(v.P + si)]]};
      }},
    {id: 'ci', name: 'Compound Interest', url: '/calculators/compound-interest-calculator.html', fields: [F('P', 'Principal (₹)', 100000), F('rate', 'Rate (% per year)', 8, {step: 0.01}), F('years', 'Time (years)', 5, {step: 0.01}), F('n', 'Compounding', 4, {type: 'select', options: [[1, 'Yearly'], [2, 'Half-yearly'], [4, 'Quarterly'], [12, 'Monthly']]})],
      calc: function (v) {
        if (!(v.P > 0 && v.rate >= 0 && v.years > 0)) return bad('Enter a principal and time above zero.');
        var a = v.P * Math.pow(1 + v.rate / 100 / v.n, v.n * v.years);
        return {rows: [['Compound interest', INR(a - v.P), 1], ['Total amount', INR(a)]]};
      }},
    {id: 'cagr', name: 'CAGR', url: '/calculators/cagr-calculator.html', fields: [F('start', 'Starting value (₹)', 100000), F('end', 'Ending value (₹)', 250000), F('years', 'Years', 5, {step: 0.01})],
      calc: function (v) {
        if (!(v.start > 0 && v.end > 0 && v.years > 0)) return bad('Enter positive values and years above zero.');
        var c = Math.pow(v.end / v.start, 1 / v.years) - 1;
        return {rows: [['CAGR', PCT(c * 100), 1], ['Absolute return', PCT((v.end / v.start - 1) * 100)]]};
      }},
    {id: 'bmi', name: 'BMI', url: '/calculators/bmi-calculator.html', fields: [F('w', 'Weight (kg)', 70, {step: 0.1}), F('h', 'Height (cm)', 170, {step: 0.1})],
      note: 'WHO adult categories. BMI is a screening measure, not a diagnosis. Asian-specific cut-offs are lower.',
      calc: function (v) {
        if (!(v.w > 0 && v.h > 0)) return bad('Enter weight and height above zero.');
        var b = v.w / Math.pow(v.h / 100, 2), c = b < 18.5 ? 'Underweight' : b < 25 ? 'Normal weight' : b < 30 ? 'Overweight' : 'Obese';
        return {rows: [['BMI', NUM(b, 1), 1], ['Category', c], ['Healthy weight range', NUM(18.5 * Math.pow(v.h / 100, 2), 1) + ' – ' + NUM(24.9 * Math.pow(v.h / 100, 2), 1) + ' kg']]};
      }},
    {id: 'age', name: 'Age', url: '/calculators/age-calculator.html', fields: [F('dob', 'Date of birth', '1995-06-15', {type: 'date'}), F('asof', 'Age as on', '', {type: 'date', today: true})],
      calc: function (v) {
        var dob = new Date(v.dob + 'T00:00:00'), asOf = new Date((v.asof || '') + 'T00:00:00');
        if (isNaN(dob) || isNaN(asOf) || dob > asOf) return bad('Enter a valid date of birth that is not after the “age as on” date.');
        var p = ageParts(dob, asOf), days = Math.round((asOf - dob) / 86400000);
        return {rows: [['Age', p.years + ' years, ' + p.months + ' months, ' + p.days + ' days', 1], ['Total days lived', NUM(days, 0)]]};
      }},
    {id: 'discount', name: 'Discount', url: '/calculators/discount-calculator.html', fields: [F('price', 'Original price (₹)', 2999), F('off', 'Discount (%)', 30, {step: 0.01})],
      calc: function (v) {
        if (!(v.price > 0 && v.off >= 0 && v.off <= 100)) return bad('Enter a price above zero and a discount between 0 and 100%.');
        var s = v.price * v.off / 100;
        return {rows: [['Final price', INR(v.price - s), 1], ['You save', INR(s)]]};
      }},
    {id: 'hike', name: 'Salary Hike', url: '/calculators/salary-calculator.html', fields: [F('cur', 'Current salary (₹ per month)', 50000), F('pct', 'Hike (%)', 12, {step: 0.01})],
      calc: function (v) {
        if (!(v.cur > 0 && v.pct >= 0)) return bad('Enter a current salary above zero.');
        var n = v.cur * (1 + v.pct / 100);
        return {rows: [['New monthly salary', INR(n), 1], ['Increase per month', INR(n - v.cur)], ['New yearly salary', INR(n * 12)]]};
      }},
    {id: 'swp', name: 'SWP', url: '/calculators/swp-calculator.html', fields: [F('corpus', 'Investment (₹)', 3000000), F('w', 'Monthly withdrawal (₹)', 20000), F('rate', 'Expected return (% per year)', 8, {step: 0.1}), F('years', 'Period (years)', 15)],
      note: 'Withdrawals at month end. Returns are not guaranteed; taxes are ignored.',
      calc: function (v) {
        if (!(v.corpus > 0 && v.w > 0 && v.rate >= 0 && v.years > 0)) return bad('Enter an investment, withdrawal and period above zero.');
        var s = swp(v.corpus, v.w, v.rate, v.years), rows = [['Balance at end', INR(s.balance), 1], ['Total withdrawn', INR(s.withdrawn)]];
        if (s.balance === 0) rows.push(['Corpus lasts', 'About ' + s.months + ' months']);
        return {rows: rows};
      }},
    {id: 'elig', name: 'Loan Eligibility', url: '/calculators/home-loan-eligibility-calculator.html', fields: [F('inc', 'Monthly income (₹)', 100000), F('ex', 'Existing monthly EMIs (₹)', 10000), F('rate', 'Interest rate (% per year)', 8.5, {step: 0.01}), F('years', 'Tenure (years)', 20), F('foir', 'Share of income for EMIs (%)', 50)],
      note: 'An estimate only. Banks apply their own income, credit-score and obligation rules.',
      calc: function (v) {
        if (!(v.inc > 0 && v.years > 0 && v.foir > 0 && v.foir <= 100 && v.rate >= 0 && v.ex >= 0)) return bad('Enter income, tenure and a share between 1 and 100%.');
        var e = eligibility(v.inc, v.ex, v.rate, v.years, v.foir);
        return {rows: [['Estimated eligible loan', INR(e.loan), 1], ['Maximum affordable EMI', INR(e.maxEmi)]]};
      }}
  ];

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in (attrs || {})) { if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function todayISO() { var d = new Date(), p = function (x) { return String(x).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }

  function mount(doc) {
    var host = doc.querySelector('[data-top20]');
    if (!host || host.getAttribute('data-ready')) return;
    host.setAttribute('data-ready', '1');
    var tabs = el('div', {'class': 'top20-tabs', role: 'tablist', 'aria-label': 'Top 20 calculators in India'});
    var panel = el('div', {'class': 'top20-panel', role: 'tabpanel', id: 'top20-panel'});
    host.appendChild(tabs); host.appendChild(panel);
    var current = null, buttons = {}, currentForm = null, currencyStatus = el('p', {'class': 'top20-currency-status', 'role': 'status', 'aria-live': 'polite'});
    panel.appendChild(currencyStatus);
    function updateCurrencyLabels() {
      var symbol = currencySymbol(displayCurrency);
      if (!currentForm) return;
      current.fields.forEach(function (f) {
        if (!f.currency) return;
        var label = currentForm.querySelector('label[for="top20-' + current.id + '-' + f.k + '"] span');
        if (label) { if (!label.dataset.fcOriginalText) label.dataset.fcOriginalText = label.textContent; label.textContent = label.dataset.fcOriginalText.replace(/₹/g, symbol); }
      });
      var note = panel.querySelector('.top20-note');
      if (note) { if (!note.dataset.fcOriginalText) note.dataset.fcOriginalText = note.textContent; note.textContent = note.dataset.fcOriginalText.replace(/₹/g, symbol); }
    }
    function loadDisplayCurrency() {
      var localeApi = window.FCLocale;
      var selected = localeApi && localeApi.getCurrency ? localeApi.getCurrency() : 'INR';
      var locale = localeApi && localeApi.getLocale ? localeApi.getLocale() : 'en-IN';
      if (selected === 'INR') { var oldRate = displayRate; configureDisplayCurrency('INR', 1, locale); if (currentForm && oldRate !== 1) current.fields.forEach(function (f) { if (f.currency) { var input = currentForm.elements[f.k]; input.value = Number(input.value) / oldRate; } }); updateCurrencyLabels(); if (currentForm) currentForm.dispatchEvent(new Event('input', {bubbles: true})); currencyStatus.textContent = 'Amounts shown in Indian Rupees (INR).'; return; }
      currencyStatus.textContent = 'Loading the latest available INR to ' + selected + ' reference rate…';
      fetch('https://api.frankfurter.dev/v2/rate/INR/' + encodeURIComponent(selected), {headers: {Accept: 'application/json'}, cache: 'no-cache'}).then(function (response) { if (!response.ok) throw new Error('Rate unavailable'); return response.json(); }).then(function (data) {
        if (!data || !Number.isFinite(Number(data.rate)) || Number(data.rate) <= 0 || !data.date) throw new Error('Invalid reference rate');
        var oldRate = displayRate, nextRate = Number(data.rate);
        configureDisplayCurrency(selected, nextRate, locale);
        if (currentForm) current.fields.forEach(function (f) { if (f.currency) { var input = currentForm.elements[f.k]; input.value = Number(input.value) / oldRate * nextRate; } });
        updateCurrencyLabels();
        currencyStatus.textContent = 'Amounts converted from INR to ' + selected + ' using the Frankfurter reference rate dated ' + data.date + '. Calculations retain their original INR-based formulas.';
        if (currentForm) currentForm.dispatchEvent(new Event('input', {bubbles: true}));
      }).catch(function () {
        currencyStatus.textContent = 'Reference rate unavailable. Results are kept in INR to avoid showing an incorrect currency.';
        if (localeApi && localeApi.setCurrency) localeApi.setCurrency('INR');
      });
    }
    window.addEventListener('fc:localechange', loadDisplayCurrency);
    window.addEventListener('fc:locale-ready', loadDisplayCurrency);

    function render() {
      var c = current, form = el('form', {'class': 'top20-form', novalidate: 'novalidate'}); currentForm = form;
      form.addEventListener('submit', function (e) { e.preventDefault(); });
      c.fields.forEach(function (f) {
        var id = 'top20-' + c.id + '-' + f.k, input;
        if (f.type === 'select') {
          input = el('select', {id: id, name: f.k}, f.options.map(function (o) { var op = el('option', {value: o[0], text: o[1]}); if (String(o[0]) === String(f.v)) op.selected = true; return op; }));
        } else if (f.type === 'date') {
          input = el('input', {id: id, name: f.k, type: 'date', value: f.today ? todayISO() : f.v});
        } else {
          input = el('input', {id: id, name: f.k, type: 'number', inputmode: 'decimal', min: '0', step: f.step || 'any', value: f.currency ? f.v * displayRate : f.v});
        }
        form.appendChild(el('label', {'for': id}, [el('span', {text: f.label}), input]));
      });
      var out = el('div', {'class': 'top20-result', 'aria-live': 'polite'});
      var foot = el('p', {'class': 'top20-foot'});
      var link = el('a', {href: c.url, text: 'Open the full ' + c.name + ' calculator →'});
      function compute() {
        var v = {};
        c.fields.forEach(function (f) {
          var raw = form.elements[f.k].value;
          v[f.k] = (f.type === 'select' ? (isNaN(Number(raw)) ? raw : Number(raw)) : f.type === 'date' ? raw : (raw === '' ? NaN : Number(raw) / (f.currency ? displayRate : 1)));
        });
        var r;
        try { r = c.calc(v); } catch (err) { r = bad('Please check the values entered.'); }
        out.textContent = '';
        if (r.error) { out.appendChild(el('p', {'class': 'top20-error', text: r.error})); return; }
        r.rows.forEach(function (row) {
          out.appendChild(el('div', {'class': 'top20-row' + (row[2] ? ' top20-main' : '')}, [el('span', {text: row[0]}), el('strong', {text: row[1]})]));
        });
      }
      form.addEventListener('input', compute); form.addEventListener('change', compute);
      panel.textContent = '';
      panel.setAttribute('aria-labelledby', 'top20-tab-' + c.id);
      panel.appendChild(el('h3', {text: c.name + ' Calculator'}));
      panel.appendChild(form); panel.appendChild(out);
      if (c.note) panel.appendChild(el('p', {'class': 'top20-note', text: c.note}));
      foot.appendChild(link); panel.appendChild(foot);
      compute();
    }
    function select(id, focus) {
      current = CALCS.filter(function (c) { return c.id === id; })[0] || CALCS[0];
      Object.keys(buttons).forEach(function (k) { var on = k === current.id; buttons[k].setAttribute('aria-selected', on ? 'true' : 'false'); buttons[k].tabIndex = on ? 0 : -1; });
      render();
      if (focus) buttons[current.id].focus();
    }
    CALCS.forEach(function (c) {
      var b = el('button', {type: 'button', role: 'tab', id: 'top20-tab-' + c.id, 'aria-controls': 'top20-panel', 'aria-selected': 'false', text: c.name});
      b.addEventListener('click', function () { select(c.id); });
      b.addEventListener('keydown', function (e) {
        var i = CALCS.indexOf(current), j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
        if (j === null) return; e.preventDefault(); select(CALCS[(j + CALCS.length) % CALCS.length].id, true);
      });
      buttons[c.id] = b; tabs.appendChild(b);
    });
    select(CALCS[0].id);
    loadDisplayCurrency();
  }

  return {CALCS: CALCS, mount: mount, configureDisplayCurrency: configureDisplayCurrency, getDisplayCurrency: function () { return {currency: displayCurrency, rate: displayRate, locale: displayLocale}; }, emi: emi, sipFV: sipFV, rdMaturity: rdMaturity, ppfMaturity: ppfMaturity, newRegimeTax: newRegimeTax, hraExemption: hraExemption, ageParts: ageParts, swp: swp, eligibility: eligibility};
});
