const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('UK student loan calculator exposes 2026-27 plan thresholds and separate postgraduate deductions', () => {
  const html = read('international/uk-student-loan-calculator.html');
  assert.ok(html.includes('lang="en-GB"'));
  assert.ok(html.includes("currency:'GBP'"));
  assert.ok(html.includes('plan1:26900') && html.includes('plan2:29385') && html.includes('plan4:33795') && html.includes('plan5:25000'));
  assert.ok(html.includes('Math.max(0,salary-threshold)*0.09'));
  assert.ok(html.includes('Math.max(0,salary-21000)*0.06'));
  assert.ok(html.includes('https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027'));
  assert.ok(html.includes('id="studentLoanForm"') && html.includes('aria-live="polite"'));
  assert.ok(html.includes('/assets/site-shell.js') && html.includes('/assets/site-chrome.js'));
  assert.ok(html.includes('application/ld+json'));
});

test('US home affordability calculator applies DTI, debts, local housing costs and mortgage present value', () => {
  const html = read('international/us-home-affordability-calculator.html');
  assert.ok(html.includes('lang="en-US"'));
  assert.ok(html.includes("currency:'USD'"));
  assert.ok(html.includes('const monthlyHousingAndDebtBudget=income*dti/100'));
  assert.ok(html.includes('debts-annualTax/12-insurance-hoa'));
  assert.ok(html.includes('monthlyRate===0?principalAndInterestBudget*months'));
  assert.ok(html.includes('principalAndInterestBudget*(1-Math.pow(1+monthlyRate,-months))/monthlyRate'));
  assert.ok(html.includes('id="homeAffordabilityForm"') && html.includes('aria-live="polite"'));
  assert.ok(html.includes('https://www.consumerfinance.gov/owning-a-home/'));
  assert.ok(html.includes('/assets/site-shell.js') && html.includes('/assets/site-chrome.js'));
  assert.ok(html.includes('application/ld+json'));
});

test('UK and US country hubs link to the new local calculators', () => {
  assert.ok(read('uk/index.html').includes('/international/uk-student-loan-calculator.html'));
  assert.ok(read('us/index.html').includes('/international/us-home-affordability-calculator.html'));
});

test('UK and US country sitemap lists the new calculators', () => {
  const sitemap = read('sitemap-uk-us.xml');
  assert.ok(sitemap.includes('https://friendlycalculator.in/international/uk-student-loan-calculator.html'));
  assert.ok(sitemap.includes('https://friendlycalculator.in/international/us-home-affordability-calculator.html'));
});
