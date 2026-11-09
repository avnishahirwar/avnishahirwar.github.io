const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync(new URL('../index.html', 'file://' + __filename), 'utf8');

function extractFunction(name) {
  const start = html.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, 'Missing application function: ' + name);
  const open = html.indexOf('{', start);
  let depth = 0, quote = null, escaped = false, lineComment = false, blockComment = false;
  for (let i = open; i < html.length; i++) {
    const c = html[i], next = html[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && next === '/') { lineComment = true; i++; continue; }
    if (c === '/' && next === '*') { blockComment = true; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('Unclosed function: ' + name);
}

const taxHelpers = ['slabTax', 'taxAfterRebate', 'taxWithSurcharge'].map(extractFunction).join('\n');

function calculate(name, values, selectValues = {}) {
  const output = {};
  const elements = {
    ...Object.fromEntries(Object.entries(values).map(([id, value]) => [id, { value: String(value) }])),
    ...Object.fromEntries(Object.entries(selectValues).map(([id, value]) => [id, { value: String(value) }]))
  };
  const document = { getElementById: id => elements[id] || { value: '', classList: { toggle() {} } } };
  const val = id => Number(elements[id]?.value);
  const fmt = number => '₹' + Number(number).toFixed(2);
  const helpers = ['calcTax', 'calcTDS'].includes(name) ? taxHelpers : '';
  const factory = new Function('val', 'show', 'fmt', 'renderChart', 'document',
    helpers + '\n' + extractFunction(name) + '\nreturn ' + name + ';');
  const fn = factory(val, (id, message) => { output[id] = message; }, fmt, () => {}, document);
  fn();
  return Object.values(output).join(' ');
}

test('GST exclusive amount calculates tax and total', () => {
  assert.match(calculate('calcGST', { gstAmount: 10000, gstRate: 18 }, { gstMode: 'exclusive' }), /GST: ₹1800\.00.*Total: ₹11800\.00/);
});
test('EMI handles zero interest without division by zero', () => {
  assert.match(calculate('calcEMI', { loan: 120000, rate: 0, years: 1 }), /Monthly EMI: ₹10000\.00/);
});
test('EMI standard amortization example', () => {
  assert.match(calculate('calcEMI', { loan: 100000, rate: 12, years: 1 }), /Monthly EMI: ₹8884\.88/);
});
test('discount calculates savings and payable amount', () => {
  assert.match(calculate('calcDiscount', { original: 2000, discount: 25 }), /You save: ₹500\.00.*Final price: ₹1500\.00/);
});
test('FD quarterly compounding example', () => {
  assert.match(calculate('calcFD', { fdPrincipal: 10000, fdRate: 10, fdYears: 1, fdFrequency: 4 }), /Maturity value: ₹11038\.13/);
});
test('PF projection with zero interest', () => {
  assert.match(calculate('calcPF', { pfMonthly: 1000, pfRate: 0, pfYears: 1 }), /Estimated PF balance: ₹12000\.00/);
});
test('savings interest uses simple daily estimate', () => {
  assert.match(calculate('calcSavings', { savBalance: 20000, savRate: 5, savDays: 180 }), /Estimated interest: ₹493\.15/);
});
test('salary hourly and daily values', () => {
  assert.match(calculate('calcSalary', { salaryMonthly: 30000, salaryDays: 30, salaryHours: 8 }), /Per Hour Salary: ₹125\.00.*Per Day Salary: ₹1000\.00/);
});
test('SIP zero-return case equals invested principal', () => {
  assert.match(calculate('calcSIP', { sipMonthly: 1000, sipRate: 0, sipYears: 1 }), /Estimated future value: ₹12000\.00/);
});
test('inflation compounds annually', () => {
  assert.match(calculate('calcInflation', { inflAmount: 10000, inflRate: 6, inflYears: 2 }), /Estimated future cost: ₹11236\.00/);
});
test('adult BMI calculation example', () => {
  assert.match(calculate('calcBMI', { bmiAge: 25, bmiHeightUnit: 'cm', bmiHeightCm: 170, bmiFeet: 5, bmiInches: 7, bmiWeightUnit: 'kg', bmiWeight: 70 }), /BMI: 24\.2/);
});
test('BMI does not apply adult categories to under-18 users', () => {
  assert.match(calculate('calcBMI', { bmiAge: 16, bmiHeightUnit: 'cm', bmiHeightCm: 170, bmiFeet: 5, bmiInches: 7, bmiWeightUnit: 'kg', bmiWeight: 60 }), /not suitable/);
});
test('fuel cost example', () => {
  assert.match(calculate('calcFuel', { fuelDistance: 100, fuelMileage: 20, fuelPrice: 100 }), /Total fuel cost: ₹500\.00/);
});
test('new-regime salary example applies standard deduction and rebate', () => {
  assert.match(calculate('calcTax', { taxIncome: 1200000, taxDeductions: 0 }, { taxRegime: 'new', taxIncomeType: 'salary', taxResident: 'resident', taxAgeGroup: 'below60' }), /Estimated total tax: ₹0\.00/);
});
test('TDS estimate uses same tax calculation assumptions', () => {
  assert.match(calculate('calcTDS', { tdsSalary: 1200000, tdsDeductions: 0, tdsPaid: 0, tdsMonths: 12 }, { tdsRegime: 'new', tdsResident: 'resident', tdsAgeGroup: 'below60' }), /Estimated annual tax: ₹0\.00/);
});
test('age calculation handles leap-day birthdays', () => {
  assert.match(calculate('calcAge', { ageDob: '2000-02-29', ageAsOf: '2021-02-28' }), /Age: 20 years, 11 months, 30 days/);
});
test('electricity bill adds energy, fixed and other charges', () => {
  assert.match(calculate('calcElectricity', { electricityUnits: 200, electricityRate: 6, electricityFixed: 100, electricityOther: 20 }), /Estimated bill: ₹1320\.00/);
});
test('profit and loss percentage uses cost price as denominator', () => {
  assert.match(calculate('calcPL', { plCost: 100, plSelling: 80 }), /LOSS: ₹20\.00.*20\.00%/);
});
