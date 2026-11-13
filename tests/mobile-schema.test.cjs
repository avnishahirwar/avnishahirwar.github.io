const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
const chrome = fs.readFileSync(path.join(root, 'assets/site-chrome.css'), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(https:\\/\\/friendlycalculator\\.in[^<]*)<\\/loc>/g)].map(match => match[1]);

function localFile(url) {
  const parsed = new URL(url);
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';
  const file = path.join(root, pathname.replace(/^\\/+/, ''));
  return fs.existsSync(file) ? file : null;
}

test('calculator detail pages declare mobile viewport and shared shell assets', () => {
  const failures = [];
  const pages = urls.filter(url => /\\/calculators\\/[^/]+\\.html$/i.test(new URL(url).pathname));
  assert.ok(pages.length > 100, 'Expected a broad calculator-page sample');
  for (const url of pages) {
    const file = localFile(url);
    if (!file) { failures.push(url + ' (missing local file)'); continue; }
    const html = fs.readFileSync(file, 'utf8');
    if (!/<meta\\s+name=["']viewport["']/i.test(html)) failures.push(url + ' (viewport meta)');
    if (!html.includes('/assets/site-shell.js')) failures.push(url + ' (shared shell script)');
    if (!html.includes('/assets/site-chrome.css')) failures.push(url + ' (shared mobile chrome styles)');
  }
  assert.deepEqual(failures, [], failures.slice(0, 30).join('\\n'));
});

test('shared shell adds truthful WebApplication schema without fabricated reviews', () => {
  assert.match(shell, /injectCalculatorApplicationSchema/);
  assert.match(shell, /@type':'WebApplication/);
  assert.match(shell, /applicationCategory/);
  assert.match(shell, /isAccessibleForFree:true/);
  assert.match(shell, /priceCurrency:'INR'/);
  assert.match(shell, /hasApplicationSchema/);
  assert.doesNotMatch(shell, /aggregateRating|reviewRating/);
});

test('mobile calculator panels collapse input grids and keep wide tables scrollable', () => {
  assert.match(chrome, /@media\\(max-width:640px\\)/);
  assert.match(chrome, /\\.fields,\\.result-grid,\\.form-grid,\\.input-grid/);
  assert.match(chrome, /grid-template-columns:minmax\\(0,1fr\\)!important/);
  assert.match(chrome, /overflow-x:auto/);
});
