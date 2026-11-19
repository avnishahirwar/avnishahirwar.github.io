const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
require(path.join(root, 'assets/chemistry-calculators.js'));
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(https:\/\/friendlycalculator\.in[^<]*)<\/loc>/g)].map(m => m[1]);
const catalogueCounts = require('./catalogue-counts.cjs')(root);
const { canonicalCalculatorUrls, expectedSearchIndexUrls, expectedSearchIndexLength, coreCalculatorUrls, expectedCoreCalculatorCount, biologyChemistryCount, homepageCoreCalculatorCount } = catalogueCounts;

function localFile(url, baseFile = 'index.html') {
  const parsed = new URL(url, 'https://friendlycalculator.in/' + baseFile);
  if (parsed.origin !== 'https://friendlycalculator.in') return null;
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';
  let target = path.join(root, pathname.replace(/^\/+/, ''));
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  return target;
}

test('international hub hero links meet the dark-header contrast style', () => {
  const html = fs.readFileSync(path.join(root, 'international/index.html'), 'utf8');
  assert.match(html, /\.hero\s+\.links\s+a\s*\{[^}]*color:\s*#e6d6b2/i);
});

test('sitemap is valid XML-shaped content with unique canonical URLs', () => {
  assert.match(sitemap, /^<\?xml/);
  assert.ok(urls.length >= 20, 'Expected public site pages in sitemap');
  assert.equal(new Set(urls).size, urls.length, 'Sitemap URLs must be unique');
});

test('AdSense publisher loader is not duplicated and configured ad slots have a loader', () => {
  // Ad spaces remain hidden until AdSense is approved and configured.
  const failures = [];
  for (const url of urls) {
    const file = localFile(url);
    if (!file || !fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const hasAdSlot = /class=["'][^"']*(?:ad-slot|ad-placeholder|adsense-placeholder)[^"']*["']/i.test(html);
    const count = html.split('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js').length - 1;
    if (count > 1 || (hasAdSlot && count !== 1)) failures.push(url + ' (ad slot: ' + hasAdSlot + ', loader count: ' + count + ')');
  }
  assert.deepEqual(failures, [], 'AdSense loader must match actual ad-slot pages: ' + failures.join(', '));
});

test('AdSense auto ads are excluded from navigation, contact and interactive calculator pages', () => {
  const excluded = ['index.html', 'calculator/contact.html', 'calculators/loan-emi-calculator.html'];
  for (const relative of excluded) {
    const html = fs.readFileSync(path.join(root, relative), 'utf8');
    assert.doesNotMatch(html, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i, relative + ' must not load auto ads');
  }
});
test('every public sitemap page loads the shared site header and footer shell', () => {
  const failures = [];
  for (const url of urls) {
    const file = localFile(url);
    if (!file || !fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const pathname = new URL(url).pathname;
    const expectedShell = pathname === '/' ? '/assets/homepage-shell.js' : '/assets/site-shell.js';
    if (!html.includes(expectedShell)) failures.push(url + ' (' + expectedShell + ')');
    if (!html.includes('/assets/site-shell.css')) failures.push(url + ' (shared shell styles)');
  }
  assert.deepEqual(failures, [], 'Public pages must use the shared header/footer: ' + failures.join(', '));
});

test('shared shell provides keyboard skip navigation and visible focus styles', () => {
  const shellJs = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const shellCss = fs.readFileSync(path.join(root, 'assets/site-shell.css'), 'utf8');
  assert.match(shellJs, /fc-skip-link/);
  assert.match(shellJs, /fc-main-content/);
  assert.match(shellCss, /\.fc-skip-link:focus/);
  assert.match(shellCss, /:focus-visible/);
});

test('every sitemap URL maps to a committed page', () => {
  const missing = urls.filter(url => {
    const file = localFile(url);
    return !file || !fs.existsSync(file);
  });
  assert.deepEqual(missing, [], 'Missing sitemap targets: ' + missing.join(', '));
});

test('every public sitemap page has a title, viewport and canonical URL', () => {
  const failures = [];
  for (const url of urls) {
    const file = localFile(url);
    if (!file || !fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    if (!/<title>\s*[^<]+<\/title>/i.test(html)) failures.push(url + ' (title)');
    if (!/<meta[^>]+name=["']viewport["']/i.test(html)) failures.push(url + ' (viewport)');
    if (!/<link[^>]+rel=["']canonical["']/i.test(html)) failures.push(url + ' (canonical)');
  }
  assert.deepEqual(failures, [], 'Metadata issues: ' + failures.join(', '));
});

test('local links in public pages do not point to missing files', () => {
  const failures = [];
  for (const pageUrl of urls) {
    const pageFile = localFile(pageUrl);
    if (!pageFile || !fs.existsSync(pageFile)) continue;
    const html = fs.readFileSync(pageFile, 'utf8');
    const relativePage = path.relative(root, pageFile).split(path.sep).join('/');
    // Only inspect rendered markup: JavaScript template strings can contain
    // dynamically assembled href/src fragments that are not actual local links.
    const staticMarkup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    for (const match of staticMarkup.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
      const ref = match[1].trim();
      if (!ref || /^(?:#|mailto:|tel:|javascript:|data:|https?:|\/\/)/i.test(ref)) continue;
      const target = localFile(ref, relativePage);
      if (target && !fs.existsSync(target)) failures.push(relativePage + ' -> ' + ref);
    }
  }
  assert.deepEqual(failures, [], 'Broken local links: ' + failures.join(', '));
});


test('owner-designated permanent website features are protected from accidental removal', () => {
  const requiredFiles = [
    'calculator/business.html',
    'calculator/pricing.html',
    'calculator/premium-waitlist.html',
    'calculator/contact.html',
    'calculator/api.html',
    'calculator/dashboard.html',
    'calculator/admin.html',
    'calculator/about.html',
    'calculator/privacy.html',
    'calculator/terms.html',
    'calculator/disclaimer.html',
    'calculator/cookies.html',
    'sitemap.xml',
    'robots.txt',
    'ads.txt'
  ];
  for (const file of requiredFiles) {
    assert.ok(fs.existsSync(path.join(root, file)), 'Permanent website asset missing: ' + file);
  }

  const business = fs.readFileSync(path.join(root, 'calculator/business.html'), 'utf8');
  const contact = fs.readFileSync(path.join(root, 'calculator/contact.html'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');

  const permanentModels = [
    'Business Dashboard & SaaS Workspaces', 'Embed-as-a-Service', 'Automated Business Reports',
    'API Usage Packages', 'Digital Business Templates', 'Category Sponsorship',
    'Enterprise Integration', 'White-label SaaS Platform', 'Consent-based Lead Generation',
    'Expert & Professional Referrals', 'Paid Membership & Productivity Benefits',
    'Strategic Licensing & Platform Exit', 'Accountant & CA Practice Tools',
    'HR, Payroll & Employer Workflows', 'Bank, NBFC & Fintech Calculator Partnerships',
    'Real Estate & Property Tools', 'E-commerce Pricing & Margin Tools',
    'Agency & Consultant Reseller Programme', 'Developer Integration & Implementation Fees',
    'Priority Support & Service-Level Plans', 'Schools, Colleges & Training Licences',
    'Energy, Solar & Utility Calculator Solutions', 'Construction & Contractor Estimators',
    'Travel, Fuel & Fleet Cost Tools', 'Insurance Estimation & Referral Partnerships',
    'Privacy-safe Aggregate Usage Insights', 'Publisher & Media Calculator Syndication',
    'Contextual Merchant Referrals', 'Sponsored Tools & Co-branded Campaigns',
    'Multi-location Franchise Licences', 'Supplier & Distributor Calculator Portals',
    'Onboarding, Training & Workshops'
  ];
  for (const model of permanentModels) {
    assert.ok(business.includes(model), 'Permanent business model missing: ' + model);
  }

  const dashboard = fs.readFileSync(path.join(root, 'calculator/dashboard.html'), 'utf8');
  assert.match(dashboard, /name="robots" content="noindex,nofollow"/i);
  assert.match(dashboard, /Generate API key/i);
  assert.match(dashboard, /Try API/i);

  assert.match(business, /Permanent catalogue policy/i);
  assert.match(contact, /Business Enquiries & Partnerships/i);
  assert.match(contact, /Custom calculator development/i);
  assert.match(shell, /instagram\.com\/avnish_ahirwar/);
  assert.match(shell, /linkedin\.com\/in\/avnishahirwar415/);
  assert.match(shell, /mailto:avnishahirwar415@gmail\.com/);
  assert.doesNotMatch(shell, /About, trust & policies/i);
  assert.match(shell, /\.ad-slot/);
  assert.match(shell, /\.ad-placeholder/);
  assert.match(shell, /\.adsense-placeholder/);
});

 
test('shared Header follows the same navigation and regional-control order on every page', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const header = shell.slice(shell.indexOf('const links=['), shell.indexOf('const languageControl='));
  const expectedHeader = [
    '[nav.home,localeHome[currentLocale]]',
    '[nav.business,',
    '[nav.finance,',
    '[nav.tax,',
    '[nav.everyday,',
    '[nav.blog,',
    "[nav.login,r+'dashboard.html']"
  ];
  let last = -1;
  for (const item of expectedHeader) {
    const index = header.indexOf(item);
    assert.ok(index > last, 'Header item is missing or out of order: ' + item);
    last = index;
  }
  assert.doesNotMatch(header, /nav\.search|Search Calculator/);
  assert.match(shell, /en:\{home:'Home',login:'Login'/);
  assert.ok(shell.includes('fc-all-calculators-link') && shell.includes('nav.all') && shell.includes("r+'site-directory.html'") && shell.includes('globalCalculatorsUrl'), 'All Calculators must remain a plain link alongside Global Tools.');
  assert.ok(!shell.includes('fc-all-dropdown'), 'All Calculators must not use dropdown markup.');
  const headerStart = shell.indexOf('h.innerHTML=');
  const headerEnd = shell.indexOf('const reservedHeader', headerStart);
  const headerMarkup = shell.slice(headerStart, headerEnd);
  assert.ok(headerMarkup.includes("+'<span class=\"fc-header-language-slot\">'+languageControl+'</span></nav>"), 'Language must be the first control after Login inside the shared navigation.');
  assert.ok(shell.includes('if(headerIsReady){existingHeader.replaceWith(h);'), 'Pre-existing static headers must be normalized to the canonical shared navigation.');
  assert.ok(headerMarkup.indexOf('nav.global')>=0 && headerMarkup.indexOf('nav.global')<headerMarkup.indexOf('links.slice(4,5)'), 'Global Calculators must appear after Tax and before Everyday.');
  assert.ok(headerMarkup.indexOf('links.slice(4,5)')<headerMarkup.indexOf('fc-all-calculators-link'), 'Everyday must appear before All Calculators.');
  assert.ok(headerMarkup.indexOf('fc-all-calculators-link')<headerMarkup.indexOf('links.slice(5)'), 'Blog and Login must follow the All Calculators link.');
  assert.ok(!headerMarkup.includes('fc-all-dropdown'), 'All Calculators must not have dropdown behavior.');
  const renderedOrder = [
    'links.slice(0,4)', 'nav.global', 'links.slice(4,5)',
    'fc-all-calculators-link', 'links.slice(5)', 'fc-header-language-slot'
  ];
  let renderedLast = -1;
  for (const token of renderedOrder) {
    const index = shell.indexOf(token, headerStart);
    assert.ok(index > renderedLast, 'Rendered Header order is incorrect at: ' + token);
    renderedLast = index;
  }
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const homepageNavStart = homepage.indexOf('<nav id="fc-primary-navigation"');
  const homepageNav = homepage.slice(homepageNavStart, homepage.indexOf('</nav>', homepageNavStart));
  const homepageOrder = ['>Home<', '>Business Tools<', '>Finance<', '>Tax<', '>Global Calculators<', '>Everyday<', '>All Calculators<', '>Blogs<', '>Login<', 'fc-language-control', 'fc-currency-control', 'fc-country-format-control', 'fc-unit-control'];
  let homepageLast = -1;
  for (const token of homepageOrder) {
    const index = homepageNav.indexOf(token);
    assert.ok(index > homepageLast, 'Homepage Header order is incorrect at: ' + token);
    homepageLast = index;
  }
  assert.ok(shell.includes('fc-regional-settings-source') && shell.includes('fc-display-panel') && shell.includes('regionalControlsSource.append(...regionalMarkup.children)'), 'Legacy locale controls must remain available to FCLocale.');
  assert.ok(shell.includes('primaryNav.append(currencyControl,countryFormatLabel,unitControl)') && shell.includes('panel.append(regionalSettingsControls)'), 'Header regional controls must also be available inside Settings.');
  assert.ok(shell.indexOf('primaryNav.append(currencyControl,countryFormatLabel,unitControl)')>shell.indexOf('headerLanguageControl=activeHeader.querySelector'), 'Currency, Country & format, and Units must follow Language.');
  assert.ok(!shell.includes('fc-display-language-row'), 'Language must not be repeated inside Settings.');
  assert.ok(shell.includes('themeModes.append(normalModeButton,darkModeButton)'), 'Accessibility must expose only Normal Mode and Dark Mode.');
  const footer = shell.slice(shell.indexOf('const footerLabels='), shell.indexOf('const footerLinks='));
  for (const labels of [
    "en:['About','Methodology','Privacy','Terms','Disclaimer','Legal & Compliance','Embed','Sitemap','Contact','Advertising']",
    "hi:['हमारे बारे में','कार्यप्रणाली','गोपनीयता','नियम','अस्वीकरण','कानूनी एवं अनुपालन','एम्बेड','साइटमैप (अंग्रेज़ी)','संपर्क','विज्ञापन']"
  ]) assert.ok(footer.includes(labels), 'Footer sequence missing: ' + labels);
  const footerLocaleRows = footer.split('\n').filter(line => /^\s{2}(de|en|hi|es|fr|pt|ar|id|bn|ta|ja|ru):\[/.test(line));
  assert.equal(footerLocaleRows.length, 12, 'All 12 site locales must define Footer labels.');
  for (const row of footerLocaleRows) {
    const labels = row.slice(row.indexOf(':[') + 2, row.lastIndexOf(']'));
    assert.equal(labels.split("','").length, 10, 'Each locale must expose all ten Footer destinations.');
  }
  assert.doesNotMatch(shell, /if\(footerLinks\.length===9\)/, 'Footer labels must be localized rather than falling back to English.');
  assert.doesNotMatch(footer, /Cookies|कुकीज़|ملفات تعريف الارتباط/);
  assert.ok(shell.includes("r+'disclaimer.html','/calculator/legal-compliance.html','/embed/','/sitemap.html',currentLocale==='hi'?'/hi/contact.html':r+'contact.html','/calculator/advertise.html'];"));
});

test('the shared top navigation exposes the preserved Admin Dashboard exactly once', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.ok(shell.includes("['Admin',r+'admin.html']"));
  assert.equal((shell.match(/\['Admin',r\+'admin\.html'\]/g) || []).length, 1);
  assert.ok(fs.existsSync(path.join(root, 'calculator/admin.html')), 'Admin dashboard page must remain preserved');
  const dashboard = fs.readFileSync(path.join(root, 'calculator/admin.html'), 'utf8');
  assert.match(dashboard, /app_metadata\?\.role!==['"]admin['"]/);
});

test('About page catalogue matches every canonical published calculator page', () => {
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  assert.ok(about.includes('Available calculators (' + canonicalCalculatorUrls.length + ' tools)'));
  assert.ok(about.includes(expectedCoreCalculatorCount + ' public calculators'));
  const linkedPages = [...about.matchAll(/<li><a href="\/calculators\/([^"]+)">/g)].map(m => m[1]).sort();
  assert.deepEqual(linkedPages, canonicalCalculatorUrls.map(url => url.split('/').pop()).sort());
  assert.doesNotMatch(about, /<ol[^>]+start=/i);
});

test('contact page has one consistent indexable robots directive', () => {
  const contact = fs.readFileSync(path.join(root, 'calculator/contact.html'), 'utf8');
  assert.equal((contact.match(/<meta[^>]+name=["']robots["']/gi) || []).length, 1);
  assert.doesNotMatch(contact, /name=["']googlebot["'][^>]+noindex/i);
});


test('GA4 records calculator actions and privacy-safe search metadata', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.match(shell, /calculator_calculate/);
  assert.match(shell, /calculator_search/);
  assert.match(shell, /search_term_length/);
  assert.doesNotMatch(shell, /search_term:\s*field\.value/);
});

test('calculator directory exposes its curated core catalogue and keeps business services separate', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const links = [...directory.matchAll(/href="(\/calculators\/[^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(links).size, links.length);
  assert.ok(links.every(url => canonicalCalculatorUrls.includes(url)));
  assert.equal(coreCalculatorUrls.length, expectedCoreCalculatorCount);
  assert.equal(homepageCoreCalculatorCount, expectedCoreCalculatorCount);
  assert.ok(coreCalculatorUrls.every(url => links.includes(url)));
  const services = directory.indexOf('<h2>Business & developer services</h2>');
  const trust = directory.indexOf('<h2>About, trust & policies</h2>');
  assert.ok(services > directory.indexOf('<h2>Date, time and work calculators</h2>'));
  assert.ok(services < trust);
  const section = directory.slice(services, directory.indexOf('</section>', services));
  assert.equal((section.match(/class="card"/g) || []).length, 4);
  assert.ok(!directory.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'));
});

test('shared shell routes homepage calculator hash links to the current tool', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.ok(shell.includes('getLocalCalculatorTarget'));
  assert.ok(shell.includes('scrollIntoView'));
  assert.ok(shell.includes('Practical tools for everyday calculations.'));
});

test('brand images are crawlable, descriptive and included in the image sitemap', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const hindi = fs.readFileSync(path.join(root, 'hi/index.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const logo = fs.readFileSync(path.join(root, 'assets/friendly-calculator-logo.svg'), 'utf8');
  const image = fs.readFileSync(path.join(root, 'assets/friendly-calculator-brand-illustration.svg'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.ok(homepage.includes('"logo":"https://friendlycalculator.in/assets/friendly-calculator-logo.svg"'));
  assert.ok(hindi.includes('"logo":"https://friendlycalculator.in/assets/friendly-calculator-logo.svg"'));
  assert.ok(logo.includes('width="512"') && logo.includes('height="512"'));
  assert.ok(image.includes('width="1200"') && image.includes('height="630"'));
  for (const html of [homepage, hindi, about, directory]) {
    assert.ok(html.includes('src="/assets/friendly-calculator-brand-illustration.svg"') && /<img[^>]+alt="[^"]+"/.test(html));
  }
  assert.match(shell, /alt="Friendly Calculator logo"/);
  assert.equal(shell.split('src="/assets/friendly-calculator-logo.svg"').length - 1, 4);
  assert.ok(sitemap.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'));
  assert.equal(sitemap.split('<image:loc>https://friendlycalculator.in/assets/friendly-calculator-brand-illustration.svg</image:loc>').length - 1, 4);
});

test('shared shell removes repeated generic interactive-calculator prompts', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.ok(shell.includes('open the interactive calculator'));
});

test('SIP and BMI calls to action point to on-page calculator targets', () => {
  const sip = fs.readFileSync(path.join(root, 'calculators/sip-calculator.html'), 'utf8');
  const bmi = fs.readFileSync(path.join(root, 'calculators/bmi-calculator.html'), 'utf8');
  const pageCalculators = fs.readFileSync(path.join(root, 'assets/page-calculators.js'), 'utf8');
  assert.ok(sip.includes('href="#sip-tool"') && sip.includes('id="sip-tool"'));
  assert.ok(bmi.includes('href="#live-page-calculator"'));
  assert.ok(pageCalculators.includes('"/calculators/bmi-calculator.html":"bmi calculator"'));
  assert.ok(pageCalculators.includes('panel.id="live-page-calculator"'));
});

test('GST calculator links to the current core catalogue count', () => {
  const gst = fs.readFileSync(path.join(root, 'calculators/gst-calculator.html'), 'utf8');
  assert.ok(gst.includes('Explore all ' + expectedCoreCalculatorCount + ' calculators on Friendly Calculator.'));
  assert.doesNotMatch(gst, /Explore all 303 calculators/);
});

test('income tax page reserves a stable mobile header before the shared navigation replaces the legacy header', () => {
  const tax = fs.readFileSync(path.join(root, 'calculators/income-tax-calculator.html'), 'utf8');
  const earlyScript = tax.indexOf("<script>document.documentElement.classList.add('fc-js');</script>");
  const bodyStart = tax.indexOf('<body>');
  assert.ok(earlyScript >= 0 && earlyScript < bodyStart, 'The JS-ready class must be set in the document head');
  assert.ok(tax.includes('html.fc-js #fc-header-reservation+header.fc-header{display:none}'));
  assert.ok(tax.includes('<div id="fc-header-reservation" class="fc-header-reservation"'));
  assert.ok(tax.includes('<header class="fc-header">'), 'The legacy header remains available when JavaScript is disabled');
  assert.ok(tax.includes('<button type="button" class="fc-favourite-toggle" aria-pressed="false">☆ Add to favourites</button>'), 'Render the favourite control in the initial HTML to avoid inserting it after first paint');
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.ok(shell.includes("const existingFavourite=heading?.nextElementSibling?.classList.contains('fc-favourite-toggle')?heading.nextElementSibling:null;"));
  assert.ok(shell.includes('const favouriteButton=existingFavourite||document.createElement(\'button\');'));
});

test('RD and salary calculator pages target their actual search intent and current catalogue', () => {
  const rd = fs.readFileSync(path.join(root, 'calculators/rd-calculator.html'), 'utf8');
  const salary = fs.readFileSync(path.join(root, 'calculators/salary-calculator.html'), 'utf8');
  assert.ok(rd.includes('<title>RD Calculator India | Monthly Deposit &amp; Maturity Estimate</title>'));
  assert.ok(rd.includes('name="description" content="Estimate RD maturity in India from monthly deposit, annual rate and tenure. View total deposits, interest, a worked example and key limitations."'));
  assert.ok(rd.includes('<h1>RD Calculator India | Monthly Deposit & Maturity Estimate</h1>'));
  assert.ok(rd.includes('Five-year RD examples at an assumed 6.7% rate'));
  assert.ok(rd.includes('₹1,41,944'));
  assert.ok(rd.includes('not official Post Office maturity quotations'));
  assert.ok(salary.includes('<title>Salary Calculator: Monthly, Daily &amp; Hourly Pay</title>'));
  assert.ok(salary.includes('name="description" content="Convert monthly salary into annual, daily and hourly pay. Enter working days and hours for a gross-pay estimate; tax and payroll deductions are not included."'));
  assert.ok(salary.includes('<h1>Salary Calculator: Monthly, Daily & Hourly Pay</h1>'));
  assert.ok(salary.includes('Explore all ' + expectedCoreCalculatorCount + ' calculators on Friendly Calculator.'));
  assert.doesNotMatch(salary, /Explore all 186 browser-based tools/);
});

test('homepage uses the same navy brand color as the shared site shell', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(homepage.includes('--fc-blue:#101c2c;--fc-blue-dark:#20364e;'));
  assert.ok(homepage.includes('name="theme-color" content="#101c2c"'));
});


test('language switch checks the selected locale calculator file before navigating', () => {
  const shell = fs.readFileSync(new URL('../assets/site-shell.js', 'file://' + __filename), 'utf8');
  assert.match(shell, /fetch\(target,\{method:'GET',cache:'no-store',credentials:'same-origin'\}\)/);
  assert.match(shell, /if\(response\.ok\)\{response\.body\?\.cancel\(\);location\.href=target/);
  assert.match(shell, /fc-language-notice/);
});


test('SSY maturity page documents the official 15-year deposit and 21-year maturity model', () => {
  const page = fs.readFileSync(path.join(root, 'calculators/ssy-calculator.html'), 'utf8');
  const engine = fs.readFileSync(path.join(root, 'assets/extra-calculators.js'), 'utf8');
  assert.match(page, /Sukanya Samriddhi Yojana \(SSY\) Maturity Calculator/);
  assert.ok(page.includes('up to 15 years'));
  assert.ok(page.includes('21 years from account opening'));
  assert.ok(page.includes('indiapost.gov.in/banking-services/savings'));
  assert.ok(engine.includes('"kind":"ssy"'));
  assert.ok(engine.includes('"def":8.2'));
});

test('home-loan prepayment page explains both lump-sum and recurring extra payments', () => {
  const page = fs.readFileSync(path.join(root, 'calculators/loan-prepayment-calculator.html'), 'utf8');
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  assert.match(page, /Home Loan &amp; Loan Prepayment Calculator/);
  assert.ok(page.includes('one-time lump-sum prepayment'));
  assert.ok(page.includes('extra monthly payments'));
  assert.ok(directory.includes('Home Loan &amp; Loan Prepayment Calculator'));
});


test('Investment Calculator is present, linked, indexed in sitemap and backed by a unique formula',()=>{
 const extra=fs.readFileSync(path.join(root,'assets/extra-calculators.js'),'utf8');
 const directory=fs.readFileSync(path.join(root,'calculator/site-directory.html'),'utf8');
 const finance=fs.readFileSync(path.join(root,'calculator/finance-calculators.html'),'utf8');
 const about=fs.readFileSync(path.join(root,'calculator/about.html'),'utf8');
 const page=fs.readFileSync(path.join(root,'calculators/investment-calculator.html'),'utf8');
 assert.ok(page.includes('data-calc="investment-calculator">'));
 assert.ok(page.includes('<title>Investment Calculator | Friendly Calculator</title>'));
 assert.ok(page.includes('rel="canonical"'));
 assert.ok(extra.includes('"slug":"investment-calculator"'));
 assert.ok(directory.includes('/calculators/investment-calculator.html'));
 assert.ok(finance.includes('/calculators/investment-calculator.html'));
 assert.ok(about.includes('/calculators/investment-calculator.html'));
 assert.ok(sitemap.includes('https://friendlycalculator.in/calculators/investment-calculator.html'));
 assert.match(extra,/case'investment':/);
});


test('language switcher dynamically checks existing locale calculator pages without a stale slug allowlist', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.ok(shell.includes("fetch(target,{method:'GET',cache:'no-store',credentials:'same-origin'})"));
  assert.ok(shell.includes("response.body?.cancel()"));
  assert.doesNotMatch(shell, /sharedTranslatedSlugs|hindiOnlySlugs|otherLocaleOnlySlugs/);
  for (const locale of ['hi','es','fr','pt','ar','id','bn','ta']) {
    const directory = path.join(root, locale, 'calculators');
    assert.ok(fs.existsSync(directory), 'Missing locale calculator directory: ' + locale);
    const files = fs.readdirSync(directory).filter(file => file.endsWith('.html'));
    assert.ok(files.length > 0, 'Locale has no translated calculators: ' + locale);
    for (const file of files) assert.ok(fs.existsSync(path.join(directory, file)), 'Missing translated calculator: ' + locale + '/' + file);
  }
});

test('every public sitemap page has a valid favicon reference and matching asset MIME type', () => {
  const failures = [];
  const shellJs = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const shellNormalizesFavicons = shellJs.includes('const ensureFavicon=()=>{') &&
    shellJs.includes("ensure('icon','image/svg+xml','/favicon.svg','any')") &&
    shellJs.includes("ensure('icon','image/png','/favicon-96.png','96x96')");
  for (const url of urls) {
    const file = localFile(url);
    if (!file || !fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const relativePage = path.relative(root, file).split(path.sep).join('/');
    const iconLinks = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map(match => match[0])
      .filter(tag => /\brel=["'][^"']*\bicon\b[^"']*["']/i.test(tag));
    if (!iconLinks.length) {
      if (!html.includes('/assets/site-shell.js') || !shellNormalizesFavicons) {
        failures.push(relativePage + ' (no favicon link or shared-shell fallback)');
      }
      continue;
    }
    for (const tag of iconLinks) {
      const href = (tag.match(/\bhref=["']([^"']+)["']/i) || [])[1];
      if (!href) {
        failures.push(relativePage + ' (icon link missing href)');
        continue;
      }
      const target = localFile(href, relativePage);
      if (!target || !fs.existsSync(target)) {
        failures.push(relativePage + ' -> missing icon asset ' + href);
      }
    }
  }
  assert.deepEqual(failures, [], 'Favicon issues: ' + failures.join('; '));
});


test('homepage structured data and copy accurately describe all supported languages', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const supportedLanguages = ['English', 'Hindi', 'Spanish', 'French', 'Portuguese', 'Arabic', 'Indonesian', 'Bengali', 'Tamil'];
  const availableLanguage = homepage.match(/\"availableLanguage\":\[([^\]]+)\]/);
  assert.ok(availableLanguage, 'Homepage ContactPoint must declare available languages');
  for (const language of supportedLanguages) {
    assert.ok(availableLanguage[1].includes('"' + language + '"'), 'ContactPoint must include ' + language);
  }
  assert.match(homepage, /as a multilingual platform/i);
  assert.match(homepage, /Use the language selector to choose from the available languages/i);
  assert.doesNotMatch(homepage, /as a bilingual platform/i);
});

test('mortgage calculator is fully localized and discoverable in all nine supported languages', () => {
  const locales = ['en','hi','es','fr','pt','ar','id','bn','ta'];
  const base = 'https://friendlycalculator.in';
  const slug = '/calculators/mortgage-calculator.html';
  for (const locale of locales) {
    const url = locale === 'en' ? base + slug : base + '/' + locale + slug;
    const file = localFile(url);
    assert.ok(file && fs.existsSync(file), 'Missing localized mortgage page: ' + locale);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, new RegExp('<html lang="' + locale + '"'));
    assert.ok(html.includes('rel="canonical"'), 'Missing self-canonical: ' + locale);
    assert.ok(html.includes('hreflang="x-default"'), 'Missing x-default hreflang: ' + locale);
    for (const alternate of locales) assert.ok(html.includes('hreflang="' + alternate + '"'), 'Missing ' + alternate + ' hreflang on ' + locale);
    for (const id of ['home-price','down-payment','interest-rate','loan-term','property-tax','home-insurance','maintenance','mortgage-result']) {
      assert.ok(html.includes('id="' + id + '"'), 'Missing calculator control ' + id + ' on ' + locale);
    }
    assert.ok(html.includes('/assets/mortgage-calculator.js'), 'Missing shared calculation engine: ' + locale);
    assert.ok(html.includes('/assets/site-shell.js'), 'Missing shared language/navigation shell: ' + locale);
  }
  const arabic = fs.readFileSync(path.join(root, 'ar/calculators/mortgage-calculator.html'), 'utf8');
  assert.match(arabic, /<html lang="ar" dir="rtl">/);
});


test('Hindi RD calculator is localized and linked from the English alternate', () => {
  const file = path.join(root, 'hi/calculators/rd-calculator.html');
  assert.ok(fs.existsSync(file));
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, /<html lang="hi">/);
  assert.ok(html.includes('rel="canonical"') && html.includes('hreflang="en"') && html.includes('hreflang="x-default"'));
  for (const id of ['monthly','rate','years','months','calculate','invested','interest','maturity']) assert.ok(html.includes('id="' + id + '"'));
  assert.ok(html.includes('Math.pow(1+quarterly,1/3)-1'));
  assert.ok(sitemap.includes('https://friendlycalculator.in/hi/calculators/rd-calculator.html'));
  const english = fs.readFileSync(path.join(root, 'calculators/rd-calculator.html'), 'utf8');
  assert.ok(english.includes('hreflang="hi"'));
});


test('Salary calculator guide is localized, linked and indexed in all nine supported languages', () => {
  const locales = ['en','hi','es','fr','pt','ar','id','bn','ta'];
  for (const locale of locales) {
    const url = locale === 'en' ? 'https://friendlycalculator.in/calculators/salary-calculator.html' : 'https://friendlycalculator.in/' + locale + '/calculators/salary-calculator.html';
    const file = localFile(url);
    assert.ok(file && fs.existsSync(file), 'Missing localized salary page: ' + locale);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, new RegExp('<html lang="' + locale + '"'));
    assert.ok(html.includes('rel="canonical"'));
    assert.ok(html.includes('hreflang="x-default"'));
    for (const alternate of locales) assert.ok(html.includes('hreflang="' + alternate + '"'), 'Missing hreflang ' + alternate + ': ' + locale);
    assert.ok(html.includes('working days') || html.includes('कार्यदिवस') || html.includes('días laborables') || html.includes('jours ouvrés') || html.includes('dias úteis') || html.includes('أيام العمل') || html.includes('hari kerja') || html.includes('কর্মদিবস') || html.includes('வேலை நாட்கள்'));
    assert.ok(html.includes('/assets/site-shell.js'));
    assert.ok(html.includes('href="/#calc-salary-monthly"'), 'Salary CTA must target the existing calculator: ' + locale);
    assert.ok(!html.includes('index.html#calc-salary-monthly'), 'Do not link to a missing locale calculator anchor: ' + locale);
  }
  const arabic = fs.readFileSync(path.join(root, 'ar/calculators/salary-calculator.html'), 'utf8');
  assert.match(arabic, /<html lang="ar" dir="rtl">/);
});

// Every localized calculator page must publish reciprocal hreflang and x-default metadata.
test('EPF and PPF calculators are localized and discoverable in all nine supported languages', () => {
  const locales = ['en','hi','es','fr','pt','ar','id','bn','ta'];
  const slugs = ['epf-pf-calculator.html','ppf-calculator.html'];
  for (const slug of slugs) {
    for (const locale of locales) {
      const url = locale === 'en' ? 'https://friendlycalculator.in/calculators/' + slug : 'https://friendlycalculator.in/' + locale + '/calculators/' + slug;
      const file = localFile(url);
      assert.ok(file && fs.existsSync(file), 'Missing localized ' + slug + ': ' + locale);
      const html = fs.readFileSync(file, 'utf8');
      assert.match(html, new RegExp('<html lang="' + locale + '"'));
      assert.ok(html.includes('rel="canonical"'));
      assert.ok(html.includes('hreflang="x-default"'));
      for (const alternate of locales) assert.ok(html.includes('hreflang="' + alternate + '"'), 'Missing hreflang ' + alternate + ' on ' + locale + '/' + slug);
      if (locale === 'en' && slug === 'epf-pf-calculator.html') {
        const engine = fs.readFileSync(path.join(root, 'assets/page-calculators.js'), 'utf8');
        assert.ok(engine.includes('"/calculators/epf-pf-calculator.html":"epf / pf calculator"'), 'English EPF page must load its shared calculator definition');
      } else if (locale === 'en' && slug === 'ppf-calculator.html') {
        assert.ok(html.includes('id="ppf-btn"') && html.includes('id="ppf-res"'), 'English PPF controls must remain present');
      } else {
        assert.ok(html.includes('id="calculate"') && html.includes('id="result"'), 'Calculator controls missing on ' + locale + '/' + slug);
      }
      assert.ok(html.includes('/assets/site-shell.js'));
      assert.ok(sitemap.includes(url), 'Missing sitemap URL: ' + url);
    }
  }
  const epfHindi = fs.readFileSync(path.join(root, 'hi/calculators/epf-pf-calculator.html'), 'utf8');
  assert.ok(epfHindi.includes('Math.pow(1+r,n)-1)/r'), 'EPF monthly contribution formula must be preserved');
  const ppfHindi = fs.readFileSync(path.join(root, 'hi/calculators/ppf-calculator.html'), 'utf8');
  assert.ok(ppfHindi.includes('fv=(fv+p)*(1+r)'), 'PPF annual beginning-of-year compounding formula must be preserved');
  const arabicEpf = fs.readFileSync(path.join(root, 'ar/calculators/epf-pf-calculator.html'), 'utf8');
  const arabicPpf = fs.readFileSync(path.join(root, 'ar/calculators/ppf-calculator.html'), 'utf8');
  assert.match(arabicEpf, /<html lang="ar" dir="rtl">/);
  assert.match(arabicPpf, /<html lang="ar" dir="rtl">/);
});


test('RD calculator is localized in all nine languages with reciprocal hreflang and preserved quarterly-to-monthly rate formula', () => {
 const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];
 for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/rd-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/rd-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing RD locale page: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('rel="canonical"')&&html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'),'Missing '+alt+' hreflang on '+url);assert.ok(sitemap.includes(url),'Missing sitemap URL: '+url);assert.ok(html.includes('/assets/site-shell.js'));if(locale!=='en')assert.ok(html.includes('id="calculate"')&&html.includes('id="maturity"'));if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}
 const hi=fs.readFileSync(path.join(root,'hi/calculators/rd-calculator.html'),'utf8');assert.ok(hi.includes('Math.pow(1+quarterly,1/3)-1'),'RD monthly-equivalent rate formula must be preserved');
});


test('Savings account interest calculator is localized in all nine languages with reciprocal hreflang and preserved simple-interest model', () => {
 const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];
 for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/savings-interest-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/savings-interest-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing savings-interest locale page: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('rel="canonical"')&&html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'),'Missing '+alt+' hreflang on '+url);assert.ok(sitemap.includes(url),'Missing sitemap URL: '+url);assert.ok(html.includes('/assets/site-shell.js'));if(locale!=='en')assert.ok(html.includes('id="balance"')&&html.includes('id="calculate"')&&html.includes('id="out"'));if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}
 const hi=fs.readFileSync(path.join(root,'hi/calculators/savings-interest-calculator.html'),'utf8');assert.ok(hi.includes('balance*rate/100*days/365'),'Savings interest simple-interest formula must be preserved');
});


test('Inflation calculator has all locale pages and preserves the annual compound inflation formula',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/inflation-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/inflation-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing inflation locale page: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('rel="canonical"')&&html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));assert.ok(html.includes('/assets/site-shell.js'));if(locale!=='en')assert.ok(html.includes('id="amount"')&&html.includes('id="calculate"')&&html.includes('id="future"'));if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}const hi=fs.readFileSync(path.join(root,'hi/calculators/inflation-calculator.html'),'utf8');assert.ok(hi.includes('amount*Math.pow(1+rate/100,years)'));});


test('Lumpsum calculator is localized in all nine languages and retains the compounding formula',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/lumpsum-investment-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/lumpsum-investment-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file));const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));if(locale!=='en')assert.ok(html.includes('id="principal"')&&html.includes('id="frequency"'));if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}const hi=fs.readFileSync(path.join(root,'hi/calculators/lumpsum-investment-calculator.html'),'utf8');assert.ok(hi.includes('Math.pow(1+v.rate/100/n,n*v.years)'));});


// The English legacy page uses one combined result container; localized pages expose individual outputs.
test('NPS calculator is available in all nine locales with reciprocal hreflang and preserved monthly contribution annuity model',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/nps-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/nps-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing NPS locale: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'),'Missing hreflang '+alt+' in '+url);assert.ok(sitemap.includes(url));assert.ok(html.includes('id="monthly"')&&html.includes('id="annuityRate"'));if(locale!=='en')assert.ok(html.includes('id="corpus"'));if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}const hi=fs.readFileSync(path.join(root,'hi/calculators/nps-calculator.html'),'utf8');assert.ok(hi.includes('p*(Math.pow(1+i,n)-1)/i'),'NPS corpus formula must be preserved');assert.ok(hi.includes('annuity*ar/1200'),'NPS annuity estimate must be preserved');});


test('XIRR calculator is localized in all nine languages with reciprocal hreflang and preserved dated-cash-flow root solver',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/xirr-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/xirr-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing XIRR locale: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));for(let i=0;i<5;i++)assert.ok(html.includes('id="d'+i+'"')&&html.includes('id="a'+i+'"'));if(locale!=='en'){assert.ok(html.includes('Math.pow(1+rate,(f.date-base)/86400000/365)'));assert.ok(html.includes('for(let k=0;k<180;k++)'));}if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}});


test('HRA exemption calculator is localized in all nine languages and preserves the three-limit calculation',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/hra-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/hra-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing HRA locale: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));if(locale!=='en'){assert.ok(html.includes('id="hra-recd"')&&html.includes('id="hra-basic"')&&html.includes('id="hra-rent"')&&html.includes('id="hra-metro"'));assert.ok(html.includes('Math.min(a1,a2,a3)'));}if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}});


test('Gratuity calculator is localized in all nine languages with reciprocal hreflang and preserved statutory estimate formula',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/gratuity-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/gratuity-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing gratuity locale: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));assert.ok(html.includes('id="salary"')&&html.includes('id="years"'));if(locale!=='en'){assert.ok(html.includes('id="calculate"'));assert.ok(html.includes('s*15/26*y'));}if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}});


test('Step-up SIP calculator is localized in all nine languages and preserves annual step-up and monthly compounding model',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/step-up-sip-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/step-up-sip-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing Step-up SIP locale: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));for(const id of ['monthly','step','rate','years','calcForm','result'])assert.ok(html.includes('id="'+id+'"'));assert.ok(html.includes('type="submit"'));if(locale!=='en'){assert.ok(html.includes('Math.pow(1+Number(v.rate)/100,1/12)-1'));assert.ok(html.includes('Math.pow(1+step,Math.floor(i/12))'));assert.ok(html.includes('bal=(bal+c)*(1+mr)'));}if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}});


test('SWP calculator is localized in all nine languages and preserves effective monthly return and end-of-month withdrawal model',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/swp-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/swp-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing SWP locale: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));for(const id of ['principal','withdrawal','rate','years','calcForm','result'])assert.ok(html.includes('id="'+id+'"'));if(locale!=='en'){assert.ok(html.includes('Math.pow(1+Number(v.rate)/100,1/12)-1'));assert.ok(html.includes('b*=1+r'));assert.ok(html.includes('Math.min(w,b)'));}if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}});

test('CTC salary calculator is localized in all nine languages with reciprocal hreflang and preserved salary calculation',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/ctc-salary-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/ctc-salary-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing CTC locale: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));for(const id of ['ctc-amt','ctc-basic','ctc-pf','ctc-grat','ctc-pt','ctc-tds','ctc-btn','ctc-res'])assert.ok(html.includes('id="'+id+'"'));if(locale!=='en'){assert.ok(html.includes('basic*pfpct/100'));assert.ok(html.includes('basic*.0481'));assert.ok(html.includes('gross-employeePF/12-pt-tds'));}if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}});



test('Profit and loss calculator is localized in all nine languages with reciprocal hreflang and preserved profit percentage formula',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/profit-loss-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/profit-loss-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing profit-loss locale: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));for(const id of ['a','b','calculate','result','detail'])assert.ok(html.includes('id="'+id+'"'));if(locale!=='en'){assert.ok(html.includes('const d=b-a,p=Math.abs(d)/a*100'));assert.ok(html.includes('a<=0||b<0'));}if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}});


test('Fuel cost calculator is present in all nine languages with reciprocal hreflang and distance-mileage-price formula',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/fuel-cost-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/fuel-cost-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing fuel-cost locale: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));if(locale==='ta'){for(const id of ['d','m','p','fuel','cost','status'])assert.ok(html.includes('id="'+id+'"'));assert.ok(html.includes('const fuel=d/m'));}else{for(const id of ['n0','n1','n2','o0','o1','status'])assert.ok(html.includes('id="'+id+'"'));assert.ok(html.includes('distance/eff')||html.includes('d/m'));}if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}});


test('English fuel cost calculator CTA targets the calculator panel on the same page',()=>{const url='https://friendlycalculator.in/calculators/fuel-cost-calculator.html',file=localFile(url);assert.ok(file&&fs.existsSync(file));const html=fs.readFileSync(file,'utf8');assert.ok(html.includes('id="calc-fuel-distance"'));assert.ok(html.includes('href="#calc-fuel-distance"'));assert.ok(!html.includes('href="/#calc-n0"'));});


test('Electricity bill calculator is localized in all nine languages with reciprocal hreflang and preserved flat-rate estimate',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/electricity-bill-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/electricity-bill-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing electricity locale: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));if(locale==='en'){assert.ok(html.includes('href="/#calc-electricity-units"'));}else{for(const id of ['units','rate','fixed','other','calculate','result'])assert.ok(html.includes('id="'+id+'"'));assert.ok(html.includes('const energy=u*r,total=energy+f+o'));}if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}});


test('LCM and HCF calculator is localized in all nine languages and preserves Euclidean GCD and LCM calculation',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/lcm-hcf-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/lcm-hcf-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing LCM/HCF locale: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));for(const id of ['numbers','calculate','clear','hcf','lcm','status'])assert.ok(html.includes('id="'+id+'"'));if(locale!=='en'){assert.ok(html.includes('gcd=(a,b)=>{while(b)'));assert.ok(html.includes('l=(l/gcd(l,n))*n'));}if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}});


test('Split bill calculator is localized in all nine languages with reciprocal hreflang and preserved equal-split tip formula',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/split-bill-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/split-bill-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing split-bill locale: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));for(const id of ['bill','people','tip','calculate','total','share','status'])assert.ok(html.includes('id="'+id+'"'));if(locale!=='en'){assert.ok(html.includes('bill*(1+tip/100)'));assert.ok(html.includes('share=total/people'));}if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}});


test('Square root calculator is localized in all nine languages with reciprocal hreflang and principal square root formula',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/square-root-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/square-root-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing square-root locale: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));if(locale!=='en'){for(const id of ['number','calculate','root','check'])assert.ok(html.includes('id="'+id+'"'));assert.ok(html.includes('Math.sqrt(n)'));}if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}});


test('Work hours calculator is localized in all nine languages with reciprocal hreflang and overnight shift calculation',()=>{const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];for(const locale of locales){const url=locale==='en'?'https://friendlycalculator.in/calculators/work-hours-calculator.html':'https://friendlycalculator.in/'+locale+'/calculators/work-hours-calculator.html';const file=localFile(url);assert.ok(file&&fs.existsSync(file),'Missing work-hours locale: '+url);const html=fs.readFileSync(file,'utf8');assert.match(html,new RegExp('<html lang="'+locale+'"'));assert.ok(html.includes('hreflang="x-default"'));for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));assert.ok(sitemap.includes(url));for(const id of ['start','end','break','days','calculate','net','total','status'])assert.ok(html.includes('id="'+id+'"'));if(locale!=='en'){assert.ok(html.includes('if(elapsed<=0)elapsed+=1440'));assert.ok(html.includes('const net=elapsed-br,total=net*days'));}if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);}});


test('Unit converter is available in all nine languages with reciprocal hreflang and working conversion controls',()=>{
  const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];
  for(const locale of locales){
    const url=locale==='en'?'https://friendlycalculator.in/calculators/unit-converter.html':'https://friendlycalculator.in/'+locale+'/calculators/unit-converter.html';
    const file=localFile(url);
    assert.ok(file&&fs.existsSync(file),'Missing unit-converter locale: '+url);
    const html=fs.readFileSync(file,'utf8');
    assert.match(html,new RegExp('<html lang="'+locale+'"'));
    assert.ok(html.includes('hreflang="x-default"'));
    for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'));
    assert.ok(sitemap.includes(url));
    for(const id of ['category','amount','from','to','convert','swap','result','status'])assert.ok(html.includes('id="'+id+'"'));
    if(locale!=='en')assert.ok(html.includes('/assets/unit-converter-localized.js'));
    if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);
  }
  const script=fs.readFileSync(path.join(root,'calculators/unit-converter.html'),'utf8');
  for(const formula of ['.0254','.45359237','3.785411784','(n-32)*5/9','c*9/5+32'])assert.ok(script.includes(formula),'Missing conversion constant/formula: '+formula);
});


test('Dividend yield and markup margin calculators are localized in all nine languages',()=>{
  const locales=['en','hi','es','fr','pt','ar','id','bn','ta'];
  for(const slug of ['dividend-yield-calculator','markup-margin-calculator']){
    for(const locale of locales){
      const url=locale==='en'?'https://friendlycalculator.in/calculators/'+slug+'.html':'https://friendlycalculator.in/'+locale+'/calculators/'+slug+'.html';
      const file=localFile(url);
      assert.ok(file&&fs.existsSync(file),'Missing localized calculator: '+url);
      const html=fs.readFileSync(file,'utf8');
      assert.match(html,new RegExp('<html lang="'+locale+'"'));
      assert.ok(html.includes('hreflang="x-default"'));
      for(const alt of locales)assert.ok(html.includes('hreflang="'+alt+'"'),'Missing hreflang '+alt+': '+url);
      assert.ok(sitemap.includes(url),'Missing sitemap URL: '+url);
      assert.ok(html.includes('application/ld+json'),'Missing structured data: '+url);
      if(locale==='en')assert.ok(html.includes('id="form"'),'Missing English form: '+url);
      else assert.ok(html.includes('id="calcForm"'),'Missing localized form: '+url);
      if(slug==='dividend-yield-calculator'){
        for(const id of ['price','dividend','shares','result'])assert.ok(html.includes('id="'+id+'"'),'Missing input '+id+': '+url);
        if(locale!=='en')assert.ok(html.includes('d/p*100')&&html.includes('d*q'),'Dividend formula changed: '+url);
      }else{
        for(const id of ['cost','sell','result'])assert.ok(html.includes('id="'+id+'"'),'Missing input '+id+': '+url);
        if(locale!=='en')assert.ok(html.includes('p/c*100')&&html.includes('p/s*100'),'Markup/margin formulas changed: '+url);
      }
      if(locale==='ar')assert.match(html,/<html lang="ar" dir="rtl">/);
    }
  }
});


test('Localized homepages link to the new dividend and markup calculators',()=>{
  const locales=['hi','es','fr','pt','ar','id','bn','ta'];
  for(const locale of locales){
    const file=path.join(root,locale,'index.html');
    assert.ok(fs.existsSync(file),'Missing localized homepage: '+locale);
    const html=fs.readFileSync(file,'utf8');
    assert.ok(html.includes('/'+locale+'/calculators/dividend-yield-calculator.html'),'Dividend calculator is not linked from '+locale+' homepage');
    assert.ok(html.includes('/'+locale+'/calculators/markup-margin-calculator.html'),'Markup calculator is not linked from '+locale+' homepage');
  }
});


test('Salary TDS calculator supports both simplified tax regimes, rebate eligibility and safe payroll-month validation',()=>{
  const script=fs.readFileSync(path.join(root,'assets/page-calculators.js'),'utf8');
  const shell=fs.readFileSync(path.join(root,'assets/site-shell.js'),'utf8');
  const page=fs.readFileSync(path.join(root,'calculators/tds-calculator.html'),'utf8');
  assert.ok(shell.includes("if(p.startsWith('/calculators/'))"),'Calculator pages must load the shared calculator engine');
  assert.ok(script.includes('"salary tds calculator"'));
  assert.ok(script.includes('Old regime — individual below 60'));
  assert.ok(script.includes('New regime — Tax Year 2026–27'));
  assert.ok(script.includes('[[250000,0],[500000,.05],[1000000,.20],[Infinity,.30]]'));
  assert.ok(script.includes('v.residency==="Resident individual"'));
  assert.ok(script.includes('Math.min(tax,12500)'));
  assert.ok(script.includes('!Number.isInteger(v.months)||v.months<1||v.months>12'));
  assert.ok(script.includes('balance/v.months'));
  assert.ok(script.includes('Payroll months remaining (1–12)'));
  assert.ok(page.includes('old-regime option assumes an individual below 60'));
  assert.ok(page.includes('id="live-page-calculator"')===false,'The shared engine injects the live calculator section at runtime');
});


test('English Income Tax retains the reviewed model, Hindi uses its localized 2026–27 model, and other translations remain safely paused',()=>{
  const shared=fs.readFileSync(path.join(root,'assets/page-calculators.js'),'utf8');
  assert.ok(shared.includes('grossSalary'));
  assert.ok(shared.includes('standardDeduction'));
  assert.ok(shared.includes('surchargeBands'));
  assert.ok(shared.includes('surchargeRelief'));
  assert.ok(shared.includes('Math.min(taxBeforeRebate,Math.max(0,taxBeforeRebate-(taxable-1200000)))'));
  const hindi=fs.readFileSync(path.join(root,'hi/calculators/income-tax-calculator.html'),'utf8');
  assert.ok(hindi.includes('id="calculate-tax"'),'Hindi tax calculator is not interactive');
  assert.ok(hindi.includes('id="tax-results"'),'Hindi tax results section is missing');
  assert.ok(hindi.includes('कर वर्ष 2026–27'),'Hindi tax year disclosure is missing');
  assert.ok(hindi.includes('function calculate()'),'Hindi tax calculation function is missing');
  assert.ok(!hindi.includes('localized-tax-review-note'),'Hindi tax calculator should no longer be paused');
  const locales=['es','fr','pt','ar','id','bn','ta'];
  for(const locale of locales){
    const file=path.join(root,locale,'calculators/income-tax-calculator.html');
    assert.ok(fs.existsSync(file),'Missing income tax calculator locale: '+locale);
    const html=fs.readFileSync(file,'utf8');
    assert.ok(html.includes('id="localized-tax-review-note"'),'Missing review notice: '+locale);
    assert.ok((html.match(/aria-hidden="true"/g)||[]).length>=3,'Legacy calculator panels are still visible: '+locale);
    assert.ok(html.includes('/calculators/income-tax-calculator.html'),'Missing reviewed English calculator link: '+locale);
    assert.ok(!html.includes('function run()'),'Retired simplified calculator still runs: '+locale);
  }
});


test('agriculture, scheme and career calculator pages are linked, indexed and use the shared rural runtime', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const engine = fs.readFileSync(path.join(root, 'assets/rural-tools.js'), 'utf8');
  const pages = [
    ['crop-cost-profit-calculator', 'crop-cost-profit'],
    ['kcc-interest-calculator', 'kcc-interest'],
    ['livestock-cost-profit-calculator', 'livestock-profit'],
    ['crop-yield-sale-value-calculator', 'crop-yield-value'],
    ['pm-kisan-eligibility-checker', 'pm-kisan-checker'],
    ['ayushman-bharat-eligibility-checker', 'ayushman-checker'],
    ['apy-eligibility-pension-planner', 'apy-planner'],
    ['pmay-eligibility-checker', 'pmay-checker'],
    ['mudra-loan-category-emi-calculator', 'mudra-planner'],
    ['mp-ladli-behna-eligibility-checker', 'ladli-behna-checker'],
    ['job-change-take-home-salary-calculator', 'job-change-salary'],
    ['first-job-salary-calculator', 'first-job-salary']
  ];
  for (const [slug, key] of pages) {
    const url = 'https://friendlycalculator.in/calculators/' + slug + '.html';
    const file = path.join(root, 'calculators', slug + '.html');
    assert.ok(urls.includes(url), 'Missing sitemap URL: ' + url);
    assert.ok(fs.existsSync(file), 'Missing calculator file: ' + file);
    assert.ok(directory.includes('href="/calculators/' + slug + '.html"'), 'Missing directory link: ' + slug);
    const html = fs.readFileSync(file, 'utf8');
    assert.ok(html.includes('data-rural-tool="' + key + '"'), 'Missing runtime key: ' + key);
    assert.ok(html.includes('/assets/rural-tools.js'), 'Missing rural runtime include: ' + slug);
    assert.ok(html.includes('rel="canonical"'), 'Missing canonical: ' + slug);
    assert.ok(html.includes('id="embedCode"'), 'Missing embed code UI: ' + slug);
  }
  assert.ok(engine.includes("configs['fd-rd-sip']"), 'FD vs RD vs SIP comparison model is missing');
});

test('shared calculator shell provides export, embed, what-if, live-chart and related-tool controls', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.ok(shell.includes('Print / Save as PDF'));
  assert.ok(shell.includes('Download result image'));
  assert.ok(shell.includes('Copy embed code'));
  assert.ok(shell.includes('What-if scenario slider'));
  assert.ok(shell.includes('fc-live-chart'));
  assert.ok(shell.includes('fc-related-tools'));
  assert.ok(shell.includes('https://wa.me/'));
});


test('land area converter supports requested units and discloses local Bigha variation', () => {
  const html = fs.readFileSync(path.join(root, 'calculators/land-unit-converter-calculator.html'), 'utf8');
  const engine = fs.readFileSync(path.join(root, 'assets/rural-tools.js'), 'utf8');
  assert.ok(html.includes('data-rural-tool="land-converter"'));
  assert.ok(html.includes('Hectare'));
  assert.ok(html.includes('Bigha is not a single uniform national unit'));
  assert.ok(html.includes('/assets/rural-tools.js'));
  assert.ok(engine.includes("configs['land-converter']"));
  assert.ok(engine.includes('107639.104167'));
  assert.ok(!html.includes('/assets/extra-calculators.js'));
});


// Catalogue expansion regression: homepage, directory, About and sitemap must stay synchronized.
test('homepage, directory, About and sitemap agree on their distinct calculator catalogues', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const searchIndex = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const searchUrls = [...new Set(searchIndex.map(item => item.url))].sort();
  const sitemapCalc = [...new Set(urls.filter(url => /^https:\/\/friendlycalculator\.in\/calculators\//.test(url)).map(url => url.replace('https://friendlycalculator.in', '')))].sort();
  const directoryLinks = new Set([...directory.matchAll(/href=["'](\/calculators\/[^"'#]+)["']/g)].map(m => m[1]));
  const aboutLinks = [...about.matchAll(/<li><a href="(\/calculators\/[^"]+)">/g)].map(m => m[1]).sort();
  const start = homepage.indexOf('<nav class="home-category-index"');
  const nav = homepage.slice(start, homepage.indexOf('</nav>', start));
  const navCategoryCount = (nav.match(/<a href="\/calculator\/site-directory\.html#/g) || []).length;
  const navCalculatorTotal = [...nav.matchAll(/<span>(\d+) calculator(?:s)?<\/span>/g)].reduce((sum, m) => sum + Number(m[1]), 0);
  const categoryCount = (directory.match(/<section class="section calculator-category"/g) || []).length;
  assert.equal(searchIndex.length, expectedSearchIndexLength);
  assert.deepEqual(searchUrls, expectedSearchIndexUrls);
  assert.deepEqual(sitemapCalc, canonicalCalculatorUrls);
  assert.ok(searchIndex.some(item => item.name === 'VAT Calculator' && item.url === '/international/vat-calculator.html'));
  assert.ok([...directoryLinks].every(url => canonicalCalculatorUrls.includes(url)));
  assert.deepEqual(aboutLinks, canonicalCalculatorUrls);
  assert.ok(coreCalculatorUrls.every(url => directoryLinks.has(url)));
  assert.equal(navCalculatorTotal, expectedCoreCalculatorCount);
  assert.equal(homepageCoreCalculatorCount, expectedCoreCalculatorCount);
  assert.doesNotMatch(homepage, /class="search-panel"/);
  assert.ok(shell.includes('fc-all-calculators-link') && shell.includes('nav.all') && shell.includes("r+'site-directory.html'") && shell.includes('globalCalculatorsUrl'), 'The header must expose the site directory and global calculators as direct links.');
  assert.ok(!shell.includes('fc-all-dropdown'), 'All Calculators must remain a plain link without a dropdown.');
  const globalHeader = shell.slice(shell.indexOf('const links=['), shell.indexOf('const languageControl='));
  assert.doesNotMatch(globalHeader, /nav\.search|Search Calculator/);
  assert.match(directory, /id="siteSearch"/);
  assert.ok(directory.includes('Browse all ' + expectedCoreCalculatorCount + ' calculator tools'));
  assert.ok(directory.includes('Search ' + expectedCoreCalculatorCount + ' calculators by name or topic'));
  assert.ok(directory.includes('Showing all ' + expectedCoreCalculatorCount + ' calculators in 20 categories'));
  assert.equal(categoryCount, 20);
  const directoryIndexStart = directory.indexOf('<section class="section" id="calculator-category-index">');
  const directoryIndexEnd = directory.indexOf('</section>', directoryIndexStart);
  const directoryIndex = directory.slice(directoryIndexStart, directoryIndexEnd);
  const cards = [...directoryIndex.matchAll(/<a class="quick" href="#([^"]+)"[\s\S]*?<span>(\d+) calculator(?:s)?<\/span>/g)];
  const sections = [...directory.matchAll(/<section class="section calculator-category" id="([^"]+)"[^>]*>([\s\S]*?)(?=<section class="section calculator-category"|<section class="section"|<footer|<\/main>)/g)];
  assert.equal(cards.length, 20);
  assert.deepEqual(cards.map(m => m[1]), sections.map(m => m[1]));
  const counts = new Map();
  for (const section of sections) {
    const id = section[1], body = section[2];
    const declared = Number((body.match(/<strong>(\d+) tools?<\/strong>/) || [])[1]);
    const count = [...body.matchAll(/href="\/calculators\/[^"]+"/g)].length;
    assert.equal(declared, count);
    counts.set(id, declared);
  }
  for (const card of cards) assert.equal(Number(card[2]), counts.get(card[1]));
  assert.equal(navCategoryCount, 20);
  assert.match(homepage, /href="\/calculator\/site-directory\.html#math-statistics"><strong>Mathematics, Numbers &amp; Statistics<\/strong><span>128 calculators<\/span><\/a>/);
  assert.ok(searchIndex.some(item => item.url === '/calculators/stamp-duty-calculator.html'));
  assert.ok(searchIndex.some(item => item.url === '/calculators/bigha-to-sq-ft-calculator.html'));
  assert.ok(directory.includes('/calculator/agriculture-calculators.html'));
  assert.ok(sitemap.includes('/calculator/agriculture-calculators.html'));
  assert.ok(about.includes(expectedCoreCalculatorCount + ' public calculators'));
  assert.doesNotMatch(homepage + directory, /186 calculators|186 calculator tools|Search 186 calculators|Showing all 186 calculators|198 calculators|198 calculator tools/);
});

test('Cookie Policy is discoverable from Privacy, excluded from analytics and keeps the approved policy footer', () => {
  const privacy = fs.readFileSync(path.join(root, 'calculator/privacy.html'), 'utf8');
  const cookies = fs.readFileSync(path.join(root, 'calculator/cookies.html'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.ok(privacy.includes('href="/calculator/cookies.html"'));
  assert.ok(urls.includes('https://friendlycalculator.in/calculator/cookies.html'));
  assert.ok(shell.includes('(?:privacy|cookies)'));
  assert.match(cookies, /Last updated: 14 November 2026/);
  assert.match(cookies, /does not currently operate a separate, custom cookie-preference centre/);
  assert.ok(shell.includes("en:['About','Methodology','Privacy','Terms','Disclaimer','Legal & Compliance','Embed','Sitemap','Contact','Advertising']"), 'The shared Footer must retain the approved policy links and Sitemap.');
  assert.doesNotMatch(shell.slice(shell.indexOf('const footerPaths='), shell.indexOf('const footerLinks=')), /cookies\.html/i, 'Cookie Policy remains linked from Privacy, not the compact footer');
  
});

test('Founder landing page has the approved portrait, LinkedIn profile and factual identity markup', () => {
  const founder = fs.readFileSync(path.join(root, 'calculator/founder.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  assert.match(founder, /Avnish Ahirwar/);
  assert.match(founder, /Founder and Owner/);
  assert.match(founder, /\"@type\":\"ProfilePage\"/);
  assert.match(founder, /src="\/assets\/founder-avnish-profile\.webp/);
  assert.match(founder, /https:\/\/www\.linkedin\.com\/in\/avnishahirwar415/);
  assert.match(founder, /application\/ld\+json/);
  assert.match(about, /href="\/calculator\/founder\.html"/);
});

test('open editorial content licence requires attribution and excludes software and brand assets', () => {
  const license = fs.readFileSync(path.join(root, 'calculator/content-license.html'), 'utf8');
  const terms = fs.readFileSync(path.join(root, 'calculator/terms.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const methodology = fs.readFileSync(path.join(root, 'calculator/methodology.html'), 'utf8');
  assert.ok(urls.includes('https://friendlycalculator.in/calculator/content-license.html'));
  assert.match(license, /CC BY 4\.0/);
  assert.match(license, /Avnish Ahirwar/);
  assert.match(license, /state whether you made changes/i);
  assert.match(license, /commercial/i);
  assert.match(license, /software, source code/i);
  assert.ok(terms.includes('/calculator/content-license.html'));
  assert.ok(about.includes('/calculator/content-license.html'));
  assert.ok(methodology.includes('/calculator/content-license.html'));
  assert.match(terms, /commercially, provided you give appropriate credit/);
});


test('Hindi decimal-to-percent converter is localized, reciprocal and indexed', () => {
  const hindiPath = path.join(root, 'hi/calculators/decimal-to-percent-converter.html');
  const englishPath = path.join(root, 'calculators/decimal-to-percent-converter.html');
  assert.ok(fs.existsSync(hindiPath), 'Hindi converter page must exist');
  const hindi = fs.readFileSync(hindiPath, 'utf8');
  const english = fs.readFileSync(englishPath, 'utf8');
  assert.match(hindi, /<html lang="hi">/);
  assert.ok(hindi.includes('hreflang="en"') && hindi.includes('hreflang="hi"') && hindi.includes('hreflang="x-default"'));
  assert.ok(english.includes('hreflang="hi"'));
  for (const phrase of ['दशमलव से प्रतिशत कनवर्टर','प्रतिशत = दशमलव मान × 100','अक्सर पूछे जाने वाले सवाल','गणना करें']) assert.ok(hindi.includes(phrase), 'Hindi page is missing: ' + phrase);
  assert.ok(sitemap.includes('https://friendlycalculator.in/hi/calculators/decimal-to-percent-converter.html'));
});


test('Hindi utility calculator pages are localized, reciprocal and indexed', () => {
  const pages = [
    ['aspect-ratio-calculator', 'आस्पेक्ट रेशियो कैलकुलेटर', 'आस्पेक्ट रेशियो = चौड़ाई : ऊँचाई।', ['चौड़ाई','ऊँचाई','विकर्ण']],
    ['words-per-minute-calculator', 'शब्द प्रति मिनट कैलकुलेटर', 'कुल WPM = कुल शब्द ÷ मिनट।', ['टाइप किए गए शब्द','शुद्ध टाइपिंग गति','सटीकता']],
    ['weighted-average-calculator', 'भारित औसत कैलकुलेटर', 'भारित औसत = Σ(मान × भार) ÷ Σ(भार)।', ['भारित योग','भारों का योग','भारित औसत']]
  ];
  for (const [slug, title, formula, phrases] of pages) {
    const hindiPath = path.join(root, 'hi/calculators/' + slug + '.html');
    const englishPath = path.join(root, 'calculators/' + slug + '.html');
    assert.ok(fs.existsSync(hindiPath), 'Missing Hindi page: ' + slug);
    const hindi = fs.readFileSync(hindiPath, 'utf8');
    const english = fs.readFileSync(englishPath, 'utf8');
    assert.match(hindi, /<html lang="hi">/);
    assert.ok(hindi.includes('hreflang="en"') && hindi.includes('hreflang="hi"') && hindi.includes('hreflang="x-default"'));
    assert.ok(english.includes('hreflang="hi"'), 'Missing reciprocal English hreflang: ' + slug);
    assert.ok(hindi.includes(title), 'Missing localized title: ' + slug);
    assert.ok(hindi.includes(formula), 'Missing localized formula: ' + slug);
    for (const phrase of phrases) assert.ok(hindi.includes(phrase), 'Missing localized text: ' + phrase);
    assert.ok(sitemap.includes('https://friendlycalculator.in/hi/calculators/' + slug + '.html'), 'Missing sitemap URL: ' + slug);
  }
});


test('Hindi median and mode calculator pages are localized, reciprocal and indexed', () => {
  for (const [slug, title, formula, phrases] of [
    ['median', 'माध्यिका कैलकुलेटर', 'विषम संख्या में मान हों तो बीच का मान माध्यिका होता है।', ['संख्याएँ','क्रमबद्ध मान','माध्यिका']],
    ['mode', 'बहुलक कैलकुलेटर', 'बहुलक वह मान या मान हैं जिनकी आवृत्ति डेटा सेट में सबसे अधिक होती है।', ['संख्याएँ','अधिकतम आवृत्ति','बहुलक']]
  ]) {
    const hindiPath = path.join(root, 'hi/calculators/' + slug + '-calculator.html');
    const englishPath = path.join(root, 'calculators/' + slug + '-calculator.html');
    assert.ok(fs.existsSync(hindiPath), 'Missing Hindi page: ' + slug);
    const hindi = fs.readFileSync(hindiPath, 'utf8');
    const english = fs.readFileSync(englishPath, 'utf8');
    assert.match(hindi, /<html lang="hi">/);
    assert.ok(hindi.includes('hreflang="en"') && hindi.includes('hreflang="hi"') && hindi.includes('hreflang="x-default"'));
    assert.ok(english.includes('hreflang="hi"'), 'Missing reciprocal English hreflang: ' + slug);
    assert.ok(hindi.includes(title), 'Missing localized title: ' + slug);
    assert.ok(hindi.includes(formula), 'Missing localized formula: ' + slug);
    for (const phrase of phrases) assert.ok(hindi.includes(phrase), 'Missing localized text: ' + phrase);
    assert.ok(sitemap.includes('https://friendlycalculator.in/hi/calculators/' + slug + '-calculator.html'), 'Missing sitemap URL: ' + slug);
  }
});


test('Hindi homepage links to the recently added calculator pages', () => {
  const home = fs.readFileSync(path.join(root, 'hi/index.html'), 'utf8');
  for (const slug of [
    'median-calculator', 'mode-calculator', 'weighted-average-calculator',
    'square-root-calculator', 'decimal-to-percent-converter',
    'hours-to-minutes-calculator', 'aspect-ratio-calculator',
    'words-per-minute-calculator', 'percentage-change-calculator', 'fraction-to-percent-calculator', 'cube-root-calculator'
  ]) {
    assert.ok(home.includes('/hi/calculators/' + slug + '.html'), 'Hindi homepage is missing discovery link: ' + slug);
  }
});


test('Hindi percentage change, fraction-to-percent and cube-root pages are localized, reciprocal and indexed', () => {
  const cases = [
    ['percentage-change-calculator', 'percentage-change', 'प्रतिशत परिवर्तन कैलकुलेटर', 'प्रतिशत परिवर्तन = ((नया मान − प्रारंभिक मान) ÷ |प्रारंभिक मान|) × 100।', ['प्रारंभिक मान', 'नया मान', 'वृद्धि', 'कमी']],
    ['fraction-to-percent-calculator', 'fraction-to-percent', 'भिन्न से प्रतिशत कैलकुलेटर', 'प्रतिशत = (अंश ÷ हर) × 100।', ['अंश', 'हर', 'दशमलव मान', 'प्रतिशत']],
    ['cube-root-calculator', 'cube-root', 'घनमूल कैलकुलेटर', 'x का घनमूल वह वास्तविक संख्या r है जिसके लिए r³ = x।', ['वास्तविक संख्या', 'वास्तविक घनमूल', 'सत्यापन']]
  ];
  for (const [slug, key, title, formula, phrases] of cases) {
    const hindiPath = path.join(root, 'hi/calculators/' + slug + '.html');
    const englishPath = path.join(root, 'calculators/' + slug + '.html');
    assert.ok(fs.existsSync(hindiPath), 'Missing Hindi page: ' + slug);
    const hindi = fs.readFileSync(hindiPath, 'utf8');
    const english = fs.readFileSync(englishPath, 'utf8');
    assert.match(hindi, /<html lang="hi">/);
    assert.ok(hindi.includes('data-calculator="' + key + '"'));
    assert.ok(hindi.includes('/assets/keyword-calculators.js'));
    assert.ok(hindi.includes('hreflang="en"') && hindi.includes('hreflang="hi"') && hindi.includes('hreflang="x-default"'));
    assert.ok(english.includes('hreflang="hi"'), 'Missing reciprocal English hreflang: ' + slug);
    assert.ok(hindi.includes(title), 'Missing localized title: ' + slug);
    assert.ok(hindi.includes(formula), 'Missing localized formula: ' + slug);
    for (const phrase of phrases) assert.ok(hindi.includes(phrase), 'Missing localized text: ' + phrase);
    assert.ok(sitemap.includes('https://friendlycalculator.in/hi/calculators/' + slug + '.html'), 'Missing sitemap URL: ' + slug);
  }
});


test('Hindi percentage increase, decrease, difference and percentage-point pages are localized and indexed', () => {
  const cases = [
    ['percentage-increase-calculator', 'percentage-increase', 'प्रतिशत वृद्धि कैलकुलेटर', 'वृद्धि = मूल मान × वृद्धि दर ÷ 100। नया मान = मूल मान + वृद्धि।', ['मूल मान', 'वृद्धि (%)', 'वृद्धि राशि', 'नया मान']],
    ['percentage-decrease-calculator', 'percentage-decrease', 'प्रतिशत कमी कैलकुलेटर', 'कमी = मूल मान × कमी दर ÷ 100। नया मान = मूल मान − कमी।', ['मूल मान', 'कमी (%)', 'कमी राशि', 'नया मान']],
    ['percentage-difference-calculator', 'percentage-difference', 'प्रतिशत अंतर कैलकुलेटर', 'प्रतिशत अंतर = |A − B| ÷ ((|A| + |B|) ÷ 2) × 100।', ['पहला मान', 'दूसरा मान', 'पूर्ण अंतर', 'प्रतिशत अंतर']],
    ['percentage-point-calculator', 'percentage-point', 'प्रतिशत अंक कैलकुलेटर', 'प्रतिशत अंक परिवर्तन = नई दर − मूल दर।', ['मूल दर', 'नई दर', 'प्रतिशत अंक में परिवर्तन', 'सापेक्ष परिवर्तन']]
  ];
  for (const [slug, key, title, formula, phrases] of cases) {
    const hp = path.join(root, 'hi/calculators/' + slug + '.html');
    const ep = path.join(root, 'calculators/' + slug + '.html');
    assert.ok(fs.existsSync(hp), 'Missing Hindi page: ' + slug);
    const h = fs.readFileSync(hp, 'utf8');
    const e = fs.readFileSync(ep, 'utf8');
    assert.match(h, /<html lang="hi">/);
    assert.ok(h.includes('data-calculator="' + key + '"'));
    assert.ok(h.includes('/assets/keyword-calculators.js'));
    assert.ok(h.includes('hreflang="en"') && h.includes('hreflang="hi"') && h.includes('hreflang="x-default"'));
    assert.ok(e.includes('hreflang="hi"'), 'Missing reciprocal English hreflang: ' + slug);
    assert.ok(h.includes(title) && h.includes(formula));
    for (const phrase of phrases) assert.ok(h.includes(phrase), 'Missing localized text: ' + phrase);
    assert.ok(sitemap.includes('https://friendlycalculator.in/hi/calculators/' + slug + '.html'));
    assert.ok(fs.readFileSync(path.join(root, 'hi/index.html'), 'utf8').includes('/hi/calculators/' + slug + '.html'));
  }
});


test('Hindi average percentage, percentage-of-percentage and percent-error pages are localized and indexed', () => {
  const cases = [
    ['average-percentage-calculator', 'average-percentage', 'औसत प्रतिशत कैलकुलेटर', 'औसत प्रतिशत = सभी दर्ज प्रतिशत मानों का योग ÷ मानों की संख्या।', ['प्रतिशत 1', 'प्रतिशत 2', 'औसत प्रतिशत', 'मानों की संख्या']],
    ['percentage-of-percentage-calculator', 'percentage-of-percentage', 'प्रतिशत का प्रतिशत कैलकुलेटर', 'संयुक्त प्रतिशत = पहला प्रतिशत × दूसरा प्रतिशत ÷ 100।', ['आधार राशि', 'पहला प्रतिशत', 'दूसरा प्रतिशत', 'संयुक्त प्रतिशत']],
    ['percent-error-calculator', 'percent-error', 'प्रतिशत त्रुटि कैलकुलेटर', 'पूर्ण प्रतिशत त्रुटि = |प्रेक्षित मान − संदर्भ मान| ÷ |संदर्भ मान| × 100।', ['प्रेक्षित मान', 'संदर्भ मान', 'पूर्ण त्रुटि', 'पूर्ण प्रतिशत त्रुटि']]
  ];
  for (const [slug, key, title, formula, phrases] of cases) {
    const hp = path.join(root, 'hi/calculators/' + slug + '.html');
    const ep = path.join(root, 'calculators/' + slug + '.html');
    assert.ok(fs.existsSync(hp), 'Missing Hindi page: ' + slug);
    const h = fs.readFileSync(hp, 'utf8');
    const e = fs.readFileSync(ep, 'utf8');
    assert.match(h, /<html lang="hi">/);
    assert.ok(h.includes('data-calculator="' + key + '"'));
    assert.ok(h.includes('/assets/keyword-calculators.js'));
    assert.ok(h.includes('hreflang="en"') && h.includes('hreflang="hi"') && h.includes('hreflang="x-default"'));
    assert.ok(e.includes('hreflang="hi"'), 'Missing reciprocal English hreflang: ' + slug);
    assert.ok(h.includes(title) && h.includes(formula));
    for (const phrase of phrases) assert.ok(h.includes(phrase), 'Missing localized text: ' + phrase);
    assert.ok(sitemap.includes('https://friendlycalculator.in/hi/calculators/' + slug + '.html'));
    assert.ok(fs.readFileSync(path.join(root, 'hi/index.html'), 'utf8').includes('/hi/calculators/' + slug + '.html'));
  }
});


test('Hindi digital root, divisibility test and reciprocal pages are localized and indexed', () => {
  const cases = [
    ['digital-root-calculator', 'digital-root', 'डिजिटल रूट कैलकुलेटर', 'डिजिटल रूट: शून्य के लिए 0; अन्य पूर्णांकों के लिए 1 + ((|n| − 1) mod 9)।', ['पूर्णांक', 'अंकों का योग', 'डिजिटल रूट']],
    ['divisibility-test-calculator', 'divisibility-test', 'विभाज्यता जाँच कैलकुलेटर', 'यदि संख्या ÷ भाजक का शेषफल 0 हो, तो संख्या भाजक से पूर्णतः विभाजित होती है।', ['जाँची जाने वाली पूर्णांक संख्या', 'भाजक', 'शेषफल', 'विभाजित होता है']],
    ['reciprocal-calculator', 'reciprocal', 'व्युत्क्रम कैलकुलेटर', 'किसी गैर-शून्य संख्या x का व्युत्क्रम 1 ÷ x होता है। x × (1 ÷ x) = 1।', ['गैर-शून्य संख्या', 'व्युत्क्रम', 'सत्यापन']]
  ];
  for (const [slug, key, title, formula, phrases] of cases) {
    const hp = path.join(root, 'hi/calculators/' + slug + '.html');
    const ep = path.join(root, 'calculators/' + slug + '.html');
    assert.ok(fs.existsSync(hp), 'Missing Hindi page: ' + slug);
    const h = fs.readFileSync(hp, 'utf8');
    const e = fs.readFileSync(ep, 'utf8');
    assert.match(h, /<html lang="hi">/);
    assert.ok(h.includes('data-calculator="' + key + '"'));
    assert.ok(h.includes('/assets/keyword-calculators.js'));
    assert.ok(h.includes('hreflang="en"') && h.includes('hreflang="hi"') && h.includes('hreflang="x-default"'));
    assert.ok(e.includes('hreflang="hi"'), 'Missing reciprocal English hreflang: ' + slug);
    assert.ok(h.includes(title) && h.includes(formula));
    for (const phrase of phrases) assert.ok(h.includes(phrase), 'Missing localized text: ' + phrase);
    assert.ok(sitemap.includes('https://friendlycalculator.in/hi/calculators/' + slug + '.html'));
    assert.ok(fs.readFileSync(path.join(root, 'hi/index.html'), 'utf8').includes('/hi/calculators/' + slug + '.html'));
  }
});


test('Hindi percentile, prime number, scientific notation and completing-square pages are localized and indexed', () => {
  const cases = [
    ['percentile-rank-calculator', 'percentile-rank', 'प्रतिशतक रैंक कैलकुलेटर', 'प्रतिशतक रैंक = (लक्ष्य से कम मानों की संख्या + 0.5 × लक्ष्य के बराबर मानों की संख्या) ÷ कुल मान × 100।', ['डेटा मान', 'लक्ष्य मान', 'कुल मानों की संख्या', 'Tie-adjusted प्रतिशतक रैंक']],
    ['prime-number-calculator', 'prime-number', 'अभाज्य संख्या कैलकुलेटर', 'अभाज्य संख्या वह पूर्णांक है जो 1 से बड़ा हो और जिसके धनात्मक गुणनखंड केवल 1 तथा स्वयं वह संख्या हों।', ['जाँचने के लिए पूर्णांक', 'अभाज्य स्थिति', 'सबसे छोटा गुणनखंड']],
    ['scientific-notation-calculator', 'scientific-notation', 'वैज्ञानिक संकेतन कैलकुलेटर', 'शून्य से अलग x के लिए वैज्ञानिक संकेतन a × 10ⁿ होता है, जहाँ 1 ≤ |a| < 10 और n पूर्णांक है।', ['बदलने के लिए संख्या', 'वैज्ञानिक संकेतन', 'गुणांक', '10 की घात']],
    ['completing-the-square-calculator', 'completing-the-square', 'पूर्ण वर्ग बनाने का कैलकुलेटर', 'h = −b ÷ (2a), k = c − b² ÷ (4a)।', ['गुणांक a', 'गुणांक b', 'स्थिर पद c', 'शीर्ष रूप', 'सममिति अक्ष']]
  ];
  for (const [slug, key, title, formula, phrases] of cases) {
    const hp = path.join(root, 'hi/calculators/' + slug + '.html');
    const ep = path.join(root, 'calculators/' + slug + '.html');
    assert.ok(fs.existsSync(hp), 'Missing Hindi page: ' + slug);
    const h = fs.readFileSync(hp, 'utf8');
    const e = fs.readFileSync(ep, 'utf8');
    assert.match(h, /<html lang="hi">/);
    assert.ok(h.includes('data-calculator="' + key + '"'));
    assert.ok(h.includes('/assets/keyword-calculators.js'));
    assert.ok(h.includes('hreflang="en"') && h.includes('hreflang="hi"') && h.includes('hreflang="x-default"'));
    assert.ok(e.includes('hreflang="hi"'), 'Missing reciprocal English hreflang: ' + slug);
    assert.ok(h.includes(title) && h.includes(formula));
    for (const phrase of phrases) assert.ok(h.includes(phrase), 'Missing localized text: ' + phrase);
    assert.ok(sitemap.includes('https://friendlycalculator.in/hi/calculators/' + slug + '.html'));
    assert.ok(fs.readFileSync(path.join(root, 'hi/index.html'), 'utf8').includes('/hi/calculators/' + slug + '.html'));
  }
});


test('Hindi quartile, coefficient of variation, complex conjugate and discriminant pages are localized and indexed', () => {
  const cases = [
    ['quartile-calculator', 'quartile', 'चतुर्थक कैलकुलेटर', 'IQR = Q3 − Q1।', ['डेटा मान', 'प्रथम चतुर्थक (Q1)', 'माध्यिका (Q2)', 'तृतीय चतुर्थक (Q3)', 'अंतर-चतुर्थक परास (IQR)']],
    ['coefficient-of-variation-calculator', 'coefficient-of-variation', 'परिवर्तन गुणांक कैलकुलेटर', 'परिवर्तन गुणांक = population standard deviation ÷ |औसत| × 100%।', ['डेटा मान', 'औसत', 'जनसंख्या मानक विचलन', 'परिवर्तन गुणांक']],
    ['complex-conjugate-calculator', 'complex-conjugate', 'सम्मिश्र संयुग्म कैलकुलेटर', 'z = a + bi का संयुग्म a − bi है।', ['वास्तविक भाग', 'काल्पनिक गुणांक', 'सम्मिश्र संख्या', 'संयुग्म', 'मापांक (Modulus)']],
    ['discriminant-calculator', 'discriminant', 'विविक्तकर कैलकुलेटर', 'विविक्तकर Δ = b² − 4ac।', ['गुणांक a', 'गुणांक b', 'स्थिर पद c', 'विविक्तकर', 'मूलों का प्रकार']]
  ];
  for (const [slug, key, title, formula, phrases] of cases) {
    const hp = path.join(root, 'hi/calculators/' + slug + '.html');
    const ep = path.join(root, 'calculators/' + slug + '.html');
    assert.ok(fs.existsSync(hp), 'Missing Hindi page: ' + slug);
    const h = fs.readFileSync(hp, 'utf8');
    const e = fs.readFileSync(ep, 'utf8');
    assert.match(h, /<html lang="hi">/);
    assert.ok(h.includes('data-calculator="' + key + '"'));
    assert.ok(h.includes('/assets/keyword-calculators.js'));
    assert.ok(h.includes('hreflang="en"') && h.includes('hreflang="hi"') && h.includes('hreflang="x-default"'));
    assert.ok(e.includes('hreflang="hi"'), 'Missing reciprocal English hreflang: ' + slug);
    assert.ok(h.includes(title) && h.includes(formula));
    for (const phrase of phrases) assert.ok(h.includes(phrase), 'Missing localized text: ' + phrase);
    assert.ok(sitemap.includes('https://friendlycalculator.in/hi/calculators/' + slug + '.html'));
    assert.ok(fs.readFileSync(path.join(root, 'hi/index.html'), 'utf8').includes('/hi/calculators/' + slug + '.html'));
  }
});


test('Hindi appliance energy cost page is localized, linked and included in sitemap', () => {
  const page = fs.readFileSync(path.join(root, 'hi/calculators/appliance-energy-cost-calculator.html'), 'utf8');
  const engine = fs.readFileSync(path.join(root, 'assets/keyword-calculators.js'), 'utf8');
  const hindiHome = fs.readFileSync(path.join(root, 'hi/index.html'), 'utf8');
  assert.match(page, /<html lang="hi">/);
  assert.ok(page.includes('उपकरण बिजली खर्च कैलकुलेटर'));
  assert.ok(page.includes('rel="canonical" href="https://friendlycalculator.in/hi/calculators/appliance-energy-cost-calculator.html"'));
  assert.ok(page.includes('hreflang="en"'));
  assert.ok(engine.includes('उपकरण की शक्ति (वॉट)'));
  assert.ok(engine.includes('अनुमानित मासिक बिजली खर्च'));
  assert.ok(hindiHome.includes('/hi/calculators/appliance-energy-cost-calculator.html'));
  assert.ok(sitemap.includes('https://friendlycalculator.in/hi/calculators/appliance-energy-cost-calculator.html'));
});


test('homepage category cards and headings match the calculator links in each category', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sections = [...homepage.matchAll(/<section class="category"([\s\S]*?)<\/section>/g)];
  const counts = new Map();

  for (const match of sections) {
    const section = match[0];
    const id = (section.match(/<section class="category" id="([^"]+)"/) || [])[1];
    const headingCount = Number((section.match(/<span class="category-count">(\d+) calculator(?:s)?<\/span>/) || [])[1]);
    const group = (section.match(/<div class="category-links">([\s\S]*?)<\/div>/) || [])[1] || '';
    const groupedLinks = (group.match(/class="calculator-link"/g) || []).length;
    const allSectionLinks = (section.match(/class="calculator-link"/g) || []).length;

    assert.ok(id, 'Every homepage category needs a stable section ID');
    assert.ok(Number.isInteger(headingCount) && headingCount > 0, 'Every category heading needs a numeric count: ' + id);
    assert.equal(allSectionLinks, groupedLinks, 'All category links must remain inside the styled link group: ' + id);
    assert.equal(headingCount, groupedLinks, 'Category heading count must match its actual links: ' + id);
    counts.set(id, groupedLinks);
  }

  const index = (homepage.match(/<nav class="home-category-index"[\s\S]*?<\/nav>/) || [])[0] || '';
  const cards = [...index.matchAll(/<a href="#([^"]+)"[^>]*>[\s\S]*?<span>(\d+) calculator(?:s)?<\/span><\/a>/g)];
  assert.equal(cards.length, sections.length, 'Category index must link to every category exactly once');
  for (const card of cards) {
    assert.equal(Number(card[2]), counts.get(card[1]), 'Category index count must match section links: ' + card[1]);
  }
});


test('Avnish Ahirwar founder identity is crawlable and consistently linked', () => {
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const founder = fs.readFileSync(path.join(root, 'calculator/founder.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.match(home, /Founded by <a href="\/calculator\/founder\.html">Avnish Ahirwar<\/a>/);
  assert.match(home, /"@type":"Person","@id":"https:\/\/friendlycalculator\.in\/calculator\/founder\.html#person","name":"Avnish Ahirwar"/);
  assert.match(founder, /"@type":"ProfilePage"/);
  assert.match(founder, /"name":"Avnish Ahirwar"/);
  assert.ok(founder.includes('<title>Avnish Ahirwar | Founder and Owner of Friendly Calculator</title>'));
  assert.match(about, /<a href="\/calculator\/founder\.html">Avnish Ahirwar — Founder and Owner<\/a>/);
  assert.match(sitemap, /<loc>https:\/\/friendlycalculator\.in\/calculator\/founder\.html<\/loc>/);
});

test('hours-to-minutes page includes an unambiguous worked example and payroll limitations', () => {
  const page = fs.readFileSync(path.join(root, 'calculators/hours-to-minutes-calculator.html'), 'utf8');
  assert.match(page, /\(2 × 60\) \+ 30 = 150 minutes/);
  assert.match(page, /same duration is 2\.5 decimal hours/);
  assert.match(page, /do not enter 2\.5 hours and then add 30 minutes again/);
  assert.match(page, /does not calculate overtime/);
});

test('Bengali and Tamil concrete calculators preserve the published material-estimate formula', () => {
  for (const locale of ['bn', 'ta']) {
    const html = fs.readFileSync(path.join(root, locale, 'calculators/concrete-calculator.html'), 'utf8');
    assert.match(html, new RegExp('<html lang="' + locale + '">'));
    for (const id of ['length', 'width', 'thickness', 'cement', 'sand', 'aggregate', 'calc-form', 'result']) {
      assert.ok(html.includes('id="' + id + '"'), locale + ' missing ' + id);
    }
    assert.match(html, /wet=l\*w\*th\/1000/);
    assert.match(html, /dry=wet\*1\.54/);
    assert.match(html, /cv=dry\*c\/sum/);
    assert.match(html, /cv\*1440\/50/);
    assert.match(html, /hreflang="en"/);
    assert.match(html, /hreflang="bn"/);
    assert.match(html, /hreflang="ta"/);
    assert.match(html, /qualified engineer|தகுதியான பொறியாளர்|যোগ্য প্রকৌশলী/i);
    const home = fs.readFileSync(path.join(root, locale, 'index.html'), 'utf8');
    assert.ok(home.includes('/' + locale + '/calculators/concrete-calculator.html'));
  }
  const english = fs.readFileSync(path.join(root, 'calculators/concrete-calculator.html'), 'utf8');
  assert.match(english, /hreflang="bn"/);
  assert.match(english, /hreflang="ta"/);
});
test('working-days page documents inclusive dates, weekends, custom holidays and range limit', () => {
  const page = fs.readFileSync(path.join(root, 'calculators/working-days-calculator.html'), 'utf8');
  assert.match(page, /start date and end date are both included/);
  assert.match(page, /Saturdays and Sundays are excluded/);
  assert.match(page, /does not download national, state, bank or company holiday calendars/);
  assert.match(page, /no longer than ten years/);
  assert.match(page, /Monday 2 November through Friday 6 November 2026/);
  assert.match(page, /Wednesday 4 November is entered as a custom holiday/);
  assert.match(page, /commas, spaces, semicolons or new lines/);
  assert.match(page, /Duplicate dates are counted once/);
  assert.match(page, /3,660 days/);
  assert.match(page, /Can I change the weekend days\?/);
  assert.match(page, /Does the calculator automatically exclude Indian public holidays\?/);
});

test('homepage category summary and directory markup match the published catalogue', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  assert.match(homepage, /organised into 19 clearly labelled categories/);
  assert.doesNotMatch(directory, /\\\\n/);
  assert.ok(directory.includes('Showing all ' + expectedCoreCalculatorCount + ' calculators in 20 categories'));
});


test('Maharashtra employee professional tax uses Schedule I salary bands and February collection', () => {
  const html = fs.readFileSync(path.join(root, 'calculators/professional-tax-calculator.html'), 'utf8');
  assert.match(html, /value="MH">Maharashtra — verified employee schedule/);
  assert.match(html, /Maharashtra statutory employee category/);
  assert.match(html, /salary<=7500/);
  assert.match(html, /salary<=10000/);
  assert.match(html, /salary<=25000/);
  assert.match(html, /normal=200;february=300/);
  assert.match(html, /mahagst\.gov\.in/);
  assert.match(html, /Other taxpayer classes and exemptions are not covered/);
});

test('browser image resizer and converter process files locally without upload calls', () => {
  const html = fs.readFileSync(path.join(root, 'calculator/image-tools.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'assets/image-tools.js'), 'utf8');
  assert.ok(urls.includes('https://friendlycalculator.in/calculator/image-tools.html'));
  assert.match(html, /rel="canonical" href="https:\/\/friendlycalculator\.in\/calculator\/image-tools\.html"/);
  assert.match(html, /Image decoding, resizing and conversion happen locally in your browser/);
  assert.match(js, /canvas\.toBlob/);
  assert.match(js, /maxFileBytes=20\*1024\*1024/);
  assert.match(js, /maxPixels=20000000/);
  assert.match(js, /The output is larger than 20 megapixels/);
  assert.doesNotMatch(js, /fetch\s*\(|XMLHttpRequest|sendBeacon|navigator\.sendBeacon/);
  assert.ok(fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8').includes('/calculator/image-tools.html'));
});

test('PWA manifest is installable and service worker caches only public query-free GET pages', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(worker, /friendly-calculator-public-v5/);
  assert.match(worker, /key !== CACHE_NAME/);
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const offline = fs.readFileSync(path.join(root, 'offline.html'), 'utf8');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some(icon => icon.sizes === 'any' && icon.type === 'image/svg+xml'));
  assert.match(shell, /manifest\.webmanifest/);
  assert.match(shell, /serviceWorker\.register\('\/sw\.js'/);
  assert.match(worker, /request\.method !== 'GET'/);
  assert.match(worker, /url\.search \|\| url\.hash/);
  assert.match(worker, /isPrivatePath/);
  assert.match(worker, /request\.mode === 'navigate'/);
  assert.match(offline, /You're offline/);
});


test('minutes-to-hours page documents fractional minutes, reference conversions and display precision', () => {
  const page = fs.readFileSync(path.join(root, 'calculators/minutes-to-hours-calculator.html'), 'utf8');
  assert.match(page, /95 minutes is 1\.5833 decimal hours/);
  assert.match(page, /12\.5 minutes is valid/);
  assert.match(page, /rounds the remaining minutes to two decimal places/);
  assert.match(page, /1,440/);
  assert.match(page, /does not determine payroll, overtime, billable hours or contractual working time/);
});


test('PWA install affordance explains browser install paths and the offline cache boundary', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.equal(manifest.display, 'standalone');
  assert.match(shell, /beforeinstallprompt/);
  assert.match(shell, /appinstalled/);
  assert.match(shell, /Install Friendly Calculator/);
  assert.match(shell, /Previously visited public pages may be available offline/);
  assert.match(worker, /request\.mode === 'navigate'/);
  assert.match(worker, /isPrivatePath/);
});

test('Bhopal and Madhya Pradesh resource hub uses existing calculators and official references', () => {
  const page = fs.readFileSync(path.join(root, 'calculator/bhopal-calculators.html'), 'utf8');
  assert.match(page, /rel="canonical" href="https:\/\/friendlycalculator\.in\/calculator\/bhopal-calculators\.html"/);
  assert.match(page, /calculators\/electricity-bill-calculator\.html/);
  assert.match(page, /calculators\/professional-tax-calculator\.html/);
  assert.match(page, /calculators\/crop-cost-profit-calculator\.html/);
  assert.match(page, /calculators\/kcc-interest-calculator\.html/);
  assert.match(page, /mperc\.in\/notices\/view\/210/);
  assert.match(page, /portal\.mpcz\.in\/web\/tariff-details/);
  assert.match(page, /services\.mp\.gov\.in\/eservice/);
  assert.match(page, /does not provide ward-level property guideline values/);
  assert.ok(urls.includes('https://friendlycalculator.in/calculator/bhopal-calculators.html'));
  assert.ok(fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8').includes('/calculator/bhopal-calculators.html'));
});

test('business page clearly exposes live selected-calculator iframe embeds', () => {
  const page = fs.readFileSync(path.join(root, 'calculator/business.html'), 'utf8');
  assert.match(page, /\/embed\//);
  assert.match(page, /self-service iframe builder is already live/);
  assert.match(page, /keeps visible attribution/);
});


test('display settings provide only Normal Mode and Dark Mode', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'assets/site-shell.css'), 'utf8');
  for (const token of ['fc-display-settings', 'fc-display-panel', 'fc-display-theme', 'normalModeButton', 'darkModeButton', 'aria-pressed', "initialTheme=theme==='dark'?'dark':'light'"]) {
    assert.ok(shell.includes(token), 'Missing display setting token: ' + token);
  }
  assert.ok(!shell.includes('contrastButton') && !shell.includes('sizeLabel') && !shell.includes('motionButton'));
  assert.match(styles, /data-fc-theme="dark"/);
  assert.match(styles, /fc-theme-mode-options/);
  assert.match(styles, /color-scheme:dark/);
});


test('Bengali and Tamil Bigha calculator pages are fully localized and cross-linked', () => {
  for (const locale of ['bn', 'ta']) {
    const pagePath = path.join(root, locale, 'calculators', 'bigha-to-sq-ft-calculator.html');
    const html = fs.readFileSync(pagePath, 'utf8');
    assert.match(html, new RegExp('<html lang="' + locale + '">'));
    assert.match(html, /id="bighaForm"/);
    assert.match(html, /id="factor"/);
    assert.match(html, /0\.09290304/);
    assert.match(html, /43,560/);
    assert.match(html, /hreflang="en"/);
    assert.match(html, /hreflang="hi"/);
    assert.match(html, /hreflang="bn"/);
    assert.match(html, /hreflang="ta"/);
    assert.match(html, /aria-live="polite"/);
    const home = fs.readFileSync(path.join(root, locale, 'index.html'), 'utf8');
    assert.ok(home.includes('/' + locale + '/calculators/bigha-to-sq-ft-calculator.html'));
  }
  for (const locale of ['en', 'hi']) {
    const html = fs.readFileSync(path.join(root, locale === 'en' ? 'calculators' : 'hi/calculators', 'bigha-to-sq-ft-calculator.html'), 'utf8');
    assert.match(html, /hreflang="bn"/);
    assert.match(html, /hreflang="ta"/);
  }
});


test('Bengali and Tamil aspect-ratio pages preserve the shared formula and reciprocal locale links', () => {
  const en = fs.readFileSync(path.join(root, 'calculators/aspect-ratio-calculator.html'), 'utf8');
  const hi = fs.readFileSync(path.join(root, 'hi/calculators/aspect-ratio-calculator.html'), 'utf8');
  for (const locale of ['bn', 'ta']) {
    const html = fs.readFileSync(path.join(root, locale, 'calculators/aspect-ratio-calculator.html'), 'utf8');
    assert.match(html, new RegExp('<html lang="' + locale + '">'));
    assert.match(html, /data-calculator="aspect-ratio"/);
    assert.match(html, /id="fcNewCalc"/);
    assert.match(html, /id="fcNewFields"/);
    assert.match(html, /id="fcNewOutput"/);
    assert.match(html, /(?:1920 × 1080|১৯২০ × ১০৮০)/);
    assert.match(html, /hreflang="en"/);
    assert.match(html, /hreflang="hi"/);
    assert.match(html, /hreflang="bn"/);
    assert.match(html, /hreflang="ta"/);
    assert.match(html, /hreflang="x-default"/);
    assert.match(html, /MutationObserver/);
    assert.ok(fs.readFileSync(path.join(root, locale, 'index.html'), 'utf8').includes('/' + locale + '/calculators/aspect-ratio-calculator.html'));
  }
  for (const html of [en, hi]) {
    assert.match(html, /hreflang="bn"/);
    assert.match(html, /hreflang="ta"/);
  }
});


test('hours-to-minutes page provides unit-consistent reference examples and valid social metadata', () => {
  const page = fs.readFileSync(path.join(root, 'calculators/hours-to-minutes-calculator.html'), 'utf8');
  assert.match(page, /Quick conversion reference/);
  assert.match(page, /<td>2 hours 30 minutes<\/td><td>150<\/td><td>2\.5<\/td>/);
  assert.match(page, /15 minutes is 0\.25 hour and 45 minutes is 0\.75 hour/);
  assert.match(page, /rel="icon" type="image\/png" href="\/favicon\.png"/);
  assert.match(page, /twitter:image" content="https:\/\/friendlycalculator\.in\/og-friendly-calculator\.png"/);
});


test('basic calculator avoids retired no-op chrome script and preserves deferred shared shell', () => {
  const page = fs.readFileSync(path.join(root, 'calculators/basic-calculator.html'), 'utf8');
  assert.equal(page.includes('/assets/site-chrome.js?v=1'), false);
  assert.ok(page.includes('<script src="/assets/site-shell.js" defer></script>'));
  assert.ok(page.includes('<link rel="stylesheet" href="/assets/site-chrome.css?v=1">'));
});

test('homepage prioritizes its visible brand illustration and uses the lean homepage shell', () => {
  const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(page.includes('loading="lazy" fetchpriority="low"'));
  assert.ok(page.includes('friendly-calculator-brand-illustration.svg'));
  assert.ok(page.includes('width="1200" height="630"'));
  assert.ok(page.includes('<script src="/assets/homepage-shell.js" defer></script>'));
  assert.ok(page.includes("link.href='/assets/site-shell.css'"));
  assert.ok(page.includes("requestIdleCallback(loadShellStyles,{timeout:1200})"));
  assert.equal(page.includes('<link rel="preload" href="/assets/site-shell.css" as="style"'), false);
});


test('key calculator pages do not load the retired no-op chrome script', () => {
  for (const relative of [
    'calculators/basic-calculator.html',
    'calculators/gst-calculator.html',
    'calculators/minutes-to-hours-calculator.html',
    'calculators/loan-emi-calculator.html'
  ]) {
    const page = fs.readFileSync(path.join(root, relative), 'utf8');
    assert.equal(page.includes('/assets/site-chrome.js?v=1'), false, relative + ' must not request the retired no-op script');
    assert.ok(page.includes('/assets/site-shell.js'), relative + ' must retain the shared site shell');
  }
});


test('directory prioritizes its visible brand illustration as the LCP image', () => {
  const page = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  assert.match(page, /friendly-calculator-brand-illustration\.svg[^>]*fetchpriority="high"/);
  assert.match(page, /width="1200" height="630"/);
});


test('homepage FAQ summary controls meet the minimum mobile touch target', () => {
  const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(page, /\.home-note details>summary\{[^}]*display:block[^}]*min-height:44px/);
});

test('directory category links use visible accessible names and readable search status text', () => {
  const page = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const quickLinks = [...page.matchAll(/<a class="quick"[^>]*>/g)].map(match => match[0]);
  assert.ok(quickLinks.length >= 16, 'Expected the category quick links');
  assert.equal(quickLinks.some(link => /aria-label=/.test(link)), false, 'Visible link text should provide the accessible name');
  assert.match(page, /#searchStatus\{[^}]*color:#4b5a6a/);
});


test('homepage search runtime validates the complete sitemap-backed deferred catalogue', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const searchIndex = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  assert.equal(searchIndex.length, expectedSearchIndexLength);
  assert.deepEqual([...new Set(searchIndex.map(item => item.url))].sort(), expectedSearchIndexUrls);
  assert.match(homepage, /!Array\.isArray\(items\)/);
  assert.match(homepage, /items\.some\(item=>!item/);
  assert.doesNotMatch(homepage, /items\.length!==\d+/);
  assert.doesNotMatch(homepage, /items\.length!==285/);
});

test('homepage stays lightweight while the full canonical calculator catalogue remains searchable and discoverable', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const searchIndexPath = path.join(root, 'assets/calculator-search-index.json');
  assert.ok(fs.existsSync(searchIndexPath), 'Deferred calculator search index must exist');
  const searchIndex = JSON.parse(fs.readFileSync(searchIndexPath, 'utf8'));

  assert.ok(Buffer.byteLength(homepage, 'utf8') < 500 * 1024, 'Homepage HTML must stay below 500 KB');
  assert.equal((homepage.match(/class=["']calculator-link["']/g) || []).length, 0,
    'The homepage must not embed the full calculator catalogue');
  assert.equal((homepage.match(/class=["']home-popular-tools["']/g) || []).length, 1);
  const popular = homepage.slice(homepage.indexOf('class="home-popular-tools"'), homepage.indexOf('</nav>', homepage.indexOf('class="home-popular-tools"')));
  assert.equal((popular.match(/<a\s/g) || []).length, 18, 'Homepage must show exactly 18 popular calculator links');

  const categoryNavStart = homepage.indexOf('<nav class="home-category-index"');
  const categoryNavEnd = homepage.indexOf('</nav>', categoryNavStart);
  assert.ok(categoryNavStart >= 0 && categoryNavEnd > categoryNavStart, 'Homepage category cards must exist');
  const categoryNav = homepage.slice(categoryNavStart, categoryNavEnd);
  const categoryLinks = [...categoryNav.matchAll(/href="\/calculator\/site-directory\.html#([^"]+)"/g)].map(match => match[1]);
  assert.equal(categoryLinks.length, 20, 'All 20 category cards must link to the full directory');
  assert.equal(new Set(categoryLinks).size, 20, 'Category card destinations must be unique');

  assert.equal(searchIndex.length, expectedSearchIndexLength);
  assert.equal(new Set(searchIndex.map(item => item.url)).size, expectedSearchIndexLength);
  for (const item of searchIndex) {
    assert.ok(item.name && item.category && (item.url.startsWith('/calculators/') || item.url === '/international/vat-calculator.html'), 'Search entries must have a name, category and valid calculator URL');
    assert.ok(fs.existsSync(path.join(root, item.url.replace(/^\//, ''))), 'Search result target must exist: ' + item.url);
  }
  assert.match(homepage, /calculator-search-index\.json/);
  assert.match(homepage, /input\.addEventListener\('input'/);
  assert.match(homepage, /function loadCatalogue\(/);
  assert.match(homepage, /loading="lazy" fetchpriority="low"/, 'Decorative homepage artwork must not compete with the initial render');

  const vm = require('node:vm');
  const scripts = [...homepage.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .filter(match => !/type=["']application\/ld\+json["']/i.test(match[0]));
  for (const [index, script] of scripts.entries()) {
    assert.doesNotThrow(() => new vm.Script(script[1]), 'Homepage inline script ' + (index + 1) + ' must parse');
  }
});

test('homepage calculator search results region has a valid accessible role', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(homepage, /id="fc-home-search-results"[^>]*role="region"[^>]*aria-label="Calculator search results"/);
});


test('static assets have safe browser cache headers and the service worker remains revalidatable', () => {
  const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
  assert.match(headers, /\/assets\/\*[\s\S]*?Cache-Control: public, max-age=86400, stale-while-revalidate=604800/);
  assert.match(headers, /\/manifest\.webmanifest[\s\S]*?Cache-Control: public, max-age=3600, stale-while-revalidate=86400/);
  assert.match(headers, /\/sw\.js[\s\S]*?Cache-Control: no-cache/);
  assert.match(headers, /\/favicon-96\.png[\s\S]*?Cache-Control: public, max-age=604800/);
  assert.match(headers, /\/favicon\.svg[\s\S]*?Cache-Control: public, max-age=604800/);
  assert.match(headers, /\/apple-touch-icon\.png[\s\S]*?Cache-Control: public, max-age=604800/);
  assert.match(headers, /Content-Security-Policy: frame-ancestors 'self'/);
});


test('homepage recent and favourite calculators remain browser-local and bounded', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const personalToolsPath = path.join(root, 'assets/homepage-personal-tools.js');
  assert.ok(fs.existsSync(personalToolsPath), 'Homepage personal tools script must exist');
  const personalTools = fs.readFileSync(personalToolsPath, 'utf8');

  assert.match(homepage, /id="fc-home-personal"/);
  assert.match(homepage, /id="fc-home-recent"/);
  assert.match(homepage, /id="fc-home-favourites"/);
  assert.match(homepage, /homepage-personal-tools\.js/);
  assert.match(homepage, /not sent to our servers|stay in this browser/i);
  assert.match(shell, /const recentKey='fc-recent-v1'/);
  assert.match(shell, /const favouriteKey='fc-favourites-v1'/);
  assert.match(shell, /recent\.slice\(0,5\)/);
  assert.match(shell, /favouriteButton\.setAttribute\('aria-pressed'/);
  assert.match(shell, /const pageItem=\{url:location\.pathname/);
  assert.match(personalTools, /slice\(0,5\)/);
  assert.match(personalTools, /fc-clear-recent/);
  const vm = require('node:vm');
  assert.doesNotThrow(() => new vm.Script(personalTools), 'Homepage personal tools script must parse');
});



test('homepage inline CSS has valid rule separation and the calculator search panel selector', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const styles = [...homepage.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]);
  assert.ok(styles.length >= 1, 'Homepage inline CSS must remain present');
  const inlineCss = styles.join('\n');
  assert.doesNotMatch(inlineCss, /\\n/, 'CSS must not contain a literal escaped newline token');
  assert.match(inlineCss, /\.home-tool-search\s*\{/, 'Homepage search panel selector must remain valid');
  assert.doesNotMatch(inlineCss, /(?:^|\n)\s*n\s+\.home-tool-search/, 'Homepage search selector must not have a stray leading n');
});



test('homepage exposes crawlable internal links to Hindi and Arabic language editions', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(homepage.includes('<h1>Make bigger decisions with better numbers.</h1>'));
  assert.ok(homepage.includes('<title>Wealth, Property &amp;amp; Free Online | Friendly Calc</title>'));
  assert.ok(homepage.includes('name="description" content="Clear calculators for wealth planning, property investment, loan EMI, GST, income tax, savings and everyday maths in India and worldwide."'));
  assert.ok(homepage.includes('property="og:title" content="Wealth, Property &amp; Free Online Calculators | Friendly Calculator"'));
  assert.ok(homepage.includes('name="twitter:title" content="Free Online Calculators India &amp; Worldwide | EMI, GST &amp; Tax"'));
  assert.ok(homepage.includes('<a href="/hi/index.html" lang="hi">हिन्दी</a>'));
  assert.ok(homepage.includes('<a href="/ar/index.html" lang="ar" dir="rtl">العربية</a>'));
  assert.ok(sitemap.includes('https://friendlycalculator.in/hi/index.html'));
  assert.ok(sitemap.includes('https://friendlycalculator.in/ar/index.html'));
});

test('Hindi and Arabic homepages cross-link the English and each other language editions', () => {
  const hindi = fs.readFileSync(path.join(root, 'hi/index.html'), 'utf8');
  const arabic = fs.readFileSync(path.join(root, 'ar/index.html'), 'utf8');
  assert.ok(hindi.includes('<a class="button secondary" href="/">English version</a>'));
  assert.ok(hindi.includes('<a class="button secondary" href="/ar/index.html" lang="ar" dir="rtl">العربية</a>'));
  assert.ok(arabic.includes('<a class="fc-locale-button alt" href="/">English</a>'));
  assert.ok(arabic.includes('<a class="fc-locale-button alt" href="/hi/index.html" lang="hi">हिन्दी</a>'));
});

test('income tax page title and heading identify the current salary-estimate tax year', () => {
  const tax = fs.readFileSync(path.join(root, 'calculators/income-tax-calculator.html'), 'utf8');
  assert.ok(tax.includes('<title>Income Tax Calculator India 2026–27 | Salary Tax Estimate</title>'));
  assert.ok(tax.includes('<h1>Income Tax Calculator India for Tax Year 2026–27</h1>'));
  assert.ok(tax.includes('name="description" content="Estimate Indian salary income tax for Tax Year 2026–27'));
});


test('RD calculator explains its end-of-month estimate and distinguishes official Post Office scheme rules', () => {
  const rd = fs.readFileSync(path.join(root, 'calculators/rd-calculator.html'), 'utf8');
  assert.ok(rd.includes('<title>RD Calculator India | Monthly Deposit &amp; Maturity Estimate</title>'));
  assert.ok(rd.includes('<h1>RD Calculator India | Monthly Deposit & Maturity Estimate</h1>'));
  assert.ok(rd.includes('This general estimate is not the official National Savings Recurring Deposit maturity table.'));
  assert.ok(rd.includes('https://www.nsiindia.gov.in/writereaddata/SchemeRules/RECURRINGDEPOSITSCHEMERule.pdf'));
  assert.ok(rd.includes('Is this the official Post Office RD maturity calculator?'));
  assert.ok(rd.includes('Math.pow(1+quarterly,1/3)-1'));
});

test('Net Worth Calculator is indexed, discoverable and calculates assets less liabilities', () => {
  const pagePath = path.join(root, 'calculators/net-worth-calculator.html');
  const scriptPath = path.join(root, 'assets/net-worth-calculator.js');
  const page = fs.readFileSync(pagePath, 'utf8');
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const finance = fs.readFileSync(path.join(root, 'calculator/finance-calculators.html'), 'utf8');
  const searchIndex = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const calculator = require(scriptPath);

  assert.ok(urls.includes('https://friendlycalculator.in/calculators/net-worth-calculator.html'));
  assert.match(page, /<title>Net Worth Calculator/);
  assert.match(page, /name="robots" content="index,follow/);
  assert.match(page, /value="INR" selected/);
  assert.match(page, /id="fc-main-content"/);
  assert.match(page, /id="net-worth-form"/);
  assert.match(directory, /href="\/calculators\/net-worth-calculator\.html"/);
  assert.match(about, /href="\/calculators\/net-worth-calculator\.html"/);
  assert.match(finance, /href="\/calculators\/net-worth-calculator\.html"/);
  assert.ok(searchIndex.some(item => item.url === '/calculators/net-worth-calculator.html'));
  assert.equal(searchIndex.length, expectedSearchIndexLength);

  const result = calculator.calculateNetWorth({
    cash: 25000, investments: 50000, otherAssets: 10000,
    homeLoan: 10000, creditCard: 10000
  });
  assert.equal(result.totalAssets, 85000);
  assert.equal(result.totalLiabilities, 20000);
  assert.equal(result.netWorth, 65000);
  assert.ok(Math.abs(result.liabilityToAssetPercent - (20000 / 85000 * 100)) < 1e-10);
  assert.throws(() => calculator.calculateNetWorth({ cash: -1 }), /non-negative/);
  assert.equal(calculator.calculateNetWorth({}).netWorth, 0);
});


test('five new informational calculators are indexed, discoverable and use bounded browser-side calculations', () => {
  const pages = {
    'medical-unit-converter': ['Medical Unit Converter', '18.0182', '38.67', 'does not interpret'],
    'dream-reflection-calculator': ['Dream Reflection Calculator', 'recall', 'vivid', 'not a validated'],
    'love-compatibility-calculator': ['Love Compatibility Calculator', 'respect', 'communication', 'not a prediction'],
    'friendship-compatibility-calculator': ['Friendship Compatibility Calculator', 'support', 'interests', 'not a scientific'],
    'goal-success-calculator': ['Goal Success Calculator', 'completed', 'planned', 'not a success prediction']
  };
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const searchIndex = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const vm = require('node:vm');

  for (const [slug, markers] of Object.entries(pages)) {
    const html = fs.readFileSync(path.join(root, 'calculators', slug + '.html'), 'utf8');
    assert.ok(html.includes('<title>' + markers[0] + ' | Friendly Calculator</title>'), slug + ' title');
    assert.match(html, /name="robots" content="index,follow/);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /type="application\/ld\+json"/);
    assert.match(html, /id="calculate|id="convert/);
    for (const marker of markers.slice(1)) assert.ok(html.toLowerCase().includes(marker.toLowerCase()), slug + ' missing marker: ' + marker);
    const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    assert.ok(inlineScripts.length >= 1, slug + ' must include its calculation logic');
    for (const script of inlineScripts) assert.doesNotThrow(() => new vm.Script(script), slug + ' script must parse');
    assert.ok(searchIndex.some(item => item.url === '/calculators/' + slug + '.html'), slug + ' must be in search index');
    assert.ok(directory.includes('href="/calculators/' + slug + '.html"'), slug + ' must be linked from directory');
    assert.ok(about.includes('href="/calculators/' + slug + '.html"'), slug + ' must be linked from About catalogue');
  }
  assert.equal(searchIndex.length, expectedSearchIndexLength);
  assert.equal(homepageCoreCalculatorCount, expectedCoreCalculatorCount);
});

 
test('high-intent finance hubs link loan, mortgage, insurance and tax collections', () => {
  const finance = fs.readFileSync(path.join(root, 'calculator/finance-calculators.html'), 'utf8');
  const insurance = fs.readFileSync(path.join(root, 'calculator/insurance-calculators.html'), 'utf8');
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  for (const marker of ['/calculators/loan-emi-calculator.html','/calculators/mortgage-calculator.html','/calculators/home-loan-eligibility-calculator.html','/calculators/insurance-premium-calculator.html','/calculator/insurance-calculators.html','/calculator/tax.html']) assert.ok(finance.includes(marker), 'finance hub missing ' + marker);
  assert.match(insurance, /Insurance Premium Calculator/);
  assert.match(insurance, /does not provide an insurance quote/i);
  assert.ok(directory.includes('/calculator/insurance-calculators.html'));
});


test('custom Stamp Duty and US 401(k) pages skip the generic calculator injector', () => {
  for (const file of ['calculators/stamp-duty-calculator.html', 'calculators/401k-calculator.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /data-fc-native-calculator/, file + ' must declare its native calculator UI');
  }
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.match(shell, /!document\.querySelector\('\[data-fc-native-calculator\]'\)/);
});

test('four chemistry batch calculators are complete and discoverable', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const routes = [
    'molality-calculator',
    'normality-calculator',
    'empirical-formula-calculator',
    'hydrogen-ion-concentration-calculator'
  ];
  for (const slug of routes) {
    const route = '/calculators/' + slug + '.html';
    const page = fs.readFileSync(path.join(root, route.slice(1)), 'utf8');
    assert.ok(page.includes('rel="canonical" href="https://friendlycalculator.in' + route + '"'));
    assert.match(page, /"@type":"SoftwareApplication"/);
    assert.match(page, /<form id="calcForm"/);
    assert.match(page, /<h2>Formula<\/h2>/);
    assert.match(page, /Assumptions and limitations/);
    assert.match(page, /aria-live="polite"/);
    assert.ok(directory.includes('href="' + route + '"'));
    assert.ok(about.includes('href="' + route + '"'));
    assert.ok(index.some(item => item.url === route));
  }
  assert.equal(index.length, expectedSearchIndexLength);
});

test('ten chemistry batch 03 calculators are present in pages, search and directory', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const slugs = [
    'avogadro-s-number-calculator',
    'molar-mass-of-gas-calculator',
    'moles-to-atoms-converter',
    'ppm-to-molarity-calculator',
    'residence-time-calculator',
    'dilution-factor-calculator',
    'henderson-hasselbalch-calculator',
    'mass-percent-calculator',
    'percentage-concentration-to-molarity-calculator',
    'ph-calculator'
  ];
  for (const slug of slugs) {
    const route = '/calculators/' + slug + '.html';
    const page = fs.readFileSync(path.join(root, route.slice(1)), 'utf8');
    assert.ok(page.includes('rel="canonical" href="https://friendlycalculator.in' + route + '"'));
    assert.match(page, /"@type":"SoftwareApplication"/);
    assert.match(page, /<form id="calcForm"/);
    assert.match(page, /<h2>Formula<\/h2>/);
    assert.match(page, /Assumptions and limitations/);
    assert.ok(directory.includes('href="' + route + '"'));
    assert.ok(about.includes('href="' + route + '"'));
    assert.ok(index.some(item => item.url === route));
  }
  assert.equal(index.length, expectedSearchIndexLength);
  assert.ok(directory.includes('<strong>' + biologyChemistryCount + ' tools</strong>'));
  assert.ok(about.includes(expectedCoreCalculatorCount + ' public calculators'));
});

test('ten chemistry batch 04 calculators are present in pages, search and directory', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const slugs = [
    'electronegativity-difference-calculator',
    'percent-ionic-character-calculator',
    'pka-calculator',
    'alligation-calculator',
    'concentration-calculator',
    'mixing-ratio-calculator',
    'raoults-law-calculator',
    'actual-yield-calculator',
    'activation-energy-calculator',
    'boiling-point-elevation-calculator'
  ];
  for (const slug of slugs) {
    const route = '/calculators/' + slug + '.html';
    const page = fs.readFileSync(path.join(root, route.slice(1)), 'utf8');
    assert.ok(page.includes('rel="canonical" href="https://friendlycalculator.in' + route + '"'));
    assert.match(page, /"@type":"SoftwareApplication"/);
    assert.match(page, /<form id="calcForm"/);
    assert.match(page, /<h2>Formula<\/h2>/);
    assert.match(page, /Assumptions and limitations/);
    assert.ok(directory.includes('href="' + route + '"'));
    assert.ok(about.includes('href="' + route + '"'));
    assert.ok(index.some(item => item.url === route));
  }
  assert.equal(index.length, expectedSearchIndexLength);
  assert.ok(directory.includes('<strong>' + biologyChemistryCount + ' tools</strong>'));
  assert.ok(about.includes(expectedCoreCalculatorCount + ' public calculators'));
});

test('ten chemistry batch 05 calculators are present in pages, search and directory', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const slugs = [
    'afr-calculator-air-fuel-ratio',
    'molecular-weight-calculator',
    'activity-coefficient-calculator',
    'buffer-capacity-calculator',
    'neutralization-calculator',
    'percent-solution-calculator',
    'solution-dilution-calculator',
    'titration-calculator',
    'water-hardness-calculator',
    'theoretical-yield-calculator'
  ];
  for (const slug of slugs) {
    const route = '/calculators/' + slug + '.html';
    const page = fs.readFileSync(path.join(root, route.slice(1)), 'utf8');
    assert.ok(page.includes('rel="canonical" href="https://friendlycalculator.in' + route + '"'));
    assert.match(page, /"@type":"SoftwareApplication"/);
    assert.match(page, /<form id="calcForm"/);
    assert.match(page, /<h2>Formula<\/h2>/);
    assert.match(page, /Assumptions and limitations/);
    assert.ok(directory.includes('href="' + route + '"'));
    assert.ok(about.includes('href="' + route + '"'));
    assert.ok(index.some(item => item.url === route));
  }
  assert.equal(index.length, expectedSearchIndexLength);
  assert.ok(directory.includes('<strong>' + biologyChemistryCount + ' tools</strong>'));
  assert.ok(about.includes(expectedCoreCalculatorCount + ' public calculators'));
});

test('ten chemistry batch 06 calculators are present in pages, search and directory', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const slugs = [
    'equilibrium-constant-calculator',
    'kp-calculator',
    'molar-ratio-calculator',
    'rate-constant-calculator',
    'reaction-quotient-calculator',
    'entropy-calculator',
    'freezing-point-depression-calculator',
    'gibbs-free-energy-calculator',
    'gibbs-phase-rule-calculator',
    'q10-calculator'
  ];
  for (const slug of slugs) {
    const route = '/calculators/' + slug + '.html';
    const page = fs.readFileSync(path.join(root, route.slice(1)), 'utf8');
    assert.ok(page.includes('rel="canonical" href="https://friendlycalculator.in' + route + '"'));
    assert.match(page, /"@type":"SoftwareApplication"/);
    assert.match(page, /<form id="calcForm"/);
    assert.match(page, /<h2>Formula<\/h2>/);
    assert.match(page, /Assumptions and limitations/);
    assert.ok(directory.includes('href="' + route + '"'));
    assert.ok(about.includes('href="' + route + '"'));
    assert.ok(index.some(item => item.url === route));
  }
  assert.equal(index.length, expectedSearchIndexLength);
  assert.ok(directory.includes('<strong>' + biologyChemistryCount + ' tools</strong>'));
  assert.ok(about.includes(expectedCoreCalculatorCount + ' public calculators'));
});

test('ten chemistry batch 07 calculators are present in pages, search and directory', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const slugs = [
    'stp-calculator-standard-temperature-and-pressure',
    'partial-pressure-calculator',
    'vapor-pressure-calculator',
    'vapor-pressure-of-water-calculator',
    'boiling-point-calculator',
    'boiling-point-at-altitude-calculator',
    'heat-of-combustion-calculator',
    'osmotic-pressure-calculator',
    'ionic-strength-calculator',
    'diffusion-coefficient-calculator'
  ];
  for (const slug of slugs) {
    const route = '/calculators/' + slug + '.html';
    const page = fs.readFileSync(path.join(root, route.slice(1)), 'utf8');
    assert.ok(page.includes('rel="canonical" href="https://friendlycalculator.in' + route + '"'));
    assert.match(page, /"@type":"SoftwareApplication"/);
    assert.match(page, /<form id="calcForm"/);
    assert.match(page, /<h2>Formula<\/h2>/);
    assert.match(page, /Assumptions and limitations/);
    assert.ok(directory.includes('href="' + route + '"'));
    assert.ok(about.includes('href="' + route + '"'));
    assert.ok(index.some(item => item.url === route));
  }
  assert.equal(index.length, expectedSearchIndexLength);
  assert.ok(directory.includes('<strong>' + biologyChemistryCount + ' tools</strong>'));
  assert.ok(about.includes(expectedCoreCalculatorCount + ' public calculators'));
});

test('ten chemistry batch 08 calculators are present in pages, search and directory', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const slugs = [
    'electronegativity-calculator',
    'cell-emf-calculator-electromotive-force-of-a-cell',
    'nernst-equation-calculator',
    'rate-of-effusion-calculator',
    'half-life-calculator',
    'arrhenius-equation-calculator',
    'langmuir-isotherm-calculator',
    'young-laplace-equation-calculator',
    'radioactive-decay-calculator',
    'chemical-oxygen-demand-calculator'
  ];
  for (const slug of slugs) {
    const route = '/calculators/' + slug + '.html';
    const page = fs.readFileSync(path.join(root, route.slice(1)), 'utf8');
    assert.ok(page.includes('rel="canonical" href="https://friendlycalculator.in' + route + '"'));
    assert.match(page, /"@type":"SoftwareApplication"/);
    assert.match(page, /<form id="calcForm"/);
    assert.match(page, /<h2>Formula<\/h2>/);
    assert.match(page, /Assumptions and limitations/);
    assert.ok(directory.includes('href="' + route + '"'));
    assert.ok(about.includes('href="' + route + '"'));
    assert.ok(index.some(item => item.url === route));
  }
  assert.equal(index.length, expectedSearchIndexLength);
  assert.ok(directory.includes('<strong>' + biologyChemistryCount + ' tools</strong>'));
  assert.ok(about.includes(expectedCoreCalculatorCount + ' public calculators'));
});

test('ten chemistry batch 09 calculators are present in pages, search and directory', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const slugs = [
    'saponification-value-calculator',
    'degree-of-unsaturation-calculator',
    'radiocarbon-dating-calculator-carbon-14-dating',
    'calibration-curve-calculator',
    'enzyme-activity-calculator',
    'isoelectric-point-calculator',
    'michaelis-menten-equation-calculator',
    'beer-lambert-law-calculator',
    'crude-protein-calculator',
    'cubic-cell-calculator'
  ];
  for (const slug of slugs) {
    const route = '/calculators/' + slug + '.html';
    const page = fs.readFileSync(path.join(root, route.slice(1)), 'utf8');
    assert.ok(page.includes('rel="canonical" href="https://friendlycalculator.in' + route + '"'));
    assert.match(page, /"@type":"SoftwareApplication"/);
    assert.match(page, /<form id="calcForm"/);
    assert.match(page, /<h2>Formula<\/h2>/);
    assert.match(page, /Assumptions and limitations/);
    assert.ok(directory.includes('href="' + route + '"'));
    assert.ok(about.includes('href="' + route + '"'));
    assert.ok(index.some(item => item.url === route));
  }
  assert.equal(index.length, expectedSearchIndexLength);
  assert.ok(directory.includes('<strong>' + biologyChemistryCount + ' tools</strong>'));
  assert.ok(about.includes(expectedCoreCalculatorCount + ' public calculators'));
});

test('seven chemistry batch 10 calculators are present in pages, search and directory', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const slugs = [
    'effective-nuclear-charge-calculator',
    'electron-configuration-calculator',
    'electrolysis-calculator',
    'lattice-energy-calculator',
    'combustion-analysis-calculator',
    'combustion-reaction-calculator',
    'miller-indices-calculator'
  ];
  for (const slug of slugs) {
    const route = '/calculators/' + slug + '.html';
    const page = fs.readFileSync(path.join(root, route.slice(1)), 'utf8');
    assert.ok(page.includes('rel="canonical" href="https://friendlycalculator.in' + route + '"'));
    assert.match(page, /"@type":"SoftwareApplication"/);
    assert.match(page, /<form id="calcForm"/);
    assert.match(page, /<h2>Formula<\/h2>/);
    assert.match(page, /Assumptions and limitations/);
    assert.ok(directory.includes('href="' + route + '"'));
    assert.ok(about.includes('href="' + route + '"'));
    assert.ok(index.some(item => item.url === route));
  }
  assert.equal(index.length, expectedSearchIndexLength);
  assert.ok(directory.includes('<strong>' + biologyChemistryCount + ' tools</strong>'));
  assert.ok(about.includes(expectedCoreCalculatorCount + ' public calculators'));
});


test('three remaining safe chemistry calculators are present in pages, search and directory',()=>{
 const directory=fs.readFileSync(path.join(root,'calculator/site-directory.html'),'utf8');
 const about=fs.readFileSync(path.join(root,'calculator/about.html'),'utf8');
 const index=JSON.parse(fs.readFileSync(path.join(root,'assets/calculator-search-index.json'),'utf8'));
 const slugs=['atom-calculator','chemical-equation-balancer','percent-yield-calculator'];
 for(const slug of slugs){const route='/calculators/'+slug+'.html';const page=fs.readFileSync(path.join(root,route.slice(1)),'utf8');assert.ok(page.includes('rel="canonical" href="https://friendlycalculator.in'+route+'"'));assert.match(page,/"@type":"SoftwareApplication"/);assert.match(page,/<form id="calcForm"/);assert.match(page,/<h2>Formula<\/h2>/);assert.match(page,/Assumptions and limitations/);assert.ok(directory.includes('href="'+route+'"'));assert.ok(about.includes('href="'+route+'"'));assert.ok(index.some(item=>item.url===route));}
 assert.equal(index.length, expectedSearchIndexLength);
 assert.ok(directory.includes('<strong>' + biologyChemistryCount + ' tools</strong>'));
 assert.ok(about.includes(expectedCoreCalculatorCount + ' public calculators'));
});


test('remaining chemistry calculator formulas return expected results',()=>{
 const chemistry=global.FriendlyChemistryCalculators;
 assert.ok(chemistry);
 const atom=Object.fromEntries(chemistry.atom({atomicNumber:8,massNumber:16,charge:0}));
 assert.equal(atom.Protons,'8');assert.equal(atom.Neutrons,'8');assert.equal(atom.Electrons,'8');
 const yieldRows=Object.fromEntries(chemistry.percentYield({actual:8.5,theoretical:10}));
 assert.match(yieldRows['Percent yield'],/^85/);
 const balanced=Object.fromEntries(chemistry.balanceEquation({equation:'Fe + O2 -> Fe2O3'}));
 assert.equal(balanced['Balanced equation'],'4 Fe + 3 O2 → 2 Fe2O3');
 const grouped=Object.fromEntries(chemistry.balanceEquation({equation:'Al + HCl -> AlCl3 + H2'}));
 assert.equal(grouped['Balanced equation'],'2 Al + 6 HCl → 2 AlCl3 + 3 H2');
 assert.throws(()=>chemistry.atom({atomicNumber:8,massNumber:7,charge:0}),/Mass number/);
 assert.throws(()=>chemistry.percentYield({actual:2,theoretical:0}),/positive/);
});


test('homepage shows 24 popular calculators as responsive thumbnail-led rows', () => {
  const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const start = page.indexOf('<section class="home-learning home-popular-worldwide"');
  const end = page.indexOf('<nav class="home-category-index"', start);
  assert.ok(start >= 0 && end > start, 'popular calculator section exists');
  const section = page.slice(start, end);
  const routes = [...section.matchAll(/class="home-popular-item" href="([^"]+)"/g)].map(match => match[1]);
  assert.equal(routes.length, 24);
  assert.equal(new Set(routes).size, 24);
  for (const route of routes) assert.ok(index.some(item => item.url === route), 'popular route is indexed: ' + route);
  assert.match(page, /\.home-popular-list/);
  assert.match(page, /\.home-popular-icon/);
  assert.match(page, /\.home-popular-item/);
  assert.doesNotMatch(section, /bmi-calculator\.html/i);
});


test('homepage keeps critical header CSS inline and defers the shared shell stylesheet', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /link\.rel='stylesheet'[\s\S]*link\.href='\/assets\/site-shell\.css'/);
  assert.match(html, /requestIdleCallback\(loadShellStyles,\{timeout:1200\}\)/);
  assert.match(html, /<noscript><link rel="stylesheet" href="\/assets\/site-shell\.css"><\/noscript>/);
  assert.doesNotMatch(html, /<link rel="preload" href="\/assets\/site-shell\.css"/);
  assert.match(html, /\.fc-global-header\{/);
  assert.ok(html.includes('src="/assets/homepage-shell.js" defer'));
  assert.match(html, /src="\/assets\/site-shell\.js" defer/);
});

test('Settings trigger is the final Footer item; regional preferences follow Language and are mirrored in Settings', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'assets/site-shell.css'), 'utf8');
  assert.ok(shell.includes("panel.setAttribute('role','dialog')"));
  assert.ok(shell.includes("panel.setAttribute('aria-modal','true')"));
  assert.ok(shell.includes("closeTop.className='fc-display-close-top'") && shell.includes('panelHead.append(heading,closeTop)'));
  assert.ok(shell.includes("backdrop.className='fc-display-backdrop'"));
  assert.ok(shell.includes("panel.append(status,close)"), 'Settings panel must end with status and a visible Close button only.');
  assert.ok(!shell.includes("save.textContent=t.save") && !shell.includes("reset.textContent=t.reset") && !shell.includes("actionRow"), 'Settings must not render empty Save/Reset controls.');
  assert.ok(shell.includes("panel.scrollTop=0") && shell.includes("closeTop.focus({preventScroll:true})"), 'Settings must open at the top without focus-driven scrolling.');
  assert.ok(shell.includes("removeDuplicateLegacyHeaders") && shell.includes("nav[aria-label=\"Main navigation\"]"), 'Only the shared navigation header may remain.');
  assert.ok(shell.includes("(activeHeader.querySelector('.fc-top-row')||activeHeader.querySelector('.fc-global-nav'))?.insertBefore(toggle,primaryNav)"), 'Mobile Menu toggle must sit in the shared top row.');
  assert.ok(shell.includes("defaultLocaleSettings") && shell.includes("window.FCLocale?.getCurrency()"));
  assert.ok(shell.includes("countryFormatSelect") && shell.includes("Object.entries(localeNames)"));
  assert.ok(shell.includes("+'<span class=\"fc-header-language-slot\">'+languageControl+'</span></nav>"), 'Language must remain inside the shared Header after Login.');
  assert.ok(shell.includes("themeModes.append(normalModeButton,darkModeButton)"), 'Accessibility must offer Normal Mode and Dark Mode.');
  assert.ok(!shell.includes("contrastButton") && !shell.includes("sizeLabel") && !shell.includes("motionButton"));
  assert.ok(shell.includes('footerNavigation.appendChild(trigger)'), 'Settings must be the final Footer navigation item.');
  assert.ok(shell.includes('fc-settings-site-controls') && shell.includes('mirrorSiteControl') && shell.includes('mirrorSiteControl(currencyControl,regionalSettingsControls)') && shell.includes('mirrorSiteControl(countryFormatLabel,regionalSettingsControls)') && shell.includes('mirrorSiteControl(unitControl,regionalSettingsControls)'), 'Settings must mirror all regional Header preferences and Language.');
  assert.ok(!shell.includes('dock.appendChild(trigger)'), 'Settings must not remain in a floating dock.');
  assert.ok(shell.includes("'fc-footer-settings-link'"), 'Footer Settings must use the shared Footer link styling.');
  assert.ok(shell.includes("legacyFooters=Array.from(document.querySelectorAll('footer:not(.fc-global-footer)'))"), 'Legacy plain footers must be normalized rather than duplicated.');
  assert.ok(shell.includes("collectLinks(oldFooter);oldFooter.remove();"), 'Existing footer links must be preserved when duplicate legacy footers are consolidated.');
  assert.ok(shell.includes("document.querySelectorAll('footer.fc-global-footer').forEach((duplicate,index)=>"), 'Only one shared footer may remain.');
  assert.ok(shell.includes("if(!label)button.remove();"), 'Stale blank buttons must be removed from the Settings panel.');
  assert.ok(shell.includes("themeModes.append(normalModeButton,darkModeButton)"), 'Only the two labeled Normal Mode and Dark Mode controls belong in Accessibility.');
  assert.ok(css.includes('footer.fc-global-footer .fc-global-footer-links>#fc-display-settings.fc-footer-settings-link'), 'Footer Settings must be styled like the other Footer links.');
  assert.ok(css.includes('.fc-settings-site-controls{display:grid'), 'Site Settings controls must have a responsive grid layout.');
  assert.ok(css.includes('.fc-theme-mode-options') && css.includes('fc-display-backdrop') && css.includes('width:min(380px,calc(100vw - 24px))'));
  assert.ok(css.includes('.fc-top-row>.fc-language-control{') && css.includes('grid-row:2!important'), 'Mobile Language selector must occupy its own row below the brand.');
  assert.ok(css.includes('#fc-floating-tools{z-index:9990!important}') && css.includes('#fc-ai-panel{z-index:10020!important}'), 'Assistant layering remains intact.');
});

test('homepage uses the shared PWA install action and preserves language, analytics and accessibility controls', () => {
  const script = fs.readFileSync(path.join(root, 'assets/homepage-shell.js'), 'utf8');
  const shared = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.ok(!script.includes("id='fc-pwa-install'") && !script.includes('id="fc-pwa-install"'), 'Homepage must not create its own floating install button.');
  assert.ok(shared.includes('quickActions.appendChild(installButton)'), 'The shared shell must place the install action inside Settings Quick Actions.');
  assert.ok(!shared.includes('footerInner.appendChild(button)'), 'The install action must not be mounted in the Footer.');
  assert.ok(shared.includes("position:static!important"), 'The install action must not float over page content.');
  for (const feature of ['fc-language-select', 'gtm.js', 'fc-display-settings', 'fc-ai-lazy-launch', 'fc-skip-link']) {
    assert.ok(script.includes(feature), 'Missing homepage feature: ' + feature);
  }
  assert.ok(shared.includes('serviceWorker.register'), 'The shared shell must retain service-worker registration.');
});


test('English homepage always renders the shared footer and Sitemap link', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'assets/homepage-shell.js'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.html'), 'utf8');
  assert.match(html, /<header class="fc-global-header">/);
  assert.ok(html.includes('src="/assets/homepage-shell.js" defer'));
  assert.ok(script.includes("document.createElement('footer')"));
  assert.ok(script.includes("footer.className = 'fc-global-footer'"));
  assert.ok(script.includes("['Sitemap', '/sitemap.html']"));
  assert.ok(script.includes("document.body.appendChild(footer)"));
  assert.ok(script.includes('homepageFooterNavigation.appendChild(homepageSettingsTrigger)'), 'Homepage fallback Settings trigger must be the final Footer navigation item.');
  assert.ok(sitemap.includes('src="/assets/site-shell.js"'));
  assert.ok(sitemap.includes('id="sitemap-title"'));
});


test('shared header and footer fail-safe normalizes legacy navigation and nested footers', () => {
  const script = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const firstEnhancement = script.indexOf('const ensureFavicon');
  const fallback = script.indexOf('fc-shell-failsafe');
  assert.ok(fallback > 0 && fallback < firstEnhancement, 'Site chrome fallback must run before optional enhancements');
  assert.ok(script.includes("['Sitemap','/sitemap.html']"), 'Fallback Footer must link to Sitemap.');
  assert.ok(!script.slice(script.indexOf("header.innerHTML ="),script.indexOf('document.body.prepend(header)')).includes('Sitemap'), 'Sitemap must remain out of the Header.');
  assert.ok(script.includes('aria-label="Footer navigation"'), 'Fallback footer must have accessible navigation');
  assert.ok(script.includes("document.body.prepend(header)"), 'Fallback header must be inserted before page content');
  assert.ok(script.includes("removeDuplicateLegacyHeaders"), 'Legacy navigation headers must be removed before rendering the shared header.');
  assert.ok(script.includes('.site-brand,.site-nav,.site-nav-wrap,.site-links,.nav'), 'All legacy navigation header patterns must be recognized.');
  assert.ok(script.includes("document.querySelectorAll('footer').forEach(oldFooter=>oldFooter.remove());"), 'Nested and duplicate footers must all be removed.');
  assert.ok(script.includes('document.body.appendChild(f);'), 'Exactly one canonical footer must be appended directly to body.');
  assert.ok(script.includes('preservedFooterLinks.forEach(link=>'), 'Useful legacy footer links must be preserved in the canonical footer.');
  assert.ok(script.includes('quickActions.appendChild(installButton)'), 'The Install action must remain inside Settings Quick Actions.');
});

test('shared Footer keeps social destinations in one icon row and hides redundant theme status visually', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'assets/site-shell.css'), 'utf8');
  assert.ok(shell.includes('const isFooterSocialLink=link=>'), 'Legacy social links must be identified before they are merged into Footer navigation.');
  assert.ok(shell.includes('!isFooterSocialLink(link)'), 'Instagram, LinkedIn and email links must not be duplicated as text navigation items.');
  assert.ok(shell.includes('class="fc-social-links"'), 'The shared Footer must retain its dedicated social icon row.');
  assert.ok(shell.includes('aria-atomic'), 'Theme status must remain available to assistive technology.');
  assert.ok(css.includes('body>.fc-display-panel .fc-display-status'), 'The redundant theme status line must be visually hidden in Settings.');
  assert.ok(css.includes('clip-path:inset(50%)'), 'The hidden status must use an accessible visually-hidden treatment.');
});


test('Settings regional controls use consistent readable typography', () => {
  const css = fs.readFileSync(path.join(root, 'assets/site-shell.css'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.ok(css.includes('.fc-settings-site-controls select') && css.includes('min-height:40px'), 'Settings regional controls must retain readable touch-target sizing.');
  assert.match(shell, /regionalMarkup\.innerHTML=currencyControl\+countryControl\+unitControl/);
  assert.match(shell, /regionalSettingsControls\.append\(currencyControl,countryFormatLabel,unitControl\)/);
  assert.doesNotMatch(shell, /addSettingRow\('fc-display-units-row'/);
});

test('legacy All Pages footer links are excluded while Sitemap remains', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.match(shell, /isFooterDirectoryLink=link=>/);
  assert.match(shell, /!isFooterDirectoryLink\(link\)/);
  assert.ok(shell.includes("['Sitemap','/sitemap.html']"));
  assert.doesNotMatch(shell, /'All Pages Directory'/);
  assert.doesNotMatch(shell, /'सभी पेज'/);
});

test('Open Assistant stays lazy-loaded as a live on-page action outside Settings', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.match(shell, /document\.body\.appendChild\(launcher\)/);
  assert.match(shell, /document\.querySelector\('#fc-ai-launch'\)\?\.click\(\)/);
  assert.match(shell, /const assistantLauncher=document\.getElementById\('fc-ai-lazy-launch'\)/);
  assert.doesNotMatch(shell, /quickActions\.appendChild\(assistantLauncher\)/);
  const styles = fs.readFileSync(path.join(root, 'assets/site-shell.css'), 'utf8');
  assert.match(styles, /#fc-ai-lazy-launch\{position:fixed;right:16px;bottom:18px/);
});


test('all localized legacy page-directory footer links are filtered by path and label', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.match(shell, /site-directory\|page-directory\|directory/);
  assert.match(shell, /verzeichnis\|seitenverzeichnis/);
  assert.match(shell, /فهرس الصفحات/);
  assert.doesNotMatch(shell, /'Startseite','Verzeichnis'/);
  assert.doesNotMatch(shell, /'الرئيسية','الدليل'/);
  assert.ok(shell.includes("['Sitemap','/sitemap.html']"));
});


test('shared shell visually replaces legacy page-level headers and footers', () => {
  const script = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.ok(script.includes('body > header:not(.fc-global-header)'));
  assert.ok(script.includes('body > .top'));
  assert.ok(script.includes('body > footer:not(.fc-global-footer)'));
  assert.ok(script.includes('node.hidden = true'));
  assert.ok(script.includes("node.setAttribute('aria-hidden', 'true')"));
  assert.ok(script.includes('const hasPageContent = !!node.querySelector'));
  assert.ok(script.includes('navNodes.forEach'), 'Only legacy navigation should be hidden when the header also contains page content');
  assert.match(script, /fc-global-footer-links/);
});

test('homepage has the same static shared footer and Sitemap destination', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<footer class="fc-global-footer"(?:\s|>)/);
  assert.ok(html.includes('href="/sitemap.html">Sitemap</a>'));
  assert.ok(html.includes('class="fc-global-footer-links"'));
});


test('homepage critical CSS keeps the shared regional Header readable before deferred styles load', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const styleStart = html.indexOf('<style id="fc-critical-home-shell">');
  const styleEnd = html.indexOf('</style>', styleStart);
  const critical = styleStart >= 0 && styleEnd > styleStart ? html.slice(styleStart, styleEnd) : '';
  assert.ok(critical.includes('.fc-top-row{width:min(1440px,96%);min-height:70px;margin:auto;display:flex'));
  assert.ok(css.includes('.fc-global-links>.fc-header-language-slot{display:contents!important;}') && css.includes('.fc-global-links>.fc-header-language-slot>.fc-language-control select') && css.includes('.fc-global-links>.fc-currency-control select') && css.includes('.fc-global-links>.fc-country-format-control select') && css.includes('.fc-global-links>.fc-unit-control select') && css.includes('height:40px!important') && css.includes('width:100%!important'), 'All Header dropdowns must share the same width and height.');
  assert.ok(critical.includes('.fc-global-links .fc-currency-control'));
  assert.ok(critical.includes('.fc-global-links .fc-country-format-control'));
  assert.ok(critical.includes('.fc-global-links .fc-unit-control'));
  assert.ok(critical.includes('@media(max-width:760px)') && critical.includes('.fc-global-links.fc-nav-open'));
});
