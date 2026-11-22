const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const script = pathToFileURL(path.join(__dirname, '..', 'scripts', 'translate-locales.mjs')).href;
let api;
test('load translator module', async () => {
  api = await import(script);
  assert.equal(typeof api.tokenizeHtml, 'function');
});

test('catalogue keeps all 50 configured locales available and does not queue them for translation', async () => {
  const catalogue = require('../config/language-catalogue.json').locales;
  assert.equal(catalogue.length, 50);
  assert.ok(catalogue.every(x => x.status === 'available'));
  assert.deepEqual(await api.loadPlannedLocales(), []);
  assert.ok(catalogue.some(x => x.direction === 'rtl'));
});

test('HTML tokenization excludes executable and code contents but leaves their markup untouched', () => {
  const html = '<p>Translate me <strong>please</strong></p><script>const label="do not translate";</script><code>x + 2</code>';
  const pieces = api.tokenizeHtml(html);
  const texts = pieces.filter(x => x.type === 'text').map(x => x.value);
  assert.deepEqual(texts, ['Translate me ', 'please']);
  assert.equal(pieces.map(x => x.value).join(''), html);
});

test('protected placeholders and numeric/formula tokens must survive exactly once', () => {
  const source = 'EMI {amount}: 12.5% on 120 months; ${result}';
  const protectedValue = api.protectedText(source);
  assert.ok(protectedValue.input.includes('ZXQKEEP'));
  assert.equal(api.restoreProtectedText(protectedValue.input, protectedValue.kept), source);
  assert.throws(() => api.restoreProtectedText('tokens removed', protectedValue.kept), /exactly once/);
});

test('draft translates only text nodes, sets target direction and enforces noindex', async () => {
  const source = '<!doctype html><html lang="en"><head><title>Hello world</title><meta name="robots" content="index,follow"><meta name="description" content="English metadata"></head><body><p>Calculate <b>your total</b>.</p><script>const x="Keep";</script></body></html>';
  const locale = { code: 'ar', direction: 'rtl', name: 'Arabic', nativeName: 'العربية' };
  const draft = await api.buildDraft(source, locale, async strings => strings.map(x => `X${x}X`));
  assert.match(draft, /<html lang="ar" dir="rtl">/);
  assert.match(draft, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(draft, /MACHINE-TRANSLATED REVIEW DRAFT: DO NOT PUBLISH/);
  assert.doesNotMatch(draft, /content="index,follow"/);
  assert.match(draft, /content="English metadata"/);
  assert.match(draft, /<script>const x="Keep";<\/script>/);
  assert.match(draft, /<b>Xyour totalX<\/b>/);
});

test('refuses empty translated output rather than silently erasing content', async () => {
  await assert.rejects(api.buildDraft('<p>Text</p>', { code: 'fr', direction: 'ltr' }, async () => ['']), /non-empty translated text strings/);
});

test('fails closed when source HTML cannot receive noindex metadata', async () => {
  await assert.rejects(api.buildDraft('<p>Text</p>', { code: 'fr', direction: 'ltr' }, async strings => strings), /must contain both <html> and <head>/);
});
