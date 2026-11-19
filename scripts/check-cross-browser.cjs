#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const { chromium, firefox, webkit } = require('playwright');
const ORIGIN = (process.env.FC_SITE_ORIGIN || 'https://friendlycalculator.in').replace(/\/+$/, '');
const ROUTES = ['/', '/calculators/simple-interest-calculator.html', '/calculators/compound-interest-calculator.html', '/calculators/trig-calculator.html', '/calculators/mortgage-calculator.html'];
async function inspect(browserType, route, viewport) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const pageErrors = [];
  const failedSameOriginResponses = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => {
    try { if (new URL(response.url()).origin === ORIGIN && response.status() >= 400) failedSameOriginResponses.push({ status: response.status(), url: response.url() }); } catch (_) {}
  });
  try {
    const response = await page.goto(ORIGIN + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
    assert.ok(response && response.status() < 400, browserType.name() + ' ' + route + ': successful HTTP response');
    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('header.fc-global-header') && document.querySelector('footer.fc-global-footer') && document.getElementById('fc-display-settings')?.closest('footer.fc-global-footer'), { timeout: 20000 });
    const state = await page.evaluate(() => {
      const settings = document.getElementById('fc-display-settings');
      const language = document.getElementById('fc-language-select');
      const root = document.documentElement;
      const body = document.body;
      return {
        title: document.title,
        headerCount: document.querySelectorAll('header.fc-global-header').length,
        footerCount: document.querySelectorAll('footer.fc-global-footer').length,
        hasMain: !!document.querySelector('main'),
        hasH1: !!document.querySelector('h1'),
        hasLanguageSelector: !!language,
        settingsInFooter: !!settings && !!settings.closest('footer.fc-global-footer'),
        viewportWidth: window.innerWidth,
        documentWidth: Math.max(root.scrollWidth, body.scrollWidth),
        horizontalOverflow: Math.max(root.scrollWidth, body.scrollWidth) > window.innerWidth + 1,
        overflowingElements: Array.from(document.querySelectorAll('body *')).map(el => { const rect = el.getBoundingClientRect(); return { tag: el.tagName, id: el.id, className: typeof el.className === 'string' ? el.className.slice(0, 90) : '', left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }; }).filter(el => el.right > window.innerWidth + 1 || el.left < -1 || el.scrollWidth > el.clientWidth + 2).slice(0, 12),
        twitterImage: document.querySelector('meta[name="twitter:image"]')?.content || null
      };
    });
    process.stdout.write('DIAGNOSTIC ' + browserType.name() + ' ' + route + ' ' + viewport.width + ' ' + JSON.stringify(state) + '\\n');
    assert.equal(state.headerCount, 1, browserType.name() + ' ' + route + ': one shared header');
    assert.equal(state.footerCount, 1, browserType.name() + ' ' + route + ': one shared footer');
    assert.equal(state.hasMain, true, browserType.name() + ' ' + route + ': main landmark');
    assert.equal(state.hasH1, true, browserType.name() + ' ' + route + ': page heading');
    assert.equal(state.hasLanguageSelector, true, browserType.name() + ' ' + route + ': language selector');
    assert.equal(state.settingsInFooter, true, browserType.name() + ' ' + route + ': Settings in footer');
    assert.equal(state.horizontalOverflow, false, browserType.name() + ' ' + route + ': no horizontal overflow at ' + viewport.width + 'px');
    assert.deepEqual(pageErrors, [], browserType.name() + ' ' + route + ': no uncaught JavaScript errors');
    assert.deepEqual(failedSameOriginResponses, [], browserType.name() + ' ' + route + ': no failed same-origin resources');
    if (route === '/calculators/simple-interest-calculator.html') assert.ok(state.twitterImage && state.twitterImage.startsWith('https://'), 'Simple Interest page has an absolute social preview image URL');
    process.stdout.write('PASS ' + browserType.name() + ' ' + route + ' ' + viewport.width + 'x' + viewport.height + ' ' + JSON.stringify(state) + '\n');
  } finally { await context.close(); await browser.close(); }
}
(async () => {
  for (const engine of [chromium, firefox, webkit]) {
    for (const route of ROUTES) await inspect(engine, route, { width: 1365, height: 900 });
    await inspect(engine, '/', { width: 375, height: 812 });
    await inspect(engine, '/', { width: 320, height: 720 });
  }
  process.stdout.write('PASS cross-browser smoke suite: Chromium, Firefox and WebKit desktop/mobile checks.\n');
})().catch(error => { process.stderr.write((error && error.stack) || String(error)); process.exitCode = 1; });
