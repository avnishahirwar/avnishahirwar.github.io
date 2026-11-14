const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(new URL('../assets/keyword-calculators.js', 'file://' + __filename), 'utf8');
function loadDefinitions() {
  const end = source.lastIndexOf('})();');
  assert.ok(end >= 0);
  const instrumented = source.slice(0, end) + 'globalThis.__calculatorDefinitions = defs;\n' + source.slice(end);
  const sandbox = { document: { readyState: 'loading', addEventListener() {} } };
  vm.runInNewContext(instrumented, sandbox, { timeout: 1000 });
  return sandbox.__calculatorDefinitions;
}
function close(actual, expected, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= tolerance, actual + ' should be close to ' + expected);
}
test('home and productivity expansion registers all eight original calculators', () => {
  const defs = loadDefinitions();
  for (const key of ['appliance-energy-cost','electricity-single-usage','data-usage','meeting-cost','words-per-minute','speaking-time','paper-weight','pomodoro-planner']) {
    assert.ok(defs[key], 'missing formula: ' + key);
    assert.ok(Array.isArray(defs[key].fields) && typeof defs[key].calc === 'function');
  }
});
test('appliance energy and single-use electricity formulas return correct estimates', () => {
  const d = loadDefinitions();
  const a = d['appliance-energy-cost'].calc({watts:1000,quantity:1,hoursPerDay:3,daysPerMonth:30,tariff:7});
  close(a[1][1],90); close(a[2][1],630);
  const b = d['electricity-single-usage'].calc({watts:1500,quantity:1,minutes:30,tariff:7});
  close(b[0][1],0.75); close(b[1][1],5.25);
});
test('data usage and meeting cost formulas use entered periods and attendees', () => {
  const d = loadDefinitions();
  const a = d['data-usage'].calc({videoHours:1,videoRate:1.5,musicHours:1,musicRate:0.1,browsingHours:2,browsingRate:0.15,days:30});
  close(a[0][1],1.9); close(a[1][1],57);
  const b = d['meeting-cost'].calc({participants:8,hourlyCost:500,minutes:60,meetings:4});
  close(b[1][1],4000); close(b[2][1],16000);
});
test('typing speed and speaking duration handle errors and rounded seconds', () => {
  const d = loadDefinitions();
  const a = d['words-per-minute'].calc({words:300,minutes:5,errors:3});
  close(a[0][1],60); close(a[1][1],59.4); close(a[2][1],99);
  const b = d['speaking-time'].calc({words:750,rate:130,pauses:30});
  assert.equal(b[1][1],'6 min 16 sec');
  assert.deepEqual(d['speaking-time'].calc({words:1,rate:1,pauses:0})[1][1],'1 min 00 sec');
});
test('paper batch mass and Pomodoro session totals are consistent', () => {
  const d = loadDefinitions();
  const a = d['paper-weight'].calc({width:21,height:29.7,gsm:80,sheets:500});
  close(a[2][1],2.4948);
  const b = d['pomodoro-planner'].calc({sessions:4,focus:25,shortBreak:5,longBreak:15,longEvery:4});
  close(b[0][1],100); close(b[1][1],15); close(b[2][1],115);
});
test('new formulas reject invalid or out-of-range inputs', () => {
  const d = loadDefinitions();
  assert.equal(d['electricity-single-usage'].calc({watts:1000,quantity:1,minutes:2000,tariff:7}).length,0);
  assert.equal(d['data-usage'].calc({videoHours:25,videoRate:1,musicHours:0,musicRate:0,browsingHours:0,browsingRate:0,days:30}).length,0);
  assert.equal(d['words-per-minute'].calc({words:10,minutes:1,errors:11}).length,0);
  assert.equal(d['paper-weight'].calc({width:0,height:10,gsm:80,sheets:1}).length,0);
  assert.equal(d['pomodoro-planner'].calc({sessions:0,focus:25,shortBreak:5,longBreak:15,longEvery:4}).length,0);
});
