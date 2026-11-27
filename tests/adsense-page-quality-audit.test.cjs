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

test('penalises repeated template paragraphs instead of treating them as original content',()=>{
 const repeated='This generic explanation is repeated across many calculator pages and adds no page-specific guidance.';
 const html='<main><h1>Specific calculator</h1><p>'+repeated+'</p><p>This page explains a distinct measurement method and its relevant units and practical constraints.</p><label>Wall length<input></label></main>';
 const page=auditPage('specific-calculator.html',html,new Set([repeated.toLowerCase()]));
 assert.ok(page.features.repeatedParagraphWords>0);
 assert.ok(page.features.pageSpecificWords<page.features.words);
 assert.ok(page.features.repeatedParagraphRatio>0);
 assert.equal(page.features.qualityEligible,false);
});

test('detects noindex and refresh-only pages regardless of meta attribute order',()=>{
 const {hasNoindex,hasRefreshRedirect}=require('../scripts/adsense-page-quality-audit.cjs');
 assert.equal(hasNoindex('<meta name="robots" content="noindex,follow">'),true);
 assert.equal(hasNoindex('<meta content="noindex" name="googlebot">'),true);
 assert.equal(hasNoindex('<meta name="robots" content="index,follow">'),false);
 assert.equal(hasRefreshRedirect('<meta http-equiv="refresh" content="0;url=/new.html">'),true);
 assert.equal(hasRefreshRedirect('<meta name="description" content="A calculator">'),false);
});

test('requires a canonical URL to match the actual calculator route',()=>{
 const {isSelfCanonical}=require('../scripts/adsense-page-quality-audit.cjs');
 assert.equal(isSelfCanonical('emi-calculator.html','https://friendlycalculator.in/calculators/emi-calculator.html'),true);
 assert.equal(isSelfCanonical('emi-calculator.html','https://friendlycalculator.in/calculators/loan-emi-calculator.html'),false);
 assert.equal(isSelfCanonical('emi-calculator.html','https://example.com/calculators/emi-calculator.html'),false);
});

test('flags historical year-specific pages for manual review',()=>{
 const {isHistoricalPrimaryYear}=require('../scripts/adsense-page-quality-audit.cjs');
 assert.equal(isHistoricalPrimaryYear('income-tax-calculator-2020-21.html','Income Tax Calculator for 2020–21'),true);
 assert.equal(isHistoricalPrimaryYear('income-tax-calculator.html','Income Tax Calculator for Tax Year 2026–27'),false);
});

test('index shortlist eligibility requires unique page metadata, one meaningful H1 and self canonical',()=>{
 const body=Array.from({length:190},(_,i)=>'scenario'+i).join(' ');
 const html='<head><title>Quality Calculator — Practical estimate</title><meta name="description" content="Calculate a specific result with a clear formula, worked example, assumptions and limitations for your chosen inputs."><link rel="canonical" href="https://friendlycalculator.in/calculators/quality-calculator.html"></head><main><h1>Quality Calculator</h1><h2>Formula and worked example</h2><p>Formula: total = amount × rate. Worked example: use a principal value and an annual rate.</p><h2>Assumptions and limitations</h2><p>'+body+'</p><label>Amount<input type="number"></label><button type="button">Calculate</button></main>';
 const page=auditPage('quality-calculator.html',html);
 assert.equal(page.features.baseEligible,true);
 assert.equal(page.features.selfCanonical,true);
 assert.equal(page.features.h1Count,1);
 assert.equal(page.features.meaningfulH1,true);
 const noCanonical= auditPage('quality-calculator.html',html.replace(/<link rel="canonical"[^>]*>/,''));
 assert.equal(noCanonical.features.baseEligible,false);
 const noindex= auditPage('quality-calculator.html',html.replace('</head>','<meta name="robots" content="noindex,follow"></head>'));
 assert.equal(noindex.features.baseEligible,false);
});

test('a single low word-count signal alone does not recommend noindex',()=>{
 const html='<head><title>Short equation helper | Friendly Calculator</title><link rel="canonical" href="https://friendlycalculator.in/calculators/short-equation-helper.html"></head><main><h1>Short equation helper</h1><label>Starting amount<input type="number"></label><p>Formula: result = value × 2.</p></main>';
 const page=auditPage('short-equation-helper.html',html);
 assert.equal(page.features.pageSpecificWords<120,true);
 assert.equal(page.features.hardThin,false);
});
test('two distinct thin-content signals can enter the suggested noindex review queue',()=>{
 const html='<head><title>Generic helper | Friendly Calculator</title><link rel="canonical" href="https://friendlycalculator.in/calculators/generic-helper.html"></head><main><h1>Generic helper</h1><p>This calculator performs the displayed calculation. This calculator performs the displayed calculation.</p></main>';
 const page=auditPage('generic-helper.html',html);
 assert.equal(page.features.hardThin,true);
});
