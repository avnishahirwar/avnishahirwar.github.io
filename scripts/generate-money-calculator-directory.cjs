#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'assets/calculator-search-index.json');
const OUTPUT_FILE = path.join(ROOT, 'calculator/money-calculators.html');
const FINANCE_CATEGORIES = new Set([
  'finance',
  'savings, investment & retirement',
  'loans, emi & credit',
  'tax, salary & payroll',
  'business, sales & operations',
  'business & trade',
  'agriculture & rural finance',
  'career & salary planning',
  'insurance & protection'
]);
const GROUPS = [
  ['personal', 'Personal money, budgeting & everyday costs', 'Plan a household budget, compare prices, estimate spending and understand personal cash flow.'],
  ['loans', 'Loans, mortgages, credit & debt', 'Estimate borrowing costs, repayments, credit usage and debt payoff scenarios.'],
  ['saving', 'Savings, investment, markets & retirement', 'Explore savings, deposits, investment projections, market measures and retirement planning.'],
  ['tax', 'Tax, salary & payroll', 'Find tax, take-home pay, salary, payroll and statutory contribution estimates by jurisdiction.'],
  ['business', 'Business finance, accounting & valuation', 'Work with business costs, profitability, cash flow, accounting ratios and valuation inputs.'],
  ['property', 'Property & real estate', 'Estimate property prices, rental returns, home affordability and real-estate investment measures.'],
  ['currency', 'Currency, banking & payments', 'Compare money conversion, exchange, banking, payment and transaction-cost calculations.'],
  ['insurance', 'Insurance & protection', 'Review premium and protection estimates using assumptions you provide.'],
  ['other', 'Other money & financial calculations', 'Browse additional financial measures and specialist tools from the wider catalogue.']
];
const GROUP_ORDER = new Map(GROUPS.map(([id], index) => [id, index]));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

function classify(item) {
  const text = `${item.name || ''} ${item.keywords || ''} ${item.description || ''}`.toLowerCase();
  if (/insurance|premium|policy cover/.test(text)) return 'insurance';
  if (/real estate|property|rental property|rent vs buy|home affordability|house price|property tax|mortgage points/.test(text)) return 'property';
  if (/loan|mortgage|emi|credit|debt|payoff|pay off|refinanc|lending|borrow|repayment|installment|instalment|apr/.test(text)) return 'loans';
  if (/tax|gst|vat|payroll|salary|wage|income|take.home|paycheck|pension contribution|fica|tds/.test(text)) return 'tax';
  if (/currency|forex|foreign exchange|exchange rate|remittance|money transfer|wire transfer|bank fee|payment processing/.test(text)) return 'currency';
  if (/investment|investor|savings|saving|retirement|retire|pension|portfolio|stock|share|bond|dividend|mutual fund|sip|systematic|return|yield|cagr|xirr|irr|npv|dcf|wealth|net worth|compound interest|deposit|annuity|crypto|cryptocurrency|capital gains|market cap|equity|valuation/.test(text)) return 'saving';
  if (/business|accounting|cash flow|cashflow|profit|loss|margin|markup|revenue|sales|cogs|ebitda|enterprise value|working capital|break.even|inventory|invoice|commission|economic|agriculture|farm|trade|operating cost/.test(text)) return 'business';
  if (/budget|spend|expense|cost|tip|discount|unit price|affordability|bill|money|personal finance|inflation/.test(text)) return 'personal';
  return 'other';
}
function isMoneyEntry(item) {
  const text = `${item.name || ''} ${item.keywords || ''} ${item.description || ''}`.toLowerCase();
  return /finance|money|loan|mortgage|emi|credit|debt|saving|investment|investor|retire|pension|salary|wage|payroll|paycheck|income|tax|gst|vat|cash flow|cashflow|profit|loss|sales|budget|spend|expense|cost|discount|bill|tip|afford|property|real estate|rent|currency|forex|exchange|yield|bond|stock|share|dividend|equity|portfolio|crypto|wealth|net worth|inflation|interest|deposit|bank|payment|insurance|premium|fee|return|cagr|xirr|irr|npv|dcf|roi|margin|markup|valuation|revenue|accounting|ebitda|cogs|inventory|commission|agriculture|farm|trade|annuity|amortiz|refinanc|loan-to-value|debt-to-income|capital gains|market cap|cash value|purchase price/.test(text);
}
function financeEntries() {
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  const byUrl = new Map();
  for (const item of index) {
    if (!FINANCE_CATEGORIES.has(String(item.category || '').trim().toLowerCase())) continue;
    if (!isMoneyEntry(item)) continue;
    const url = String(item.url || '');
    if (!(url.startsWith('/calculators/') || url.startsWith('/international/'))) continue;
    if (!url.endsWith('.html') || url.includes('..') || url.includes('?') || url.includes('#')) continue;
    const diskPath = path.join(ROOT, url.slice(1));
    if (!fs.existsSync(diskPath)) continue;
    const normalized = {...item, url, group: classify(item)};
    const previous = byUrl.get(url);
    if (!previous || (normalized.description || '').length > (previous.description || '').length) byUrl.set(url, normalized);
  }
  return [...byUrl.values()].sort((a, b) =>
    GROUP_ORDER.get(a.group) - GROUP_ORDER.get(b.group) || a.name.localeCompare(b.name, 'en') || a.url.localeCompare(b.url)
  );
}
function build() {
  const entries = financeEntries();
  const sections = GROUPS.map(([id, title, description]) => {
    const members = entries.filter(item => item.group === id);
    if (!members.length) return '';
    const links = members.map(item => {
      const search = `${item.name} ${item.category} ${item.keywords || ''} ${item.description || ''}`.toLowerCase();
      return `      <li class="money-tool" data-search="${escapeHtml(search)}"><a href="${escapeHtml(item.url)}">${escapeHtml(item.name)}</a><p>${escapeHtml(item.description || 'Open this calculator to enter your own values and review its assumptions.')}</p></li>`;
    }).join('\n');
    return `    <details class="money-category" data-category="${id}"><summary><span>${escapeHtml(title)}</span><span class="category-count">${members.length} tools</span></summary><p class="category-description">${escapeHtml(description)}</p><ul class="money-tool-list">\n${links}\n    </ul></details>`;
  }).filter(Boolean).join('\n');
  const date = new Date().toISOString().slice(0, 10);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Money &amp; Finance Calculators Worldwide | Friendly Calculator</title>
<meta name="description" content="Browse a searchable directory of money and finance calculators for budgeting, loans, taxes, savings, investments, business, property and more.">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://friendlycalculator.in/calculator/money-calculators.html">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="website"><meta property="og:site_name" content="Friendly Calculator">
<meta property="og:title" content="Money &amp; Finance Calculators Worldwide | Friendly Calculator">
<meta property="og:description" content="Search money calculators for personal finance, borrowing, savings, taxes, business and global markets.">
<meta property="og:url" content="https://friendlycalculator.in/calculator/money-calculators.html">
<meta property="og:image" content="https://friendlycalculator.in/og-friendly-calculator.png">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Money &amp; Finance Calculators Worldwide | Friendly Calculator">
<meta name="twitter:description" content="Browse finance calculators by topic and search the full directory.">
<link rel="stylesheet" href="/assets/site-shell.css"><link rel="stylesheet" href="/assets/site-chrome.css?v=1">
<style>
:root{--money-ink:#172638;--money-muted:#596b7c;--money-line:#dce4eb;--money-paper:#fff;--money-wash:#f4f7f9;--money-accent:#174f82}
*{box-sizing:border-box}body{margin:0;background:var(--money-wash);color:var(--money-ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
.money-wrap{width:min(1100px,94%);margin:0 auto}.money-nav{padding:16px 0;border-bottom:1px solid var(--money-line);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.money-brand{font-weight:850;text-decoration:none;color:var(--money-ink);letter-spacing:.03em}.money-nav nav{display:flex;gap:14px;flex-wrap:wrap}.money-nav nav a{font-size:.9rem}
.money-hero{padding:30px 0 18px}.money-hero h1{font-size:clamp(1.9rem,4vw,2.8rem);line-height:1.12;margin:8px 0}.money-hero p{max-width:850px;color:var(--money-muted)}.money-kicker{font-size:.78rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--money-accent)}
.money-search{background:var(--money-paper);border:1px solid var(--money-line);border-radius:12px;padding:18px;margin:10px 0 18px}.money-search label{font-weight:750;display:block;margin-bottom:8px}.money-search-row{display:flex;gap:9px}.money-search input{flex:1;min-width:0;border:1px solid #aebbc7;border-radius:8px;padding:12px;font:inherit}.money-search button{border:0;border-radius:8px;background:var(--money-accent);color:#fff;padding:11px 17px;font:inherit;font-weight:750;cursor:pointer}.money-search-status{font-size:.88rem;color:var(--money-muted);margin:8px 0 0}
.money-directory{display:grid;gap:12px}.money-category{background:var(--money-paper);border:1px solid var(--money-line);border-radius:12px;overflow:hidden}.money-category>summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer;padding:15px 18px;font-weight:800;font-size:1.05rem;background:#edf3f7}.money-category>summary::-webkit-details-marker{display:none}.money-category>summary::before{content:"+";color:var(--money-accent);font-size:1.2rem;margin-right:4px}.money-category[open]>summary::before{content:"−"}.category-count{font-size:.78rem;font-weight:700;color:var(--money-muted);white-space:nowrap}.category-description{color:var(--money-muted);margin:0;padding:13px 18px 0}.money-tool-list{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px;margin:0;padding:8px 18px 15px}.money-tool{padding:12px 0;border-bottom:1px solid #edf0f3;min-width:0}.money-tool a{font-weight:750;text-decoration:none}.money-tool a:hover{text-decoration:underline}.money-tool p{margin:4px 0 0;color:var(--money-muted);font-size:.86rem}.money-tool[hidden],.money-category[hidden]{display:none!important}.money-empty{display:none;background:white;border:1px solid var(--money-line);border-radius:10px;padding:18px;color:var(--money-muted)}.money-note{margin:20px 0;background:#fff;border:1px solid var(--money-line);border-radius:12px;padding:18px;color:var(--money-muted);font-size:.9rem}.money-note h2{font-size:1.1rem;margin:0 0 7px;color:var(--money-ink)}.money-note p:last-child{margin-bottom:0}.money-footer{padding:24px 0 34px;color:var(--money-muted);font-size:.88rem}.money-footer a{margin-right:12px}
@media(max-width:650px){.money-search-row{flex-direction:column}.money-search button{width:100%}.money-tool-list{grid-template-columns:1fr}.money-category>summary{align-items:flex-start}.money-nav{align-items:flex-start;flex-direction:column}}
</style>
<script type="application/ld+json">${JSON.stringify({ '@context':'https://schema.org','@type':'CollectionPage','name':'Money and Finance Calculators Worldwide','url':'https://friendlycalculator.in/calculator/money-calculators.html','dateModified':date,'isAccessibleForFree':true,'description':'A searchable directory of personal, business and international money calculators.'})}</script>
</head>
<body>
<header class="money-wrap money-nav"><a class="money-brand" href="/">FRIENDLY CALCULATOR</a><nav aria-label="Main navigation"><a href="/">Home</a><a href="/calculator/finance-calculators.html">Finance overview</a><a href="/calculator/tax.html">Tax</a><a href="/calculator/site-directory.html">All calculators</a></nav></header>
<main class="money-wrap">
<section class="money-hero"><p class="money-kicker">Global money toolkit · ${entries.length} listed calculators</p><h1>Money &amp; Finance Calculators</h1><p>Explore the current site's money tools in one place, from household budgeting and borrowing to investment, tax, business finance and country-specific estimates. Search by calculator name, topic or keyword, then open a tool to enter your own assumptions.</p><p><a href="/calculator/finance-calculators.html">See the finance overview and featured tools →</a></p></section>
<section class="money-search" aria-labelledby="money-search-label"><label id="money-search-label" for="money-search-input">Search money calculators</label><div class="money-search-row"><input id="money-search-input" type="search" autocomplete="off" placeholder="Try mortgage, salary, bond, tax, currency…" aria-describedby="money-search-status"><button id="money-search-clear" type="button">Clear search</button></div><p class="money-search-status" id="money-search-status" role="status" aria-live="polite">Browse by topic or search all ${entries.length} listed calculators.</p></section>
<section class="money-directory" aria-label="Money calculator categories">\n${sections}\n</section><p id="money-search-empty" class="money-empty">No calculators match that search. Try another topic or clear the search.</p>
<section class="money-note"><h2>Use results as estimates</h2><p>Calculator coverage and rules vary by country, product and tax year. Rates, fees, legal requirements, eligibility and provider terms can change. Each result is based on the inputs and assumptions shown by that tool; it is not a lender offer, tax filing, investment recommendation or professional financial advice.</p><p>For country-specific tax or statutory calculations, confirm the selected jurisdiction and tax period against the relevant official source. For market-linked projections, remember that assumed returns are not guaranteed.</p></section>
</main><footer class="money-wrap money-footer"><a href="/calculator/site-directory.html">All calculators</a><a href="/calculator/methodology.html">Methodology</a><a href="/calculator/disclaimer.html">Disclaimer</a><a href="/calculator/contact.html">Contact</a><p>© Friendly Calculator</p></footer>
<script>
(()=>{'use strict';const input=document.getElementById('money-search-input'),clear=document.getElementById('money-search-clear'),status=document.getElementById('money-search-status'),empty=document.getElementById('money-search-empty'),groups=[...document.querySelectorAll('.money-category')],items=[...document.querySelectorAll('.money-tool')];function filter(){const q=input.value.trim().toLocaleLowerCase();let visible=0;for(const item of items){const match=!q||(item.dataset.search||'').includes(q);item.hidden=!match;if(match)visible++;}for(const group of groups){const has=[...group.querySelectorAll('.money-tool')].some(item=>!item.hidden);group.hidden=!has;if(q&&has)group.open=true;}empty.style.display=q&&visible===0?'block':'none';const groupCount=groups.filter(group=>!group.hidden).length;status.textContent=q?(visible+' matching calculators across '+groupCount+' topic groups.'):'Browse by topic or search all '+items.length+' listed calculators.';}input.addEventListener('input',filter);clear.addEventListener('click',()=>{input.value='';filter();input.focus();});})();
</script><script src="/assets/site-shell.js" defer></script><script src="/assets/site-chrome.js?v=1" defer></script>
</body></html>\n`;
}
function main() {
  const html = build();
  if (process.argv.includes('--check')) {
    if (!html.includes('Money &amp; Finance Calculators') || (html.match(/class="money-tool"/g) || []).length < 400) {
      throw new Error('Generated money directory is incomplete.');
    }
    console.log(`Money directory check passed: ${(html.match(/class="money-tool"/g) || []).length} calculators.`);
    return;
  }
  fs.mkdirSync(path.dirname(OUTPUT_FILE), {recursive:true});
  fs.writeFileSync(OUTPUT_FILE, html);
  console.log(`Generated ${path.relative(ROOT, OUTPUT_FILE)} with ${(html.match(/class="money-tool"/g) || []).length} verified calculator links.`);
}
if (require.main === module) main();
module.exports = {build, financeEntries, classify};
