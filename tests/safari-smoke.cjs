'use strict';

const { Builder, By, until } = require('selenium-webdriver');
const assert = require('node:assert/strict');

const origin = process.env.FC_SITE_ORIGIN || 'https://friendlycalculator.in';

async function setContentViewport(driver, profile) {
  await driver.manage().window().setRect({ width: profile.width, height: profile.height });
  let measured;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    measured = await driver.executeScript(
      'return { width: window.innerWidth, height: window.innerHeight };'
    );
    const widthDelta = profile.width - measured.width;
    const heightDelta = profile.height - measured.height;
    if (Math.abs(widthDelta) <= 2 && Math.abs(heightDelta) <= 2) break;
    const outer = await driver.manage().window().getRect();
    await driver.manage().window().setRect({
      width: outer.width + widthDelta,
      height: outer.height + heightDelta
    });
  }
  measured = await driver.executeScript(
    'return { width: window.innerWidth, height: window.innerHeight };'
  );
  assert.ok(
    Math.abs(measured.width - profile.width) <= 2 &&
    Math.abs(measured.height - profile.height) <= 2,
    'Safari ' + profile.label + ': requested content viewport ' +
      profile.width + 'x' + profile.height + ', measured ' +
      measured.width + 'x' + measured.height
  );
  return measured;
}

(async () => {
  const driver = await new Builder().forBrowser('safari').build();
  try {
    for (const viewport of [
      { width: 390, height: 844, label: 'phone-width' },
      { width: 820, height: 1180, label: 'tablet-width' },
      { width: 1365, height: 900, label: 'desktop-width' }
    ]) {
      await setContentViewport(driver, viewport);
      await driver.get(origin + '/');
      await driver.wait(until.elementLocated(By.css('header.fc-global-header')), 20000);
      await driver.wait(until.elementLocated(By.css('footer.fc-global-footer')), 20000);
      const settings = await driver.findElement(By.css('#fc-display-settings'));
      await driver.wait(async () => settings.isDisplayed() && settings.isEnabled(), 10000);
      if ((await settings.getText()).trim() !== 'Settings') throw new Error('Safari ' + viewport.label + ': Settings label mismatch');
      await driver.executeScript('arguments[0].scrollIntoView({ block: "center" });', settings);
      await driver.executeScript('arguments[0].click();', settings);
      await driver.wait(async () => {
        const panel = await driver.findElement(By.css('#fc-display-panel'));
        return panel.isDisplayed();
      }, 10000);
      const selectorCount = await driver.executeScript(
        "return document.querySelectorAll('#fc-display-panel .fc-settings-site-controls select').length"
      );
      if (selectorCount < 4) throw new Error('Safari ' + viewport.label + ': missing regional selectors');
      const overflow = await driver.executeScript(
        "return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2"
      );
      if (overflow) throw new Error('Safari ' + viewport.label + ': homepage horizontal overflow');

      await driver.get(origin + '/calculators/simple-interest-calculator.html');
      await driver.wait(until.elementLocated(By.css('#fcNewCalc')), 20000);
      await driver.wait(until.elementLocated(By.css('#fcNewFields input')), 20000);
      const calculatorOverflow = await driver.executeScript(
        "return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2"
      );
      if (calculatorOverflow) throw new Error('Safari ' + viewport.label + ': calculator horizontal overflow');
    }
    process.stdout.write('Safari phone-width, tablet-width and desktop-width content viewport smoke tests passed.\\n');
  } finally {
    await driver.quit();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
