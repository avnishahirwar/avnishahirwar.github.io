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
  assert.ok(shell.includes('globalCalculatorsUrl') && shell.includes('nav.global') && shell.includes('fc-all-calculators-link'), 'Global Tools and All Calculators must both remain available as links.');
  const headerStart=shell.indexOf('h.innerHTML=');
  const headerEnd=shell.indexOf('const reservedHeader',headerStart);
  const headerMarkup=shell.slice(headerStart,headerEnd);
  assert.ok(headerMarkup.indexOf('nav.global')<headerMarkup.indexOf('fc-all-calculators-link'), 'Global Tools must precede All Calculators.');
  assert.ok(headerMarkup.includes("'<a href=\"'+globalCalculatorsUrl+'\">'+nav.global+'</a>"), 'Global Tools must be a standalone top-level navigation link.');
});

test('shared footer retains Sitemap; regional preferences follow Language in Header and Settings stays outside chrome', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.match(shell, /en:\['About','Methodology','Privacy','Terms','Disclaimer','Legal & Compliance','Embed','Sitemap','Contact'\]/);
  assert.ok(shell.includes("'/sitemap.html'"), 'Shared footer must link to the complete sitemap.');
  const headerStart = shell.indexOf('h.innerHTML=');
  const headerEnd = shell.indexOf('const reservedHeader', headerStart);
  const headerMarkup = shell.slice(headerStart, headerEnd);
  assert.ok(!headerMarkup.includes('fc-settings-row'), 'Legacy regional row must not be rendered in the header.');
  assert.ok(headerMarkup.includes("+languageControl+'</nav>"), 'Language selector must remain inside the header navigation after Login.');
  assert.ok(shell.includes("languageControlElement.after(currencyControl,countryFormatLabel,unitControl)"), 'Currency, Country & format, and Units must appear immediately after Language in Header.');
  assert.ok(shell.includes("if(p==='/'&&currentLocale!=='en')location.replace(localeHome[currentLocale]+location.search+location.hash)"), 'The root page must respect a saved or browser-supported language preference by default.');
  assert.ok(!headerMarkup.includes('Sitemap'), 'Sitemap must not appear in the All Calculators dropdown.');
  assert.ok(shell.includes('markCurrentNavigation(activeHeader.querySelector(\'#fc-primary-navigation\'))') && shell.includes('markCurrentNavigation(f.querySelector(\'.fc-global-footer-links\'))'), 'Only the current page item should be highlighted in each navigation region.');
  assert.ok(shell.includes('const activeHeader=h;'), 'Active state must target the mounted canonical header, not a replaced legacy node.');
  assert.ok(shell.includes('fc-regional-settings-source'), 'Original country and locale controls must remain available for locale compatibility.');
  assert.ok(shell.includes('regionalControlsSource.appendChild(compatibilityControls)'), 'Hidden original locale controls must preserve the global locale event contract.');
  assert.ok(!shell.includes("addSettingRow('fc-display-currency-row'"), 'Display currency must not be placed inside Settings & Accessibility.');
  assert.ok(!shell.includes('fc-display-language-row'), 'Language must not be repeated inside Settings.');
  assert.ok(shell.includes('themeModes.append(normalModeButton,darkModeButton)'), 'Accessibility must expose only Normal Mode and Dark Mode.');
  assert.ok(shell.includes('dock.appendChild(open)') && shell.includes('dock.appendChild(trigger)'), 'The single Settings trigger must be in the standalone floating dock.');
  assert.ok(shell.includes("['Embed','/embed/'],['Sitemap','/sitemap.html'],['Contact','/calculator/contact.html']"), 'Legacy footer fallback must also put Sitemap before Contact.');
  assert.ok(shell.includes("footerLinks.map(([n,u])=>") && shell.includes("'/sitemap.html',currentLocale==='hi'?'/hi/contact.html':r+'contact.html'"), 'Footer order must place Sitemap before Contact.');
  assert.ok(!shell.includes('footerNav.appendChild(open)') && !shell.includes('footerNav.appendChild(trigger)'), 'Settings must not be mounted in the shared footer.');
  assert.ok(shell.includes("document.querySelectorAll('footer').forEach(oldFooter=>oldFooter.remove());"), 'Nested and duplicate footers must be consolidated into one shared footer.');
  assert.ok(shell.includes('.site-brand,.site-nav,.site-nav-wrap,.site-links,.nav'), 'Legacy navigation headers must be removed.');
  assert.ok(shell.includes('quickActions.appendChild(installButton)'), 'Install action must be placed inside Settings Quick Actions.');
  assert.ok(!shell.includes('footerInner.appendChild(button)'), 'Install action must not be placed in the Footer.');
  assert.ok(shell.includes('if(!label)button.remove();'), 'Blank legacy buttons must not remain in Settings.');
  assert.ok(shell.includes('quickActions.appendChild(installButton)'), 'Install action must stay inside Settings Quick Actions.');
  assert.ok(!shell.includes('quickActions.appendChild(assistantLauncher)'), 'Open Assistant must remain outside Settings Quick Actions.');
  assert.ok(shell.includes('document.body.appendChild(launcher)') && shell.includes("document.querySelector('#fc-ai-launch')?.click()"), 'Open Assistant must remain a live on-page launcher.');
  assert.ok(shell.includes('const isFooterSocialLink=link=>') && shell.includes('!isFooterSocialLink(link)'), 'Social/contact links must appear only in the dedicated icon row, not duplicated in footer text links.');
  assert.ok(shell.includes("status.setAttribute('aria-atomic','true')") && fs.readFileSync(path.join(root, 'assets/site-shell.css'), 'utf8').includes('clip-path:inset(50%)'), 'Theme status remains accessible but is not repeated visibly under the mode buttons.');
});


test('header order places Login immediately before Language and keeps Sitemap only in Footer', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const headerStart = shell.indexOf('h.innerHTML=');
  const headerEnd = shell.indexOf('const reservedHeader', headerStart);
  const headerMarkup = shell.slice(headerStart, headerEnd);
  assert.ok(headerMarkup.indexOf('nav.login') < headerMarkup.indexOf('languageControl'), 'Language must follow Login.');
  assert.ok(!headerMarkup.includes('/sitemap.html'), 'Header must not link to Sitemap.');
  assert.ok(shell.includes("markCurrentNavigation(activeHeader.querySelector('#fc-primary-navigation'))"));
  assert.ok(shell.includes("markCurrentNavigation(f.querySelector('.fc-global-footer-links'))"));
  const css = fs.readFileSync(path.join(root, 'assets/site-shell.css'), 'utf8');
  assert.ok(css.includes('.fc-global-footer-links a[aria-current="page"]'));
  assert.ok(css.includes('.fc-global-links>.fc-all-calculators-link'));
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


test('Accessibility defaults to readable Normal Mode unless Dark Mode was explicitly saved', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const homepageShell = fs.readFileSync(path.join(root, 'assets/homepage-shell.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'assets/site-shell.css'), 'utf8');
  assert.match(shell, /const initialTheme=theme==='dark'\?'dark':'light'/);
  assert.match(homepageShell, /if\(currentTheme!=='dark'\)currentTheme='light'/);
  assert.match(shell, /normalModeButton\.addEventListener\('click',\(\)=>applyTheme\('light'\)\)/);
  assert.match(homepageShell, /normal\.addEventListener\('click',\(\)=>applyTheme\('light'\)\)/);
  assert.match(css, /html\[data-fc-theme="light"\]\{color-scheme:light\}/);
  assert.match(css, /\.fc-theme-mode-options \.fc-display-action\[aria-pressed="true"\][\s\S]*?color:#fff!important/);
  assert.match(css, /html\[data-fc-theme="dark"\] body>\.fc-display-panel \.fc-theme-mode-options \.fc-display-action\{[\s\S]*?color:#edf3f8!important/);
});

test('Tax and Salary calculators page does not repeat Home or All Calculators in the page body', () => {
  const page = fs.readFileSync(path.join(root, 'calculator/tax.html'), 'utf8');
  const body = page.slice(page.indexOf('<main'), page.indexOf('</main>'));
  assert.ok(!body.includes('<a href="/">Home</a>'), 'Remove the duplicate Home link from the page body.');
  assert.ok(!body.includes('<a href="/calculator/site-directory.html">All calculators</a>'), 'Remove the duplicate All Calculators link from the page body.');
  assert.ok(page.includes('<header>') && page.includes('<a href="/">Home</a>'), 'Keep the global Header Home link.');
});


test('All Calculators is a plain header link with no dropdown markup or behavior', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const headerStart = shell.indexOf('h.innerHTML=');
  const headerEnd = shell.indexOf('const reservedHeader', headerStart);
  const headerMarkup = shell.slice(headerStart, headerEnd);
  assert.ok(headerMarkup.includes('class="fc-all-calculators-link"'));
  assert.ok(!headerMarkup.includes('<details') && !headerMarkup.includes('<summary>'));
  assert.ok(!headerMarkup.includes('fc-all-dropdown'));
  const fallbackStart = shell.indexOf('header.innerHTML =');
  const fallbackEnd = shell.indexOf('document.body.prepend(header)', fallbackStart);
  const fallbackMarkup = shell.slice(fallbackStart, fallbackEnd);
  assert.ok(fallbackMarkup.includes('href="/calculator/site-directory.html">All Calculators</a>'));
  assert.ok(!fallbackMarkup.includes('<details') && !fallbackMarkup.includes('<summary>'));
});

test('shared footer has identical responsive sizing rules across all public pages', () => {
  const css = fs.readFileSync(path.join(root, 'assets/site-shell.css'), 'utf8');
  assert.match(css, /footer\.fc-global-footer\{[\s\S]*?padding:16px 0 0!important/);
  assert.match(css, /footer\.fc-global-footer \.fc-global-footer-inner\{[\s\S]*?width:min\(1440px,96%\)!important/);
  assert.match(css, /footer\.fc-global-footer \.fc-footer-top\{[\s\S]*?min-height:64px!important/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*?footer\.fc-global-footer \.fc-global-footer-inner\{width:92%!important/);
});


test('regional defaults follow the visitor browser region and preserve explicit saved choices', () => {
  const locale = fs.readFileSync(path.join(root, 'assets/global-locale.js'), 'utf8');
  assert.ok(locale.includes("navigator.languages?.[0]||navigator.language"), 'Browser locale must be used for first-visit regional defaults.');
  assert.ok(locale.includes("read(COUNTRY_KEY,detectedCountry"), 'A saved country must override the detected browser country.');
  assert.ok(locale.includes("read(CURRENCY_KEY,COUNTRY_CURRENCY[country]||browserCurrency"), 'Currency must default from the selected or detected country.');
  assert.ok(locale.includes("read(LOCALE_KEY,COUNTRY_LOCALE[country]||detectedFormat"), 'Number/date format must default from the selected or detected locale.');
  assert.ok(locale.includes("read(UNIT_KEY,browserRegion==='US'?'imperial':'metric'"), 'Measurement units must default by visitor region and retain saved preference.');
});


test('currency, country and units are mounted visibly after Language in the shared Header', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.ok(shell.includes('regionalControlsSource.innerHTML=formatControl'), 'Only the date-format compatibility selector remains hidden.');
  assert.ok(shell.includes('regionalMarkup.innerHTML=currencyControl+countryControl+unitControl'), 'Visible controls are created in the required order.');
  assert.ok(shell.includes("countryLabel?.classList.replace('fc-country-control','fc-country-format-control')"));
  assert.ok(shell.includes("(activeHeader.querySelector('.fc-top-row')||primaryNav).append(...regionalMarkup.children)"), 'Regional controls must be mounted in the visible Header after Language.');
  assert.ok(shell.includes("activeHeader.querySelector('.fc-currency-control')"), 'The mount must avoid duplicating visible controls.');
  const css = fs.readFileSync(path.join(root, 'assets/site-shell.css'), 'utf8');
  for (const selector of ['.fc-top-row>.fc-currency-control','.fc-top-row>.fc-country-format-control','.fc-top-row>.fc-unit-control']) {
    assert.ok(css.includes(selector), 'Missing responsive Header styling for ' + selector);
  }
});
