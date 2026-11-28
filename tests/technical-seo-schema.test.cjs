'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const pages = [
  'calculators/income-tax-calculator.html',
  'calculators/gst-calculator.html',
  'calculators/fd-calculator.html',
  'calculators/loan-emi-calculator.html',
  'calculators/swp-calculator.html'
];

function parseJsonLd(html, file) {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return scripts.map((match, index) => {
    try { return JSON.parse(match[1]); }
    catch (error) { assert.fail(file + ' JSON-LD block ' + (index + 1) + ' is invalid: ' + error.message); }
  });
}

function flattenTypes(value, output = []) {
  if (!value || typeof value !== 'object') return output;
  if (typeof value['@type'] === 'string') output.push(value);
  if (Array.isArray(value['@graph'])) value['@graph'].forEach(item => flattenTypes(item, output));
  return output;
}

test('priority calculator pages expose one accurate static WebApplication and preserve page schemas', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.match(shell, /function injectVisibleCalculatorFaqSchema/);

  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const canonicalTag = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0] || '';
    const canonical = canonicalTag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    assert.ok(canonical && canonical.startsWith('https://friendlycalculator.in/'), file + ' must have a canonical HTTPS URL');

    const h1 = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')
      .replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const metaDescription = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const blocks = parseJsonLd(html, file);
    const objects = blocks.flatMap(block => flattenTypes(block));
    const apps = objects.filter(item => item['@type'] === 'WebApplication' || item['@type'] === 'SoftwareApplication');

    assert.equal(apps.length, 1, file + ' must contain exactly one static application schema object');
    assert.equal(apps[0].url, canonical, file + ' application URL must match canonical');
    assert.equal(apps[0]['@id'], canonical + '#application', file + ' application @id must be unique to the canonical page');
    assert.equal(apps[0].name, h1, file + ' application name must match the visible H1');
    assert.equal(apps[0].description, metaDescription, file + ' application description must match visible page metadata');
    assert.equal(apps[0].isAccessibleForFree, true, file + ' must accurately identify the free public tool');
    assert.equal(apps[0].offers?.price, '0', file + ' must use the public zero-price offer');
    assert.equal(apps[0].offers?.priceCurrency, 'INR', file + ' must use the Indian display currency');
    assert.equal(apps[0].publisher?.name, 'Friendly Calculator', file + ' must identify the publisher');
    assert.ok(apps[0].applicationCategory, file + ' must declare an application category');
    assert.ok(!/\[[A-Z_]+\]/.test(apps[0].description), file + ' must not contain placeholder text');

    assert.ok(objects.some(item => item['@type'] === 'WebPage'), file + ' must retain WebPage schema');
    assert.ok(objects.some(item => item['@type'] === 'BreadcrumbList'), file + ' must retain BreadcrumbList');
    assert.match(html, /<details[\s\S]*?<summary/i, file + ' must retain visible FAQ content');
    assert.ok(objects.some(item => item['@type'] === 'FAQPage'), file + ' must retain matching FAQPage schema');

  }
});

function runApplicationSchemaInjector({ pathname = '/calculators/example-tax-calculator.html', lang = 'en', existing = [] } = {}) {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const start = shell.indexOf('function injectCalculatorApplicationSchema(){');
  const invocation = '\\ninjectCalculatorApplicationSchema();';
  const end = shell.indexOf(invocation, start);
  assert.ok(start >= 0 && end > start, 'The shared application-schema injector must be present');
  const source = shell.slice(start, end + invocation.length);
  const appended = [];
  const canonical = 'https://friendlycalculator.in' + pathname;
  const selectors = {
    'link[rel="canonical"]': { href: canonical },
    'main h1,h1': { textContent: 'Example Tax Calculator' },
    'meta[name="description"]': { content: 'Calculate an example tax amount with clear assumptions.' }
  };
  const document = {
    documentElement: { lang },
    querySelectorAll(selector) {
      assert.equal(selector, 'script[type="application/ld+json"]');
      return existing;
    },
    querySelector(selector) { return selectors[selector] || null; },
    createElement(tagName) {
      return { tagName: tagName.toUpperCase(), dataset: {}, type: '', textContent: '' };
    },
    head: { appendChild(node) { appended.push(node); } }
  };
  const window = { location: { pathname, href: canonical } };
  vm.runInNewContext(source, { window, document, URL, JSON });
  return appended;
}

test('application schema injector emits accurate JSON-LD in an isolated browser context', () => {
  const appended = runApplicationSchemaInjector({ pathname: '/calculators/example-tax-calculator.html', lang: 'hi' });
  assert.equal(appended.length, 1);
  assert.equal(appended[0].type, 'application/ld+json');
  const schema = JSON.parse(appended[0].textContent);
  assert.equal(schema['@type'], 'WebApplication');
  assert.equal(schema.url, 'https://friendlycalculator.in/calculators/example-tax-calculator.html');
  assert.equal(schema.name, 'Example Tax Calculator');
  assert.equal(schema.description, 'Calculate an example tax amount with clear assumptions.');
  assert.equal(schema.inLanguage, 'hi');
  assert.equal(schema.applicationCategory, 'FinanceApplication');
  assert.equal(schema.isAccessibleForFree, true);
  assert.equal(schema.offers.price, '0');
  assert.equal(schema.provider.name, 'Friendly Calculator');
});

test('application schema injector does not duplicate existing application schema', () => {
  const existing = [{
    textContent: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Existing Calculator'
    })
  }];
  const appended = runApplicationSchemaInjector({ existing });
  assert.equal(appended.length, 0);
});

test('application schema injector ignores non-calculator routes', () => {
  const appended = runApplicationSchemaInjector({ pathname: '/about.html' });
  assert.equal(appended.length, 0);
});
