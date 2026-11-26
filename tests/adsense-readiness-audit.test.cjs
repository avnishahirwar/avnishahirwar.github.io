'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { countWords, extractPublisherIds, isNoindex } = require('../scripts/adsense-readiness-audit.cjs');

test('detects robots noindex regardless of attribute order', () => {
  assert.equal(isNoindex('<meta name="robots" content="noindex,follow">'), true);
  assert.equal(isNoindex('<meta content="noindex" name="googlebot">'), true);
  assert.equal(isNoindex('<meta name="robots" content="index,follow">'), false);
});

test('extracts AdSense publisher association IDs', () => {
  assert.deepEqual(
    extractPublisherIds('<meta name="google-adsense-account" content="ca-pub-1234567890123456">'),
    ['ca-pub-1234567890123456']
  );
  assert.deepEqual(extractPublisherIds('<meta name="description" content="hello">'), []);
});

test('counts visible text approximately and excludes scripts/styles', () => {
  const words = countWords('<main><h1>Useful calculator guide</h1><p>Formula and example</p><script>hidden tracking code</script><style>.x{}</style></main>');
  assert.equal(words, 7);
});
