'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {auditPage,mainText,stripMarkup}=require('../scripts/adsense-page-quality-audit.cjs');
test('visible main text excludes script and style boilerplate',()=>{
 const text=mainText('<main><h1>Loan calculator</h1><p>Formula and worked example</p><script>fake words</script><style>.x{}</style></main>');
 assert.equal(text,'Loan calculator Formula and worked example');
});
test('flags generic placeholder labels and raw variable identifiers',()=>{
 const page=auditPage('sample-calculator.html','<main><h1>Example</h1><label>Input A<input></label><label>latestdueDate<input></label></main>');
 assert.equal(page.features.placeholderLabels,1);
 assert.equal(page.features.rawIdentifiers,1);
});
test('recognises substantive page signals and canonical metadata',()=>{
 const html='<head><title>EMI Calculator</title><meta name="description" content="Calculate monthly loan payments with principal, interest and tenure assumptions."><link rel="canonical" href="https://friendlycalculator.in/calculators/emi-calculator.html"></head><main><h1>EMI Calculator</h1><label>Loan amount<input></label><p>Formula: monthly payment from principal and interest rate.</p><h2>Worked example</h2><p>For example, a loan has a monthly payment.</p><h2>Assumptions</h2><p>Rounding and limitations apply.</p><h2>Frequently asked questions</h2><p>Question and answer.</p><p>Source https://www.rbi.org.in/example</p></main>';
 const page=auditPage('emi-calculator.html',html);
 for(const key of ['formula','workedExample','assumptions','faq','source','hasCanonical','core'])assert.equal(page.features[key],true);
});
test('stripMarkup removes HTML tags and entities safely',()=>{
 assert.equal(stripMarkup('<p>One&nbsp;two &amp; three</p>'),'One two three');
});
