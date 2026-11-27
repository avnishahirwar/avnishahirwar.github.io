const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = [
  ['age-calculator.html', 'https://aa.usno.navy.mil/faq/leap_years', 'Gregorian rule'],
  ['percentage-calculator.html', 'https://www.etymonline.com/word/percent', 'per centum'],
  ['simple-interest-calculator.html', 'https://academic.oup.com/edited-volume/61673/chapter-abstract/548932147', 'Delos'],
  ['gst-calculator.html', 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=1513001&lang=2&reg=3', '1 July 2017'],
  ['ppf-calculator.html', 'https://www.nsiindia.gov.in/%28S%281fixicbby0t22445w2aqjerx%29%29/InternalPage.aspx?Id_Pk=79', '1 July 1968'],
  ['circle-area-calculator.html', 'https://ntrs.nasa.gov/citations/19960001040', '78.54 cm²'],
  ['unit-converter.html', 'https://www.nist.gov/pml/special-publication-330/sp-330-preface-9th-edition', '68°F'],
  ['mortgage-calculator.html', 'https://www.consumerfinance.gov/ask-cfpb/how-does-paying-down-a-mortgage-work-en-1943/', 'amortization']
];

for (const [filename, source, uniqueFact] of pages) {
  test(filename + ' includes a sourced, page-specific history/facts section', () => {
    const html = fs.readFileSync(path.join(root, 'calculators', filename), 'utf8');
    assert.match(html, /History and interesting facts/);
    assert.ok(html.includes(source), 'the section must cite its supporting source');
    assert.ok(html.toLowerCase().includes(uniqueFact.toLowerCase()), 'the section must contain its page-specific fact');
    assert.match(html, /<section[^>]*aria-labelledby=/);
  });
}

test('circle-area and unit-converter pages include clear worked examples', () => {
  const circle = fs.readFileSync(path.join(root, 'calculators', 'circle-area-calculator.html'), 'utf8');
  const units = fs.readFileSync(path.join(root, 'calculators', 'unit-converter.html'), 'utf8');
  assert.match(circle, /Worked example/);
  assert.match(circle, /78\.54 cm²/);
  assert.match(units, /Worked example/);
  assert.match(units, /68°F/);
});
