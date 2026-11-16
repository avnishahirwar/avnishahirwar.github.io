const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
test('country, language, currency and number-format preferences are separate controls',()=>{
 const shell=fs.readFileSync(path.join(root,'assets/site-shell.js'),'utf8');
 const locale=fs.readFileSync(path.join(root,'assets/global-locale.js'),'utf8');
 assert.match(shell,/id="fc-language-select"/);
 assert.match(shell,/id="fc-country-select"/);
 assert.match(shell,/id="fc-currency-select"/);
 assert.match(shell,/id="fc-locale-select"/);
 assert.match(locale,/setCountry\(value\)/);
 assert.match(locale,/COUNTRY_CURRENCY/);
 assert.match(locale,/COUNTRY_LOCALE/);
 assert.match(locale,/COUNTRY_KEY/);
});
test('country selection updates default currency and number format independently of URL language',()=>{
 const locale=fs.readFileSync(path.join(root,'assets/global-locale.js'),'utf8');
 assert.match(locale,/US:'USD'/);assert.match(locale,/GB:'GBP'/);assert.match(locale,/MX:'MXN'/);assert.match(locale,/DE:'EUR'/);
 assert.match(locale,/localStorage\.setItem\(COUNTRY_KEY,country\)/);
 assert.match(locale,/localStorage\.setItem\(CURRENCY_KEY,currency\)/);
 assert.match(locale,/setCurrency\(value\)/);
 assert.match(locale,/setLocale\(value\)/);
});
test('US country hub is self-canonical, scoped to US tools and cites official US authorities',()=>{
 const html=fs.readFileSync(path.join(root,'us/index.html'),'utf8');
 assert.match(html,/rel="canonical" href="https:\/\/friendlycalculator\.in\/us\//);
 assert.match(html,/hreflang="en-US"/);assert.match(html,/Tax Year 2026/);
 assert.match(html,/international\/us-income-tax-calculator\.html/);assert.match(html,/calculators\/401k-calculator\.html/);
 assert.match(html,/irs\.gov/);assert.match(html,/ssa\.gov/);
 assert.doesNotMatch(html,/GST Calculator|PPF Calculator|HRA Exemption/);
});
test('UK country hub uses UK tax-year scope and UK-specific calculators and sources',()=>{
 const html=fs.readFileSync(path.join(root,'uk/index.html'),'utf8');
 assert.match(html,/rel="canonical" href="https:\/\/friendlycalculator\.in\/uk\//);
 assert.match(html,/hreflang="en-GB"/);assert.match(html,/6 April 2026 to 5 April 2027/);
 assert.match(html,/uk-income-tax-calculator\.html/);assert.match(html,/uk-payroll-calculator\.html/);assert.match(html,/uk-stamp-duty-calculator\.html/);
 assert.match(html,/gov\.uk/);
 assert.doesNotMatch(html,/GST Calculator|PPF Calculator|HRA Exemption/);
});
test('Canada, Australia, UAE and Saudi Arabia country hubs list only their scoped tools',()=>{
 const checks=[
  ['ca/index.html','/international/canada-payroll-calculator.html','canada.ca','GST/HST'],
  ['au/index.html','/international/australia-tax-super-calculator.html','ato.gov.au','2026–27'],
  ['ae/index.html','/international/uae-personal-income-tax-calculator.html','u.ae','AED'],
  ['sa/index.html','/international/saudi-vat-calculator.html','zatca.gov.sa','15%']
 ];
 for(const [file,link,source,marker] of checks){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(html,/rel="canonical"/);assert.ok(html.includes(link));assert.ok(html.includes(source));assert.ok(html.includes(marker));
  assert.doesNotMatch(html,/href=[\"'][^\"']*(?:gst-calculator|ppf-calculator|hra-calculator)/i);
 }
});