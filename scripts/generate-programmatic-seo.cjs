#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'seo/programmatic-pages.json'), 'utf8'));
const outDir = path.join(root, 'guides/emi');
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money = (n) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
const emi = (p, annualRate, months) => {
  const monthlyRate = annualRate / 1200;
  if (!monthlyRate) return p / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return p * monthlyRate * factor / (factor - 1);
};
const years = (list) => list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : String(list[0]);
const donut = (principal, interest) => {
  const share = Math.round(interest / (principal + interest) * 1000) / 10;
  return '<svg viewBox="0 0 42 42" width="170" height="170" role="img" aria-label="Principal is ' + (100 - share).toFixed(1) + '% and interest is ' + share.toFixed(1) + '% of total repayment">' +
    '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="#234d6b" stroke-width="6"></circle>' +
    '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="#d8bd82" stroke-width="6" stroke-dasharray="' + share + ' ' + (100 - share) + '" stroke-dashoffset="25"></circle></svg>';
};
function render(item) {
  const principal = Number(item.amount);
  const rate = Number(item.rate);
  const rateLabel = String(rate);
  const termYears = Array.isArray(item.terms) && item.terms.length ? item.terms.map(Number) : [1,2,3,5];
  const featuredYears = termYears.includes(Number(item.featuredYears)) ? Number(item.featuredYears) : termYears[Math.floor((termYears.length - 1) / 2)];
  const terms = termYears.map(y => y * 12);
  const rows = terms.map(months => {
    const payment = emi(principal, rate, months);
    const total = payment * months;
    return '<tr><th scope="row">' + (months/12) + ' years</th><td>' + money(payment) + '</td><td>' + money(total-principal) + '</td><td>' + money(total) + '</td></tr>';
  }).join('');
  const featuredMonths = featuredYears * 12;
  const featuredEmi = emi(principal, rate, featuredMonths);
  const featuredTotal = featuredEmi * featuredMonths;
  const featuredInterest = featuredTotal - principal;
  const interestShare = (featuredInterest / featuredTotal * 100).toFixed(1);
  const rateRows = [rate - 1, rate, rate + 1].filter(r => r >= 0).map(r => {
    const payment = emi(principal, r, featuredMonths);
    const interest = payment * featuredMonths - principal;
    return '<tr><th scope="row">' + r + '%' + (r === rate ? ' (this page)' : '') + '</th><td>' + money(payment) + '</td><td>' + money(interest) + '</td></tr>';
  }).join('');
  const calcPath = item.kind === 'home' ? '/calculators/home-loan-emi-calculator.html' : '/calculators/loan-emi-calculator.html';
  const calcLabel = item.kind === 'home' ? 'Home Loan EMI Calculator' : 'Loan EMI Calculator';
  const calcLink = calcPath + (item.kind === 'home' ? '?amount=' + principal + '&rate=' + rate + '&months=' + featuredMonths : '');
  const others = data.pages.filter(p => p.slug !== item.slug && (item.kind ? p.kind === item.kind : !p.kind))
    .sort((a, b) => Math.abs(a.amount - principal) - Math.abs(b.amount - principal) || Math.abs(a.rate - rate) - Math.abs(b.rate - rate)).slice(0, 4);
  const moreLinks = others.length ? '<section class="panel"><h2>More loan EMI examples</h2><ul>' + others.map(p => '<li><a href="/guides/emi/' + p.slug + '.html">' + esc(money(Number(p.amount)) + ' loan at ' + p.rate + '% interest') + '</a></li>').join('') + '</ul></section>' : '';
  const title = money(principal) + ' ' + (item.kind === 'home' ? 'Home ' : '') + 'Loan EMI at ' + rateLabel + '% Interest | Friendly Calculator';
  const description = 'See estimated monthly EMI, total interest and repayment for a ' + money(principal) + ' ' + (item.kind === 'home' ? 'home ' : '') + 'loan at ' + rateLabel + '% annual interest, with ' + years(termYears) + ' year comparisons.';
  const canonical = data.site + '/guides/emi/' + item.slug + '.html';
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(title) + '</title><meta name="description" content="' + esc(description) + '">' +
    '<meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="' + canonical + '">' +
    '<meta property="og:type" content="article"><meta property="og:site_name" content="Friendly Calculator"><meta property="og:title" content="' + esc(title) + '">' +
    '<meta property="og:description" content="' + esc(description) + '"><meta property="og:url" content="' + canonical + '">' +
    '<meta property="og:image" content="https://friendlycalculator.in/og-friendly-calculator.png"><meta name="twitter:card" content="summary_large_image">' +
    '<link rel="icon" href="/favicon-96.png"><link rel="stylesheet" href="/assets/site-shell.css">' +
    '<style>body{margin:0;background:#f4f6f8;color:#202b36;font:16px/1.65 Arial,sans-serif}.wrap{width:min(900px,92%);margin:auto}.top{background:#101c2c;padding:18px 0}.brand{color:#fff;font-weight:800;text-decoration:none}.main{padding:32px 0}.panel{background:#fff;border:1px solid #d9e0e6;border-radius:10px;padding:20px;margin:16px 0}.muted{color:#64717d}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:600px}th,td{text-align:right;padding:11px;border-bottom:1px solid #e2e7eb}th:first-child,td:first-child{text-align:left}thead{background:#edf2f6}.cta{display:inline-block;background:#101c2c;color:#fff;padding:11px 16px;border-radius:6px;text-decoration:none;font-weight:700}.crumb{font-size:.9rem;color:#64717d}.faq details{background:#fff;border:1px solid #d9e0e6;border-radius:8px;padding:12px;margin:10px 0}.faq summary{font-weight:700;cursor:pointer}</style>' +
    '<script type="application/ld+json">' + JSON.stringify({"@context":"https://schema.org","@type":"WebPage","name":title,"description":description,"url":canonical,"isPartOf":{"@type":"WebSite","name":"Friendly Calculator","url":data.site+"/"}}).replace(/</g,'\\u003c') + '</script></head><body>' +
    '<header class="top"><div class="wrap"><a class="brand" href="/">Friendly Calculator</a></div></header><main class="wrap main">' +
    '<p class="crumb"><a href="/">Home</a> / <a href="/guides/">Guides</a> / Loan EMI examples</p>' +
    '<h1>' + esc(money(principal) + ' ' + (item.kind === 'home' ? 'Home ' : '') + 'Loan EMI at ' + rateLabel + '% Interest') + '</h1><p>' + esc(item.description) + ' This page gives an illustrative estimate, not a loan offer or financial advice.</p>' +
    '<section class="panel"><h2>Repayment comparison</h2><p>Loan amount: <strong>' + esc(money(principal)) + '</strong> · Annual interest: <strong>' + rateLabel + '%</strong> · Repayment: monthly instalments</p>' +
    '<div class="table-wrap"><table><thead><tr><th>Tenure</th><th>Estimated monthly EMI</th><th>Total interest</th><th>Total repayment</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<p class="muted">Estimates use a fixed annual nominal rate divided by 12, monthly reducing-balance interest and end-of-month payments. Values are rounded to the nearest rupee.</p></section>' +
    '<section class="panel"><h2>Where the money goes over ' + featuredYears + ' years</h2><div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">' + donut(principal, featuredInterest) +
    '<div><p>Of the <strong>' + esc(money(featuredTotal)) + '</strong> repaid on a ' + featuredYears + '-year term, <strong>' + esc(money(principal)) + '</strong> is principal and <strong>' + esc(money(featuredInterest)) + '</strong> (' + interestShare + '%) is interest.</p>' +
    '<p class="muted"><span style="color:#234d6b">■</span> Principal &nbsp; <span style="color:#d8bd82">■</span> Interest</p></div></div></section>' +
    '<section class="panel"><h2>How a 1% rate change affects a ' + featuredYears + '-year loan</h2><div class="table-wrap"><table><thead><tr><th>Annual rate</th><th>Monthly EMI</th><th>Total interest</th></tr></thead><tbody>' + rateRows + '</tbody></table></div></section>' +
    '<section class="panel"><h2>How the EMI is estimated</h2><p>EMI = P × r × (1 + r)<sup>n</sup> ÷ ((1 + r)<sup>n</sup> − 1), where P is principal, r is the monthly interest rate and n is the number of monthly payments.</p>' +
    '<p>For this example, P = ' + esc(money(principal)) + ', r = ' + rateLabel + '% ÷ 12 ÷ 100, and n depends on the selected tenure. For a ' + featuredYears + '-year term, n = ' + featuredMonths + ' and the estimated EMI is about <strong>' + esc(money(featuredEmi)) + '</strong>.</p></section>' +
    '<section class="panel"><h2>What this estimate excludes</h2><ul><li>Processing fees, insurance, taxes and other lender charges</li><li>Floating-rate changes, missed payments or prepayments</li><li>Different lender conventions for payment dates and rounding</li></ul>' +
    '<p>Actual EMI and total cost depend on the lender’s amortisation schedule and loan agreement.</p><a class="cta" href="' + calcLink + '">Open the interactive ' + calcLabel + '</a></section>' + moreLinks +
    '<section class="faq"><h2>Frequently asked questions</h2><details><summary>What is the EMI on a ' + esc(money(principal)) + ' loan at ' + rateLabel + '% for ' + featuredYears + ' years?</summary><p>About ' + esc(money(featuredEmi)) + ' per month under the assumptions above, with roughly ' + esc(money(featuredInterest)) + ' paid as interest over the term.</p></details>' +
    '<details><summary>Does a longer tenure reduce the EMI?</summary><p>Usually yes, because the principal is spread over more monthly payments. However, the total interest paid is generally higher.</p></details>' +
    '<details><summary>Is the interest rate fixed for the full loan?</summary><p>This illustration assumes a fixed rate. A floating-rate loan can change when the lender revises its benchmark or spread.</p></details>' +
    '<details><summary>Will my bank quote exactly this EMI?</summary><p>Not necessarily. Fees, payment dates, rate type, rounding and lender-specific terms can change the final schedule.</p></details></section>' +
    '<p class="muted">Reviewed: ' + esc(data.reviewed) + ' · <a href="/calculators/loan-emi-calculator.html">Loan EMI Calculator</a> · <a href="/guides/">All guides</a></p></main><script defer src="/assets/site-shell.js"></script></body></html>\n';
}
for (const item of data.pages) {
  if (!/^[a-z0-9-]+$/.test(item.slug) || !(Number(item.amount)>0) || !(Number(item.rate)>=0)) throw new Error('Invalid SEO page data: ' + item.slug);
  const target = path.join(outDir, item.slug + '.html');
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, render(item));
}
if (process.argv.includes('--check')) {
  for (const item of data.pages) {
    const file = path.join(outDir, item.slug + '.html');
    if (!fs.existsSync(file)) throw new Error('Missing generated page: ' + file);
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('rel="canonical"') || !html.includes('EMI formula') && !html.includes('How the EMI is estimated')) throw new Error('Generated page validation failed: ' + file);
  }
}
console.log('Generated ' + data.pages.length + ' curated EMI long-tail pages.');
