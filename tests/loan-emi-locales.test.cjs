const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const locales = ['en', 'hi', 'es', 'fr', 'pt', 'ar', 'id', 'bn', 'ta', 'de', 'ja', 'ru'];
const alternateLocales = [...locales, 'x-default'];
const routeFor = locale => locale === 'en'
  ? 'calculators/loan-emi-calculator.html'
  : path.join(locale, 'calculators/loan-emi-calculator.html');
const urlFor = locale => locale === 'en'
  ? 'https://friendlycalculator.in/calculators/loan-emi-calculator.html'
  : 'https://friendlycalculator.in/' + locale + '/calculators/loan-emi-calculator.html';

test('Loan EMI language pages have canonical URLs and one reciprocal hreflang cluster', () => {
  for (const locale of locales) {
    const file = routeFor(locale);
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const lang = (html.match(/<html lang="([^"]+)"/) || [])[1];
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)]
      .map(match => ({ locale: match[1], url: match[2] }));

    assert.equal(lang, locale, file + ' must declare its language');
    assert.equal(canonical, urlFor(locale), file + ' must be self-canonical');
    assert.match(html, /<meta name="robots" content="index,follow/);
    assert.ok(html.includes('/assets/site-shell.js'));
    assert.deepEqual(alternates.map(item => item.locale), alternateLocales, file + ' must expose the complete alternate cluster once');
    for (const alternate of locales) {
      const item = alternates.find(candidate => candidate.locale === alternate);
      assert.equal(item.url, urlFor(alternate), file + ' has an incorrect ' + alternate + ' alternate');
    }
    assert.equal(alternates.find(item => item.locale === 'x-default').url, urlFor('en'));
  }
});

test('German, Japanese and Russian loan EMI forms validate inputs and use the same reducing-balance formula', () => {
  for (const locale of ['de', 'ja', 'ru']) {
    const html = fs.readFileSync(path.join(root, routeFor(locale)), 'utf8');
    assert.match(html, /<form id="fc-loan-form"/);
    assert.match(html, /id="fc-principal" type="number" min="1" max="1000000000000"[^>]*required/);
    assert.match(html, /id="fc-rate" type="number" min="0" max="100"[^>]*required/);
    assert.match(html, /id="fc-years" type="number" min="0" max="50"[^>]*required/);
    assert.match(html, /id="fc-extra" type="number" min="0" max="11"[^>]*required/);
    assert.match(html, /r=annual\/1200/);
    assert.match(html, /r===0\?p\/n:p\*r\*Math\.pow\(1\+r,n\)\/\(Math\.pow\(1\+r,n\)-1\)/);
    assert.match(html, /annual>=0&&annual<=100/);
    assert.match(html, /Number\.isInteger\(years\)/);
    assert.match(html, /Number\.isInteger\(extra\)/);
    assert.match(html, /window\.addEventListener\('fc:locale-ready',render\)/);
    assert.match(html, /window\.addEventListener\('fc:localechange',render\)/);
    assert.match(html, /"@type":"WebApplication"/);
    assert.match(html, /"@type":"FAQPage"/);
  }
});

test('new loan EMI translations are listed in their locale sitemaps and sitemap index', () => {
  for (const locale of ['de', 'ja', 'ru']) {
    const url = urlFor(locale);
    const sitemap = fs.readFileSync(path.join(root, 'sitemap-' + locale + '.xml'), 'utf8');
    assert.equal(sitemap.split(url).length - 1, 1, locale + ' sitemap must include its new page exactly once');
    assert.match(sitemap, new RegExp('<lastmod>2026-11-19</lastmod>'));
  }
  const index = fs.readFileSync(path.join(root, 'sitemap-locales.xml'), 'utf8');
  for (const locale of ['de', 'ja', 'ru']) {
    assert.ok(index.includes('https://friendlycalculator.in/sitemap-' + locale + '.xml'));
  }
});
