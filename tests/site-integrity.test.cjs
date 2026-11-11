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
