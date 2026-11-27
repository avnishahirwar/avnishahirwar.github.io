'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { getCalculatorMatch } = require('../assets/calculator-search-matcher.js');

test('short acronyms match exact calculator tokens without emission false positives', () => {
  const emission = {
    name: 'CO₂ Breathing Emission Calculator',
    category: 'Biology & Chemistry',
    keywords: 'carbon dioxide breathing emission estimate',
    description: 'Estimate carbon dioxide from breathing.'
  };
  const emi = {
    name: 'Loan EMI Calculator',
    category: 'Loans, EMI & Credit',
    keywords: 'emi loan installment monthly payment',
    description: 'Estimate a loan instalment.'
  };
  assert.equal(getCalculatorMatch(emission, ['emi'], 'emi', emission.category), null);
  assert.notEqual(getCalculatorMatch(emi, ['emi'], 'emi', emi.category), null);
});

test('GST, SIP and VAT acronyms remain searchable', () => {
  for (const [name, term] of [
    ['GST Calculator', 'gst'],
    ['SIP Calculator', 'sip'],
    ['VAT Calculator', 'vat']
  ]) {
    assert.notEqual(
      getCalculatorMatch({ name, category: 'Finance', keywords: '', description: '' }, [term], term, 'Finance'),
      null,
      name + ' should match ' + term
    );
  }
});

test('longer partial words still match their intended calculator names', () => {
  const item = {
    name: 'Percentage Increase Calculator',
    category: 'Mathematics',
    keywords: '',
    description: ''
  };
  assert.notEqual(getCalculatorMatch(item, ['percent'], 'percent', 'Mathematics'), null);
});


test('homepage defers the search matcher and initializes search after deferred scripts', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const matcherPosition = html.indexOf('<script src="/assets/calculator-search-matcher.js"');
  assert.notEqual(matcherPosition, -1, 'homepage includes the shared calculator search matcher');
  const matcherTagEnd = html.indexOf('>', matcherPosition);
  const matcherTag = html.slice(matcherPosition, matcherTagEnd + 1);
  assert.ok(matcherTag.includes(' defer'), 'search matcher must not block HTML parsing');
  const bootstrap = html.indexOf("document.addEventListener('DOMContentLoaded',()=>{", matcherTagEnd);
  assert.ok(bootstrap > matcherTagEnd, 'homepage search bootstrap waits until deferred scripts have executed');
  assert.equal(html.split('calculator-search-matcher.js').length - 1, 1, 'homepage loads the matcher once');
});
