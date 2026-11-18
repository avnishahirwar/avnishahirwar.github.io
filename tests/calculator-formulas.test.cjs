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

test('native GST calculator skips the generic calculator bundle', () => {
  const gstPage = fs.readFileSync(new URL('../calculators/gst-calculator.html', 'file://' + __filename), 'utf8');
  const shell = fs.readFileSync(new URL('../assets/site-shell.js', 'file://' + __filename), 'utf8');
  assert.match(gstPage, /id="live-page-calculator"[^>]*data-fc-native-calculator/);
  assert.ok(!gstPage.includes('<script src="/assets/page-calculators.js" defer></script>'));
  assert.ok(shell.includes("if(p.startsWith('/calculators/')&&!document.querySelector('[data-fc-native-calculator]')){"));
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
      ['Estimated taxable salary income', 510000], ['Tax before rebate', 2000], ['Estimated tax including surcharge and cess', 2080]
    ]],
    ['income tax calculator india', { grossSalary: 5075001, standardDeduction: 75000, age: 35, regime: 'New regime — Tax Year 2026–27', residency: 'Resident individual' }, [
      ['Estimated taxable salary income', 5000001], ['Surcharge rate', 10], ['Marginal relief on surcharge', 107999.33], ['Estimated tax including surcharge and cess', 1123201.04]
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
    querySelector() { return get('calculator-root'); },
    querySelectorAll(selector) { return selector === '.sip-slider' ? [] : []; }
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

test('quadratic solver explains the discriminant and substitutes the quadratic formula', () => {
  const html = fs.readFileSync(new URL('../calculators/quadratic-polynomial-solver.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes('case "quadratic"'));
  assert.ok(script, 'Quadratic solver script exists');
  const dom = makeTestDom({ a: '1', b: '-5', c: '6' });
  vm.runInNewContext(script, { document: dom.document, Number, Math, Intl });
  dom.get('form').listeners.submit({ preventDefault() {} });
  const output = dom.get('result').innerHTML;
  assert.match(output, /Roots: <b>3 and 2<\/b>/);
  assert.match(output, /D = b² − 4ac/);
  assert.match(output, /x₁/);
  assert.match(output, /x₂/);
  const complexDom = makeTestDom({ a: '1', b: '2', c: '5' });
  vm.runInNewContext(script, { document: complexDom.document, Number, Math, Intl });
  complexDom.get('form').listeners.submit({ preventDefault() {} });
  assert.match(complexDom.get('result').innerHTML, /complex-conjugate roots/);
});

test('dedicated SIP page calculates both end-of-month and beginning-of-month projections', () => {
  const html = fs.readFileSync(new URL('../calculators/sip-calculator.html', 'file://' + __filename), 'utf8');
  const script = inlineScripts(html).find(item => item.includes("sipCalculate"));
  assert.ok(script, 'SIP calculation script exists');
  const endDom = makeTestDom({ sipMonthly: '2000', sipRate: '12', sipYears: '10', sipTiming: 'end' });
  vm.runInNewContext(script, { document: endDom.document, Number, Math, Intl });
  const endRows = resultRows(endDom.get('sipResult'));
  closeTo(numericCurrency(endRows.find(row => row[0] === 'Total contributions')[1]), 240000, 0.1);
  closeTo(numericCurrency(endRows.find(row => row[0] === 'Illustrative estimated value')[1]), 460077, 0.2);

  const beginningDom = makeTestDom({ sipMonthly: '2000', sipRate: '12', sipYears: '10', sipTiming: 'beginning' });
  vm.runInNewContext(script, { document: beginningDom.document, Number, Math, Intl });
  const beginningRows = resultRows(beginningDom.get('sipResult'));
  closeTo(numericCurrency(beginningRows.find(row => row[0] === 'Illustrative estimated value')[1]), 474678.15, 0.2);
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
  closeTo(beginningMonth, 474678.1527, 0.01);
});


test('GST calculator avoids obsolete general-rate presets and asks for a verified custom rate', () => {
  const html = fs.readFileSync(new URL('../calculators/gst-calculator.html', 'file://' + __filename), 'utf8');
  assert.match(html, /name="rate" type="number"/);
  assert.match(html, /id="gst-common-rates"/);
  assert.match(html, /option value="5"/);
  assert.match(html, /option value="18"/);
  assert.match(html, /option value="40"/);
  assert.doesNotMatch(html, /12%|28%|<option>12<\/option>|<option>28<\/option>/);
  assert.match(html, /HSN\/SAC classification/);
  assert.match(html, /22 September 2025/);
});

test('Income Tax calculator explanation matches the expanded Tax Year 2026–27 model and states its limits', () => {
  assert.match(source, /Age attained during the tax year/);
  assert.match(source, /surcharge marginal relief and 4% health and education cess/);
  assert.match(source, /salary-only estimate/);
  assert.doesNotMatch(source, /does not calculate deductions from gross salary or model surcharge/);
  const html = fs.readFileSync(new URL('../calculators/income-tax-calculator.html', 'file://' + __filename), 'utf8');
  assert.match(html, /gross salary, standard deduction, age, residential status and tax regime/);
  assert.match(html, /Tax Year 2026–27/);
});

test('About and Contact pages show consistent ownership, catalogue count and the actual contact route', () => {
  const about = fs.readFileSync(new URL('../calculator/about.html', 'file://' + __filename), 'utf8');
  const contact = fs.readFileSync(new URL('../calculator/contact.html', 'file://' + __filename), 'utf8');
  assert.match(about, /Avnish Ahirwar/);
  assert.match(about, /473 public calculators/);
  assert.match(about, /Available calculators \(473 tools\)/);
  const searchIndex = JSON.parse(fs.readFileSync(new URL('../assets/calculator-search-index.json', 'file://' + __filename), 'utf8'));
  const homepage = fs.readFileSync(new URL('../index.html', 'file://' + __filename), 'utf8');
  assert.equal(searchIndex.length, 474);
  assert.ok(searchIndex.some(item => item.name === 'VAT Calculator' && item.url === '/international/vat-calculator.html'));
  assert.match(homepage, /Search all 474 calculators/);
  assert.match(contact, /secure enquiry form is on this Contact page/);
  assert.doesNotMatch(contact, /homepage enquiry form/);
});

test('Privacy policy does not claim Google CMP is live before account-side publication', () => {
  const privacy = fs.readFileSync(new URL('../calculator/privacy.html', 'file://' + __filename), 'utf8');
  assert.match(privacy, /Google <strong>Privacy &amp; messaging<\/strong>/);
  assert.match(privacy, /message has not yet been published/);
  assert.match(privacy, /does not claim that a Google-certified CMP is already active/);
});


test('Hindi Income Tax uses its reviewed localized model while other translated pages keep the retired model disabled', () => {
  const hindi = fs.readFileSync(new URL('../hi/calculators/income-tax-calculator.html', 'file://' + __filename), 'utf8');
  assert.match(hindi, /id="calculate-tax"/);
  assert.match(hindi, /id="tax-results"/);
  assert.match(hindi, /function calculate\(\)/);
  assert.doesNotMatch(hindi, /localized-tax-review-note/);
  assert.match(hindi, /memo-2026\.pdf/, 'Hindi tax model links to the official Finance Bill 2026 memorandum');
  assert.match(hindi, /incometax\.gov\.in/, 'Hindi tax model links to the Income Tax Department');
  for (const locale of ['es', 'fr', 'pt', 'ar', 'id', 'bn', 'ta']) {
    const html = fs.readFileSync(new URL('../' + locale + '/calculators/income-tax-calculator.html', 'file://' + __filename), 'utf8');
    assert.match(html, /id="localized-tax-review-note"/, locale + ' has a review notice');
    assert.match(html, /calculators\/income-tax-calculator\.html/, locale + ' links to the reviewed English model');
    assert.ok((html.match(/aria-hidden="true"/g) || []).length >= 3, locale + ' hides the old form, result and legacy explanation panels');
    assert.doesNotMatch(html, /function run\(\)/, locale + ' no longer executes the retired simplified model');
  }
});

test('the ten priority Hindi calculators expose canonical URLs, nine language alternates, schemas, formula notes and visual results', () => {
  const slugs = ['loan-emi-calculator','home-loan-emi-calculator','car-loan-calculator','personal-loan-eligibility-calculator','sip-calculator','fd-calculator','rd-calculator','ppf-calculator','gst-calculator','income-tax-calculator'];
  for (const slug of slugs) {
    const html = fs.readFileSync(new URL('../hi/calculators/' + slug + '.html', 'file://' + __filename), 'utf8');
    assert.match(html, /<html[^>]+lang="hi"/, slug + ' is marked Hindi');
    assert.match(html, /rel="canonical" href="https:\/\/friendlycalculator\.in\/hi\/calculators\//, slug + ' has a Hindi canonical');
    for (const locale of ['en','hi','es','fr','pt','ar','id','bn','ta','x-default']) assert.match(html, new RegExp('hreflang="' + locale + '"'), slug + ' is missing ' + locale + ' hreflang');
    assert.match(html, /"@type":"SoftwareApplication"/, slug + ' has SoftwareApplication schema');
    assert.match(html, /"@type":"FAQPage"/, slug + ' has FAQ schema');
    assert.match(html, /hi-formula-intro/, slug + ' has a formula summary');
    assert.match(html, /hi-top10-visuals\.js/, slug + ' loads its result chart');
    assert.match(html, /उदाहरण|Worked example/, slug + ' has a worked example');
  }
  const visualRuntime = fs.readFileSync(new URL('../assets/hi-top10-visuals.js', 'file://' + __filename), 'utf8');
  assert.match(visualRuntime, /hi-amortization-schedule/);
  assert.match(visualRuntime, /hi-sip-growth/);
});

test('standard EMI calculators include a bounded month-by-month repayment schedule', () => {
  const js = fs.readFileSync(new URL('../assets/extra-calculators.js', 'file://' + __filename), 'utf8');
  assert.ok(js.includes('function appendEmiAmortizationSchedule(kind,values,monthlyRate,result)'));
  assert.match(js, /kind!=='emi'/);
  assert.ok(js.includes('Number.isInteger(months)||months>600'));
  assert.match(js, /Scheduled principal/);
  assert.match(js, /Scheduled interest/);
  assert.match(js, /Month-by-month repayment schedule/);
  for (const slug of ['car-loan-calculator','bike-loan-calculator','gold-loan-calculator','loan-against-property-calculator']) {
    const html = fs.readFileSync(new URL('../calculators/' + slug + '.html', 'file://' + __filename), 'utf8');
    assert.match(html, /data-fc-native-calculator/, slug + ' must not receive a duplicate injected calculator');
  }
  const principal = 800000, annualRate = 0.09, months = 60, monthlyRate = annualRate / 12;
  const emi = principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  let balance = principal, interestTotal = 0, principalTotal = 0;
  for (let month = 1; month <= months; month++) {
    const interest = balance * monthlyRate;
    let payment = Math.min(emi, balance + interest);
    let principalPart = Math.max(0, payment - interest);
    if (month === months || principalPart > balance) { principalPart = balance; payment = balance + interest; }
    balance = Math.max(0, balance - principalPart);
    interestTotal += interest; principalTotal += principalPart;
  }
  closeTo(principalTotal, principal, 0.01);
  closeTo(interestTotal, emi * months - principal, 0.01);
  closeTo(balance, 0, 0.01);
});

test('EPS pension estimate validates eligible service and salary before calculation', () => {
  const js = fs.readFileSync(new URL('../assets/extra-calculators.js', 'file://' + __filename), 'utf8');
  assert.match(js, /case'eps':\{if\(v\.service<10\)/);
  assert.match(js, /valid service period up to 50 years/);
});


test('advanced matrix calculator supports 2x2 and 3x3 operations with worked method labels', () => {
  const matrix = require('../assets/matrix-calculator.js');
  assert.equal(matrix.determinant([[1, 2], [3, 4]]), -2);
  assert.equal(matrix.determinant([[1, 2, 3], [0, 1, 4], [5, 6, 0]]), 1);
  assert.deepEqual(matrix.add([[1, 2], [3, 4]], [[5, 6], [7, 8]]), [[6, 8], [10, 12]]);
  assert.deepEqual(matrix.multiply([[1, 2], [3, 4]], [[5, 6], [7, 8]]), [[19, 22], [43, 50]]);
  assert.deepEqual(matrix.transpose([[1, 2, 3], [4, 5, 6]]), [[1, 4], [2, 5], [3, 6]]);
  const inv = matrix.inverse([[4, 7], [2, 6]]);
  assert.ok(Math.abs(inv[0][0] - 0.6) < 1e-10);
  assert.ok(Math.abs(inv[0][1] + 0.7) < 1e-10);
  assert.throws(() => matrix.inverse([[1, 2], [2, 4]]), /singular/);
  const explained = matrix.calculate([[1, 2], [3, 4]], [[5, 6], [7, 8]], 'multiply');
  assert.deepEqual(explained.matrix, [[19, 22], [43, 50]]);
  assert.ok(explained.steps.some(step => step.includes('1 × 5') && step.includes('2 × 7') && step.includes('19')), 'multiplication shows substituted arithmetic');
  const added = matrix.calculate([[1, 2], [3, 4]], [[5, 6], [7, 8]], 'add');
  assert.ok(added.steps.some(step => step === 'C11 = 1 + 5 = 6.'), 'addition shows each cell calculation');
  const detSteps = matrix.calculate([[1, 2], [3, 4]], null, 'determinant');
  assert.ok(detSteps.steps.some(step => step.includes('(1 × 4) − (2 × 3) = -2')), 'determinant shows substituted formula');
  const inverseSteps = matrix.calculate([[4, 7], [2, 6]], null, 'inverse').steps;
  assert.ok(inverseSteps.some(step => step.includes('divide R1')), 'inverse shows row operations');
  assert.ok(explained.steps.length >= 2);
});


// The Loan EMI page uses a focused script instead of downloading the full
// shared calculator bundle. Exercise the dedicated production formula.
test('dedicated Loan EMI page script calculates standard and zero-rate cases', () => {
  const pageSource = fs.readFileSync(new URL('../assets/loan-emi-calculator.js', 'file://' + __filename), 'utf8');
  assert.match(pageSource, /Monthly loan amortization schedule/);
  assert.match(pageSource, /calculator_used/);
  const instrumented = pageSource.replace(
    'window.FriendlyCalculatorLoanEMI = { calculateLoanEmi };',
    'globalThis.__calculateLoanEmi = calculateLoanEmi;'
  );
  const sandbox = {
    document: { readyState: 'loading', addEventListener() {} },
    window: {},
    location: { pathname: '/calculators/loan-emi-calculator.html' }
  };
  vm.runInNewContext(instrumented, sandbox, { timeout: 1000 });
  const standard = sandbox.__calculateLoanEmi(500000, 9, 60);
  closeTo(standard.emi, 10379.177, 0.01);
  closeTo(standard.totalRepayment, 622750.62, 0.1);
  closeTo(standard.totalInterest, 122750.62, 0.1);
  const zeroRate = sandbox.__calculateLoanEmi(120000, 0, 12);
  closeTo(zeroRate.emi, 10000, 0.001);
  closeTo(zeroRate.totalInterest, 0, 0.001);
});

test('GST page renders its default result statically and calculates only on user submission', () => {
  const html = fs.readFileSync(new URL('../calculators/gst-calculator.html', 'file://' + __filename), 'utf8');
  const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).find(source => source.includes("form.addEventListener('submit',calculate)"));
  assert.ok(script, 'GST calculator submit handler must remain present');
  assert.match(html, /id="gst-live-result" aria-live="polite" style="display:block/);
  for (const value of ['₹10,000.00', '₹1,800.00', '₹900.00', '₹11,800.00']) assert.ok(html.includes(value), 'Missing static default result ' + value);
  assert.match(script, /form.addEventListener\('submit',calculate\)/);
  assert.doesNotMatch(script, /calculate\(new Event\('submit'/);
  assert.match(script, /How this result was calculated/);
});


test('Crop cost and EPS pension pages publish visible, specific FAQs for schema generation', () => {
  const crop = fs.readFileSync(new URL('../calculators/crop-cost-profit-calculator.html', 'file://' + __filename), 'utf8');
  const eps = fs.readFileSync(new URL('../calculators/eps-pension-calculator.html', 'file://' + __filename), 'utf8');
  for (const question of ['Can I use this for different crops?', 'Is net return the same as farm income?', 'Does the calculator use a fixed MSP?']) assert.ok(crop.includes('<summary>' + question + '</summary>'), 'Missing crop FAQ: ' + question);
  for (const question of ['What is the EPS pension formula?', 'Should I enter gross salary?', 'Is this an official EPFO pension calculation?']) assert.ok(eps.includes('<summary>' + question + '</summary>'), 'Missing EPS FAQ: ' + question);
  assert.match(fs.readFileSync(new URL('../assets/site-shell.js', 'file://' + __filename), 'utf8'), /injectVisibleCalculatorFaqSchema/);
});


test('Steps-to-kilometres and number-to-words FAQs separate questions from answers', () => {
  const steps = fs.readFileSync(new URL('../calculators/steps-to-km-calculator.html', 'file://' + __filename), 'utf8');
  const words = fs.readFileSync(new URL('../calculators/number-to-words-indian-format.html', 'file://' + __filename), 'utf8');
  for (const question of ['Is the distance exact?', 'Can I change the step length?', "Does this access my phone's step counter?"]) assert.ok(steps.includes('<summary>' + question + '</summary>'), 'Missing steps FAQ: ' + question);
  for (const question of ['Does this use lakh and crore?', 'Can I enter paise or decimals?', 'Is the result suitable for legal documents?']) assert.ok(words.includes('<summary>' + question + '</summary>'), 'Missing number-to-words FAQ: ' + question);
});

const chemistryEngineSource = fs.readFileSync(new URL('../assets/chemistry-calculators.js', 'file://' + __filename), 'utf8');
const chemistryContext = {};
vm.runInNewContext(chemistryEngineSource, chemistryContext);
const chemistry = chemistryContext.FriendlyChemistryCalculators;

test('chemistry batch 03 formulas return expected reference values', () => {
  const avogadro = chemistry.avogadro({ moles: 1 });
  assert.ok(Math.abs(Number(avogadro[1][1]) / 6.02214076e23 - 1) < 1e-12);

  const gas = chemistry.molarMassGas({ mass: 1, temperature: 273.15, pressure: 101.325, volume: 22.414 });
  assert.ok(Math.abs(parseFloat(gas[0][1]) - 1) < 0.002);

  const atoms = chemistry.molesToAtoms({ moles: 1, atomsPerMolecule: 3 });
  assert.ok(Math.abs(Number(atoms[1][1]) / 1.806642228e24 - 1) < 1e-8);

  const ppm = chemistry.ppmToMolarity({ ppm: 1000, density: 1, molarMass: 58.44 });
  assert.ok(Math.abs(parseFloat(ppm[1][1]) - (1 / 58.44)) < 1e-6);

  const residence = chemistry.residenceTime({ volume: 1000, flow: 100 });
  assert.ok(Math.abs(parseFloat(residence[0][1]) - 10) < 1e-8);

  const dilution = chemistry.dilutionFactor({ stock: 1, target: 0.1, finalVolume: 100 });
  assert.ok(Math.abs(parseFloat(dilution[0][1]) - 10) < 1e-8);
  assert.ok(Math.abs(parseFloat(dilution[1][1]) - 10) < 1e-8);
  assert.ok(Math.abs(parseFloat(dilution[2][1]) - 90) < 1e-8);

  const buffer = chemistry.hendersonHasselbalch({ pKa: 4.76, base: 0.1, acid: 0.1 });
  assert.ok(Math.abs(parseFloat(buffer[1][1]) - 4.76) < 1e-8);

  const massPercent = chemistry.massPercent({ soluteMass: 10, solventMass: 90 });
  assert.ok(Math.abs(parseFloat(massPercent[1][1]) - 10) < 1e-8);

  const percentToMolarity = chemistry.percentageToMolarity({ percentWv: 5, molarMass: 58.44 });
  assert.ok(Math.abs(parseFloat(percentToMolarity[1][1]) - (50 / 58.44)) < 1e-6);

  const ph = chemistry.ph({ hydrogen: 0.001 });
  assert.ok(Math.abs(parseFloat(ph[0][1]) - 3) < 1e-8);
});

test('chemistry batch 03 formulas reject invalid physical inputs', () => {
  assert.throws(() => chemistry.molarMassGas({ mass: 1, temperature: 0, pressure: 100, volume: 1 }), /positive finite value/);
  assert.throws(() => chemistry.molesToAtoms({ moles: 1, atomsPerMolecule: 1.5 }), /positive whole number/);
  assert.throws(() => chemistry.dilutionFactor({ stock: 0.1, target: 1, finalVolume: 100 }), /lower than stock/);
  assert.throws(() => chemistry.hendersonHasselbalch({ pKa: 4.7, base: 0, acid: 0.1 }), /positive finite value/);
  assert.throws(() => chemistry.massPercent({ soluteMass: 0, solventMass: 0 }), /greater than zero/);
  assert.throws(() => chemistry.ph({ hydrogen: 0 }), /positive finite value/);
});

const batch04Source = fs.readFileSync(new URL('../assets/chemistry-calculators-batch04.js', 'file://' + __filename), 'utf8');
const batch04Context = {};
vm.runInNewContext(batch04Source, batch04Context);
const batch04 = batch04Context.FriendlyChemistryBatch04;

test('chemistry batch 04 formulas return expected reference values', () => {
  const en = batch04.electronegativity({ first: 2.2, second: 3.16 });
  assert.ok(Math.abs(parseFloat(en[0][1]) - 0.96) < 1e-8);

  const ionic = batch04.ionic({ difference: 1 });
  assert.ok(Math.abs(parseFloat(ionic[0][1]) - ((1 - Math.exp(-0.25)) * 100)) < 1e-4);

  const pka = batch04.pka({ ka: 1e-5, pka: NaN });
  assert.ok(Math.abs(parseFloat(pka[0][1]) - 5) < 1e-8);
  const ka = batch04.pka({ ka: NaN, pka: 5 });
  assert.ok(Math.abs(Number(ka[0][1]) / 1e-5 - 1) < 1e-8);

  const alligation = batch04.alligation({ high: 40, low: 10, target: 25, total: 100 });
  assert.ok(Math.abs(parseFloat(alligation[0][1]) - 50) < 1e-8);
  assert.ok(Math.abs(parseFloat(alligation[1][1]) - 50) < 1e-8);

  const concentration = batch04.concentration({ mass: 5, volume: 1, molarMass: 58.44 });
  assert.ok(Math.abs(parseFloat(concentration[0][1]) - 5) < 1e-8);
  assert.ok(Math.abs(parseFloat(concentration[1][1]) - (5 / 58.44)) < 1e-6);

  const mixing = batch04.mixing({ partsA: 2, partsB: 3, total: 10 });
  assert.ok(Math.abs(parseFloat(mixing[0][1]) - 4) < 1e-8);
  assert.ok(Math.abs(parseFloat(mixing[1][1]) - 6) < 1e-8);

  const raoult = batch04.raoult({ solventMoles: 8, soluteMoles: 2, purePressure: 3.17 });
  assert.ok(Math.abs(parseFloat(raoult[0][1]) - 0.8) < 1e-8);
  assert.ok(Math.abs(parseFloat(raoult[1][1]) - 2.536) < 1e-6);

  const actual = batch04.actualYield({ theoretical: 10, actual: 8, percent: NaN });
  assert.ok(Math.abs(parseFloat(actual[0][1]) - 80) < 1e-8);
  const estimated = batch04.actualYield({ theoretical: 10, actual: NaN, percent: 80 });
  assert.ok(Math.abs(parseFloat(estimated[0][1]) - 8) < 1e-8);

  const activation = batch04.activation({ k1: 1, t1: 300, k2: 2, t2: 310 });
  assert.ok(Number.isFinite(parseFloat(activation[0][1])) && parseFloat(activation[0][1]) > 0);

  const boiling = batch04.boiling({ molality: 0.5, kb: 0.512, factor: 2, normal: 100 });
  assert.ok(Math.abs(parseFloat(boiling[0][1]) - 0.512) < 1e-8);
  assert.ok(Math.abs(parseFloat(boiling[1][1]) - 100.512) < 1e-8);
});

test('chemistry batch 04 formulas reject invalid or ambiguous inputs', () => {
  assert.throws(() => batch04.electronegativity({ first: -1, second: 2 }), /non-negative finite value/);
  assert.throws(() => batch04.pka({ ka: 1e-5, pka: 5 }), /not both/);
  assert.throws(() => batch04.alligation({ high: 10, low: 10, target: 10, total: 10 }), /strictly between/);
  assert.throws(() => batch04.concentration({ mass: 1, volume: 0, molarMass: 10 }), /positive finite value/);
  assert.throws(() => batch04.mixing({ partsA: 0, partsB: 2, total: 10 }), /positive finite value/);
  assert.throws(() => batch04.raoult({ solventMoles: 1, soluteMoles: 0, purePressure: 3 }), /positive finite value/);
  assert.throws(() => batch04.actualYield({ theoretical: 10, actual: 8, percent: 80 }), /either an actual yield or a percent yield/);
  assert.throws(() => batch04.activation({ k1: 1, t1: 300, k2: 2, t2: 300 }), /different/);
  assert.throws(() => batch04.boiling({ molality: 0, kb: 0.5, factor: 2, normal: 100 }), /positive finite value/);
});

const batch05Source = fs.readFileSync(new URL('../assets/chemistry-calculators-batch05.js', 'file://' + __filename), 'utf8');
const batch05Context = {};
vm.runInNewContext(batch05Source, batch05Context);
const batch05 = batch05Context.FriendlyChemistryBatch05;

test('chemistry batch 05 formulas return expected reference values', () => {
  const afr = batch05.afr({ air: 14.7, fuel: 1, stoich: 14.7 });
  assert.ok(Math.abs(parseFloat(afr[1][1]) - 1) < 1e-8);

  const water = batch05.molecular({ formula: 'H2O' });
  assert.ok(Math.abs(parseFloat(water[0][1]) - 18.015) < 0.002);
  const calciumHydroxide = batch05.molecular({ formula: 'Ca(OH)2' });
  assert.ok(Math.abs(parseFloat(calciumHydroxide[0][1]) - 74.092) < 0.003);

  const activity = batch05.activity({ charge: 1, ionic: 0.1 });
  assert.ok(parseFloat(activity[1][1]) > 0 && parseFloat(activity[1][1]) < 1);

  const buffer = batch05.buffer({ total: 0.1, pka: 4.76, ph: 4.76 });
  assert.ok(Math.abs(parseFloat(buffer[0][1]) - (2.303 * 0.1 / 4)) < 1e-6);

  const neutral = batch05.neutralization({ acidM: 0.1, acidV: 25, acidCoeff: 1, baseM: 0.1, baseV: 50, baseCoeff: 2 });
  assert.match(neutral[2][1], /equivalence/);

  const percent = batch05.percentSolution({ mass: 5, volume: 100 });
  assert.ok(Math.abs(parseFloat(percent[0][1]) - 5) < 1e-8);

  const dilution = batch05.solutionDilution({ stock: 1, target: 0.1, final: 100 });
  assert.ok(Math.abs(parseFloat(dilution[0][1]) - 10) < 1e-8);
  assert.ok(Math.abs(parseFloat(dilution[1][1]) - 90) < 1e-8);

  const titration = batch05.titration({ sampleM: 0.1, sampleV: 25, analyteCoeff: 1, titrantM: 0.1, titrantCoeff: 1 });
  assert.ok(Math.abs(parseFloat(titration[0][1]) - 25) < 1e-8);

  const hardness = batch05.hardness({ calcium: 40, magnesium: 12 });
  assert.ok(Math.abs(parseFloat(hardness[0][1]) - 149.296) < 1e-6);

  const theoretical = batch05.theoretical({ reactantMass: 10, reactantMolar: 50, reactantCoeff: 1, productMolar: 80, productCoeff: 1 });
  assert.ok(Math.abs(parseFloat(theoretical[0][1]) - 16) < 1e-8);
});

test('chemistry batch 05 formulas reject unsupported or invalid inputs', () => {
  assert.throws(() => batch05.afr({ air: 1, fuel: 0, stoich: 14 }), /positive finite value/);
  assert.throws(() => batch05.molecular({ formula: 'XeF2' }), /not in this calculator/);
  assert.throws(() => batch05.molecular({ formula: 'Ca(OH2' }), /Missing closing parenthesis/);
  assert.throws(() => batch05.activity({ charge: 1, ionic: 0.6 }), /up to about 0.5/);
  assert.throws(() => batch05.buffer({ total: 0.1, pka: NaN, ph: 5 }), /valid pKa and pH/);
  assert.throws(() => batch05.solutionDilution({ stock: 0.1, target: 1, final: 100 }), /cannot exceed stock/);
  assert.throws(() => batch05.titration({ sampleM: 0.1, sampleV: 25, analyteCoeff: 1, titrantM: 0, titrantCoeff: 1 }), /positive finite value/);
  assert.throws(() => batch05.hardness({ calcium: -1, magnesium: 2 }), /non-negative finite value/);
});

const batch06Source = fs.readFileSync(new URL('../assets/chemistry-calculators-batch06.js', 'file://' + __filename), 'utf8');
const batch06Context = {};
vm.runInNewContext(batch06Source, batch06Context);
const batch06 = batch06Context.FriendlyChemistryBatch06;

test('chemistry batch 06 formulas return expected reference values', () => {
  const equilibrium = batch06.equilibrium({ a: 0.2, b: 0.2, c: 0.1, d: 0.1, na: 1, nb: 1, nc: 1, nd: 1 });
  assert.ok(Math.abs(parseFloat(equilibrium[0][1]) - 0.25) < 1e-8);

  const kp = batch06.kp({ kc: 0.5, temperature: 298.15, delta: -1 });
  assert.ok(Math.abs(parseFloat(kp[0][1]) - (0.5 / (0.082057366 * 298.15))) < 1e-6);

  const ratio = batch06.molarRatio({ known: 2, knownCoeff: 2, targetCoeff: 3 });
  assert.ok(Math.abs(parseFloat(ratio[0][1]) - 3) < 1e-8);

  const rate = batch06.rateConstant({ initial: 1, final: 0.5, time: 60 });
  assert.ok(Math.abs(parseFloat(rate[1][1]) - 60) < 1e-5);

  const quotient = batch06.reactionQuotient({ a: 0.2, b: 0.2, c: 0.1, d: 0.1, na: 1, nb: 1, nc: 1, nd: 1, kc: 1 });
  assert.match(quotient[1][1], /Forward direction favoured/);

  const entropy = batch06.entropy({ heat: 2.5, temperature: 298.15 });
  assert.ok(Math.abs(parseFloat(entropy[0][1]) - (2500 / 298.15)) < 1e-5);

  const freezing = batch06.freezing({ molality: 0.5, kf: 1.86, factor: 2, normal: 0 });
  assert.ok(Math.abs(parseFloat(freezing[0][1]) - 1.86) < 1e-8);
  assert.ok(Math.abs(parseFloat(freezing[1][1]) + 1.86) < 1e-8);

  const gibbs = batch06.gibbs({ enthalpy: -100, entropy: -200, temperature: 298.15 });
  assert.ok(Math.abs(parseFloat(gibbs[0][1]) - (-40.37)) < 0.02);

  const phase = batch06.phaseRule({ components: 2, phases: 2 });
  assert.equal(phase[0][1], '2');

  const q10 = batch06.q10({ rate1: 1, temp1: 20, rate2: 2, temp2: 30 });
  assert.ok(Math.abs(parseFloat(q10[0][1]) - 2) < 1e-8);
});

test('chemistry batch 06 formulas reject invalid physical and stoichiometric inputs', () => {
  assert.throws(() => batch06.equilibrium({ a: 0, b: 1, c: 1, d: 1, na: 1, nb: 1, nc: 1, nd: 1 }), /positive finite value/);
  assert.throws(() => batch06.kp({ kc: 1, temperature: 0, delta: 1 }), /positive finite value/);
  assert.throws(() => batch06.molarRatio({ known: 1, knownCoeff: 0, targetCoeff: 1 }), /positive whole-number coefficient/);
  assert.throws(() => batch06.rateConstant({ initial: 1, final: 2, time: 10 }), /cannot exceed initial/);
  assert.throws(() => batch06.reactionQuotient({ a: 1, b: 1, c: 1, d: 1, na: 1, nb: 1, nc: 1, nd: 1, kc: 0 }), /positive finite value/);
  assert.throws(() => batch06.freezing({ molality: 1, kf: 1, factor: 0, normal: 0 }), /positive finite value/);
  assert.throws(() => batch06.phaseRule({ components: 1, phases: 4 }), /negative degree/);
  assert.throws(() => batch06.q10({ rate1: 1, temp1: 20, rate2: 2, temp2: 20 }), /different valid temperatures/);
});

const batch07Source = fs.readFileSync(new URL('../assets/chemistry-calculators-batch07.js', 'file://' + __filename), 'utf8');
const batch07Context = {};
vm.runInNewContext(batch07Source, batch07Context);
const batch07 = batch07Context.FriendlyChemistryBatch07;

test('chemistry batch 07 formulas return expected reference values', () => {
  const stp = batch07.stp({ moles: 1, temperature: 273.15, pressure: 101.325 });
  assert.ok(Math.abs(parseFloat(stp[0][1]) - 22.414) < 0.02);

  const partial = batch07.partial({ component: 2, total: 5, pressure: 100 });
  assert.ok(Math.abs(parseFloat(partial[1][1]) - 40) < 1e-8);

  const vapor = batch07.vapor({ a: 8.07131, b: 1730.63, c: 233.426, temperature: 25 });
  assert.ok(parseFloat(vapor[0][1]) > 23 && parseFloat(vapor[0][1]) < 24);

  const water = batch07.waterVapor({ temperature: 25 });
  assert.ok(parseFloat(water[1][1]) > 3.1 && parseFloat(water[1][1]) < 3.3);

  const boiling = batch07.boilingPoint({ a: 8.07131, b: 1730.63, c: 233.426, pressure: 760 });
  assert.ok(Math.abs(parseFloat(boiling[0][1]) - 100) < 0.02);

  const altitude = batch07.altitudeBoil({ altitude: 0 });
  assert.ok(Math.abs(parseFloat(altitude[1][1]) - 100) < 0.05);

  const combustion = batch07.combustion({ mass: 1, energy: 44 });
  assert.ok(Math.abs(parseFloat(combustion[0][1]) - 44) < 1e-8);

  const osmotic = batch07.osmotic({ molarity: 0.1, factor: 1, temperature: 298.15 });
  assert.ok(Math.abs(parseFloat(osmotic[0][1]) - (0.1 * 0.082057366 * 298.15)) < 1e-6);

  const ionic = batch07.ionicStrength({ c1: 0.1, z1: 1, c2: 0.1, z2: -1, c3: 0, z3: 0, c4: 0, z4: 0 });
  assert.ok(Math.abs(parseFloat(ionic[0][1]) - 0.1) < 1e-8);

  const diffusion = batch07.diffusion({ temperature: 298.15, viscosity: 0.001, radius: 1 });
  const d = Number(diffusion[0][1].split(' ')[0]);
  assert.ok(d > 2.1e-10 && d < 2.3e-10);
});

test('chemistry batch 07 formulas reject invalid units and ranges', () => {
  assert.throws(() => batch07.stp({ moles: 1, temperature: 0, pressure: 100 }), /positive finite value/);
  assert.throws(() => batch07.partial({ component: 6, total: 5, pressure: 100 }), /cannot exceed/);
  assert.throws(() => batch07.waterVapor({ temperature: 101 }), /between 1 °C and 100 °C/);
  assert.throws(() => batch07.boilingPoint({ a: 8, b: 1000, c: 200, pressure: 0 }), /positive finite value/);
  assert.throws(() => batch07.altitudeBoil({ altitude: 12000 }), /between 0 and 11,000/);
  assert.throws(() => batch07.ionicStrength({ c1: 0.1, z1: 0, c2: 0, z2: 0, c3: 0, z3: 0, c4: 0, z4: 0 }), /non-zero integer charge/);
  assert.throws(() => batch07.diffusion({ temperature: 298, viscosity: 0, radius: 1 }), /positive finite value/);
});
