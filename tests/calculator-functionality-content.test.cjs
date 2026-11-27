'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../assets/generated-equation-calculator.js');
const dates = require('../assets/date-offset-calculator.js');

const root = path.resolve(__dirname, '..');
function page(file) {
  return fs.readFileSync(path.join(root, 'calculators', file), 'utf8');
}
function embeddedConfig(html) {
  const match = html.match(/window\\.FC_EQUATION_CONFIG="((?:\\\\.|[^"])*)";/);
  assert.ok(match, 'calculator must expose its equation configuration');
  return JSON.parse(JSON.parse('"' + match[1] + '"'));
}
function closeTo(actual, expected, tolerance) {
  assert.ok(Number.isFinite(actual), 'calculation must return a finite number');
  assert.ok(Math.abs(actual - expected) <= tolerance, actual + ' should be within ' + tolerance + ' of ' + expected);
}

test('calendar-day arithmetic handles month ends, leap years and invalid dates', () => {
  assert.equal(dates.addCalendarDays('2025-01-01', 100), '2025-04-11');
  assert.equal(dates.addCalendarDays('2025-01-01', 30), '2025-01-31');
  assert.equal(dates.addCalendarDays('2024-01-31', 30), '2024-03-01');
  assert.equal(dates.addCalendarDays('2024-02-20', 10), '2024-03-01');
  assert.equal(dates.addCalendarDays('2025-02-29', 1), '');
  assert.equal(dates.addCalendarDays('2025-01-01', -1), '');
  assert.equal(dates.weekday('2025-04-11'), 'Friday');
});

test('100-day and 30-day pages use the dedicated date calculator and explain the result', () => {
  for (const [file, days] of [['100-day-calculator.html', '100'], ['30-day-calculator.html', '30']]) {
    const html = page(file);
    assert.match(html, new RegExp('data-date-offset="' + days + '"'));
    assert.match(html, /name="startDate"/);
    assert.match(html, /assets\\/date-offset-calculator\\.js/);
    assert.doesNotMatch(html, /generated-equation-calculator\\.js/);
    assert.match(html, /Formula and calculation method/);
    assert.match(html, /Worked example/);
    assert.match(html, /Assumptions and limitations/);
    assert.match(html, /Interesting fact/);
    assert.match(html, /Frequently asked questions/);
  }
});

test('16:9 calculator solves exact dimensions in either direction', () => {
  const html = page('16-9-aspect-ratio-calculator.html');
  const eqs = engine.prepare(embeddedConfig(html));
  const fromWidth = engine.solve(eqs, { width: 1920 });
  const fromHeight = engine.solve(eqs, { height: 1080 });
  closeTo(fromWidth.derived.height, 1080, 1e-9);
  closeTo(fromHeight.derived.width, 1920, 1e-9);
  assert.match(html, /Worked example/);
  assert.match(html, /Assumptions and limitations/);
  assert.match(html, /Interesting fact/);
  assert.match(html, /Frequently asked questions/);
});

test('2D distance calculator returns the Euclidean distance and explains inverse-solution limits', () => {
  const html = page('2d-distance-calculator.html');
  const eqs = engine.prepare(embeddedConfig(html));
  const result = engine.solve(eqs, { x1: 1, y1: 2, x2: 4, y2: 6 });
  closeTo(result.derived.distance, 5, 1e-12);
  assert.match(html, /Distance = √\\(\\(x₂ − x₁\\)² \\+ \\(y₂ − y₁\\)²\\)/);
  assert.match(html, /positive-root branch/);
  assert.match(html, /Worked example/);
  assert.match(html, /Assumptions and limitations/);
  assert.match(html, /Interesting fact/);
  assert.match(html, /Frequently asked questions/);
});
