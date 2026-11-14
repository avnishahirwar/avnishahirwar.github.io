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
  assert.match(about, /Platform:<\/strong> 219 public calculators/);
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


test('language switch checks the selected locale calculator file before navigating', () => {
  const shell = fs.readFileSync(new URL('../assets/site-shell.js', 'file://' + __filename), 'utf8');
  assert.match(shell, /fetch\(target,\{method:'HEAD',cache:'no-store'\}\)/);
  assert.match(shell, /if\(response\.ok\)\{location\.href=target/);
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
  assert.ok(shell.includes("fetch(target,{method:'HEAD',cache:'no-store'})"));
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
  const script=fs.readFileSync(path.join(root,'assets/unit-converter-localized.js'),'utf8');
  for(const formula of ['.0254','.45359237','3.785411784','(n-32)*5/9','x*9/5+32'])assert.ok(script.includes(formula),'Missing conversion constant/formula: '+formula);
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
test('homepage, directory, About and sitemap agree on the public calculator catalogue', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  const uniqueCalculatorLinks = html => new Set([...html.matchAll(/href=["'](\/calculators\/[^"'#]+)["']/g)].map(m => m[1]));
  const homepageLinks = uniqueCalculatorLinks(homepage);
  const directoryLinks = uniqueCalculatorLinks(directory);
  const sitemapCalculatorUrls = urls.filter(url => /^https:\/\/friendlycalculator\.in\/calculators\//.test(url));
  const navStart = homepage.indexOf('<nav class="home-category-index"');
  const navEnd = homepage.indexOf('</nav>', navStart);
  const nav = homepage.slice(navStart, navEnd);
  const navCategoryCount = (nav.match(/<a href="#home-/g) || []).length;
  const navCalculatorTotal = [...nav.matchAll(/<span>(\d+) calculators<\/span>/g)].reduce((sum, match) => sum + Number(match[1]), 0);
  const categoryCount = (directory.match(/<section class="section calculator-category"/g) || []).length;
  assert.equal(homepageLinks.size, 219, 'Homepage must link to every unique calculator');
  assert.equal(directoryLinks.size, homepageLinks.size, 'Directory and homepage calculator sets must match in size');
  assert.equal(new Set(sitemapCalculatorUrls).size, homepageLinks.size, 'Sitemap and homepage calculator counts must match');
  assert.doesNotMatch(homepage, /class="search-panel"/, 'Homepage must not contain the calculator search panel');
  assert.match(shell, /\[nav\.all,r\+'site-directory\.html'\]/, 'Global header must link to the All Calculators directory');
  assert.match(shell, /\[nav\.search\|\|'Search Calculator',r\+'site-directory\.html#siteSearch'\]/, 'Global header must retain a localized direct Search Calculator link');
  assert.match(directory, /id="siteSearch"/, 'Directory must retain the calculator search input');
  assert.match(directory, /Browse all 219 calculator tools/);
  assert.match(directory, /Search 219 calculators by name or topic/);
  assert.match(directory, /Showing all 219 calculators in 14 categories/);
  assert.equal(categoryCount, 14, 'Directory must show all 14 calculator categories');
  assert.equal(navCategoryCount, 14, 'Homepage shortcuts must expose all 14 categories');
  assert.equal(navCalculatorTotal, 219, 'Homepage category shortcuts must account for every calculator');
  assert.ok(homepage.includes('/calculators/stamp-duty-calculator.html'));
  assert.ok(homepage.includes('/calculators/bigha-to-sq-ft-calculator.html'));
  assert.ok(directory.includes('/calculator/agriculture-calculators.html'));
  assert.ok(sitemap.includes('/calculator/agriculture-calculators.html'));
  assert.match(about, /219 public calculators/);
  assert.doesNotMatch(homepage + directory, /186 calculators|186 calculator tools|Search 186 calculators|Showing all 186 calculators|198 calculators|198 calculator tools/);
});

test('Cookie Policy is discoverable from Privacy, excluded from analytics and keeps the approved seven-link footer', () => {
  const privacy = fs.readFileSync(path.join(root, 'calculator/privacy.html'), 'utf8');
  const cookies = fs.readFileSync(path.join(root, 'calculator/cookies.html'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'assets/site-shell.js'), 'utf8');
  assert.ok(privacy.includes('href="/calculator/cookies.html"'));
  assert.ok(urls.includes('https://friendlycalculator.in/calculator/cookies.html'));
  assert.ok(shell.includes('(?:privacy|cookies)'));
  assert.match(cookies, /Last updated: 14 November 2026/);
  assert.match(cookies, /does not currently operate a separate, custom cookie-preference centre/);
  assert.match(shell, /en:\['About','Methodology','Privacy','Terms','Disclaimer','Embed','Contact','Cookies'\]/);
  assert.match(shell, /r\+'cookies\.html'/, 'Footer must link to the Cookie Policy page');
  
});

test('Founder landing page has the approved portrait, LinkedIn profile and factual identity markup', () => {
  const founder = fs.readFileSync(path.join(root, 'calculator/founder.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  assert.match(founder, /Avnish Ahirwar/);
  assert.match(founder, /Investor and Founder/);
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
