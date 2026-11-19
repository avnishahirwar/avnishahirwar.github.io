'use strict';

const { Builder, By, until } = require('selenium-webdriver');

const origin = process.env.FC_SITE_ORIGIN || 'https://friendlycalculator.in';

(async () => {
  const driver = await new Builder().forBrowser('safari').build();
  try {
    await driver.manage().window().setRect({ width: 390, height: 844 });
    await driver.get(origin + '/');
    await driver.wait(until.elementLocated(By.css('header.fc-global-header')), 20000);
    await driver.wait(until.elementLocated(By.css('footer.fc-global-footer')), 20000);
    const settings = await driver.findElement(By.css('#fc-display-settings'));
    await driver.wait(async () => settings.isDisplayed() && settings.isEnabled(), 10000);
    if ((await settings.getText()).trim() !== 'Settings') throw new Error('Safari: Settings label mismatch');
    await driver.executeScript('arguments[0].scrollIntoView({ block: "center" });', settings);
    await settings.click();
    await driver.wait(async () => {
      const panel = await driver.findElement(By.css('#fc-display-panel'));
      return panel.isDisplayed();
    }, 10000);
    const selectorCount = await driver.executeScript(
      "return document.querySelectorAll('#fc-display-panel .fc-settings-site-controls select').length"
    );
    if (selectorCount < 4) throw new Error('Safari: missing regional selectors');
    const overflow = await driver.executeScript(
      "return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2"
    );
    if (overflow) throw new Error('Safari: homepage horizontal overflow');

    await driver.get(origin + '/calculators/simple-interest-calculator.html');
    await driver.wait(until.elementLocated(By.css('#fcNewCalc')), 20000);
    await driver.wait(until.elementLocated(By.css('#fcNewFields input')), 20000);
    const calculatorOverflow = await driver.executeScript(
      "return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2"
    );
    if (calculatorOverflow) throw new Error('Safari: calculator horizontal overflow');
    process.stdout.write('Safari desktop/mobile viewport smoke test passed.\n');
  } finally {
    await driver.quit();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
