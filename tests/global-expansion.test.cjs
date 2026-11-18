const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const globalPage = fs.readFileSync(path.join(root, 'international', 'index.html'), 'utf8');

test('homepage presents Friendly Calculator as a global free calculator platform', () => {
  assert.match(home, /<h1>Free Online Calculators for India and Worldwide<\/h1>/);
  assert.doesNotMatch(home, /<h1>Free Online Calculators for India<\/h1>/);
  assert.match(home, /Calculators for users worldwide/);
  assert.match(home, /\/international\//);
});

test('international directory links only to existing country-oriented and general-purpose tools', () => {
  for (const route of [
    '/calculators/mortgage-calculator.html',
    '/calculators/401k-calculator.html',
    '/international/vat-calculator.html',
    '/calculators/sales-tax-calculator.html',
    '/calculators/currency-converter-calculator.html',
    '/calculators/tip-calculator.html',
    '/calculator/tax.html',
    '/calculator/finance-calculators.html'
  ]) {
    assert.ok(fs.existsSync(path.join(root, route.replace(/^\//, ''))), 'Missing linked route: ' + route);
    assert.ok(globalPage.includes('href="' + route + '"'), 'International directory does not link to: ' + route);
  }
});

test('international directory has self-canonical, English language metadata and a clear estimate disclaimer', () => {
  assert.match(globalPage, /<html lang="en">/);
  assert.match(globalPage, /rel="canonical" href="https:\/\/friendlycalculator\.in\/international\//);
  assert.match(globalPage, /hreflang="x-default"/);
  assert.match(globalPage, /not tax, legal, financial or investment advice/i);
  assert.match(globalPage, /does not automatically determine US state, county or city rates/i);
});

test('global landing page is discoverable from homepage and uses the shared site shell', () => {
  assert.match(home, /href="\/international\/"/);
  assert.match(globalPage, /\/assets\/site-shell\.js/);
  assert.match(globalPage, /\/assets\/site-shell\.css/);
});

test('primary navigation follows category order and exposes the international hub in the All menu', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const navStart = shell.indexOf('const links=[');
  const navEnd = shell.indexOf('];', navStart);
  const nav = shell.slice(navStart, navEnd);
  const order = ['nav.home','nav.business','nav.finance','nav.tax','nav.everyday','nav.blog','nav.login'];
  let previous = -1;
  for (const item of order) {
    const index = nav.indexOf(item);
    assert.ok(index > previous, 'Navigation item out of order or missing: ' + item);
    previous = index;
  }
  assert.match(nav, /r\+'tax\.html'/);
  assert.ok(shell.includes('globalCalculatorsUrl') && shell.includes('nav.global') && shell.includes('fc-all-dropdown'), 'All menu must expose the international calculators hub.');
});

test('shared footer retains policy navigation and Sitemap; regional settings stay outside chrome and Settings trigger stays in Footer', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.match(shell, /en:\['About','Methodology','Privacy','Terms','Disclaimer','Legal & Compliance','Embed','Contact','Sitemap'\]/);
  assert.ok(shell.includes("'/sitemap.html'"), 'Shared footer must link to the complete sitemap.');
  const headerStart = shell.indexOf('h.innerHTML=');
  const headerEnd = shell.indexOf('const reservedHeader', headerStart);
  const headerMarkup = shell.slice(headerStart, headerEnd);
  assert.ok(!headerMarkup.includes('fc-settings-row'), 'Regional preferences must not appear in the global header.');
  assert.ok(shell.includes('primaryNav.after(languageHost.firstElementChild)'), 'Language selector must remain visible in the shared header.');
  assert.ok(shell.includes('fc-regional-settings-source'), 'Currency, country/format and units must be staged for Settings outside the header.');
  assert.ok(!shell.includes('fc-display-language-row'), 'Language must not be repeated inside Settings.');
  assert.ok(shell.includes('themeModes.append(normalModeButton,darkModeButton)'), 'Accessibility must expose only Normal Mode and Dark Mode.');
  assert.ok(shell.includes('footerNav.appendChild(open)'), 'The single Settings trigger must be in the shared footer.');
  assert.ok(!shell.includes('dock.appendChild(open)'), 'Settings must not be mounted in the floating tools dock.');
  assert.ok(shell.includes("document.querySelectorAll('footer').forEach(oldFooter=>oldFooter.remove());"), 'Nested and duplicate footers must be consolidated into one shared footer.');
  assert.ok(shell.includes('.site-brand,.site-nav,.site-nav-wrap,.site-links,.nav'), 'Legacy navigation headers must be removed.');
  assert.ok(shell.includes("footerInner.appendChild(button)"), 'Install action must be placed in the shared footer.');
  assert.ok(shell.includes('if(!label)button.remove();'), 'Blank legacy buttons must not remain in Settings.');
  assert.ok(!shell.includes('quickActions.appendChild(install)') && shell.includes('quickActions.appendChild(assistant)'), 'Install must remain in Footer while the assistant stays in Settings.');
});

test('directory promotes the global hub and current tax category route', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  assert.match(directory, /href="\/international\/"/);
  assert.match(directory, /href="\/calculator\/tax\.html"/);
  assert.match(directory, /International Calculators/);
});

test('static directory navigation is crawlable and uses the canonical tax category route', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const header = directory.slice(directory.indexOf('<nav id="fc-primary-navigation"'), directory.indexOf('</nav>', directory.indexOf('<nav id="fc-primary-navigation"')));
  for (const route of [
    '/calculator/finance-calculators.html',
    '/calculator/tax.html',
    '/calculator/business-calculators.html',
    '/calculator/everyday-calculators.html',
    '/international/',
    '/calculator/site-directory.html'
  ]) assert.ok(header.includes('href="' + route + '"'), 'Missing crawlable header route: ' + route);
  assert.ok(!header.includes('/calculator/tax-calculators.html'), 'Retired tax category URL must not be in primary navigation');
});
