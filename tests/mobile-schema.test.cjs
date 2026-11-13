const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
const chrome = fs.readFileSync(path.join(root, 'assets/site-chrome.css'), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = sitemap.split('<loc>').slice(1).map(part => part.split('</loc>')[0]);

function localFile(url) {
  let pathname = decodeURIComponent(new URL(url).pathname);
  if (pathname === '/') pathname = '/index.html';
  const file = path.join(root, pathname.startsWith('/') ? pathname.slice(1) : pathname);
  return fs.existsSync(file) ? file : null;
}

test('calculator detail pages declare mobile viewport and shared shell assets', () => {
  const failures = [];
  const pages = urls.filter(url => {
    const pathname = new URL(url).pathname;
    return pathname.includes('/calculators/') && pathname.toLowerCase().endsWith('.html');
  });
  assert.ok(pages.length > 100, 'Expected a broad calculator-page sample');
  for (const url of pages) {
    const file = localFile(url);
    if (!file) { failures.push(url + ' (missing local file)'); continue; }
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('name="viewport"') && !html.includes("name='viewport'")) failures.push(url + ' (viewport meta)');
    if (!html.includes('/assets/site-shell.js')) failures.push(url + ' (shared shell script)');
    if (!html.includes('/assets/site-chrome.css')) failures.push(url + ' (shared mobile chrome styles)');
  }
  assert.deepEqual(failures, [], failures.slice(0, 30).join('\\n'));
});

test('shared shell adds truthful WebApplication schema without fabricated reviews', () => {
  assert.ok(shell.includes('injectCalculatorApplicationSchema'));
  assert.ok(shell.includes("'@type':'WebApplication'"));
  assert.ok(shell.includes('applicationCategory'));
  assert.ok(shell.includes('isAccessibleForFree:true'));
  assert.ok(shell.includes("priceCurrency:'INR'"));
  assert.ok(shell.includes('hasApplicationSchema'));
  assert.ok(!shell.includes('aggregateRating') && !shell.includes('reviewRating'));
});

test('mobile calculator panels collapse input grids and keep wide tables scrollable', () => {
  assert.ok(chrome.includes('@media(max-width:640px)'));
  assert.ok(chrome.includes('.fields,.result-grid,.form-grid,.input-grid'));
  assert.ok(chrome.includes('grid-template-columns:minmax(0,1fr)!important'));
  assert.ok(chrome.includes('overflow-x:auto'));
});
