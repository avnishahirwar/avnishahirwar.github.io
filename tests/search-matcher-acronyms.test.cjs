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
