'use strict';
/**
 * Rebuild the curated 20-section calculator directory from the canonical sitemap
 * and the search index. The checked-in assignment file preserves the pre-existing
 * editorial grouping; new sitemap routes are assigned using their search-index
 * category and a conservative topic classifier.
 */
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const ASSIGNMENTS = require('../config/site-directory-category-assignments.json');
const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');
const INDEX_FILE = path.join(ROOT, 'assets/calculator-search-index.json');
const TARGET = path.join(ROOT, 'calculator', 'site-directory.html');

const HUBS = [
  ['/calculator/finance-calculators.html', 'Finance'],
  ['/calculator/insurance-calculators.html', 'Insurance'],
  ['/calculator/tax.html', 'Tax'],
  ['/calculator/math-calculators.html', 'Mathematics'],
  ['/calculator/physics-calculators.html', 'Physics'],
  ['/calculator/chemistry-calculators.html', 'Chemistry'],
  ['/calculator/biology-calculators.html', 'Biology'],
  ['/calculator/science-calculators.html', 'Science'],
  ['/calculator/money-calculators.html', 'Money & finance'],
  ['/calculator/economic-calculators.html', 'Economics'],
  ['/calculator/agriculture-calculators.html', 'Agriculture Calculators'],
  ['/international/', 'International Calculators']
];

const HEADER = '<header class="fc-global-header"><div class="fc-global-nav"><a class="fc-global-brand" href="/" aria-label="FRIENDLY CALCULATOR Home"><img class="fc-brand-mark" src="/assets/friendly-calculator-logo.svg" width="34" height="34" alt="Friendly Calculator logo" decoding="async"> <span>FRIENDLY <b>CALCULATOR</b></span></a><nav id="fc-primary-navigation" class="fc-global-links" aria-label="Main navigation"><a href="/">Home</a><a href="/calculator/business-calculators.html">Business Tools</a><a href="/calculator/finance-calculators.html">Finance</a><a href="/calculator/tax.html">Tax</a><a href="/international/">Global Calculators</a><a href="/calculator/everyday-calculators.html">Everyday</a><a href="/calculator/site-directory.html">All Calculators</a><a href="/blog/">Blog</a><a href="/calculator/dashboard.html" class="fc-login-link">Login</a><label class="fc-language-control"><span class="fc-language-label">Language</span><select id="fc-language-select" aria-label="Choose website language"><option value="en">English</option><option value="hi">हिन्दी</option><option value="es">Español</option><option value="fr">Français</option><option value="pt">Português</option><option value="ar">العربية</option><option value="id">Bahasa Indonesia</option><option value="bn">বাংলা</option><option value="ta">தமிழ்</option><option value="mr">मराठी</option><option value="vi">Tiếng Việt</option><option value="gu">ગુજરાતી</option><option value="kn">ಕನ್ನಡ</option><option value="te">తెలుగు</option><option value="de">Deutsch (selected tools)</option><option value="ja">日本語 (selected tools)</option><option value="ru">Русский (selected tools)</option></select></label></nav></div></header>';

function decodeEntities(value) {
  return String(value || '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function esc(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function readCanonicalCalculatorUrls() {
  const xml = fs.readFileSync(SITEMAP_FILE, 'utf8');
  return [...new Set([...xml.matchAll(/<loc>(https:\/\/friendlycalculator\.in[^<]*)<\/loc>/g)]
    .map(match => new URL(match[1]).pathname)
    .filter(url => url.startsWith('/calculators/') && url.endsWith('.html')))].sort();
}
function readPageEntry(url, indexByUrl) {
  const file = path.join(ROOT, url.slice(1));
  const html = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const rawTitle = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const title = decodeEntities(indexByUrl.get(url)?.name) ||
    decodeEntities(rawTitle.split('|')[0].replace(/\s+/g, ' ').trim()) || path.basename(url, '.html').replace(/-/g, ' ');
  const rawDescription = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || indexByUrl.get(url)?.description || '';
  const description = decodeEntities(rawDescription).replace(/\s+/g, ' ').trim().slice(0, 190);
  return { url, title, description, category: decodeEntities(indexByUrl.get(url)?.category || ''), keywords: decodeEntities(indexByUrl.get(url)?.keywords || '') };
}
function normalize(value) {
  return decodeEntities(value).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}
function classify(entry) {
  const c = normalize(entry.category);
  const t = normalize([entry.title, entry.url, entry.description, entry.keywords].join(' '));
  const exact = new Map([
    ['savings investment retirement','savings-investments'],
    ['loans emi credit','loans-credit'],
    ['insurance protection','insurance-protection'],
    ['tax salary payroll','tax-payroll'],
    ['business sales operations','business-operations'],
    ['mathematics numbers statistics','math-statistics'],
    ['astronomy space','astronomy-space'],
    ['astrology numerology','astrology-numerology'],
    ['geometry measurement construction','geometry-construction'],
    ['date time work','date-time-work'],
    ['converters data technology','converters-technology'],
    ['home travel everyday costs','home-travel'],
    ['energy sustainability','energy-sustainability'],
    ['food cooking','food-cooking'],
    ['education academic tools','education-learning'],
    ['health fitness family','health-family'],
    ['agriculture rural finance','agriculture-rural'],
    ['government schemes eligibility','government-schemes'],
    ['career salary planning','career-salary'],
    ['biology chemistry','biology-chemistry']
  ]);
  if (exact.has(c)) return exact.get(c);

  if (/insurance|premium policy|life cover|health cover/.test(t) || c.includes('insurance')) return 'insurance-protection';
  if (/income tax|gst|tds|vat|payroll|salary|paycheck|provident fund|epf|professional tax|tax regime|tax slab/.test(t) || c.includes('tax') || c.includes('payroll')) return 'tax-payroll';
  if (/loan|mortgage|emi|credit card|debt|borrowing|home affordability|repayment|lending/.test(t) || c.includes('loan') || c.includes('credit') || c.includes('real estate')) return 'loans-credit';
  if (/sip|mutual fund|fixed deposit|\bfd\b|\brd\b|investment|retirement|savings|compound interest|portfolio|net worth|pension|provident/.test(t) || c.includes('banking') || c.includes('finance') || c.includes('investment')) return 'savings-investments';
  if (/business|sales|profit|margin|invoice|revenue|inventory|accounting|cash flow|logistics|manufacturing|enterprise|trade|break even/.test(t) || /business|trade|enterprise|logistics|manufacturing/.test(c)) return 'business-operations';
  if (/astronomy|planet|orbital|spaceflight|star distance/.test(t) || c.includes('astronomy')) return 'astronomy-space';
  if (/astrology|zodiac|numerology|life path number/.test(t) || c.includes('astrology')) return 'astrology-numerology';
  if (/agriculture|crop|farm|kisan|rural|irrigation|yield per acre/.test(t) || c.includes('agriculture')) return 'agriculture-rural';
  if (/government scheme|eligibility|subsidy|pension scheme|public benefit/.test(t) || c.includes('government')) return 'government-schemes';
  if (/career|salary hike|career growth|notice period|gratuity|employee/.test(t) || c.includes('career')) return 'career-salary';
  if (/recipe|cooking|food|ingredient|calorie in recipe|serving size|kitchen/.test(t) || c.includes('food')) return 'food-cooking';
  if (/health|medical|fitness|body mass|pregnancy|fertility|heart rate|workout|exercise|sports|bench press|squat one rep/.test(t) || /health|sports|workout|exercise/.test(c)) return 'health-family';
  if (/education|academic|student|grade|school|exam|study|learning|gpa|cgpa/.test(t) || c.includes('education') || c.includes('academic')) return 'education-learning';
  if (/energy|electricity|solar|power|watt|voltage|battery|emission|carbon|ecology|environment/.test(t) || /energy|ecology|environment|electrical/.test(c)) return 'energy-sustainability';
  if (/geometry|triangle|circle|polygon|angle|perimeter|area|volume|surface area|construction|concrete|roof|stair|wire size|measurement|dimension/.test(t) || /geometry|construction|architecture/.test(c)) return 'geometry-construction';
  if (/date|time|age calculator|day calculator|time zone|shift|working days|hours worked|duration/.test(t) || c.includes('date') || c.includes('time') || c.includes('work')) return 'date-time-work';
  if (/travel|trip|fuel|mileage|rent|household|home|property|vehicle|car loan|distance between|everyday/.test(t) || c.includes('everyday') || c.includes('home') || c.includes('travel') || c.includes('hospitality')) return 'home-travel';
  if (/biology|chemistry|molar|mole |stoichiometry|ph calculator|genetics|dna|chemical|biology|physics|force|velocity|acceleration|thermodynamics|kinetics/.test(t) || /biology|chemistry|physics|science/.test(c)) return 'biology-chemistry';
  if (/convert|converter|unit|currency|data transfer|network|pixel|image|ratio|format|technology|digital/.test(t) || /conversion|converter|technology|design|fashion|other|calculator/.test(c)) return 'converters-technology';
  if (/statistics|probability|mean|median|mode|standard deviation|equation|algebra|calculus|fraction|number theory|percentage|percent|ratio|sequence|matrix|vector/.test(t) || /math|statistics/.test(c)) return 'math-statistics';
  return 'converters-technology';
}
function build() {
  const routes = readCanonicalCalculatorUrls();
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  const indexByUrl = new Map(index.map(item => [item.url, item]));
  const entries = new Map(routes.map(url => [url, readPageEntry(url, indexByUrl)]));
  const categories = ASSIGNMENTS.categories.map(category => ({
    ...category,
    title: decodeEntities(category.title),
    urls: category.urls.filter(url => entries.has(url))
  }));
  const assigned = new Set(categories.flatMap(category => category.urls));
  const missing = routes.filter(url => !assigned.has(url));
  for (const url of missing) {
    const categoryId = classify(entries.get(url));
    const category = categories.find(item => item.id === categoryId) || categories.find(item => item.id === 'converters-technology');
    category.urls.push(url);
    assigned.add(url);
  }
  const unique = new Set(categories.flatMap(category => category.urls));
  if (unique.size !== routes.length) throw new Error('Directory assignment mismatch: expected ' + routes.length + ' unique sitemap calculators, got ' + unique.size);
  if (categories.length !== 20) throw new Error('Expected 20 directory categories, found ' + categories.length);
  const math = categories.find(category => category.id === 'math-statistics');
  if (!math || math.urls.length < 300) throw new Error('Mathematics category unexpectedly incomplete: ' + (math?.urls.length || 0));
  const allLinks = categories.reduce((sum, category) => sum + category.urls.length, 0);
  const expectedDuplicate = allLinks - unique.size;
  if (expectedDuplicate !== 0) throw new Error('Directory routes must be unique; found ' + expectedDuplicate + ' duplicate links');

  const categoryEntries = categories.map(category => {
    const cards = category.urls.map(url => {
      const item = entries.get(url);
      const search = esc(normalize([item.title, item.description, item.keywords].join(' ')));
      return '<a class="card" href="' + esc(url) + '" data-search="' + search + '" data-type="calculator"><strong>' + esc(item.title) + '</strong><span>' + esc(item.description || item.title + ' calculator') + '</span></a>';
    }).join('\n');
    const count = category.urls.length;
    const cleanDescription = category.description.replace(/\s+\d[\d,]*\s+tools?\b/gi, '').trim();
    return '<section class="section calculator-category" id="' + esc(category.id) + '"><div class="section-head"><div><h2>' + esc(category.title) + '</h2><p>' + esc(cleanDescription) + ' <strong>' + count.toLocaleString('en-US') + (count === 1 ? ' tool' : ' tools') + '</strong></p></div></div><div class="grid">' + cards + '</div></section>';
  });
  const quickLinks = categories.map(category => '<a class="quick" href="#' + esc(category.id) + '"><strong>' + esc(category.title) + '</strong><span>' + category.urls.length.toLocaleString('en-US') + (category.urls.length === 1 ? ' calculator' : ' calculators') + '</span></a>').join('\n');
  const total = allLinks.toLocaleString('en-US');
  const hubLinks = HUBS.map(([url, label]) => '<a href="' + esc(url) + '">' + esc(label) + '</a>').join(' · ');
  const intro = 'Browse calculator tools, business services and website information from one organized directory.';
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>All Calculators Directory - ' + routes.length.toLocaleString('en-US') + ' Calculators | Friendly Calculator</title><meta name="description" content="Browse ' + routes.length.toLocaleString('en-US') + ' free calculators by topic, including finance, tax, business, science, health, conversions and everyday tools."><link rel="canonical" href="https://friendlycalculator.in/calculator/site-directory.html"><link rel="preload" as="image" href="/assets/friendly-calculator-brand-illustration.svg" type="image/svg+xml" fetchpriority="high"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:site_name" content="Friendly Calculator"><meta property="og:title" content="All Calculators Directory | Friendly Calculator"><meta property="og:description" content="Browse the complete Friendly Calculator catalogue by topic."><meta property="og:url" content="https://friendlycalculator.in/calculator/site-directory.html"><meta property="og:image" content="https://friendlycalculator.in/og-friendly-calculator.png"><meta property="og:image:alt" content="Friendly Calculator — online calculators and practical tools"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="All Calculators Directory | Friendly Calculator"><meta name="twitter:description" content="Browse the complete Friendly Calculator catalogue by topic."><meta name="twitter:image" content="https://friendlycalculator.in/og-friendly-calculator.png"><meta name="twitter:image:alt" content="Friendly Calculator — online calculators and practical tools"><link rel="stylesheet" href="/assets/site-shell.css"><style>*{box-sizing:border-box}body{margin:0;background:#f5f6f8;color:#172638;font:16px/1.65 system-ui,sans-serif}.wrap{width:min(1120px,94%);margin:24px auto}.hero,.section,.search-panel{background:#fff;border:1px solid #dfe5eb;border-radius:14px;padding:20px;margin:16px 0}.hero{background:#101c2c;color:#fff}.hero p{max-width:900px}.fc-brand-visual{margin:18px 0}.fc-brand-visual img{display:block;width:100%;height:auto;max-width:1200px;border-radius:12px}#siteSearch{width:100%;padding:12px;border:1px solid #b8c4cf;border-radius:8px;font:inherit}#searchStatus{color:#4b5a6a;margin:8px 0;font-size:.9rem}.quick-links{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px}.quick{display:grid;gap:3px;background:#edf3f7;border:1px solid #dfe5eb;border-radius:9px;padding:11px;text-decoration:none;color:#172638}.quick span{font-size:.85rem;color:#4b5a6a}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:9px}.card{display:grid;gap:4px;background:#fff;border:1px solid #dfe5eb;border-radius:9px;padding:12px;text-decoration:none;color:#172638}.card strong{font-size:.96rem}.card span{font-size:.86rem;color:#596b7c}.section-head h2{margin:0 0 6px}.section-head p{margin:0 0 12px;color:#596b7c}.directory-services{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.fc-footer{background:#101c2c;color:#fff;margin-top:24px;padding:24px}.fc-footer a{color:#bfd4e3}.fc-footer-links{display:grid;gap:4px;margin-top:8px}@media(max-width:650px){.grid,.directory-services{grid-template-columns:1fr}}</style><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"CollectionPage","name":"All Calculators Directory","url":"https://friendlycalculator.in/calculator/site-directory.html","inLanguage":"en","isPartOf":{"@type":"WebSite","name":"Friendly Calculator","url":"https://friendlycalculator.in/"}},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://friendlycalculator.in/"},{"@type":"ListItem","position":2,"name":"All Calculators","item":"https://friendlycalculator.in/calculator/site-directory.html"}]}]}</script></head><body>' + HEADER + '<main class="wrap"><header class="hero"><p>Friendly Calculator · Complete directory</p><h1>All ' + routes.length.toLocaleString('en-US') + ' calculator tools</h1><p>' + esc(intro) + '</p><nav class="subject-hubs" aria-label="Explore calculator subject hubs">' + hubLinks + '</nav><figure class="fc-brand-visual"><img src="/assets/friendly-calculator-brand-illustration.svg" alt="Friendly Calculator brand illustration showing practical finance, tax, business and everyday calculation tools" width="1200" height="630" fetchpriority="high" loading="eager" decoding="async"></figure><p>Explore the full catalogue by topic. Each calculator page explains its inputs, formula, assumptions and limitations where applicable.</p></header><section class="section" id="calculator-category-index"><h2>Browse by category</h2><p>Choose a category to jump directly to its calculators.</p><nav class="quick-links" aria-label="Calculator category shortcuts">' + quickLinks + '</nav></section><section class="search-panel"><label for="siteSearch"><strong>Search ' + total + ' calculators by name or topic</strong></label><input id="siteSearch" type="search" placeholder="Search calculators by name or topic..." autocomplete="off"><p id="searchStatus" role="status" aria-live="polite">Showing all ' + total + ' calculator links.</p></section>' + categoryEntries.slice(0,10).join('') + '<h2>Date, time and work calculators</h2>' + '<section class="section" id="directory-business-services"><h2>Business &amp; developer services</h2><div class="directory-services"><a class="card" href="/embed/"><strong>Calculator Embed Builder</strong><span>Generate responsive calculator embeds for websites and blogs.</span></a><a class="card" href="/developers/"><strong>Developer Integration Guide</strong><span>Review iframe integration, privacy and attribution guidance.</span></a><a class="card" href="/calculator/api.html"><strong>Calculator API</strong><span>Read API documentation, authentication and usage limits.</span></a><a class="card" href="/business/partnerships.html"><strong>Business Partnerships</strong><span>Explore co-branded calculator and technology collaborations.</span></a></div></section>' + categoryEntries.slice(10).join('') + '<section class="section" id="directory-trust-resources"><h2>About, trust &amp; policies</h2><p>Learn how Friendly Calculator builds and reviews its tools, how privacy is handled, and how to contact the team.</p><div class="directory-services"><a class="card" href="/calculator/about.html"><strong>About Friendly Calculator</strong><span>Our catalogue, purpose and editorial approach.</span></a><a class="card" href="/calculator/methodology.html"><strong>Calculation Methodology</strong><span>Review formulas, assumptions and limitations.</span></a><a class="card" href="/calculator/privacy.html"><strong>Privacy Policy</strong><span>Understand privacy and data practices.</span></a><a class="card" href="/calculator/contact.html"><strong>Contact &amp; Corrections</strong><span>Send questions, feedback and correction requests.</span></a><a class="card" href="/calculator/image-tools.html"><strong>Browser Image Resizer &amp; Converter</strong><span>Resize and convert images locally in your browser without uploading.</span></a><a class="card" href="/calculator/bhopal-calculators.html"><strong>Bhopal &amp; Madhya Pradesh Calculators</strong><span>Explore locally relevant estimates and official references.</span></a><a class="card" href="/calculator/terms.html"><strong>Terms of Use</strong><span>Read the terms governing website use.</span></a><a class="card" href="/calculator/disclaimer.html"><strong>Disclaimer</strong><span>Understand the limits of calculator estimates.</span></a></div></section><p>' + esc(intro) + '</p></main><footer class="fc-footer"><div class="wrap"><strong>FRIENDLY CALCULATOR</strong><nav class="fc-footer-links"><a href="/">Home</a><a href="/calculator/about.html">About</a><a href="/calculator/privacy.html">Privacy</a><a href="/calculator/terms.html">Terms</a><a href="/calculator/contact.html">Contact</a></nav></div></footer><script>(function(){var input=document.getElementById("siteSearch"),status=document.getElementById("searchStatus");if(!input||!status)return;var cards=Array.prototype.slice.call(document.querySelectorAll(".calculator-category .card"));function update(){var q=input.value.trim().toLowerCase(),shown=0;cards.forEach(function(card){var hay=(card.getAttribute("data-search")||card.textContent||"").toLowerCase(),match=!q||hay.indexOf(q)!==-1;card.hidden=!match;if(match)shown++;});status.textContent=q?("Showing "+shown+" matching calculator links."):("Showing all "+cards.length+" calculator links.");}input.addEventListener("input",update);})();</script><script src="/assets/site-shell.js" defer></script></body></html>';
  return {html, routes, categories, allLinks};
}
function main() {
  const {html, routes, categories, allLinks} = build();
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(TARGET) ? fs.readFileSync(TARGET, 'utf8') : '';
    if (current !== html) {
      console.error('site-directory.html is out of date. Run: node scripts/build-site-directory.cjs');
      process.exit(1);
    }
    console.log('site-directory.html is current: ' + routes.length.toLocaleString('en-US') + ' unique calculators across ' + categories.length + ' categories (' + allLinks + ' category links).');
    return;
  }
  fs.writeFileSync(TARGET, html);
  console.log('site-directory.html rebuilt with ' + routes.length.toLocaleString('en-US') + ' unique calculators across ' + categories.length + ' categories (' + allLinks + ' category links).');
}
main();
