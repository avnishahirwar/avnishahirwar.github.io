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
    ['income tax calculator india', { income: 1200000, regime: 'New regime — Tax Year 2026–27' }, [
      ['Tax before rebate', 60000], ['Section 87A rebate (if eligible)', 60000], ['Estimated tax including cess', 0]
    ]],
    ['salary tds calculator', { income: 900000, paid: 0, months: 6 }, [
      ['Indicative annual tax incl. cess', 0], ['Estimated balance', 0], ['Indicative monthly TDS', 0]
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
