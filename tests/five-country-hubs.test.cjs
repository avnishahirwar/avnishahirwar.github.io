const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

test('five priority country hubs are discoverable from the international directory',()=>{
 const directory=fs.readFileSync(path.join(root,'international/index.html'),'utf8');
 for(const route of ['/in/','/us/','/uk/','/ca/','/au/']) assert.ok(directory.includes('href="'+route+'"'),'Missing country hub '+route);
});

test('India hub links to existing India calculators and official authorities',()=>{
 const html=fs.readFileSync(path.join(root,'in/index.html'),'utf8');
 assert.match(html,/<html lang="en-IN">/);
 assert.match(html,/rel="canonical" href="https:\/\/friendlycalculator\.in\/in\//);
 for(const route of [
  '/calculators/income-tax-calculator.html','/calculators/gst-calculator.html',
  '/calculators/loan-emi-calculator.html','/calculators/home-loan-emi-calculator.html',
  '/calculators/car-loan-calculator.html','/calculators/sip-calculator.html',
  '/calculators/fd-calculator.html','/calculators/rd-calculator.html',
  '/calculators/ppf-calculator.html','/calculators/professional-tax-calculator.html',
  '/calculators/stamp-duty-calculator.html','/calculators/electricity-bill-calculator.html'
 ]) assert.ok(html.includes('href="'+route+'"'),'Missing India calculator '+route);
 for(const source of ['incometax.gov.in','gst.gov.in','indiapost.gov.in']) assert.ok(html.includes(source),'Missing official source '+source);
 assert.match(html,/Madhya Pradesh/);
});

test('US, UK, Canada and Australia hubs declare their local market scope and official authorities',()=>{
 const checks=[
  ['us/index.html','en-US','irs.gov'],
  ['uk/index.html','en-GB','gov.uk'],
  ['ca/index.html','en-CA','canada.ca'],
  ['au/index.html','en-AU','ato.gov.au']
 ];
 for(const [file,locale,source] of checks){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(html,new RegExp('<html lang="'+locale+'">'));
  assert.match(html,/rel="canonical"/);
  assert.ok(html.includes(source),'Missing official authority '+source+' in '+file);
 }
});
