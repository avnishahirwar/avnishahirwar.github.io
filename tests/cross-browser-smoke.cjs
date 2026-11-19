'use strict';

const { chromium, firefox, webkit } = require('playwright');
const assert = require('node:assert/strict');
const origin = process.env.FC_SITE_ORIGIN || 'https://friendlycalculator.in';
const engines = [['Chromium', chromium], ['Firefox', firefox], ['WebKit', webkit]];

async function checkPage(browser, url, label, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(new URL(url, origin).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
  assert.ok(response && response.ok(), label + ': HTTP response');
  // Test the visible combined Country & format control. The legacy country/date selects are intentionally hidden compatibility controls.
  for (const selector of ['header.fc-global-header','footer.fc-global-footer','#fc-language-select','#fc-currency-select','#fc-country-format-display','#fc-unit-system-select','#fc-ai-lazy-launch']) {
    await page.waitForSelector(selector, { timeout: 20000 });
  }
  const settings = page.locator('footer.fc-global-footer #fc-display-settings');
  await settings.waitFor({ state: 'visible', timeout: 20000 });
  assert.equal((await settings.innerText()).trim(), 'Settings', label + ': Settings label');
  await settings.click();
  await page.locator('#fc-display-panel').waitFor({ state: 'visible', timeout: 10000 });
  const dims = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  assert.ok(dims.document <= dims.viewport + 2, label + ': horizontal overflow ' + JSON.stringify(dims));
  assert.deepEqual(errors, [], label + ': uncaught JavaScript errors');
  await page.close();
  return dims;
}

(async () => {
  const results = [];
  for (const [name, engine] of engines) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const viewport of [{ width: 1365, height: 900 }, { width: 390, height: 844 }]) {
        const dims = await checkPage(browser, '/', name + ' homepage ' + viewport.width, viewport);
        results.push({ browser: name, page: '/', width: viewport.width, ...dims });
      }
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
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
      results.push({ browser: name, page: '/calculators/simple-interest-calculator.html', width: 390, ...dims });
      await page.close();
    } finally { await browser.close(); }
  }
  process.stdout.write(JSON.stringify({ ok: true, results }, null, 2) + '\n');
})().catch(error => { console.error(error); process.exitCode = 1; });
