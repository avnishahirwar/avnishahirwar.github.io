const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const pageFiles = {
  paycheck: 'calculators/paycheck-calculator.html',
  nationalInsurance: 'calculators/national-insurance-calculator.html',
  superannuation: 'calculators/superannuation-calculator.html',
  zakat: 'calculators/zakat-calculator.html'
};
function readPage(key) { return fs.readFileSync(path.join(root, pageFiles[key]), 'utf8'); }
function makePageContext(html) {
  const elements = new Map();
  for (const tag of html.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"[^>]*>/gi)) {
    const id = tag[1], attrs = tag[0];
    let value = (attrs.match(/\bvalue="([^"]*)"/i) || [])[1] || '';
    if (/<select\b/i.test(attrs)) {
      const rest = html.slice(tag.index, html.indexOf('</select>', tag.index));
      value = ((rest.match(/<option\b[^>]*selected[^>]*value="([^"]+)"/i) || rest.match(/<option\b[^>]*value="([^"]+)"[^>]*selected/i) || [])[1]) || value;
    }
    elements.set(id, { value, textContent: '', handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; }, click() { this.handlers.click?.(); } });
  }
  const document = { getElementById(id) { if (!elements.has(id)) elements.set(id, { value: '', textContent: '', handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; }, click() { this.handlers.click?.(); } }); return elements.get(id); } };
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(m => m[1]).find(s => s.includes('addEventListener'));
  assert.ok(script, 'Page must contain its calculator interaction script');
  vm.runInNewContext(script, { document, Intl }, { timeout: 1000 });
  return { elements, document };
}
function setValues(ctx, values) { for (const [id, value] of Object.entries(values)) ctx.elements.get(id).value = String(value); }
function click(ctx) { ctx.elements.get('calculate').click(); }

test('new calculator pages have unique canonicals, indexable metadata, shared shell and FAQ schema', () => {
  const canonicals = new Set();
  for (const [key, file] of Object.entries(pageFiles)) {
    const html = readPage(key);
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/i) || [])[1];
    assert.ok(canonical, file + ' canonical missing');
    assert.ok(!canonicals.has(canonical), 'Duplicate canonical: ' + canonical);
    canonicals.add(canonical);
    assert.match(html, /<title>[^<]+<\/title>/i);
    assert.match(html, /<meta name="description" content="[^"]{40,}"/i);
    assert.match(html, /<meta name="robots" content="index,follow/i);
    assert.ok(html.includes('/assets/site-shell.js'), file + ' shared shell script missing');
    assert.match(html, /"@type":"FAQPage"/);
    assert.match(html, /"@type":"WebApplication"/);
  }
});

test('paycheck calculator correctly subtracts entered deductions and annualizes pay', () => {
  const ctx = makePageContext(readPage('paycheck'));
  click(ctx);
  assert.match(ctx.elements.get('net').textContent, /1,875/);
  assert.match(ctx.elements.get('breakdown').textContent, /48,750/);
  setValues(ctx, { gross: 1000, tax: 1001, social: 0, pretax: 0, posttax: 0 });
  click(ctx);
  assert.match(ctx.elements.get('error').textContent, /do not exceed gross pay/i);
});

test('UK National Insurance calculator applies 2026–27 standard category A bands', () => {
  const ctx = makePageContext(readPage('nationalInsurance'));
  click(ctx);
  assert.match(ctx.elements.get('total').textContent, /2,194\.40/);
  setValues(ctx, { earnings: 60000 });
  click(ctx);
  assert.match(ctx.elements.get('total').textContent, /3,210\.60/);
});

test('Australian superannuation calculator applies 12% and the annual contribution base', () => {
  const ctx = makePageContext(readPage('superannuation'));
  click(ctx);
  assert.match(ctx.elements.get('contribution').textContent, /10,200/);
  setValues(ctx, { earnings: 400000 });
  click(ctx);
  assert.match(ctx.elements.get('contribution').textContent, /32,499\.60/);
});

test('Zakat calculator uses entered Nisab, net eligible wealth and selected rate', () => {
  const ctx = makePageContext(readPage('zakat'));
  setValues(ctx, { cash: 50000, gold: 5000, business: 0, investments: 0, other: 0, liabilities: 10000, nisab: 30000, rate: 2.5 });
  click(ctx);
  assert.match(ctx.elements.get('due').textContent, /1,125/);
  assert.match(ctx.elements.get('detail').textContent, /Threshold met/);
  setValues(ctx, { nisab: 50000 });
  click(ctx);
  assert.match(ctx.elements.get('due').textContent, /0\.00/);
});
