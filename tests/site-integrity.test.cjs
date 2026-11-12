const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(https:\/\/friendlycalculator\.in[^<]*)<\/loc>/g)].map(m => m[1]);

function localFile(url, baseFile = 'index.html') {
  const parsed = new URL(url, 'https://friendlycalculator.in/' + baseFile);
  if (parsed.origin !== 'https://friendlycalculator.in') return null;
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';
  let target = path.join(root, pathname.replace(/^\/+/, ''));
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  return target;
}

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
test('every public sitemap page loads the shared site header and footer shell', () => {
  const failures = [];
  for (const url of urls) {
    const file = localFile(url);
    if (!file || !fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('/assets/site-shell.js')) failures.push(url + ' (shared shell script)');
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
    for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
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

 
test('the shared top navigation exposes the preserved Admin Dashboard exactly once', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.ok(shell.includes("['Admin',r+'admin.html']"));
  assert.equal((shell.match(/\['Admin',r\+'admin\.html'\]/g) || []).length, 1);
  assert.ok(fs.existsSync(path.join(root, 'calculator/admin.html')), 'Admin dashboard page must remain preserved');
  const dashboard = fs.readFileSync(path.join(root, 'calculator/admin.html'), 'utf8');
  assert.match(dashboard, /app_metadata\?\.role!==['"]admin['"]/);
});

test('About page catalogue matches every published calculator page', () => {
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const calculatorPages = fs.readdirSync(path.join(root, 'calculators')).filter(name => name.endsWith('.html')).sort();
  const countMatch = about.match(/Available calculators \(\d+ tools\)/);
  assert.ok(countMatch, 'About page must publish the calculator catalogue count');
  assert.ok(about.includes('Available calculators (' + calculatorPages.length + ' tools)'));
  const linkedPages = [...about.matchAll(/<li><a href="\/calculators\/([^"]+)">/g)].map(match => match[1]).sort();
  assert.deepEqual(linkedPages, calculatorPages, 'About page must link each published calculator exactly once');
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

test('calculator directory matches the sitemap and keeps business services separate', () => {
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const sitemapCalculatorUrls = urls.filter(url => new URL(url).pathname.startsWith('/calculators/'));
  const directoryCalculatorUrls = [...directory.matchAll(/href="\/calculators\/([^"]+)"/g)].map(m => 'https://friendlycalculator.in/calculators/' + m[1]);
  assert.equal(new Set(directoryCalculatorUrls).size, directoryCalculatorUrls.length, 'Directory calculator links must be unique');
  assert.deepEqual([...directoryCalculatorUrls].sort(), sitemapCalculatorUrls.sort(), 'Directory and sitemap calculator catalogues must match');
  const services = directory.indexOf('<h2>Business & developer services</h2>');
  const trust = directory.indexOf('<h2>About, trust & policies</h2>');
  assert.ok(services > directory.indexOf('<h2>Date, time and work calculators</h2>'), 'Business services should follow calculator categories');
  assert.ok(services < trust, 'Business services should appear before trust and policy links');
  const section = directory.slice(services, directory.indexOf('</section>', services));
  assert.equal((section.match(/class="card"/g) || []).length, 4, 'Business services section should contain only four service links');
  assert.ok(!directory.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'), 'Directory should not load an ad script without an ad unit');
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
  assert.equal(shell.split('src="/assets/friendly-calculator-logo.svg"').length - 1, 2);
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

test('homepage uses the same navy brand color as the shared site shell', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(homepage.includes('--fc-blue:#101c2c;--fc-blue-dark:#20364e;'));
  assert.ok(homepage.includes('name="theme-color" content="#101c2c"'));
});


test('language switch only navigates to calculator translations that exist', () => {
  const shell = fs.readFileSync(new URL('../assets/site-shell.js', 'file://' + __filename), 'utf8');
  assert.match(shell, /translatedSlugsByLocale/);
  assert.match(shell, /translatedSlugsByLocale\[next\]\?\.has\(calcMatch\[1\]\)/);
  assert.match(shell, /if\(notice\)/);
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


test('language switcher covers every calculator page that exists in each locale', () => {
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const readList = name => {
    const match = shell.match(new RegExp('const ' + name + '=\\[([^\\]]*)\\]'));
    assert.ok(match, 'Expected ' + name + ' in shared language switcher');
    return [...match[1].matchAll(/'([^']+)'/g)].map(item => item[1]);
  };
  const shared = readList('sharedTranslatedSlugs');
  const hindiOnly = readList('hindiOnlySlugs');
  const otherOnly = readList('otherLocaleOnlySlugs');
  const expected = {
    en: [...shared, ...hindiOnly, ...otherOnly],
    hi: [...shared, ...hindiOnly],
    es: [...shared, ...otherOnly],
    fr: [...shared, ...otherOnly],
    pt: [...shared, ...otherOnly],
    ar: [...shared, ...otherOnly],
    id: [...shared, ...otherOnly],
    bn: [...shared, ...otherOnly],
    ta: [...shared, ...otherOnly]
  };
  for (const [locale, slugs] of Object.entries(expected)) {
    const directory = path.join(root, locale === 'en' ? 'calculators' : path.join(locale, 'calculators'));
    const actual = new Set(fs.readdirSync(directory).filter(file => file.endsWith('.html')));
    for (const slug of new Set(slugs)) {
      assert.ok(actual.has(slug), locale + ' language-switcher points to a missing calculator: ' + slug);
    }
    if (locale !== 'en') {
      assert.deepEqual([...new Set(slugs)].sort(), [...actual].sort(), locale + ' allowlist must include every translated calculator file');
    }
  }
});

test('every public sitemap page has a valid favicon reference and matching asset MIME type', () => {
  const failures = [];
  const shellJs = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const shellNormalizesFavicons = shellJs.includes('ensureFavicon') &&
    shellJs.includes("link.href='/favicon-96.png'") &&
    shellJs.includes("icon.type='image/png'") &&
    shellJs.includes("icon.type='image/svg+xml'");
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
