const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
const chrome = fs.readFileSync(path.join(root, 'assets/site-shell.css'), 'utf8');
const calculators = fs.readFileSync(path.join(root, 'assets/page-calculators.js'), 'utf8');
const minutesToHours = fs.readFileSync(path.join(root, 'calculators/minutes-to-hours-calculator.html'), 'utf8');
const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
const gstCalculator = fs.readFileSync(path.join(root, 'calculators/gst-calculator.html'), 'utf8');
const basicCalculator = fs.readFileSync(path.join(root, 'calculators/basic-calculator.html'), 'utf8');
const scientificCalculator = fs.readFileSync(path.join(root, 'calculators/scientific-calculator.html'), 'utf8');
const loanEmi = fs.readFileSync(path.join(root, 'calculators/loan-emi-calculator.html'), 'utf8');
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
    if (!html.includes('/assets/site-shell.css')) failures.push(url + ' (shared responsive shell styles)');
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
  assert.ok(shell.includes("launcher.id='fc-ai-lazy-launch'"));
  assert.ok(shell.includes("assistantScript.src='/assets/friendly-ai-assistant.js'"));
  assert.ok(shell.includes('assistantScript.onload'));
  assert.ok(!shell.includes("assistantScript.defer=true"));
  assert.ok(!shell.includes('aggregateRating') && !shell.includes('reviewRating'));
});

test('mobile calculator panels collapse input grids and keep wide tables scrollable', () => {
  assert.ok(chrome.includes('@media(max-width:640px)'));
  assert.ok(chrome.includes('.fields,.result-grid,.form-grid,.input-grid'));
  assert.ok(chrome.includes('grid-template-columns:minmax(0,1fr)!important'));
  assert.ok(chrome.includes('overflow-x:auto'));
});


test('native Minutes-to-Hours calculator does not receive a duplicate injected calculator panel', () => {
  assert.ok(minutesToHours.includes('data-fc-native-calculator'));
  assert.ok(calculators.includes('if(document.querySelector("[data-fc-native-calculator]"))return;'));
});

test('native Minutes-to-Hours page reserves the shared header before shell hydration', () => {
  assert.ok(minutesToHours.includes('<header class="fc-global-header">'));
  assert.ok(minutesToHours.includes('id="fc-primary-navigation"'));
});


test('priority pages render the shared header before shell hydration to prevent mobile layout shift', () => {
  for (const [name, html] of [['directory', directory], ['GST', gstCalculator], ['Loan EMI', loanEmi]]) {
    assert.ok(html.includes('<header class="fc-global-header"><div class="fc-global-nav">'), name + ' must render the shared header in initial HTML');
    assert.ok(html.includes('id="fc-primary-navigation"'), name + ' must include shared primary navigation');
    assert.ok(html.includes('id="fc-language-select"'), name + ' must include the language selector');
  }
  assert.ok(shell.includes('const headerIsReady=!!(existingHeader&&existingHeader.classList.contains(\'fc-global-header\')'));
  assert.ok(shell.includes('if(headerIsReady){existingHeader.replaceWith(h);'), 'The existing shared header must be replaced with the canonical header before enhancements.');
  assert.ok(shell.includes('const activeHeader=h;'), 'Enhancements must bind to the canonical header after normalization.');
});

test('homepage calculator search loads its index only after typing and renders a bounded result set', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const start = homepage.indexOf("const input=document.getElementById('fc-home-tool-search')");
  const end = homepage.indexOf('})();', start);
  assert.ok(start >= 0 && end > start, 'Homepage deferred search initializer must exist');
  const script = homepage.slice(start, end);
  assert.match(script, /function loadCatalogue\(/);
  assert.match(script, /fetch\('\/assets\/calculator-search-index\.json'/);
  assert.match(script, /input\.addEventListener\('input'/);
  assert.match(script, /setTimeout\(search,100\)/);
  assert.match(script, /if\(!query\)[\s\S]*?results\.hidden=true/);
  assert.match(script, /unique\.slice\(0,15\)/);
  assert.match(script, /unique\.length/);
});


test('directory preloads its measured LCP hero illustration from the document head', () => {
  const head = directory.slice(0, directory.indexOf('</head>'));
  assert.ok(head.includes('<link rel="preload" as="image" href="/assets/friendly-calculator-brand-illustration.svg" type="image/svg+xml" fetchpriority="high">'));
  assert.ok(directory.includes('<img src="/assets/friendly-calculator-brand-illustration.svg"'));
  assert.ok(directory.includes('fetchpriority="high" decoding="async"'));
});


test('homepage queues GA4 immediately but defers the analytics runtime past first render', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(homepage, /gtag\('config','G-QVWQSEDRGL'\)/);
  assert.match(homepage, /window\.addEventListener\('load',schedule/);
  assert.match(homepage, /},4000\)/);
  assert.match(homepage, /requestIdleCallback\(load,\{timeout:6000\}\)/);
  assert.doesNotMatch(homepage, /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js/);
});

test('shared shell delays GTM container while preserving queued analytics events', () => {
  assert.match(shell, /window\.dataLayer=window\.dataLayer\|\|\[\]/);
  assert.match(shell, /window\.setTimeout\(\(\)=>/);
  assert.match(shell, /\},8000\)/);
  assert.match(shell, /requestIdleCallback\(injectGtm,\{timeout:8000\}\)/);
  assert.match(shell, /gtm\.js\?id=GTM-MGJQH4DB/);
});

test('mobile primary navigation toggle remains beside the brand and is keyboard accessible', () => {
  assert.match(shell, /const primaryNav=activeHeader\.querySelector\('#fc-primary-navigation'\)/);
  assert.match(shell, /toggle\.setAttribute\('aria-controls','fc-primary-navigation'\)/);
  assert.match(shell, /toggle\.setAttribute\('aria-expanded','false'\)/);
  assert.match(shell, /event\.key==='Escape'/);
  assert.match(shell, /toggle\.focus\(\)/);
  assert.match(chrome, /\.fc-nav-toggle:focus-visible/);
  assert.match(chrome, /\.fc-global-brand\{flex:1 1 auto;min-width:0;width:auto\}/);
  assert.match(chrome, /\.fc-global-links\.fc-nav-open\{display:flex;flex-direction:column\}/);
});

test('priority calculator pages expose valid breadcrumb structured-data trails', () => {
  for (const [name, html, url, label] of [
    ['Basic', basicCalculator, 'https://friendlycalculator.in/calculators/basic-calculator.html', 'Basic Calculator'],
    ['Scientific', scientificCalculator, 'https://friendlycalculator.in/calculators/scientific-calculator.html', 'Scientific Calculator']
  ]) {
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    const schemas = scripts.map((match) => JSON.parse(match[1]));
    const breadcrumb = schemas.find((schema) => schema['@type'] === 'BreadcrumbList');
    assert.ok(breadcrumb, name + ' calculator must include BreadcrumbList');
    assert.equal(breadcrumb.itemListElement.length, 3, name + ' breadcrumb must include Home, Calculators and current page');
    assert.equal(breadcrumb.itemListElement[2].item, url);
    assert.equal(breadcrumb.itemListElement[2].name, label);
  }
});
