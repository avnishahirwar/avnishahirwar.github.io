'use strict';
/**
 * Build category-based English and Hindi calculator directories from the
 * canonical published calculator catalogue.
 * Usage: node scripts/build-site-directory.cjs [--check]
 */
const fs = require('node:fs');
const path = require('node:path');
const { catalogueStats } = require('./sync-calculator-counts.cjs');
const ROOT = path.join(__dirname, '..');
const ORIGIN = 'https://friendlycalculator.in';

const CATEGORIES = [
  ['savings-investments','Savings, Investment & Retirement','बचत, निवेश और सेवानिवृत्ति',/(saving|investment|retirement|deposit|compound interest|wealth|annuity|sip|mutual fund|pension|provident fund)/i],
  ['loans-credit','Loans, EMI & Credit','लोन, EMI और क्रेडिट',/(loan|emi|mortgage|credit|debt|repayment|lending|refinanc)/i],
  ['insurance-protection','Insurance & Protection','बीमा और सुरक्षा',/(insurance|premium|coverage|policy|protection|deductible)/i],
  ['tax-payroll','Tax, Salary & Payroll','टैक्स, वेतन और पेरोल',/(tax|gst|vat|tds|payroll|salary|paycheck|hra|ctc|gratuity|income tax|withholding|stamp duty)/i],
  ['business-operations','Business, Sales & Operations','व्यवसाय, बिक्री और संचालन',/(business|sales|marketing|operations|break.?even|revenue|profit|inventory|margin|conversion rate|roi)/i],
  ['math-statistics','Mathematics, Numbers & Statistics','गणित, संख्याएँ और सांख्यिकी',/(math|algebra|statistics|percentage|fraction|ratio|probability|trigonometry|calculus|number|equation)/i],
  ['astronomy-space','Astronomy & Space','खगोल विज्ञान और अंतरिक्ष',/(astronomy|space|orbital|planet|star|light.?year|astronomical)/i],
  ['astrology-numerology','Astrology & Numerology','ज्योतिष और अंक ज्योतिष',/(astrology|numerology|zodiac|horoscope|birth chart|life path)/i],
  ['geometry-construction','Geometry, Measurement & Construction','ज्यामिति, मापन और निर्माण',/(geometry|triangle|construction|measurement|area|volume|length|perimeter|slope|roof|concrete|tile|paint|fence)/i],
  ['date-time-work','Date, Time & Work','तिथि, समय और कार्य',/(date|time|calendar|duration|hours|workday|timesheet|timezone|age calculator)/i],
  ['converters-technology','Converters, Data & Technology','कन्वर्टर, डेटा और तकनीक',/(converter|conversion|technology|data|digital|bandwidth|storage|file size|bitrate|unit conversion|network|computer)/i],
  ['home-travel','Home, Travel & Everyday Costs','घर, यात्रा और दैनिक खर्च',/(home|travel|automobile|car|vehicle|fuel|trip|moving|rent|household|pet|everyday|kitchen|pool|garden)/i],
  ['energy-sustainability','Energy & Sustainability','ऊर्जा और स्थिरता',/(energy|sustainability|carbon|solar|electricity|power|emission|fuel efficiency|battery|watt|renewable)/i],
  ['food-cooking','Food & Cooking','भोजन और खाना पकाना',/(food|cooking|recipe|nutrition|coffee|baking|kitchen|drink|meal|calorie|brew)/i],
  ['education-learning','Education & Academic Tools','शिक्षा और अकादमिक उपकरण',/(education|learning|academic|grade|gpa|exam|school|college|student|study)/i],
  ['health-family','Health, Fitness & Family','स्वास्थ्य, फिटनेस और परिवार',/(health|fitness|bmi|body|medical|family|pregnancy|sleep|sport|exercise|pet care|heart rate)/i],
  ['agriculture-rural','Agriculture & Rural Finance','कृषि और ग्रामीण वित्त',/(agriculture|farming|crop|irrigation|rural|livestock|soil|harvest|fertilizer)/i],
  ['government-schemes','Government Schemes & Eligibility','सरकारी योजनाएँ और पात्रता',/(government|scheme|eligibility|benefit|subsidy|welfare|allowance)/i],
  ['career-salary','Career & Salary Planning','करियर और वेतन योजना',/(career|salary|in.?hand|take.?home|ctc|career|notice period|severance|retirement age)/i],
  ['biology-chemistry','Biology & Chemistry','जीव विज्ञान और रसायन विज्ञान',/(biology|chemistry|molar|molecule|chemical|ph|stoichiometry|enzyme|genetics|cell|reaction)/i]
];

function esc(value) {
  return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function collectGroups() {
  const byUrl = new Map(catalogueStats().entries.filter(item => {
    const url = String(item.url || '');
    const parts = url.split('/');
    return url.startsWith('/calculators/') ||
      (parts.length > 3 && /^[a-z]{2,3}$/i.test(parts[1]) && parts[2] === 'calculators' && url.endsWith('.html'));
  }).map(item => [item.url,item]));
  const physicsSupplemental = [
    '/calculators/current-divider-calculator.html',
    '/calculators/elastic-constants-calculator.html',
    '/calculators/impulse-and-momentum-calculator.html',
    '/calculators/light-year-conversion.html',
    '/calculators/projectile-time-of-flight-calculator.html'
  ];
  for (const url of physicsSupplemental) {
    if (byUrl.has(url) || !fs.existsSync(path.join(ROOT,url.slice(1)))) continue;
    const html = fs.readFileSync(path.join(ROOT,url.slice(1)),'utf8');
    const lower = html.toLowerCase();
    const titleOpen = lower.indexOf('<title');
    const titleStart = titleOpen >= 0 ? html.indexOf('>', titleOpen) + 1 : -1;
    const titleEnd = titleStart > 0 ? lower.indexOf('</title>', titleStart) : -1;
    const rawTitle = titleEnd > titleStart ? html.slice(titleStart, titleEnd) : '';
    const title = rawTitle.replaceAll('<',' ').replaceAll('>',' ').replaceAll('&amp;','&')
      .replaceAll(String.fromCharCode(10),' ').replaceAll(String.fromCharCode(13),' ')
      .replaceAll(String.fromCharCode(9),' ').split(' ').filter(Boolean).join(' ').split(/[|–—]/)[0].trim() ||
      url.split('/').pop().replace('.html','').replace(/-/g,' ');
    const metaTag = html.split('<meta').find(part => part.toLowerCase().includes('name="description"'));
    const contentStart = metaTag ? metaTag.toLowerCase().indexOf('content="') : -1;
    const description = contentStart >= 0 ? metaTag.slice(contentStart + 9).split('"')[0] : '';
    byUrl.set(url,{name:title,url,category:'Physics',keywords:'physics',description});
  }
  const entries = [...byUrl.values()];
  const groups = CATEGORIES.map(([id,label,hiLabel,pattern]) => ({id,label,hiLabel,pattern,items:[]}));
  for (const item of entries) {
    const haystack = [item.category,item.name,item.keywords,item.description].join(' ');
    const group = groups.find(candidate => candidate.pattern.test(haystack)) ||
      groups.find(candidate => candidate.id === 'math-statistics');
    group.items.push(item);
  }
  for (const group of groups) group.items.sort((a,b) => String(a.name).localeCompare(String(b.name),'en'));
  return {groups, total:entries.length};
}
function renderPage(lang, groups, total) {
  const hi = lang === 'hi';
  const title = hi ? 'सभी कैलकुलेटर | Friendly Calculator' : 'All Calculators by Category | Friendly Calculator';
  const description = hi
    ? 'Friendly Calculator के निःशुल्क कैलकुलेटर श्रेणी के अनुसार खोजें।'
    : 'Browse free online calculators by category, with searchable links to the complete calculator catalogue.';
  const url = ORIGIN + (hi ? '/hi/calculator/site-directory.html' : '/calculator/site-directory.html');
  const globalHeader = `<header class="fc-global-header"><div class="fc-global-nav"><a class="fc-global-brand" href="/" aria-label="FRIENDLY CALCULATOR Home"><img class="fc-brand-mark" src="/assets/friendly-calculator-logo.svg" width="34" height="34" alt="Friendly Calculator logo" decoding="async"> <span>FRIENDLY <b>CALCULATOR</b></span></a><nav id="fc-primary-navigation" class="fc-global-links" aria-label="Primary navigation"><a href="/">Home</a><a href="/calculator/business-calculators.html">Business Tools</a><a href="/calculator/finance-calculators.html">Finance</a><a href="/calculator/tax.html">Tax</a><a href="/international/">International Calculators</a><a href="/calculator/everyday-calculators.html">Everyday</a><a href="/calculator/site-directory.html">All Calculators</a><a href="/blog/">Blog</a><label class="fc-language-control"><span class="fc-language-label">Language</span><select id="fc-language-select" aria-label="Choose website language"><option value="en">English</option><option value="hi">हिन्दी</option><option value="es">Español</option><option value="fr">Français</option><option value="pt">Português</option><option value="ar">العربية</option><option value="id">Bahasa Indonesia</option><option value="bn">বাংলা</option><option value="ta">தமிழ்</option><option value="mr">मराठी</option><option value="vi">Tiếng Việt</option><option value="gu">ગુજરાતી</option><option value="kn">ಕನ್ನಡ</option><option value="te">తెలుగు</option><option value="de">Deutsch</option><option value="ja">日本語</option><option value="ru">Русский</option></select></label></nav></div></header>`;

  const nav = groups.map(group => '<a class="category-link" href="#' + group.id + '"><span>' +
    esc(hi ? group.hiLabel : group.label) + '</span><span>' + group.items.length.toLocaleString('en-US') +
    ' calculators</span></a>').join('\n');
  const physicsSupplemental = new Set(['/calculators/current-divider-calculator.html','/calculators/elastic-constants-calculator.html','/calculators/impulse-and-momentum-calculator.html','/calculators/light-year-conversion.html','/calculators/projectile-time-of-flight-calculator.html']);
  const sections = groups.map(group => '<section class="section calculator-category" id="' + group.id +
    '"><header class="category-heading"><div><h2>' + esc(hi ? group.hiLabel : group.label) +
    '</h2><strong>' + group.items.length.toLocaleString('en-US') + ' tools</strong></div></header><div class="cards">' +
    group.items.map(item => '<a class="card" href="' + esc(item.url) + '" data-search="' +
      esc([item.name,item.category,item.keywords,item.description,physicsSupplemental.has(item.url) ? 'physics' : ''].join(' ').toLowerCase()) +
      '"><strong>' + esc(item.name) + '</strong>' + (item.description ? '<span>' +
      esc(String(item.description).slice(0,180)) + '</span>' : '') + '</a>').join('\n') +
    '</div></section>').join('\n');
  return '<!doctype html><html lang="' + lang + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(title) + '</title><meta name="description" content="' + esc(description) + '">' +
    '<meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="' + url + '">' +
    '<link rel="alternate" hreflang="en" href="' + ORIGIN + '/calculator/site-directory.html">' +
    '<link rel="alternate" hreflang="hi" href="' + ORIGIN + '/hi/calculator/site-directory.html">' +
    '<link rel="alternate" hreflang="x-default" href="' + ORIGIN + '/calculator/site-directory.html">' +
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Friendly Calculator">' +
    '<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(description) +
    '"><meta property="og:url" content="' + url + '"><meta property="og:image" content="' + ORIGIN + '/og-friendly-calculator.png">' +
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + esc(title) +
    '"><meta name="twitter:description" content="' + esc(description) + '">' +
    '<link rel="stylesheet" href="/assets/site-shell.css"><style>*{box-sizing:border-box}body{margin:0;background:#f5f6f8;color:#172638;font:16px/1.65 system-ui,sans-serif}.wrap{width:min(1160px,94%);margin:24px auto}.hero,.panel,.calculator-category{background:#fff;border:1px solid #dfe5eb;border-radius:14px;padding:20px;margin:16px 0}.hero{background:#101c2c;color:#fff}.hero h1{margin:.3rem 0}.hero p{margin:.4rem 0}.search{width:100%;padding:13px;border:1px solid #b8c4cf;border-radius:9px;font:inherit}.category-nav{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}.category-link{display:flex;justify-content:space-between;gap:8px;padding:10px 12px;border:1px solid #dfe5eb;border-radius:9px;background:#f7f9fb;color:#172638;text-decoration:none}.category-link span:last-child{white-space:nowrap;color:#596b7c;font-size:.85rem}.category-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.category-heading h2{font-size:1.15rem;margin:0}.category-heading strong{font-size:.85rem;color:#596b7c}.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:9px;margin-top:12px}.card{display:grid;gap:4px;padding:12px;background:#f4f7fa;border:1px solid #e1e7ed;border-radius:9px;text-decoration:none;color:#172638}.card span{font-size:.84rem;color:#596b7c;line-height:1.45}.card:hover,.category-link:hover{border-color:#9e8451}.hidden{display:none}.fc-footer{background:#101c2c;color:#fff;margin-top:28px;padding:24px}.fc-footer a{color:#e4d3aa}.fc-footer-links{display:flex;gap:16px;flex-wrap:wrap;margin-top:8px}@media(max-width:650px){.cards{grid-template-columns:1fr}.category-heading{align-items:flex-start;flex-direction:column}}</style></head><body>' + globalHeader + '<main class="wrap"><header class="hero"><p>' +
    (hi ? 'कैलकुलेटर निर्देशिका' : 'Calculator directory') + '</p><h1>' + (hi ? 'सभी ' : 'All ') +
    total.toLocaleString('en-US') + (hi ? ' कैलकुलेटर' : ' calculators') + '</h1><p>' +
    (hi ? 'श्रेणी चुनें या नाम से कैलकुलेटर खोजें।' : 'Browse by category or search the complete catalogue by calculator name.') +
    '</p></header><section class="panel"><label for="q">' + (hi ? 'विषय के अनुसार कैलकुलेटर खोजें' : 'Search calculators by topic') +
    '</label><input class="search" id="q" type="search" placeholder="' + (hi ? 'नाम या विषय लिखें...' : 'Type a name or topic...') +
    '" autocomplete="off"></section><nav class="panel category-nav" aria-label="' +
    (hi ? 'कैलकुलेटर श्रेणियाँ' : 'Calculator categories') + '">' + nav + '</nav>' + sections +
    '</main><footer class="fc-global-footer"><div class="fc-global-footer-inner"><div class="fc-footer-intro"><strong>FRIENDLY CALCULATOR</strong><br><small>Practical tools for everyday calculations.</small></div><nav class="fc-global-footer-links" aria-label="Footer navigation"><a href="/">Home</a><a href="/calculator/about.html">About</a><a href="/calculator/methodology.html">Methodology</a><a href="/calculator/privacy.html">Privacy</a><a href="/calculator/terms.html">Terms</a><a href="/calculator/disclaimer.html">Disclaimer</a><a href="/calculator/contact.html">Contact</a><a href="/calculator/finance-calculators.html">Finance</a><a href="/calculator/tax.html">Tax</a><a href="/calculator/business-calculators.html">Business Tools</a><a href="/calculator/everyday-calculators.html">Everyday</a><a href="/international/">International Calculators</a><a href="/calculator/physics-calculators.html">Physics calculators</a><a href="/calculator/site-directory.html">All calculators</a></nav></div></footer>' +
    '<script>(function(){var q=document.getElementById("q");if(!q)return;q.addEventListener("input",function(){var v=q.value.trim().toLowerCase();document.querySelectorAll(".card").forEach(function(card){card.classList.toggle("hidden",!!v&&!(card.getAttribute("data-search")||"").includes(v));});document.querySelectorAll(".calculator-category").forEach(function(section){section.classList.toggle("hidden",!!v&&!section.querySelector(".card:not(.hidden)"));});});})();</script>' +
    '<script src="/assets/site-shell.js" defer></script><script src="/assets/site-chrome.js?v=1" defer></script></body></html>';
}
function main() {
  const {groups,total} = collectGroups();
  if (total < 3000) throw new Error('Unexpected published calculator catalogue size: ' + total);
  const outputs = new Map([
    ['calculator/site-directory.html',renderPage('en',groups,total)],
    ['hi/calculator/site-directory.html',renderPage('hi',groups,total)]
  ]);
  const check = process.argv.includes('--check');
  const changed = [];
  for (const [relative,content] of outputs) {
    const target = path.join(ROOT,relative);
    if (!fs.existsSync(path.dirname(target))) fs.mkdirSync(path.dirname(target),{recursive:true});
    const current = fs.existsSync(target) ? fs.readFileSync(target,'utf8') : '';
    if (current === content) continue;
    if (check) throw new Error(relative + ' is out of date. Run node scripts/build-site-directory.cjs.');
    fs.writeFileSync(target,content);
    changed.push(relative);
  }
  console.log(check ? 'English and Hindi category directories are up to date.' :
    'Generated ' + changed.length + ' category directories from ' + total.toLocaleString('en-US') + ' published calculators.');
}
if (require.main === module) main();
module.exports = {collectGroups,renderPage};
