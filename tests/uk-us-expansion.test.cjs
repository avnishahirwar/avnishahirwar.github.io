const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('UK and US country hubs expose the added country-specific calculators', () => {
  const uk = read('uk/index.html');
  const us = read('us/index.html');
  for (const route of ['/international/uk-council-tax-calculator.html']) {
    assert.ok(uk.includes('href="' + route + '"'), 'UK hub is missing ' + route);
    assert.ok(fs.existsSync(path.join(root, route.slice(1))), 'Missing UK calculator file ' + route);
  }
  for (const route of ['/international/us-student-loan-calculator.html', '/international/us-property-tax-calculator.html']) {
    assert.ok(us.includes('href="' + route + '"'), 'US hub is missing ' + route);
    assert.ok(fs.existsSync(path.join(root, route.slice(1))), 'Missing US calculator file ' + route);
  }
  assert.match(uk, /council tax/i);
  assert.match(us, /property tax/i);
  assert.match(us, /student loan/i);
});

test('new country calculators have unique canonicals, working client-side forms and country-specific currency', () => {
  const cases = [
    ['international/uk-council-tax-calculator.html', 'uk-council-tax-calculator.html', 'en-GB', 'GBP', 'councilTaxForm'],
    ['international/us-student-loan-calculator.html', 'us-student-loan-calculator.html', 'en-US', 'USD', 'studentLoanForm'],
    ['international/us-property-tax-calculator.html', 'us-property-tax-calculator.html', 'en-US', 'USD', 'propertyTaxForm']
  ];
  for (const [file, slug, locale, currency, formId] of cases) {
    const html = read(file);
    assert.ok(html.includes('https://friendlycalculator.in/international/' + slug), 'Missing canonical: ' + file);
    assert.ok(html.includes('lang="' + locale + '"'), 'Missing locale: ' + file);
    assert.ok(html.includes("currency:'" + currency + "'"), 'Missing currency formatter: ' + file);
    assert.ok(html.includes("getElementById('" + formId + "')"), 'Missing form handler: ' + file);
    assert.ok(html.includes('/assets/site-shell.js') && html.includes('/assets/site-chrome.js'), 'Missing shared site shell: ' + file);
    assert.match(html, /application\/ld\+json/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /Free educational estimate/);
  }
});

test('student-loan calculator handles zero interest and caps the final payment', () => {
  const html = read('international/us-student-loan-calculator.html');
  assert.match(html, /rate===0\?principal\/n/);
  assert.match(html, /Math\.min\(balance\+interest,scheduled\+extra\)/);
  assert.match(html, /months<n\+1200/);
});

test('property-tax calculator applies assessment ratio and exemptions before local rate', () => {
  const html = read('international/us-property-tax-calculator.html');
  assert.match(html, /market\*ratio\/100/);
  assert.match(html, /Math\.max\(0,assessed-exemption\)/);
  assert.match(html, /taxable\*rate\/100/);
  assert.match(html, /market<=0/);
});

test('council-tax calculator uses user-entered local bill and does not assume a universal band rate', () => {
  const html = read('international/uk-council-tax-calculator.html');
  assert.match(html, /bill\*\(1-discount\/100\)/);
  assert.match(html, /bill<=0/);
  assert.match(html, /Enter the annual amount on your latest council bill/);
  assert.match(html, /does not look up council rates/);
});

test('new UK and US calculator URLs are listed in the additive country sitemap', () => {
  const sitemap = read('sitemap-uk-us.xml');
  for (const route of [
    'https://friendlycalculator.in/uk/',
    'https://friendlycalculator.in/us/',
    'https://friendlycalculator.in/international/uk-council-tax-calculator.html',
    'https://friendlycalculator.in/international/us-student-loan-calculator.html',
    'https://friendlycalculator.in/international/us-property-tax-calculator.html'
  ]) assert.ok(sitemap.includes(route), 'Missing sitemap URL ' + route);
  const robots = read('robots.txt');
  assert.ok(robots.includes('Sitemap: https://friendlycalculator.in/sitemap-uk-us.xml'));
});

test('UK and US hubs cite official guidance for the newly added local-tax and student-loan tools', () => {
  const uk = read('uk/index.html');
  const us = read('us/index.html');
  assert.ok(uk.includes('https://www.gov.uk/council-tax'));
  assert.ok(us.includes('https://studentaid.gov/manage-loans/repayment'));
  assert.ok(us.includes('https://www.usa.gov/property-taxes'));
});


test('Friendship Calculator is discoverable from the homepage and has public metadata', () => {
  const home = read('index.html');
  const page = read('calculators/friendship-calculator.html');
  assert.ok(home.includes('href="/calculators/friendship-calculator.html">Friendship Calculator</a>'));
  assert.ok(page.includes('<title>Friendship Calculator'));
  assert.ok(page.includes('rel="canonical" href="https://friendlycalculator.in/calculators/friendship-calculator.html"'));
  assert.ok(page.includes('application/ld+json'));
  assert.ok(page.includes('/assets/site-shell.js'));
});

test('Friendship Calculator validates names and explains its entertainment-only score', () => {
  const page = read('calculators/friendship-calculator.html');
  assert.ok(page.includes('id="friendOne"') && page.includes('id="friendTwo"'));
  assert.ok(page.includes('maxlength="40"'));
  assert.ok(page.includes('not scientific'));
  assert.ok(page.includes('does not assess your relationship'));
  assert.ok(page.includes('aria-live="polite"'));
});

test('Friendship Calculator computes locally and does not submit or persist entered names', () => {
  const page = read('calculators/friendship-calculator.html');
  assert.ok(page.includes('function scoreFor(a,b)'));
  assert.ok(page.includes('.sort().join'));
  assert.ok(page.includes('scoreFor(a,b)'));
  assert.ok(!page.includes('fetch('));
  assert.ok(!page.includes('XMLHttpRequest'));
  assert.ok(!page.includes('localStorage'));
});
