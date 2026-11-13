const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(new URL('../assets/page-calculators.js', 'file://' + __filename), 'utf8');

const expected = [
  ['GST Calculator', 'gst calculator'],
  ['Loan EMI Calculator', 'loan emi calculator'],
  ['Fixed Deposit Calculator', 'fixed deposit calculator'],
  ['Savings Interest Calculator', 'savings account interest calculator'],
  ['Salary Calculator', 'salary calculator'],
  ['Inflation Calculator', 'inflation calculator'],
  ['Fuel Cost Calculator', 'fuel cost calculator'],
  ['Discount Calculator', 'discount calculator'],
  ['Age Calculator', 'age calculator'],
  ['Electricity Bill Calculator', 'electricity bill calculator'],
  ['Profit & Loss Calculator', 'profit & loss calculator'],
  ['EPF / PF Calculator', 'epf / pf calculator']
];

test('standalone calculator engine contains all expected calculator definitions', () => {
  for (const [title, key] of expected) {
    assert.ok(source.includes('"'+key+'"'), 'Missing calculator definition: '+title);
    assert.ok(source.includes('title:"'+title+'"') || source.includes('title: "'+title+'"'), 'Missing calculator title: '+title);
  }
});

test('calculator engine validates input and safely renders result text', () => {
  assert.match(source, /Number\.isFinite/);
  assert.match(source, /Please enter valid non-negative values/);
  assert.match(source, /textContent/);
  assert.match(source, /replaceChildren/);
});

test('calculator usage analytics records calculator name and page without sending input values', () => {
  assert.match(source, /calculator_use/);
  assert.match(source, /calculator_name:def\.title/);
  assert.match(source, /calculator_page:location\.pathname/);
});

 
test('FD, EPF and Profit & Loss page titles resolve to live calculator definitions', () => {
  assert.ok(source.includes('"/calculators/fd-calculator.html":"fixed deposit calculator"'));
  assert.ok(source.includes('"/calculators/epf-pf-calculator.html":"epf / pf calculator"'));
  assert.ok(source.includes('"/calculators/profit-loss-calculator.html":"profit & loss calculator"'));
});


// Execute the production formula definitions in an isolated VM. The page boot
// listener is stubbed so tests exercise the real calc functions without a DOM.
function loadFormulaDefinitions() {
  const wrapperEnd = source.lastIndexOf('})();');
  assert.ok(wrapperEnd >= 0, 'Formula engine IIFE should have a closing wrapper');
  const instrumented = source.slice(0, wrapperEnd) + 'globalThis.__calculatorDefinitions = definitions;\n' + source.slice(wrapperEnd);
  assert.notEqual(instrumented, source, 'Formula engine wrapper should be instrumentable');
  const sandbox = {
    document: { readyState: 'loading', addEventListener() {} }
  };
  vm.runInNewContext(instrumented, sandbox, { timeout: 1000 });
  return sandbox.__calculatorDefinitions;
}

function closeTo(actual, expectedValue, tolerance = 0.02) {
  assert.ok(Math.abs(actual - expectedValue) <= tolerance,
    'expected ' + actual + ' to be within ' + tolerance + ' of ' + expectedValue);
}

test('production formula functions return correct numeric results for every shared calculator', () => {
  const defs = loadFormulaDefinitions();
  const cases = [
    ['gst calculator', { amount: 10000, rate: 18, mode: 'Add GST', supply: 'Intra-state (CGST + SGST)' }, [
      ['Taxable value', 10000], ['Total GST', 1800], ['CGST', 900], ['SGST', 900], ['Invoice total', 11800]
    ]],
    ['loan emi calculator', { principal: 500000, rate: 9, years: 5 }, [
      ['Monthly EMI', 10379.18], ['Total repayment', 622750.66], ['Total interest', 122750.66]
    ]],
    ['fixed deposit calculator', { principal: 100000, rate: 7, years: 3, frequency: '4' }, [
      ['Maturity value', 123143.93], ['Estimated interest', 23143.93]
    ]],
    ['savings account interest calculator', { principal: 50000, rate: 3, days: 365 }, [
      ['Estimated interest', 1500], ['Balance plus interest', 51500]
    ]],
    ['salary calculator', { monthly: 30000, days: 26, hours: 8 }, [
      ['Daily estimate', 1153.8461538], ['Hourly estimate', 144.2307692]
    ]],
    ['inflation calculator', { amount: 10000, rate: 5, years: 10 }, [
      ['Estimated future cost', 16288.9462678], ['Increase', 6288.9462678]
    ]],
    ['fuel cost calculator', { distance: 100, mileage: 15, price: 100 }, [
      ['Fuel required (litres)', 6.6666667], ['Estimated trip cost', 666.6666667]
    ]],
    ['discount calculator', { amount: 2000, rate: 15 }, [
      ['You save', 300], ['Final price', 1700]
    ]],
    ['age calculator', { dob: '2000-01-01', asof: '2026-11-11' }, [
      ['Age', '26 years, 10 months, 10 days']
    ]],
    ['electricity bill calculator', { units: 200, rate: 7, fixed: 100, other: 0 }, [
      ['Energy charges', 1400], ['Estimated bill', 1500]
    ]],
    ['profit & loss calculator', { cost: 1000, selling: 1250 }, [
      ['Profit', 250], ['Percentage on cost', 25]
    ]],
    ['epf / pf calculator', { monthly: 1800, rate: 8.25, years: 20 }, [
      ['Estimated contributions', 432000], ['Illustrative accumulated value', 1093788.39], ['Illustrative interest', 661788.39]
    ]],
    ['income tax calculator india', { grossSalary: 1275000, standardDeduction: 75000, age: 35, regime: 'New regime — Tax Year 2026–27', residency: 'Resident individual' }, [
      ['Estimated taxable salary income', 1200000], ['Tax before rebate', 60000], ['Section 87A rebate / marginal relief', 60000], ['Estimated tax including surcharge and cess', 0]
    ]],
    ['income tax calculator india', { grossSalary: 1285000, standardDeduction: 75000, age: 35, regime: 'New regime — Tax Year 2026–27', residency: 'Resident individual' }, [
      ['Estimated taxable salary income', 1210000], ['Tax before rebate', 61500], ['Section 87A rebate / marginal relief', 51500], ['Health and education cess (4%)', 400], ['Estimated tax including surcharge and cess', 10400]
    ]],
    ['income tax calculator india', { grossSalary: 560000, standardDeduction: 50000, age: 40, regime: 'Old regime — individual', residency: 'Resident individual' }, [
      ['Estimated taxable salary income', 510000], ['Tax before rebate', 14500], ['Estimated tax including surcharge and cess', 15080]
    ]],
    ['income tax calculator india', { grossSalary: 560000, standardDeduction: 50000, age: 65, regime: 'Old regime — individual', residency: 'Resident individual' }, [
      ['Estimated taxable salary income', 510000], ['Tax before rebate', 12000], ['Estimated tax including surcharge and cess', 12480]
    ]],
    ['income tax calculator india', { grossSalary: 560000, standardDeduction: 50000, age: 80, regime: 'Old regime — individual', residency: 'Resident individual' }, [
      ['Estimated taxable salary income', 510000], ['Tax before rebate', 20000], ['Estimated tax including surcharge and cess', 2080]
    ]],
    ['income tax calculator india', { grossSalary: 50750001, standardDeduction: 75000, age: 35, regime: 'New regime — Tax Year 2026–27', residency: 'Resident individual' }, [
      ['Estimated taxable salary income', 50000001], ['Surcharge rate', 10], ['Marginal relief on surcharge', 1079999.33], ['Estimated tax including surcharge and cess', 11232001.04]
    ]],
    ['salary tds calculator', { income: 900000, regime: 'New regime — Tax Year 2026–27', residency: 'Resident individual', paid: 0, months: 6 }, [
      ['Tax before rebate', 30000], ['Section 87A rebate (if eligible)', 30000], ['Indicative annual tax incl. cess', 0], ['Estimated balance', 0], ['Indicative monthly TDS', 0]
    ]],
    ['salary tds calculator', { income: 1210000, regime: 'New regime — Tax Year 2026–27', residency: 'Resident individual', paid: 0, months: 6 }, [
      ['Tax before rebate', 61500], ['Section 87A rebate (if eligible)', 51500], ['Health & education cess (4%)', 400], ['Indicative annual tax incl. cess', 10400], ['Estimated balance', 10400], ['Indicative monthly TDS', 1733.333333]
    ]],
    ['salary tds calculator', { income: 800000, regime: 'Old regime — individual below 60', residency: 'Resident individual', paid: 15400, months: 6 }, [
      ['Tax before rebate', 72500], ['Section 87A rebate (if eligible)', 0], ['Health & education cess (4%)', 2900], ['Indicative annual tax incl. cess', 75400], ['Estimated balance', 60000], ['Indicative monthly TDS', 10000]
    ]],
    ['salary tds calculator', { income: 900000, regime: 'New regime — Tax Year 2026–27', residency: 'Non-resident / not eligible', paid: 0, months: 6 }, [
      ['Section 87A rebate (if eligible)', 0], ['Indicative annual tax incl. cess', 31200], ['Indicative monthly TDS', 5200]
    ]],
    ['bmi calculator', { height: 170, weight: 65 }, [
      ['BMI (number only)', 22.49134948]
    ]]
  ];

  for (const [key, input, expectedRows] of cases) {
    assert.ok(defs[key], 'Missing executable formula: ' + key);
    const actualRows = defs[key].calc(input);
    for (const [label, expectedValue] of expectedRows) {
      const actual = actualRows.find(row => row[0] === label);
      assert.ok(actual, key + ' missing output row: ' + label);
      if (typeof expectedValue === 'number') closeTo(actual[1], expectedValue, 0.1);
      else assert.equal(actual[1], expectedValue, key + ' ' + label);
    }
  }
});

test('fixed deposit defaults to quarterly compounding and distinguishes nominal rate from effective yield', () => {
  const defs = loadFormulaDefinitions();
  const fd = defs['fixed deposit calculator'];
  const rows = fd.calc({ principal: 350000, rate: 6.5, years: 1, frequency: '4' });
  const annual = fd.calc({ principal: 350000, rate: 6.5, years: 1, frequency: '1' });
  closeTo(rows.find(row => row[0] === 'Maturity value')[1], 373310.563077, 0.01);
  closeTo(rows.find(row => row[0] === 'Estimated interest')[1], 23310.563077, 0.01);
  closeTo(rows.find(row => row[0] === 'Effective annual yield')[1], 6.660160879, 0.00001);
  assert.equal(rows.find(row => row[0] === 'Compounding frequency')[1], 'Quarterly');
  closeTo(annual.find(row => row[0] === 'Maturity value')[1], 372750, 0.01);
  assert.match(source, /\["frequency","Compounding frequency \(times per year\)","select",\["4","1","2","12"\]\]/);
  assert.match(source, /Quarterly \(4 times\/year\)/);
});

test('production formulas handle zero-interest EMI and inclusive GST correctly', () => {
  const defs = loadFormulaDefinitions();
  const emi = defs['loan emi calculator'].calc({ principal: 120000, rate: 0, years: 2 });
  closeTo(emi.find(row => row[0] === 'Monthly EMI')[1], 5000, 0.001);

  const gst = defs['gst calculator'].calc({
    amount: 11800, rate: 18, mode: 'Remove GST', supply: 'Inter-state (IGST)'
  });
  closeTo(gst.find(row => row[0] === 'Taxable value')[1], 10000, 0.001);
  closeTo(gst.find(row => row[0] === 'IGST')[1], 1800, 0.001);
});


// Dedicated calculator pages: execute their actual inline browser scripts with
// a small DOM shim and verify the numeric values rendered into result tables.
function makeTestDom(values = {}) {
  class Node {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase(); this.children = []; this.style = {};
      this.dataset = {}; this.listeners = {}; this._text = ''; this.value = values[this.id] ?? '';
    }
    set textContent(value) { this._text = String(value); this.children = []; }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    append(...nodes) { this.children.push(...nodes); }
    appendChild(node) { this.children.push(node); return node; }
    replaceChildren(...nodes) { this.children = nodes; this._text = ''; }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    insertAdjacentElement(_where, node) { this.children.push(node); }
    closest(selector) { return selector === 'button' && this.tagName === 'BUTTON' ? this : null; }
  }
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) { const el = new Node(); el.id = id; el.value = values[id] ?? ''; elements.set(id, el); }
    return elements.get(id);
  };
  const document = {
    getElementById: get,
    createElement: tag => new Node(tag),
    addEventListener(name, fn) { this.listeners ??= {}; this.listeners[name] = fn; },
    querySelector() { return get('calculator-root'); }
  };
  return { document, get, elements };
}
function inlineScripts(html) {
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(script => script.trim() && !script.trim().startsWith('{'));
}
function resultRows(element) {
  const rows = [];
  const visit = node => {
    if (node.tagName === 'TR') {
      const cells = node.children;
      if (cells.length >= 2) rows.push([cells[0].textContent, cells[1].textContent]);
    }
    node.children.forEach(visit);
  };
  visit(element);
  return rows;
}
function numericCurrency(text) {
  return Number(String(text).replace(/[^0-9.-]/g, ''));
}

test('dedicated SIP page calculates the expected monthly annuity-due projection', () => {
  const html = fs.readFileSync(new URL('../calculators/sip-calculator.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes("sipCalculate"));
  assert.ok(script, 'SIP calculation script exists');
  const dom = makeTestDom({ sipMonthly: '2000', sipRate: '12', sipYears: '10' });
  vm.runInNewContext(script, { document: dom.document, Number, Math, Intl });
  const rows = resultRows(dom.get('sipResult'));
  closeTo(numericCurrency(rows.find(row => row[0] === 'Total contributions')[1]), 240000, 0.1);
  closeTo(numericCurrency(rows.find(row => row[0] === 'Illustrative estimated value')[1]), 464678.15, 0.2);
});

test('dedicated PPF page calculates beginning-of-year annual compounding', () => {
  const html = fs.readFileSync(new URL('../calculators/ppf-calculator.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes('function ppfCalc'));
  assert.ok(script, 'PPF calculation function exists');
  const dom = makeTestDom({ 'ppf-amt': '60000', 'ppf-rate': '7.1', 'ppf-years': '15' });
  const context = { document: dom.document, Number, Math, alert() {} };
  vm.runInNewContext(script + '\nppfCalc();', context);
  const rows = resultRows(dom.get('ppf-res'));
  closeTo(numericCurrency(rows.find(row => row[0] === 'Maturity value')[1]), 1627283.69, 1);
  closeTo(numericCurrency(rows.find(row => row[0] === 'Total deposited')[1]), 900000, 0.1);
});

test('dedicated CTC salary page calculates monthly take-home from entered deductions', () => {
  const html = fs.readFileSync(new URL('../calculators/ctc-salary-calculator.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes('function ctcCalc'));
  assert.ok(script, 'CTC calculation function exists');
  const dom = makeTestDom({
    'ctc-amt': '1200000', 'ctc-basic': '40', 'ctc-pf': '12',
    'ctc-grat': '1', 'ctc-pt': '200', 'ctc-tds': '3500'
  });
  vm.runInNewContext(script + '\nctcCalc();', { document: dom.document, Number, Math, alert() {} });
  const rows = resultRows(dom.get('ctc-res'));
  closeTo(numericCurrency(rows.find(row => row[0] === 'Monthly take-home estimate')[1]), 84776, 1);
});

test('dedicated HRA page applies the lowest-of-three exemption rule', () => {
  const html = fs.readFileSync(new URL('../calculators/hra-calculator.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes('function hraCalc'));
  assert.ok(script, 'HRA calculation function exists');
  const dom = makeTestDom({
    'hra-recd': '240000', 'hra-basic': '600000', 'hra-rent': '300000', 'hra-metro': '1'
  });
  vm.runInNewContext(script + '\nhraCalc();', { document: dom.document, Number, Math, alert() {} });
  const rows = resultRows(dom.get('hra-res'));
  closeTo(numericCurrency(rows.find(row => row[0] === 'Exempted HRA')[1]), 240000, 0.1);
  closeTo(numericCurrency(rows.find(row => row[0] === 'Taxable HRA')[1]), 0, 0.1);
});

test('dedicated basic calculator performs keypad arithmetic and rejects division by zero', () => {
  const html = fs.readFileSync(new URL('../calculators/basic-calculator.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes("let current='0'"));
  assert.ok(script, 'Basic calculator interaction script exists');
  const dom = makeTestDom();
  vm.runInNewContext(script, { document: dom.document, Number, Math });
  const keys = dom.get('keys');
  const click = keys.listeners.click;
  assert.equal(typeof click, 'function', 'keypad click handler is registered');
  const press = button => click({ target: { closest: () => button } });
  press({ tagName: 'BUTTON', dataset: { digit: '1' } });
  press({ tagName: 'BUTTON', dataset: { digit: '2' } });
  press({ tagName: 'BUTTON', dataset: { digit: '5' } });
  press({ tagName: 'BUTTON', dataset: { op: '+' } });
  press({ tagName: 'BUTTON', dataset: { digit: '7' } });
  press({ tagName: 'BUTTON', dataset: { digit: '5' } });
  press({ tagName: 'BUTTON', dataset: { action: 'equals' } });
  assert.equal(dom.get('display').textContent, '200');
  press({ tagName: 'BUTTON', dataset: { action: 'clear' } });
  press({ tagName: 'BUTTON', dataset: { digit: '8' } });
  press({ tagName: 'BUTTON', dataset: { op: '÷' } });
  press({ tagName: 'BUTTON', dataset: { digit: '0' } });
  press({ tagName: 'BUTTON', dataset: { action: 'equals' } });
  assert.equal(dom.get('display').textContent, 'Error');
});


test('dedicated Fraction Calculator simplifies exact fraction operations', () => {
  const html = fs.readFileSync(new URL('../calculators/fraction-calculator.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes("const gcd="));
  assert.ok(script, 'Fraction calculator script exists');
  const dom = makeTestDom({ n1: '3', d1: '4', n2: '2', d2: '5', op: 'add' });
  vm.runInNewContext(script, { document: dom.document, Number, Math, Intl, location: { pathname: '/calculators/fraction-calculator.html' } });
  assert.equal(dom.get('answer').textContent, '23/20');
  assert.ok(dom.get('mixed').textContent.includes('1 3/20'));
  dom.get('op').value = 'divide';
  dom.get('n2').value = '0';
  dom.get('calculate').listeners.click();
  assert.match(dom.get('status').textContent, /cannot be divided by zero/i);
});

test('dedicated Compound Interest Calculator calculates quarterly compounding', () => {
  const html = fs.readFileSync(new URL('../calculators/compound-interest-calculator.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes('function calculate()'));
  assert.ok(script, 'Compound interest calculation script exists');
  const dom = makeTestDom({ principal: '100000', rate: '8', years: '5', frequency: '4' });
  vm.runInNewContext(script, { document: dom.document, Number, Math, Intl, location: { pathname: '/calculators/compound-interest-calculator.html' } });
  closeTo(numericCurrency(dom.get('final').textContent), 148594.74, 0.1);
  closeTo(numericCurrency(dom.get('interest').textContent), 48594.74, 0.1);
});


test('dedicated Percentage Calculator calculates percentage of a value and percentage change', () => {
  const html = fs.readFileSync(new URL('../calculators/percentage-calculator.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes("function setMode(next)"));
  assert.ok(script, 'Percentage calculator script exists');
  const elements = new Map();
  const make = (id, value = '') => {
    const el = { id, value, hidden: false, dataset: {}, attrs: {}, listeners: {},
      setAttribute(k,v){this.attrs[k]=v;}, addEventListener(k,fn){this.listeners[k]=fn;} };
    elements.set(id, el); return el;
  };
  ['percent','base','part','whole','old','new','valueA','valueB'].forEach(id => make(id, ({percent:'10',base:'50000',part:'250',whole:'1000',old:'200',new:'350',valueA:'200',valueB:'350'})[id]));
  ['mode-of','mode-is','mode-change','mode-difference'].forEach(id => make(id));
  const buttons=['of','is','change','difference'].map(mode => {const b=make('tab-'+mode);b.dataset.mode=mode;return b;});
  const calc=make('calculate'),result=make('result'),label=make('resultLabel'),explain=make('explain'),status=make('status');
  const inputs=['percent','base','part','whole','old','new','valueA','valueB'].map(id=>elements.get(id));
  const document={getElementById:id=>elements.get(id),querySelectorAll:s=>s==='[data-mode]'?buttons:s==='.mode'?['mode-of','mode-is','mode-change','mode-difference'].map(id=>elements.get(id)):inputs};
  vm.runInNewContext(script,{document,Number,Math,Intl,location:{pathname:'/calculators/percentage-calculator.html'}});
  assert.equal(result.textContent,'5,000');
  buttons.find(b=>b.dataset.mode==='change').listeners.click();
  assert.equal(result.textContent,'75%');
  assert.match(label.textContent,/Percentage change/);
});


test('scientific calculator parser evaluates arithmetic, functions and angle modes without dynamic code execution', () => {
  const source = fs.readFileSync(new URL('../assets/scientific-calculator.js', 'file://' + __filename), 'utf8');
  const sandbox = { window: {}, document: { addEventListener() {} }, Math, Number };
  vm.runInNewContext(source, sandbox, { timeout: 1000 });
  const evaluate = sandbox.window.FCScientific.evaluate;
  closeTo(evaluate('sin(30)+sqrt(16)', 'deg'), 4.5, 1e-10);
  closeTo(evaluate('log(1000)+ln(e)', 'deg'), 4, 1e-10);
  closeTo(evaluate('2^3^2', 'deg'), 512, 1e-10);
  closeTo(evaluate('sin(pi/2)', 'rad'), 1, 1e-10);
  assert.throws(() => evaluate('window.alert(1)'), /Unsupported character|Unknown function/);
  assert.throws(() => evaluate('sqrt(-1)'), /outside the supported real-number domain/);
});

test('dedicated LCM and HCF calculator returns correct common factors and multiples', () => {
  const html = fs.readFileSync(new URL('../calculators/lcm-hcf-calculator.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes('const gcd='));
  assert.ok(script, 'LCM and HCF calculation script exists');
  const dom = makeTestDom({ numbers: '12, 18, 30' });
  vm.runInNewContext(script, { document: dom.document, Number, Math });
  assert.equal(dom.get('hcf').textContent, '6');
  assert.equal(dom.get('lcm').textContent, '180');
  dom.get('numbers').value = '8, 12';
  dom.get('calculate').listeners.click();
  assert.equal(dom.get('hcf').textContent, '4');
  assert.equal(dom.get('lcm').textContent, '24');
});


test('Date Difference Calculator clamps leap-day anniversaries to the target month end', () => {
  const html = fs.readFileSync(new URL('../calculators/date-difference-calculator.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes('const addMonths='));
  assert.ok(script, 'Date difference calculator script exists');
  const dom = makeTestDom({ start: '2024-02-29', end: '2025-02-28' });
  vm.runInNewContext(script, { document: dom.document, Number, Math, Date, Intl, location: { pathname: '/calculators/date-difference-calculator.html' } });
  assert.equal(dom.get('calendar').textContent, '1 years, 0 months, 0 days');
  dom.get('start').value = '2025-02-28';
  dom.get('end').value = '2024-02-29';
  dom.get('end').listeners.change();
  assert.equal(dom.get('calendar').textContent, '1 years, 0 months, 0 days');
});

test('dedicated Payment Calculator supports monthly schedules and zero-interest payments', () => {
  const html = fs.readFileSync(new URL('../calculators/payment-calculator.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes("const form=$('paymentForm')"));
  assert.ok(script, 'Payment calculator script exists');
  const dom = makeTestDom({ purchasePrice: '1000000', downPayment: '200000', fees: '0', apr: '9', years: '5', frequency: '12' });
  vm.runInNewContext(script, { document: dom.document, Number, Math, Intl, window: {}, location: { pathname: '/calculators/payment-calculator.html' } });
  dom.get('paymentForm').listeners.submit({ preventDefault() {} });
  let rows = resultRows(dom.get('paymentResult'));
  const expectedPayment = 800000 * (0.09 / 12) / (1 - Math.pow(1 + 0.09 / 12, -60));
  closeTo(numericCurrency(rows.find(row => row[0] === 'Regular payment')[1]), expectedPayment, 0.02);
  closeTo(numericCurrency(rows.find(row => row[0] === 'Amount financed')[1]), 800000, 0.02);
  closeTo(numericCurrency(rows.find(row => row[0] === 'Total scheduled payments')[1]), expectedPayment * 60, 0.2);
  dom.get('apr').value = '0';
  dom.get('paymentForm').listeners.submit({ preventDefault() {} });
  rows = resultRows(dom.get('paymentResult'));
  closeTo(numericCurrency(rows.find(row => row[0] === 'Regular payment')[1]), 800000 / 60, 0.02);
});


function runDedicatedPageCalculator(path, values) {
  const html = fs.readFileSync(new URL('../' + path, 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).at(-1);
  assert.ok(script, 'Expected an inline calculator script in ' + path);
  const dom = makeTestDom(values);
  vm.runInNewContext(script, {
    document: dom.document, Number, Math, Intl, Date, Uint32Array,
    crypto: require('node:crypto').webcrypto,
    window: {}, location: { pathname: '/' + path }
  }, { timeout: 1000 });
  assert.ok(dom.get('calc-form').listeners.submit, 'Expected form submit handler in ' + path);
  dom.get('calc-form').listeners.submit({ preventDefault() {} });
  return dom;
}

test('new Interest Rate Calculator solves a known fixed monthly rate', () => {
  const principal = 100000, monthlyRate = 0.005, months = 60;
  const payment = principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  const dom = runDedicatedPageCalculator('calculators/interest-rate-calculator.html', {
    principal: String(principal), payment: String(payment), months: String(months)
  });
  assert.match(dom.get('result').innerHTML, /annual nominal rate: 6(?:\.0+)?%/i);
  assert.match(dom.get('result').innerHTML, /Effective annual rate/);
});

test('new Pregnancy Calculator estimates gestational age and due date from fixed UTC dates', () => {
  const dom = runDedicatedPageCalculator('calculators/pregnancy-calculator.html', {
    lmp: '2026-01-01', today: '2026-02-12'
  });
  assert.match(dom.get('result').innerHTML, /6 weeks and 0 days/);
  assert.match(dom.get('result').innerHTML, /8 October 2026/);
});

test('new Pregnancy Conception Calculator labels the conception date as approximate', () => {
  const dom = runDedicatedPageCalculator('calculators/pregnancy-conception-calculator.html', {
    due: '2026-10-08'
  });
  assert.match(dom.get('result').innerHTML, /15 January 2026/);
  assert.match(dom.get('result').innerHTML, /rough estimate/);
});

test('new Random Number Generator supports a single-value range and count', () => {
  const dom = runDedicatedPageCalculator('calculators/random-number-generator.html', {
    min: '7', max: '7', count: '3'
  });
  assert.match(dom.get('result').innerHTML, /Generated 3 numbers/);
  assert.match(dom.get('result').innerHTML, /not for security-sensitive key generation/);
});

test('new Grade Calculator applies the configurable ten-point grade bands', () => {
  const dom = runDedicatedPageCalculator('calculators/grade-calculator.html', {
    earned: '85', possible: '100', top: '90'
  });
  assert.match(dom.get('result').innerHTML, /Course percentage: 85%/);
  assert.match(dom.get('result').innerHTML, /Letter grade: B/);
});

test('new Concrete Calculator estimates slab volume and mix quantities', () => {
  const dom = runDedicatedPageCalculator('calculators/concrete-calculator.html', {
    length: '4', width: '3', thickness: '100', cement: '1', sand: '2', aggregate: '4'
  });
  assert.match(dom.get('result').innerHTML, /Wet concrete volume: 1\.2 m³/);
  assert.match(dom.get('result').innerHTML, /7\.6 bags of 50 kg/);
  assert.match(dom.get('result').innerHTML, /qualified engineer/);
});

test('new Subnet Calculator calculates the expected IPv4 /24 network', () => {
  const dom = runDedicatedPageCalculator('calculators/subnet-calculator.html', {
    ip: '192.168.1.130', prefix: '24'
  });
  assert.match(dom.get('result').innerHTML, /Network: 192\.168\.1\.0\/24/);
  assert.match(dom.get('result').innerHTML, /Broadcast address: 192\.168\.1\.255/);
  assert.match(dom.get('result').innerHTML, /Usable host addresses: 254/);
});

const { calculateMortgage } = require('../assets/mortgage-calculator.js');

test('mortgage calculator includes principal, interest, property tax, insurance and maintenance', () => {
  const result = calculateMortgage({
    homePrice: 8000000,
    downPayment: 1600000,
    annualInterestRate: 8.5,
    termYears: 20,
    annualPropertyTax: 20000,
    annualHomeInsurance: 12000,
    monthlyMaintenance: 2500
  });
  closeTo(result.loanAmount, 6400000, 0.001);
  closeTo(result.monthlyPrincipalAndInterest, 55540.6869354, 0.001);
  closeTo(result.monthlyPropertyTax, 1666.6666667, 0.001);
  closeTo(result.monthlyHomeInsurance, 1000, 0.001);
  closeTo(result.monthlyTotal, 60707.3536021, 0.001);
  closeTo(result.totalInterest, 6929764.8644946, 0.01);
});

test('mortgage calculator handles 0% interest and rejects invalid loan assumptions', () => {
  const zeroRate = calculateMortgage({
    homePrice: 1000000, downPayment: 200000, annualInterestRate: 0,
    termYears: 10, annualPropertyTax: 12000, annualHomeInsurance: 6000,
    monthlyMaintenance: 500
  });
  closeTo(zeroRate.monthlyPrincipalAndInterest, 800000 / 120, 0.001);
  closeTo(zeroRate.monthlyTotal, 8666.6666667, 0.001);
  assert.throws(() => calculateMortgage({
    homePrice: 1000000, downPayment: 1000001, annualInterestRate: 8,
    termYears: 20
  }), /Down payment/);
  assert.throws(() => calculateMortgage({
    homePrice: 1000000, downPayment: 100000, annualInterestRate: 8,
    termYears: 0
  }), /Loan term/);
  assert.throws(() => calculateMortgage({
    homePrice: 1000000, downPayment: 100000, annualInterestRate: 8,
    termYears: 20, annualPropertyTax: -1
  }), /cannot be negative/);
});


function runExtraCalculator(slug, values) {
  const source = fs.readFileSync(new URL('../assets/extra-calculators.js', 'file://' + __filename), 'utf8');
  const fields = new Map(Object.entries(values).map(([id, value]) => [id, { value: String(value) }]));
  const listeners = {};
  const form = { innerHTML: '', addEventListener(name, fn) { listeners[name] = fn; } };
  const output = { innerHTML: '', textContent: '' };
  const root = { dataset: { calc: slug } };
  const document = {
    querySelector: () => root,
    getElementById: id => id === 'extraForm' ? form : id === 'extraResult' ? output : fields.get(id) || { value: '' }
  };
  vm.runInNewContext(source, {
    document, location: { pathname: '/calculators/' + slug + '.html' },
    Number, Math, Intl, Date
  }, { timeout: 1000 });
  return { output, submit: listeners.submit, form };
}

function extraResultNumber(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp('<span>' + escaped + '</span><strong>₹([0-9,]+(?:\\.[0-9]+)?)</strong>'));
  assert.ok(match, 'Missing currency result row: ' + label);
  return Number(match[1].replace(/,/g, ''));
}

test('SSY maturity calculator models 15 annual deposits and maturity after 21 years', () => {
  const deposit = 100000, rate = 8.2 / 100;
  const expected = deposit * Math.pow(1 + rate, 7) * (Math.pow(1 + rate, 15) - 1) / rate;
  const dom = runExtraCalculator('ssy-calculator', { annualDeposit: deposit, rate: 8.2 });
  const html = dom.output.innerHTML;
  closeTo(extraResultNumber(html, 'Total deposits'), deposit * 15, 0.01);
  closeTo(extraResultNumber(html, 'Estimated maturity after 21 years'), expected, 0.1);
  assert.match(html, /Contribution period/);
  assert.match(html, /15 years/);
  assert.match(html, /21 years/);
});

test('SSY maturity calculator rejects annual deposits outside scheme limits or increments', () => {
  const dom = runExtraCalculator('ssy-calculator', { annualDeposit: 150001, rate: 8.2 });
  assert.match(dom.output.textContent, /₹250 to ₹1,50,000/);
});

test('home-loan prepayment calculator compares baseline and revised amortization', () => {
  const balance = 2500000, annualRate = 8.5, emi = 25000, oneTime = 100000, extra = 5000;
  const monthly = annualRate / 1200;
  const simulate = (principal, payment) => {
    let remaining = principal, months = 0, interest = 0;
    while (remaining > 0.01 && months < 1200) {
      const charge = remaining * monthly;
      interest += charge;
      remaining = Math.max(0, remaining + charge - payment);
      months++;
    }
    return { months, interest };
  };
  const baseline = simulate(balance, emi);
  const revised = simulate(balance - oneTime, emi + extra);
  const dom = runExtraCalculator('loan-prepayment-calculator', {
    balance, rate: annualRate, emi, oneTime, extra
  });
  const html = dom.output.innerHTML;
  assert.match(html, /Original payoff time/);
  assert.match(html, /Revised payoff time/);
  assert.ok(extraResultNumber(html, 'Estimated interest saved') > 0);
  closeTo(extraResultNumber(html, 'Interest without prepayment'), baseline.interest, 0.1);
  closeTo(extraResultNumber(html, 'Interest after prepayment'), revised.interest, 0.1);
});

test('home-loan prepayment calculator shows zero savings when no extra payment is made', () => {
  const dom = runExtraCalculator('loan-prepayment-calculator', {
    balance: 100000, rate: 0, emi: 10000, oneTime: 0, extra: 0
  });
  assert.equal(extraResultNumber(dom.output.innerHTML, 'Estimated interest saved'), 0);
  assert.match(dom.output.innerHTML, /Time saved/);
});


test('dedicated Minutes to Hours calculator converts fractional minutes and validates the range', () => {
  const html = fs.readFileSync(new URL('../calculators/minutes-to-hours-calculator.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes('const hours=n/60'));
  assert.ok(script, 'Minutes to Hours calculation script exists');
  const dom = makeTestDom({ duration: '150' });
  vm.runInNewContext(script, { document: dom.document, Number, Math, Intl, location: { pathname: '/calculators/minutes-to-hours-calculator.html' } });
  assert.match(dom.get('result').textContent, /2\.5/);
  assert.match(dom.get('result').textContent, /2 h 30 min/);
  dom.get('duration').value = '-1';
  dom.get('calculate').listeners.click();
  assert.match(dom.get('error').textContent, /valid number of minutes/i);
});

test('dedicated Seconds to Hours calculator converts long durations and validates the range', () => {
  const html = fs.readFileSync(new URL('../calculators/seconds-to-hours-calculator.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes('const hours=n/3600'));
  assert.ok(script, 'Seconds to Hours calculation script exists');
  const dom = makeTestDom({ duration: '7200' });
  vm.runInNewContext(script, { document: dom.document, Number, Math, Intl, location: { pathname: '/calculators/seconds-to-hours-calculator.html' } });
  assert.match(dom.get('result').textContent, /2/);
  assert.match(dom.get('result').textContent, /120/);
  assert.match(dom.get('result').textContent, /2 h 0 min 0 s/);
  dom.get('duration').value = '-1';
  dom.get('calculate').listeners.click();
  assert.match(dom.get('error').textContent, /valid number of seconds/i);
});


test('SIP page exposes end-of-month and beginning-of-month calculations with matching worked examples', () => {
  const html = fs.readFileSync(new URL('../calculators/sip-calculator.html', 'file://' + __filename), 'utf8');
  assert.match(html, /id="sip-tool"/);
  assert.match(html, /href="#sip-tool">Calculate now<\/a>/);
  assert.match(html, /id="sipTiming"/);
  assert.match(html, /<option value="end" selected>End of each month<\/option>/);
  assert.match(html, /<option value="beginning">Beginning of each month<\/option>/);
  assert.match(html, /timing==='beginning'\?1\+i:1/);
  assert.match(html, /\(1 \+ i\)<sup>n<\/sup>/);
  assert.match(html, /₹4,60,077/);
  assert.match(html, /₹4,64,678/);
  assert.match(html, /og-friendly-calculator\.png/);
  assert.doesNotMatch(html, /og-friendly-calculator\.svg/);
  const p = 2000, i = 0.12 / 12, n = 120;
  const endMonth = p * ((Math.pow(1 + i, n) - 1) / i);
  const beginningMonth = endMonth * (1 + i);
  closeTo(endMonth, 460077.3789, 0.01);
  closeTo(beginningMonth, 464678.1527, 0.01);
});
