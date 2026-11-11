const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

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
  const instrumented = source.replace(/\\}\\)\\(\\);\\s*$/, 'globalThis.__calculatorDefinitions = definitions;\\n})();');
  assert.notEqual(instrumented, source, 'Formula engine wrapper should be instrumentable');
  const sandbox = {
    document: { readyState: 'loading', addEventListener() {} },
    globalThis: {}
  };
  vm.runInNewContext(instrumented, sandbox, { timeout: 1000 });
  return sandbox.globalThis.__calculatorDefinitions;
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
      ['Monthly EMI', 10379.18], ['Total repayment', 622750.8], ['Total interest', 122750.8]
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
      ['Tax before rebate', 60000], ['Indicative rebate', 60000], ['Estimated tax including cess', 0]
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
