'use strict';

const { chromium, firefox, webkit } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const origin = process.env.FC_SITE_ORIGIN || 'https://friendlycalculator.in';
const availableEngines = {
  chromium: ['Chromium', chromium],
  chrome: ['Google Chrome', chromium, { channel: 'chrome' }],
  msedge: ['Microsoft Edge', chromium, { channel: 'msedge' }],
  opera: ['Opera', chromium, { operaCDP: true }],
  firefox: ['Firefox', firefox],
  webkit: ['WebKit', webkit]
};
const selectedBrowser = (process.env.FC_BROWSER || 'all').toLowerCase();
const engines = selectedBrowser === 'all'
  ? Object.values(availableEngines)
  : availableEngines[selectedBrowser] ? [availableEngines[selectedBrowser]] : [];
if (!engines.length) throw new Error('Unsupported FC_BROWSER: ' + selectedBrowser);


async function checkFinancialCalculatorInteractions(browser, name) {
  // Compound Interest: verify the visible result against the stated quarterly formula.
  const compound = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const compoundErrors = [];
  compound.on('pageerror', error => compoundErrors.push(error.message));
  const compoundResponse = await compound.goto(new URL('/calculators/compound-interest-calculator.html', origin).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
  assert.ok(compoundResponse && compoundResponse.ok(), name + ': Compound Interest HTTP response');
  await compound.locator('#calculate').click();
  const expectedCompound = 100000 * Math.pow(1 + 0.08 / 4, 4 * 5);
  const expectedCompoundText = await compound.evaluate(value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value), expectedCompound);
  assert.equal((await compound.locator('#final').innerText()).trim(), expectedCompoundText, name + ': compound interest default calculation');
  await compound.locator('#rate').fill('0');
  await compound.locator('#calculate').click();
  assert.match(await compound.locator('#final').innerText(), /100,000|1,00,000/ , name + ': compound interest zero-rate boundary');
  await compound.locator('#principal').fill('0');
  await compound.locator('#calculate').click();
  assert.match(await compound.locator('#status').innerText(), /principal above zero/i, name + ': compound interest invalid principal validation');
  assert.deepEqual(compoundErrors, [], name + ': Compound Interest JavaScript errors');
  await compound.close();

  // Income Tax: verify the focused bundle renders the calculator and keeps the default zero-tax boundary.
  const incomeTax = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const incomeTaxErrors = [];
  incomeTax.on('pageerror', error => incomeTaxErrors.push(error.message));
  const incomeTaxResponse = await incomeTax.goto(new URL('/calculators/income-tax-calculator.html', origin).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
  assert.ok(incomeTaxResponse && incomeTaxResponse.ok(), name + ': Income Tax HTTP response');
  await incomeTax.waitForSelector('#live-page-calculator form', { timeout: 20000 });
  const incomeTaxBundles = await incomeTax.evaluate(() => ({
    focused: [...document.scripts].some(script => (script.src || '').includes('/assets/income-tax-calculator.js')),
    shared: [...document.scripts].some(script => (script.src || '').includes('/assets/page-calculators.js'))
  }));
  assert.notEqual(incomeTaxBundles.focused, incomeTaxBundles.shared, name + ': exactly one Income Tax calculator bundle is loaded');
  await incomeTax.locator('#live-page-calculator button[type="submit"]').click();
  const incomeTaxResult = await incomeTax.locator('#live-page-calculator tbody tr').filter({ hasText: 'Estimated tax including surcharge and cess' }).locator('td').innerText();
  assert.match(incomeTaxResult, /0(?:\\.00)?/, name + ': Income Tax zero-tax rebate boundary');
  assert.deepEqual(incomeTaxErrors, [], name + ': Income Tax JavaScript errors');
  await incomeTax.close();

  // General mortgage: test zero-rate amortisation plus entered monthly housing costs.
  const mortgage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mortgageErrors = [];
  mortgage.on('pageerror', error => mortgageErrors.push(error.message));
  const mortgageResponse = await mortgage.goto(new URL('/calculators/mortgage-calculator.html', origin).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
  assert.ok(mortgageResponse && mortgageResponse.ok(), name + ': Mortgage HTTP response');
  await mortgage.locator('#home-price').fill('120000');
  await mortgage.locator('#down-payment').fill('20000');
  await mortgage.locator('#interest-rate').fill('0');
  await mortgage.locator('#loan-term').fill('10');
  await mortgage.locator('#property-tax').fill('1200');
  await mortgage.locator('#home-insurance').fill('600');
  await mortgage.locator('#maintenance').fill('50');
  await mortgage.locator('#mortgage-form button[type="submit"]').click();
  const mortgageOutput = await mortgage.locator('#mortgage-result').innerText();
  assert.match(mortgageOutput, /Estimated monthly housing cost:.*1,033/i, name + ': mortgage zero-rate monthly total');
  assert.match(mortgageOutput, /Loan amount:.*(?:100,000|1,00,000)/i, name + ': mortgage principal');
  assert.match(mortgageOutput, /Estimated total interest:.*0/i, name + ': mortgage zero-rate interest');
  assert.deepEqual(mortgageErrors, [], name + ': Mortgage JavaScript errors');
  await mortgage.close();

  // Worldwide mortgage: verify country options, monthly calculation, and amortisation schedule.
  const worldwide = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const worldwideErrors = [];
  worldwide.on('pageerror', error => worldwideErrors.push(error.message));
  const worldwideResponse = await worldwide.goto(new URL('/international/global-mortgage-calculator.html', origin).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
  assert.ok(worldwideResponse && worldwideResponse.ok(), name + ': Worldwide Mortgage HTTP response');
  await worldwide.waitForFunction(() => document.querySelectorAll('#world-mortgage-country option').length >= 240, null, { timeout: 20000 });
  await worldwide.locator('#world-mortgage-country').selectOption('IN');
  await worldwide.locator('#world-home-price').fill('120000');
  await worldwide.locator('#world-down-payment').fill('20000');
  await worldwide.locator('#world-interest-rate').fill('0');
  await worldwide.locator('#world-term-years').fill('10');
  await worldwide.locator('#world-property-tax').fill('1200');
  await worldwide.locator('#world-home-insurance').fill('600');
  await worldwide.locator('#world-monthly-maintenance').fill('50');
  await worldwide.locator('#world-mortgage-form button[type="submit"]').click();
  const worldwideOutput = await worldwide.locator('#world-mortgage-result').innerText();
  assert.match(worldwideOutput, /Estimated monthly housing cost/i, name + ': worldwide mortgage result heading');
  assert.match(worldwideOutput, /1,033/i, name + ': worldwide mortgage zero-rate monthly total');
  assert.match(worldwideOutput, /100,000|1,00,000/i, name + ': worldwide mortgage principal');
  assert.equal(await worldwide.locator('#world-mortgage-schedule tbody tr').count(), 10, name + ': worldwide mortgage annual amortisation rows');
  assert.deepEqual(worldwideErrors, [], name + ': Worldwide Mortgage JavaScript errors');
  await worldwide.close();
}

async function checkPage(browser, url, label, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(new URL(url, origin).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
  assert.ok(response && response.ok(), label + ': HTTP response');
  await page.locator('header.fc-global-header').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('footer.fc-global-footer').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('#fc-primary-navigation').waitFor({ state: 'attached', timeout: 20000 });
  const settings = page.locator('#fc-display-settings');
  await settings.waitFor({ state: 'visible', timeout: 20000 });
  assert.equal((await settings.innerText()).trim(), 'Settings', label + ': Settings label');
  await settings.scrollIntoViewIfNeeded();
  await settings.click({ force: true });
  const panel = page.locator('#fc-display-panel');
  await panel.waitFor({ state: 'visible', timeout: 10000 });
  const regionalControls = panel.locator('.fc-settings-site-controls select:visible');
  assert.ok(await regionalControls.count() >= 4, label + ': language, currency, country/format and units controls');
  const dims = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  assert.ok(dims.document <= dims.viewport + 2, label + ': horizontal overflow ' + JSON.stringify(dims));
  assert.deepEqual(errors, [], label + ': uncaught JavaScript errors');

  // Exercise the homepage search on desktop and mobile, not just the shared shell.
  if ([1365, 390].includes(viewport.width)) {
    const searchInput = page.locator('#fc-home-tool-search');
    await searchInput.fill('GST');
    const gstResult = page.locator('#fc-home-search-results .home-search-result').filter({ hasText: 'GST Calculator' }).first();
    await gstResult.waitFor({ state: 'visible', timeout: 15000 });
    assert.match(await gstResult.getAttribute('href'), /gst-calculator/i, label + ': GST search result destination');
    assert.match(await page.locator('#fc-home-search-status').innerText(), /matching calculators/i, label + ': search status feedback');
    await page.locator('#fc-home-search-clear').click();
    await page.waitForFunction(() => {
      const results = document.getElementById('fc-home-search-results');
      const main = document.querySelector('main.home-main');
      return !!results && results.hidden && !(main && main.classList.contains('fc-search-active'));
    }, null, { timeout: 10000 });
  }
  await page.close();
  return dims;
}

(async () => {
  const results = [];
  for (const [name, engine] of engines) {
    const launchOptions = engines.find(entry => entry[0] === name)?.[2] || {};
    let browser;
    let operaProcess;
    try {
      if (launchOptions.operaCDP) {
        operaProcess = spawn(process.env.FC_OPERA_PATH || '/usr/bin/opera', [
          '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
          '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
          '--remote-debugging-port=9222', '--user-data-dir=/tmp/fc-opera-profile', 'about:blank'
        ], { stdio: 'ignore' });
        let cdpReady = false;
        for (let attempt = 0; attempt < 40; attempt++) {
          try {
            const response = await fetch('http://127.0.0.1:9222/json/version');
            if (response.ok) { cdpReady = true; break; }
          } catch (_) {}
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (!cdpReady) throw new Error('Opera did not expose its Chrome DevTools Protocol endpoint');
        browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
      } else {
        browser = await engine.launch({ headless: true, ...launchOptions });
      }
      for (const viewport of [{ width: 1365, height: 900 }, { width: 390, height: 844 }, { width: 375, height: 812 }, { width: 320, height: 720 }]) {
        const dims = await checkPage(browser, '/', name + ' homepage ' + viewport.width, viewport);
        results.push({ browser: name, page: '/', width: viewport.width, ...dims });
      }
      for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 812 }, { width: 320, height: 720 }]) {
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const response = await page.goto(new URL('/calculators/simple-interest-calculator.html', origin).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
        assert.ok(response && response.ok(), name + ': Simple Interest HTTP response');
        await page.waitForSelector('header.fc-global-header');
        await page.waitForSelector('footer.fc-global-footer');
        await page.waitForSelector('#fcNewCalc');
        await page.waitForSelector('#fcNewFields input');
        const dims = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
        assert.ok(dims.document <= dims.viewport + 2, name + ': calculator horizontal overflow ' + JSON.stringify(dims));
        assert.deepEqual(errors, [], name + ': calculator JavaScript errors');
        results.push({ browser: name, page: '/calculators/simple-interest-calculator.html', width: viewport.width, ...dims });
        await page.close();
      }
      await checkFinancialCalculatorInteractions(browser, name);
    } finally {
      if (browser) await browser.close();
      if (operaProcess && !operaProcess.killed) operaProcess.kill('SIGTERM');
    }
  }
  process.stdout.write(JSON.stringify({ ok: true, results }, null, 2) + '\n');
})().catch(error => { console.error(error); process.exitCode = 1; });
