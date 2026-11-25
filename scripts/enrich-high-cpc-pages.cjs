#!/usr/bin/env node
'use strict';
// Adds an original guide section (formula, worked example, inputs, mistakes, FAQ, related links)
// to thin high-value calculator pages. Idempotent: replaces its own section on re-run.
// Worked-example numbers are computed here with the same maths the pages use.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const MARK_START = '<!--fc-guide:start-->';
const MARK_END = '<!--fc-guide:end-->';
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const inr0 = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
const usd2 = (n) => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const emi = (p, annual, n) => { const r = annual / 1200; return r === 0 ? p / n : p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1); };
function stepUp(m, stepPct, annual, years) {
  let bal = 0, invested = 0; const step = stepPct / 100, mr = Math.pow(1 + annual / 100, 1 / 12) - 1, months = Math.round(years * 12);
  for (let i = 0; i < months; i++) { const c = m * Math.pow(1 + step, Math.floor(i / 12)); invested += c; bal = (bal + c) * (1 + mr); }
  return { bal, invested };
}
const { project401k } = require(path.join(root, 'assets/country-calculators.js'));

const pages = [];

// --- Personal loan EMI --------------------------------------------------
{
  const P = 500000, rate = 12, n = 36, e = emi(P, rate, n), total = e * n;
  pages.push({
    file: 'calculators/personal-loan-emi-calculator.html',
    h2: 'Personal loan EMI: formula, example and what to check',
    formula: 'EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1), where P is the loan amount, r is the monthly interest rate (annual rate ÷ 12) and n is the number of monthly instalments. Total interest = EMI × n − P.',
    example: 'A ₹5,00,000 personal loan at 12% a year for 36 months has a monthly rate of 1%. The reducing-balance formula gives an EMI of about <strong>' + inr(e) + '</strong>, total repayment of about ' + inr0(total) + ' and total interest of about ' + inr0(total - P) + '. Enter values in the units shown on the form fields to reproduce a similar result.',
    inputs: ['<strong>Loan amount:</strong> the principal you borrow, not including processing fee or insurance premiums that a lender may add.', '<strong>Interest rate:</strong> use the rate in your sanction letter or key fact statement. Personal loans are unsecured, so rates are usually higher than home or car loans.', '<strong>Tenure:</strong> a longer tenure lowers the EMI but raises total interest.'],
    mistakes: ['Comparing offers by EMI alone instead of EMI plus total interest plus fees.', 'Ignoring processing fees and prepayment or foreclosure charges.', 'Taking a longer tenure only to reduce the EMI without checking the extra interest.', 'Assuming a flat-rate quote and a reducing-balance quote are the same rate.'],
    faqs: [['How is personal loan EMI calculated?', 'Using the reducing-balance formula above, where interest each month is charged on the outstanding principal and the instalment stays constant.'], ['Does a shorter tenure save money?', 'Usually yes. The EMI is higher, but you pay interest for fewer months, so total interest falls.'], ['Does this include processing fees?', 'No. Fees, GST on fees, insurance and other lender charges are excluded; add them separately when comparing offers.'], ['Is this a loan offer?', 'No. It is a mathematical estimate. The lender decides eligibility, rate and final schedule.']],
    related: ['loan-emi-calculator', 'home-loan-emi-calculator', 'credit-card-emi-calculator', 'business-loan-emi-calculator', 'emi-affordability-calculator', 'loan-prepayment-calculator']
  });
}
// --- Step-up SIP ---------------------------------------------------------
{
  const a = stepUp(5000, 10, 12, 15), flat = stepUp(5000, 0, 12, 15);
  pages.push({
    file: 'calculators/step-up-sip-calculator.html',
    h2: 'Step-up SIP: how the projection works, with an example',
    formula: 'Each month, the contribution for year k is Monthly SIP × (1 + step-up)^(k − 1). The balance grows each month at the effective monthly rate (1 + annual return)^(1/12) − 1, and each contribution is added at the start of its month.',
    example: 'Starting with ₹5,000 a month, increasing the SIP by 10% every year, at an assumed 12% annual return for 15 years: total contributions are about ' + inr0(a.invested) + ' and the estimated value is about <strong>' + inr0(a.bal) + '</strong>. A flat ₹5,000 SIP with no step-up under the same assumptions invests ' + inr0(flat.invested) + ' and reaches about ' + inr0(flat.bal) + '. Returns are illustrative, not guaranteed.',
    inputs: ['<strong>Starting monthly SIP:</strong> the amount in the first year.', '<strong>Annual increase (%):</strong> how much you raise the SIP every 12 months, for example in line with salary growth.', '<strong>Assumed annual return (%):</strong> an assumption, not a promise; market-linked returns vary and can be negative in some periods.', '<strong>Period (years):</strong> longer periods let compounding do more of the work.'],
    mistakes: ['Using an optimistic return assumption and treating it as a forecast.', 'Choosing a step-up you cannot sustain if income does not rise as expected.', 'Ignoring expense ratio, exit load and taxes, which are not modelled here.', 'Comparing a step-up result with a flat SIP of a different period.'],
    faqs: [['What is a step-up SIP?', 'A SIP whose monthly amount increases by a fixed percentage at regular intervals, usually every year.'], ['Why does a step-up help?', 'Later contributions are larger, so more money is invested overall and the final corpus is usually higher than with a flat SIP.'], ['Are the results guaranteed?', 'No. Returns on market-linked investments are not guaranteed and this tool uses a constant assumed rate.'], ['Does it include taxes and fees?', 'No. Fund expenses, exit loads and capital-gains tax are excluded.']],
    related: ['sip-calculator', 'lumpsum-calculator', 'fd-calculator', 'inflation-calculator', 'compound-interest-calculator']
  });
}
// --- VAT -----------------------------------------------------------------
{
  const net = 1000, rate = 20, vat = net * rate / 100, gross = net + vat, back = gross / (1 + rate / 100);
  pages.push({
    file: 'calculators/vat-calculator.html',
    h2: 'VAT calculator: adding and removing VAT, with examples',
    formula: 'To add VAT: VAT = net × rate ÷ 100 and gross = net + VAT. To remove VAT from a gross price: net = gross ÷ (1 + rate ÷ 100), and VAT = gross − net.',
    example: 'Adding VAT: a net price of ' + usd2(net).replace('$', '') + ' at a 20% rate has VAT of ' + vat.toFixed(2) + ', so the gross price is ' + gross.toFixed(2) + '. Removing VAT: a gross price of ' + gross.toFixed(2) + ' at 20% has a net price of ' + back.toFixed(2) + '. Note that you divide by 1.20; subtracting 20% of the gross price gives the wrong answer.',
    inputs: ['<strong>Amount:</strong> the price you have, which can be net (before VAT) or gross (including VAT).', '<strong>VAT rate (%):</strong> use the rate that applies to your product and country; standard, reduced and zero rates differ.'],
    mistakes: ['Subtracting the VAT percentage from a gross price instead of dividing by 1 + rate.', 'Using the standard rate for goods that have a reduced or zero rate.', 'Mixing up net and gross when comparing quotes.'],
    faqs: [['What is the difference between VAT and sales tax?', 'VAT is collected at each stage of the supply chain with credit for tax already paid, while sales tax is usually charged once at final sale.'], ['How do I find the VAT in a gross price?', 'Divide the gross price by 1 + rate to get the net price, then subtract the net from the gross.'], ['Does this calculator know my country’s rate?', 'No. Enter the rate yourself and verify it with your tax authority.']],
    related: ['sales-tax-calculator', 'gst-calculator', 'percentage-calculator', 'tip-calculator']
  });
}
// --- Sales tax -----------------------------------------------------------
{
  const price = 250, rate = 8.25, tax = price * rate / 100;
  pages.push({
    file: 'calculators/sales-tax-calculator.html',
    h2: 'Sales tax: formula, example and common mistakes',
    formula: 'Sales tax = price × rate ÷ 100, and total = price + sales tax. To find the pre-tax price from a tax-inclusive total: price = total ÷ (1 + rate ÷ 100).',
    example: 'An item priced at 250.00 with an 8.25% sales tax rate has tax of ' + tax.toFixed(2) + ', so the total is ' + (price + tax).toFixed(2) + '. Working backwards, a total of ' + (price + tax).toFixed(2) + ' at the same rate corresponds to a pre-tax price of ' + ((price + tax) / (1 + rate / 100)).toFixed(2) + '.',
    inputs: ['<strong>Price:</strong> the pre-tax price of the item or service.', '<strong>Tax rate (%):</strong> combine state, county and city rates if your location charges more than one; rates and taxable items vary by place.'],
    mistakes: ['Using only the state rate when local rates also apply.', 'Assuming every item is taxable; groceries, medicine or services may be exempt in some places.', 'Applying the rate to a discounted price when the rules tax the original price.'],
    faqs: [['How do I calculate sales tax?', 'Multiply the price by the rate as a decimal, for example 0.0825 for 8.25%, and add the result to the price.'], ['Is sales tax the same everywhere?', 'No. Rates, exemptions and rules differ by state, county and city, and by country.'], ['Does this tool look up my local rate?', 'No. Enter the rate you want to use and confirm it with the relevant tax authority.']],
    related: ['vat-calculator', 'gst-calculator', 'tip-calculator', 'percentage-calculator']
  });
}
// --- 401(k) ---------------------------------------------------------------
{
  const r = project401k({ currentBalance: 10000, annualSalary: 75000, employeeContributionPercent: 6, employerMatchPercent: 50, employerMatchCapPercent: 6, annualReturnPercent: 6, salaryGrowthPercent: 2, years: 20 });
  pages.push({
    file: 'calculators/401k-calculator.html',
    h2: '401(k) growth: example and how to read the result',
    formula: 'Each year: employee contribution = salary × your contribution %; employer match = salary × min(your %, match cap %) × match %. The balance grows by the assumed annual return and contributions are added at year-end; salary then rises by the growth rate.',
    example: 'Using the default inputs, a $10,000 starting balance, a $75,000 salary, 6% employee contribution, a 50% match on up to 6% of pay, 6% annual return and 2% salary growth over 20 years gives an estimated balance of about <strong>' + usd(r.endingBalance) + '</strong>. Of that, your contributions total about ' + usd(r.employeeContributions) + ' and the employer match about ' + usd(r.employerContributions) + '. This is an illustration, not a forecast.',
    inputs: ['<strong>Employer match and cap:</strong> take these from your plan documents; a common design is 50% of the first 6% of pay.', '<strong>Annual return:</strong> an assumption; real returns vary and can be negative.', '<strong>Salary growth:</strong> raises the dollar contribution each year.'],
    mistakes: ['Not contributing enough to receive the full employer match.', 'Using a high return assumption and treating the result as certain.', 'Forgetting that fees, taxes, vesting rules and IRS contribution limits are not modelled here.'],
    faqs: [['What is a 401(k) match?', 'Money your employer adds to your 401(k) based on your own contributions, up to a plan-defined limit.'], ['Does this model contribution limits or taxes?', 'No. Check current IRS limits and your plan rules; this estimate omits taxes, fees, vesting and withdrawals.'], ['Why does a small increase in contribution matter?', 'Contributions compound, so extra years and extra percentage points can change the final balance noticeably.']],
    related: ['compound-interest-calculator', 'inflation-calculator', 'mortgage-calculator', 'sip-calculator']
  });
}

function section(p) {
  const links = p.related.filter((slug) => fs.existsSync(path.join(root, 'calculators', slug + '.html')));
  const style = 'background:#fff;border:1px solid #e0e5ea;border-radius:14px;padding:22px;margin:18px 0';
  return MARK_START + '<section id="fc-guide" style="' + style + '"><h2>' + esc(p.h2) + '</h2>' +
    '<h3>Formula</h3><p>' + p.formula + '</p>' +
    '<h3>Worked example</h3><p>' + p.example + '</p>' +
    '<h3>Inputs explained</h3><ul>' + p.inputs.map((i) => '<li>' + i + '</li>').join('') + '</ul>' +
    '<h3>Common mistakes</h3><ul>' + p.mistakes.map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul>' +
    '<h3>Frequently asked questions</h3>' + p.faqs.map(([q, a]) => '<details><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>').join('') +
    '<h3>Related calculators</h3><p>' + links.map((s) => '<a href="/calculators/' + s + '.html">' + s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) + '</a>').join(' · ') + '</p>' +
    '<p style="color:#596b7c;font-size:.9rem">Educational estimate only; not financial, tax or legal advice. Verify rates and rules with the relevant lender, tax authority or plan provider.</p></section>' + MARK_END;
}

for (const p of pages) {
  const file = path.join(root, p.file);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(new RegExp(MARK_START + '[\\s\\S]*?' + MARK_END), '');
  const block = section(p);
  const anchor = html.indexOf('<aside class="fc-review-note"');
  const end = anchor >= 0 ? anchor : html.indexOf('</main>');
  if (end < 0) throw new Error('No insertion point in ' + p.file);
  html = html.slice(0, end) + block + html.slice(end);
  fs.writeFileSync(file, html);
  console.log('Enriched ' + p.file);
}
