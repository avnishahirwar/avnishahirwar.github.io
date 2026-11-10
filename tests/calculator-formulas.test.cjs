const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(new URL('../assets/page-calculators.js', 'file://' + __filename), 'utf8');
const start = source.indexOf('const definitions = {');
const end = source.indexOf('\n  };\n  const money', start);
assert.notEqual(start, -1, 'Calculator definitions must exist in the shared calculator module');
assert.notEqual(end, -1, 'Calculator definitions must be a complete object');
const objectSource = source.slice(start + 'const definitions = '.length, end + '\n  }'.length);
const definitions = new Function('return (' + objectSource + ');')();

function calculate(name, values) {
  const definition = definitions[name];
  assert.ok(definition, 'Missing calculator definition: ' + name);
  return definition.calc(values);
}
function result(rows, label) {
  const row = rows.find(item => item[0] === label);
  assert.ok(row, 'Missing result row: ' + label);
  return row[1];
}

test('GST exclusive amount calculates tax and total', () => {
  const rows = calculate('gst calculator', {amount:10000,rate:18,mode:'Add GST'});
  assert.equal(result(rows,'GST amount'),1800);
  assert.equal(result(rows,'Total amount'),11800);
});
test('Loan EMI handles zero interest without division by zero', () => {
  const rows = calculate('loan emi calculator', {principal:120000,rate:0,years:1});
  assert.equal(result(rows,'Monthly EMI'),10000);
});
test('Fixed deposit quarterly compounding example', () => {
  const rows = calculate('fixed deposit calculator', {principal:10000,rate:10,years:1,frequency:'4'});
  assert.ok(Math.abs(result(rows,'Maturity value')-11038.13)<0.02);
});
test('EPF/PF zero-interest projection equals total contributions', () => {
  const rows = calculate('epf / pf calculator', {monthly:1000,rate:0,years:1});
  assert.equal(result(rows,'Illustrative accumulated value'),12000);
});
test('Savings interest uses a daily estimate', () => {
  const rows = calculate('savings account interest calculator', {principal:20000,rate:5,days:180});
  assert.ok(Math.abs(result(rows,'Estimated interest')-493.1506849)<0.001);
});
test('Salary calculator derives daily and hourly pay', () => {
  const rows = calculate('salary calculator', {monthly:30000,days:30,hours:8});
  assert.equal(result(rows,'Daily estimate'),1000);
  assert.equal(result(rows,'Hourly estimate'),125);
});
test('SIP tool is represented in the shared module only if published', () => {
  assert.ok(definitions['sip calculator'] || !source.includes('SIP Calculator'));
});
test('Inflation compounds annually', () => {
  const rows = calculate('inflation calculator', {amount:10000,rate:6,years:2});
  assert.ok(Math.abs(result(rows,'Estimated future cost')-11236)<0.001);
});
test('Fuel cost uses distance divided by mileage', () => {
  const rows = calculate('fuel cost calculator', {distance:100,mileage:20,price:100});
  assert.equal(result(rows,'Fuel required (litres)'),5);
  assert.equal(result(rows,'Estimated trip cost'),500);
});
test('Discount calculates savings and final price', () => {
  const rows = calculate('discount calculator', {amount:2000,rate:25});
  assert.equal(result(rows,'You save'),500);
  assert.equal(result(rows,'Final price'),1500);
});
test('Age calculator handles a simple full-year interval', () => {
  const rows = calculate('age calculator', {dob:'2000-01-01',asof:'2020-01-01'});
  assert.equal(result(rows,'Age'),'20 years, 0 months, 0 days');
});
test('Electricity bill adds energy, fixed and other charges', () => {
  const rows = calculate('electricity bill calculator', {units:200,rate:6,fixed:100,other:20});
  assert.equal(result(rows,'Estimated bill'),1320);
});
test('Profit and loss percentage uses cost price as denominator', () => {
  const rows = calculate('profit & loss calculator', {cost:100,selling:80});
  assert.equal(result(rows,'Loss'),20);
  assert.equal(result(rows,'Percentage on cost'),20);
});
