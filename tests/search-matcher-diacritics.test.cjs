'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, getCalculatorMatch } = require('../assets/calculator-search-matcher.js');

for (const [name, query] of [
  ['Alfvén Velocity Calculator', 'alfven'],
  ['Möbius Strip Calculator', 'mobius'],
  ['Vigenère Cipher Calculator', 'vigenere'],
  ['Louise Glück Poetry Calculator', 'gluck']
]) {
  test('plain spelling finds ' + name, () => {
    const item = { name, keywords: '', category: 'Other' };
    assert.notEqual(getCalculatorMatch(item, [query], query, 'Other'), null);
  });
}

test('composed and decomposed accents normalize to the same whole word', () => {
  assert.equal(normalize('Möbius'), 'mobius');
  assert.equal(normalize('Mo\u0308bius'), 'mobius');
  assert.equal(normalize('Alfvén Velocity'), 'alfven velocity');
});

test('removing accents does not make EMI match emission', () => {
  const item = { name: 'Émission Calculator', category: 'Science', keywords: '' };
  assert.equal(getCalculatorMatch(item, ['emi'], 'emi', 'Science'), null);
});
