'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const modulePath = path.join(ROOT, 'assets', 'calculator-education-sections.js');
const shellPath = path.join(ROOT, 'assets', 'site-shell.js');
const stylesPath = path.join(ROOT, 'assets', 'site-shell.css');

test('calculator education module includes the four requested learning areas', () => {
  const source = fs.readFileSync(modulePath, 'utf8');
  for (const label of [
    'How Is the Calculation Done?',
    'Example',
    'History',
    'Interesting Facts',
  ]) {
    assert.ok(source.includes(label), 'Missing learning area: ' + label);
  }
});

test('calculator education module is limited to individual calculator pages', () => {
  const source = fs.readFileSync(modulePath, 'utf8');
  assert.ok(source.includes('calculators'));
  assert.ok(source.includes("get('embed') === '1'"));
  assert.ok(source.includes('approvedTopic'));
  assert.match(source, /if \(!approvedTopic\.test/);
  assert.ok(source.includes("querySelector('form, [data-fc-native-calculator]"));
});

test('missing topic-specific information is marked for editorial verification', () => {
  const source = fs.readFileSync(modulePath, 'utf8');
  assert.ok(source.includes('FC_EQUATION_CONFIG'));
  assert.ok(source.includes('still need editorial verification'));
  assert.ok(source.includes('checked against reliable sources'));
  assert.ok(source.includes('textContent ='));
  assert.ok(!source.includes('innerHTML ='));
});

test('shared shell loads the learning module only on calculator routes', () => {
  const shell = fs.readFileSync(shellPath, 'utf8');
  assert.ok(shell.includes('calculator-education-sections.js'));
  assert.ok(shell.includes('isCalculatorPageRoute'));
  assert.ok(shell.includes('__fcCalculatorEducationLoaded'));
});

test('learning panel styling supports responsive and dark themes', () => {
  const css = fs.readFileSync(stylesPath, 'utf8');
  assert.ok(css.includes('.fc-learning-sections'));
  assert.ok(css.includes('.fc-learning-grid'));
  assert.ok(css.includes('.fc-learning-card'));
  assert.ok(css.includes('data-fc-theme="dark"'));
  assert.ok(css.includes('@media (max-width: 620px)'));
});
