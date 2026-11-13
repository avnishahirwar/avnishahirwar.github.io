const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Stamp Duty Calculator requires locally verified rates and explains state variation', () => {
  const html = read('calculators/stamp-duty-calculator.html');
  assert.match(html, /id="stampRate" type="number"[^>]*placeholder="Enter verified rate"/);
  assert.match(html, /id="registrationRate" type="number"[^>]*placeholder="Enter verified rate"/);
  assert.match(html, /Stamp duty and registration rules vary by state/i);
  assert.match(html, /const stamp=base\*sr\/100/);
  assert.match(html, /"@type":"FAQPage"/);
});

test('Bigha conversion keeps its regional factor editable and states the correct formula', () => {
  const html = read('calculators/bigha-to-sq-ft-calculator.html');
  assert.match(html, /id="factor" type="number"/);
  assert.match(html, /Bigha is not standardised nationally/i);
  assert.match(html, /square feet = Bigha × locally verified square feet per Bigha/i);
  assert.match(html, /sqft=b\*f/);
});

test('Agriculture hub links the existing rural calculators and scheme screeners', () => {
  const html = read('calculator/agriculture-calculators.html');
  for (const slug of ['crop-cost-profit-calculator','land-unit-converter-calculator','bigha-to-sq-ft-calculator','kcc-interest-calculator','crop-yield-sale-value-calculator','livestock-cost-profit-calculator','pm-kisan-eligibility-checker','mp-ladli-behna-eligibility-checker']) assert.ok(html.includes(slug), 'Missing hub link: '+slug);
});

test('Embed wrapper allowlists calculator paths and shows attribution', () => {
  const html = read('embed/index.html');
  assert.match(html, /noindex,nofollow/);
  assert.match(html, /calculators\/[a-z0-9-]+\.html/);
  assert.match(html, /Friendly Calculator/);
  assert.match(html, /referrerPolicy='strict-origin-when-cross-origin'/);
  const shell = read('assets/site-shell.js');
  assert.match(shell, /location\.origin\+'\/embed\/\?src='/);
  assert.match(shell, /fc-embed-mode/);
});
