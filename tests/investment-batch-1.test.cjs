'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const expected = [{"name":"Portfolio Rebalancing Calculator","url":"/calculators/portfolio-rebalancing-calculator.html"},{"name":"Tax-Loss Harvesting Calculator","url":"/calculators/tax-loss-harvesting-calculator.html"},{"name":"Dollar-Cost Averaging vs Lump-Sum Calculator","url":"/calculators/dollar-cost-averaging-vs-lump-sum-calculator.html"},{"name":"Sequence of Returns Risk Calculator","url":"/calculators/sequence-of-returns-risk-calculator.html"},{"name":"Bond Ladder Calculator","url":"/calculators/bond-ladder-calculator.html"},{"name":"Stock Position Sizing Calculator","url":"/calculators/stock-position-sizing-calculator.html"},{"name":"Portfolio Risk Contribution Calculator","url":"/calculators/portfolio-risk-contribution-calculator.html"},{"name":"Dividend Reinvestment vs Cash Calculator","url":"/calculators/dividend-reinvestment-vs-cash-calculator.html"},{"name":"Inflation-Adjusted Investment Goal Calculator","url":"/calculators/inflation-adjusted-investment-goal-calculator.html"},{"name":"Macaulay Bond Duration Calculator","url":"/calculators/macaulay-bond-duration-calculator.html"},{"name":"Portfolio Drawdown Recovery Calculator","url":"/calculators/portfolio-drawdown-recovery-calculator.html"}];
test('investment batch 1 exposes eleven unique functional pages in all discovery registries', () => {
  const additions = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index-additions.json'), 'utf8'));
  const urls = additions.map(x => x.url);
  assert.equal(new Set(urls).size, urls.length, 'search-index addition URLs must be unique');
  const directory = fs.readFileSync(path.join(root, 'calculator/money-calculators.html'), 'utf8');
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'config/site-directory-category-assignments.json'), 'utf8'));
  const category = registry.categories.find(x => x.id === 'savings-investments');
  assert.ok(category);
  for (const item of expected) {
    const file = path.join(root, item.url.slice(1));
    assert.ok(fs.existsSync(file), 'missing ' + item.url);
    const html = fs.readFileSync(file, 'utf8');
    for (const marker of ['<title>', '</title>', 'name="description"', 'rel="canonical"', 'id="calcForm"', "addEventListener('submit'", 'aria-live="polite"', 'Formula and calculation method', 'Worked example', 'Frequently asked questions', 'educational illustration', 'og:image:alt', 'twitter:image:alt']) {
      assert.ok(html.includes(marker), 'missing ' + marker + ' in ' + item.url);
    }
    assert.ok(additions.some(x => x.url === item.url && x.name === item.name), 'missing search index ' + item.url);
    assert.ok(directory.includes('href="' + item.url + '"'), 'missing money directory ' + item.url);
    assert.ok(category.urls.includes(item.url), 'missing site-directory assignment ' + item.url);
    if (item.url === '/calculators/portfolio-risk-contribution-calculator.html') assert.ok(html.includes('const [we0,wd0,wc0,se0,sd0,sc0,red,rec,rdc]=v'), 'correlations must remain unitless values in the covariance matrix');
  }
  assert.ok(!additions.some(x => x.url === '/calculators/jensen-alpha-calculator.html'), 'do not add the semantic duplicate of the existing Jensen alpha calculator');
  assert.ok(!fs.existsSync(path.join(root, 'calculators/jensen-alpha-calculator.html')), 'do not publish the duplicate Jensen alpha route');
});
