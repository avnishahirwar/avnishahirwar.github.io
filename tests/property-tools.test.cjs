const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Stamp Duty Calculator uses visitor-verified state rates instead of a nationwide preset', () => {
  const html = read('calculators/stamp-duty-calculator.html');
  assert.match(html, /id="stampRate" type="number"[^>]*placeholder="Enter verified rate"/);
  assert.match(html, /id="registrationRate" type="number"[^>]*placeholder="Enter verified rate"/);
  assert.match(html, /Stamp duty and registration rules vary by state/i);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, /"@type":"WebApplication"/);
});

test('Bigha conversion keeps the regional factor editable and discloses variation', () => {
  const html = read('calculators/bigha-to-sq-ft-calculator.html');
  assert.match(html, /id="factor" type="number"/);
  assert.match(html, /Bigha is not standardised nationally/);
  assert.match(html, /square feet = Bigha × locally verified square feet per Bigha/i);
});

test('Number-to-words page performs Indian grouping and supports the published range', () => {
  const html = read('calculators/number-to-words-indian-format.html');
  assert.match(html, /function words\(raw\)/);
  assert.match(html, /BigInt/);
  assert.match(html, /Kharab/);
  assert.match(html, /999999999999/);
});

test('Steps-to-kilometres page has a working form and correct conversion formula', () => {
  const html = read('calculators/steps-to-km-calculator.html');
  assert.match(html, /id="stepsForm"/);
  assert.match(html, /n\*s\/100000/);
  assert.match(html, /step length \(cm\)/i);
  assert.match(html, /example conversion table/i);
});

test('KVP page uses India Post displayed maturity terms and does not accept an unused duration input', () => {
  const html = read('calculators/kvp-calculator.html');
  assert.match(html, /7\.5%/);
  assert.match(html, /115 months/);
  assert.match(html, /p\*2/);
  assert.doesNotMatch(html, /id="months"/);
  assert.match(html, /indiapost\.gov\.in\/banking-services\/savings/);
});

test('Gratuity page explains standard formula, partial-year rule and general eligibility threshold', () => {
  const html = read('calculators/gratuity-calculator.html');
  assert.match(html, /s\*15\*count\/26/);
  assert.match(html, /fraction>0\.5/);
  assert.match(html, /five-year continuous-service threshold/i);
  assert.match(html, /fixed-term pro-rata/i);
  assert.match(html, /2000000/);
  assert.match(html, /labour\.gov\.in/);
});

test('EPS pension estimate requires the general 10-year eligible-service threshold', () => {
  const js = read('assets/extra-calculators.js');
  assert.match(js, /case'eps':\\{if\\(v\\.service<10\\)/);
});

test('SIP FAQ explains current equity-fund capital-gains treatment and instalment holding periods', () => {
  const html = read('calculators/sip-calculator.html');
  assert.match(html, /How is a SIP taxed in India/);
  assert.match(html, /12\\.5%/);
  assert.match(html, /FIFO/);
  assert.match(html, /incometaxindia\\.gov\\.in/);
});

test('Home-loan amortization page renders a principal-versus-interest chart', () => {
  const html = read('calculators/home-loan-amortization-schedule-calculator.html');
  assert.match(html, /amortization-chart/);
  assert.match(html, /Total principal and total interest comparison/);
});

test('Shared calculator shell adds relevant links and supported structured data', () => {
  const js = read('assets/site-shell.js');
  assert.match(js, /fc-related-calculators/);
  assert.match(js, /WebApplication/);
  assert.match(js, /BreadcrumbList/);
  assert.match(js, /FAQPage/);
  assert.match(js, /loan-prepayment-calculator/);
});

test('Homepage, directory, About page and sitemap include the two new calculators and updated count', () => {
  const home = read('index.html');
  const directory = read('calculator/site-directory.html');
  const about = read('calculator/about.html');
  const sitemap = read('sitemap.xml');
  for (const slug of ['stamp-duty-calculator.html', 'bigha-to-sq-ft-calculator.html']) {
    assert.ok(home.includes(slug), 'Homepage missing ' + slug);
    assert.ok(directory.includes(slug), 'Directory missing ' + slug);
    assert.ok(about.includes(slug), 'About catalogue missing ' + slug);
    assert.ok(sitemap.includes(slug), 'Sitemap missing ' + slug);
  }
  assert.match(home, /Browse all 188 calculators/);
  assert.match(directory, /188 calculators/);
  assert.match(about, /188 public calculators/);
});
