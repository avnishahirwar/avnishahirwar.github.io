const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const shell = fs.readFileSync(path.join(__dirname, '..', 'assets', 'site-shell.js'), 'utf8');

test('global language selector supports all configured locales', () => {
  for (const locale of ['en','de','hi','es','fr','pt','ar','id','bn','ta','ja','ru','mr','vi','te','gu','kn']) {
    assert.ok(shell.includes(locale + ':'));
  }
  assert.match(shell, /fc-language-select/);
  assert.match(shell, /fc-language-preference/);
  const supported = shell.match(/const supportedUiLocales=\{([^}]+)\}/);
  assert.ok(supported, 'Expected supported language set');
  const enabled = [...supported[1].matchAll(/([a-z]{2,3}):1/g)].map(match => match[1]);
  const catalogue = require('../config/language-catalogue.json');
  assert.deepEqual(new Set(enabled), new Set(catalogue.locales.map(locale => locale.code)));
});

test('language switching preserves the current route when its translation exists', () => {
  assert.match(shell, /const buildLocaleTarget=next=>/);
  assert.match(shell, /currentLocale==='en'\?p:p\.replace/);
  assert.match(shell, /fetch\(target,\{method:'GET',cache:'no-store',credentials:'same-origin'\}\)/);
  assert.match(shell, /response\.body\?\.cancel\(\)/);
  assert.match(shell, /if\(response\.ok\)\{response\.body\?\.cancel\(\);location\.href=target;return;\}/);
  assert.match(shell, /return localeHome\[next\]/);
  assert.match(shell, /fc-language-notice/);
});

test('Explicit language routes remain authoritative; root defaults to saved or browser language', () => {
  assert.match(shell, /const savedUiLocale=/);
  assert.match(shell, /navigator\.languages/);
  assert.match(shell, /const preferredUiLocale=Object\.hasOwn\(supportedUiLocales,savedUiLocale\)\?savedUiLocale:browserUiLocale/);
  assert.ok(shell.includes("p==='/'?(requestedUiLocale&&Object.hasOwn(supportedUiLocales,requestedUiLocale)?requestedUiLocale:preferredUiLocale)"));
  assert.match(shell, /if\(p==='\/'&&currentLocale!=='en'\)location\.replace\(localeHome\[currentLocale\]/);
  assert.match(shell, /routeLanguageSelect\.value=currentLocale/);
  assert.match(shell, /setItem\('fc-language-source','manual'\)/);
  assert.match(shell, /p\.startsWith\('\/hi\/'\)/);
});

test('Search Calculator is localized across all supported locales', () => {
  for (const label of ['Search Calculator','Rechner suchen','कैलकुलेटर खोजें','Buscar calculadoras','Rechercher un calculateur','Pesquisar calculadoras','البحث عن حاسبة','Cari kalkulator','ক্যালকুলেটর খুঁজুন','கணிப்பானைத் தேடு','計算ツールを検索','Поиск калькулятора','कॅल्क्युलेटर शोधा','Tìm máy tính','కాలిక్యులేటర్‌ను వెతకండి','કેલ્ક્યુલેટર શોધો','ಕ್ಯಾಲ್ಕುಲೇಟರ್ ಹುಡುಕಿ']) {
    assert.ok(shell.includes(label), 'Missing localized Search Calculator label: ' + label);
  }
});

test('localized Blog navigation uses the active locale route', () => {
  assert.ok(shell.includes("[nav.blog,currentLocale==='hi'?'/hi/blog/':'/blog/']"));
});


test('Hindi Bigha and Stamp Duty calculator routes have localized documents', () => {
  for (const file of ['bigha-to-sq-ft-calculator.html', 'stamp-duty-calculator.html']) {
    const target = path.join(__dirname, '..', 'hi', 'calculators', file);
    assert.ok(fs.existsSync(target), `Missing Hindi calculator page: ${file}`);
    const html = fs.readFileSync(target, 'utf8');
    assert.match(html, /<html lang="hi">/);
    assert.ok(html.includes('https://friendlycalculator.in/hi/calculators/' + file));
  }
});

test('German locale is available in the global selector and routing', () => {
  assert.match(shell, /de:'Deutsch'/);
  assert.match(shell, /de:'\/de\/index.html'/);
  assert.match(shell, /de:'Zum Hauptinhalt springen'/);
  assert.match(shell, /(de|es|fr|pt|ar|id|bn|ta|ja|ru)/);
});

test('Japanese and Russian have translated homepage routes and calculator hubs',()=>{
 for(const locale of ['ja','ru']){
  for(const file of ['index.html','international/index.html','calculators/mortgage-calculator.html','international/vat-calculator.html']){
   const target=path.join(__dirname,'..',locale,file);
   assert.ok(fs.existsSync(target),'Missing '+locale+'/'+file);
   const html=fs.readFileSync(target,'utf8');
   assert.match(html,new RegExp('<html lang="'+locale+'"'));
   assert.match(html,/rel="canonical"/);
   assert.match(html,/hreflang="x-default"/);
  }
 }
});


test('Japanese and Russian calculator routes receive localized shell behavior', () => {
  assert.ok(shell.includes('bn|ta|ja|ru'), 'Japanese and Russian must be recognized as calculator locales');
  const catalogue = require('../config/language-catalogue.json');
  const match = shell.match(/const localeCodes=(\[[^;]+\]);/);
  assert.ok(match, 'Expected the shared-shell locale code list');
  assert.deepEqual(JSON.parse(match[1]), catalogue.locales.filter(locale => locale.code !== 'en').map(locale => locale.code));
});


test('Partial German, Japanese and Russian editions have explicit navigation fallbacks and footer labels',()=>{
  assert.ok(shell.includes("de:['Über uns (Englisch)'"));
  assert.ok(shell.includes("ja:['サイトについて（英語）'"));
  assert.ok(shell.includes("ru:['О проекте (англ.)'"));
  assert.ok(shell.includes('const footerLinks=footerLabels[currentLocale].map('),'Every supported locale must have footer labels to prevent a runtime error');
});

test('German, Japanese and Russian basic calculators are fully localized and have reciprocal hreflang', () => {
  const pages = {
    de: ['Einfacher Rechner', 'Addition', 'Division'],
    ja: ['基本電卓', '加算', '計算方法'],
    ru: ['Базовый калькулятор', 'сложение', 'Как это работает'],
    vi: ['Máy tính cơ bản', 'Phép cộng', 'Cách sử dụng'],
    te: ['ప్రాథమిక కాలిక్యులేటర్', 'కూడిక', 'ఇది ఎలా పనిచేస్తుంది']
  };
  for (const [locale, phrases] of Object.entries(pages)) {
    const file = path.join(__dirname, '..', locale, 'calculators', 'basic-calculator.html');
    assert.ok(fs.existsSync(file), 'Missing ' + locale + ' basic calculator');
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, new RegExp('<html lang="' + locale + '"'));
    assert.ok(html.includes('rel="canonical"'));
    assert.ok(html.includes('hreflang="x-default"'));
    for (const phrase of phrases) assert.ok(html.includes(phrase), 'Missing localized phrase: ' + phrase);
    assert.match(html, /data-action="equals"/);
    assert.match(html, /site-shell\.js/);
  }
});


test('All configured locale routes enforce their document language and writing direction', () => {
  assert.ok(shell.includes("const declaredDocumentLang=(document.documentElement.getAttribute('lang')||'').trim();"));
  assert.ok(shell.includes('document.documentElement.lang=declaredDocumentLang||routeLocale;'));
  assert.ok(shell.includes("document.documentElement.dir=/^(ar|ur|fa|ps|he|sd|arz)$/.test(effectiveLocale)?'rtl':'ltr';"));
  const routeMatch = shell.match(/const routeLocaleMatch=([^;]+);/);
  assert.ok(routeMatch, 'Expected route locale detection');
  assert.doesNotMatch(routeMatch[1], /(?:^|\|)uk(?:\||\))/,
    '/uk/ is an English-GB market hub, not a Ukrainian language route');
  assert.ok(shell.includes('Object.hasOwn(supportedUiLocales,currentDocumentLocale)?currentDocumentLocale'));
});


test('language selector lists 50 high-reach languages and only enables configured locales', () => {
  const block = shell.match(/const localeNames=\{([^}]+)\};/);
  assert.ok(block, 'Expected locale catalogue');
  const codes = [...block[1].matchAll(/(?:^|,)([a-z]{2,3}):/g)].map(match => match[1]);
  assert.equal(codes.length, 50, 'Expected exactly 50 language choices');
  for (const code of ['en','zh','hi','es','ar','fr','bn','pt','id','ur','ru','de','ja','pcm','arz','mr','vi','te','sw','ha','tr','pa','fil','ta','yue','wuu','fa','ko','am','th','jv','it','gu','kn','yo','bho','nl','pl','ml','or','ne','si','uk','uz','ps','so','he','my','ro','sd']) assert.ok(codes.includes(code), 'Missing language code: '+code);
  assert.match(shell, /Object\.hasOwn\(supportedUiLocales,code\)\?'':' disabled'/);
  assert.match(shell, / — Coming soon/);
  assert.equal((shell.match(/<option value="[a-z]{2,3}"/g)||[]).length >= 50, true, 'Fallback selector should expose the language catalogue');
});


test('Marathi homepage is configured with a self-canonical route and reciprocal home hreflang', () => {
  const page = fs.readFileSync(path.join(__dirname, '..', 'mr', 'index.html'), 'utf8');
  assert.match(page, /<html lang="mr"/);
  assert.match(page, /rel="canonical" href="https:\/\/friendlycalculator\.in\/mr\/index\.html"/);
  assert.match(page, /hreflang="mr" href="https:\/\/friendlycalculator\.in\/mr\/index\.html"/);
  assert.match(shell, /mr:{home:'मुख्यपृष्ठ'/);
  assert.match(shell, /mr:'\/mr\/index\.html'/);
});


test('homepage hreflang clusters include published language homepages and exclude the UK market hub', () => {
  const catalogue = require('../config/language-catalogue.json');
  const locales = catalogue.locales.map(locale => locale.code).filter(code => code !== 'en' && code !== 'uk');
  const pages = ['index.html', ...locales.map(locale => locale + '/index.html')];
  for (const file of pages) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    for (const locale of ['en', ...locales, 'x-default']) {
      assert.match(html, new RegExp('hreflang="' + locale + '"'), file + ' missing ' + locale + ' alternate');
    }
    assert.doesNotMatch(html, /hreflang="(?:uk|en-GB)"/);
  }
  const ukHub = fs.readFileSync(path.join(__dirname, '..', 'uk', 'index.html'), 'utf8');
  assert.match(ukHub, /<html lang="en-GB">/);
  assert.equal((ukHub.match(/rel="alternate"/g) || []).length, 0, 'UK market hub must not claim unrelated locale alternates');
});



test('Vietnamese and Telugu homepages declare localized, canonical, indexable documents', () => {
  for (const [locale, phrases] of Object.entries({vi:['Máy tính trực tuyến miễn phí','Phạm vi ngôn ngữ'],te:['ఉచిత ఆన్‌లైన్ కాలిక్యులేటర్లు','భాషా పరిధి']})) {
    const html = fs.readFileSync(path.join(__dirname, '..', locale, 'index.html'), 'utf8');
    assert.match(html, new RegExp('<html lang="' + locale + '"'));
    assert.match(html, new RegExp('rel="canonical" href="https://friendlycalculator\\.in/' + locale + '/index\\.html"'));
    assert.match(html, new RegExp('hreflang="' + locale + '"'));
    assert.match(html, /name="robots" content="index,follow/);
    for (const phrase of phrases) assert.ok(html.includes(phrase), 'Missing localized homepage phrase: ' + phrase);
    assert.match(html, /assets\/site-shell\.js/);
  }
});

test('language directory reflects the 50-language catalogue without claiming 33 are planned', () => {
  const page = fs.readFileSync(path.join(__dirname, '..', 'calculator', 'languages.html'), 'utf8');
  assert.match(page, /Configured language options \(50\)/);
  assert.doesNotMatch(page, /Planned language editions|33\s+(?:planned|coming soon)/i);
  assert.equal((page.match(/class="card"/g) || []).length, 50);
  assert.equal((page.match(/class="status-live"/g) || []).length, 49);
  assert.equal((page.match(/class="status-configured"/g) || []).length, 1);
  assert.equal((page.match(/class="status-soon"/g) || []).length, 0);
  assert.equal(page.split('href="/mr/index.html"').length - 1, 1, 'Marathi edition link must appear once only');
  assert.equal(page.split('href="/vi/index.html"').length - 1, 1, 'Vietnamese edition link must appear once only');
  assert.equal(page.split('href="/te/index.html"').length - 1, 1, 'Telugu edition link must appear once only');
  assert.equal(page.split('href="/gu/index.html"').length - 1, 1, 'Gujarati edition link must appear once only');
  assert.equal(page.split('href="/kn/index.html"').length - 1, 1, 'Kannada edition link must appear once only');
  assert.match(page, /English-GB UK market hub/);
  assert.doesNotMatch(page, /href="\/uk\/index\.html"/);
});


test('Gujarati and Kannada locale routes are enabled in the shared shell',()=>{
 assert.match(shell,/gu:'ગુજરાતી'/);assert.match(shell,/kn:'ಕನ್ನಡ'/);
 assert.match(shell,/gu:1,kn:1/);assert.match(shell,/gu:'\/gu\/index.html',kn:'\/kn\/index.html'/);
 assert.match(shell,/gu:'મુખ્ય સામગ્રી પર જાઓ'/);assert.match(shell,/kn:'ಮುಖ್ಯ ವಿಷಯಕ್ಕೆ ತೆರಳಿ'/);
});


test('all localized basic calculator pages include reciprocal Gujarati and Kannada alternates',()=>{
 const pages=['calculators/basic-calculator.html','hi/calculators/basic-calculator.html','de/calculators/basic-calculator.html','ja/calculators/basic-calculator.html','ru/calculators/basic-calculator.html','vi/calculators/basic-calculator.html','te/calculators/basic-calculator.html','gu/calculators/basic-calculator.html','kn/calculators/basic-calculator.html'];
 for(const file of pages){const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');assert.match(html,/hreflang="gu"/);assert.match(html,/hreflang="kn"/);}
});


test('localized basic calculator hreflang alternates are reciprocal for Gujarati and Kannada',()=>{
 const pages=['calculators/basic-calculator.html','hi/calculators/basic-calculator.html','de/calculators/basic-calculator.html','ja/calculators/basic-calculator.html','ru/calculators/basic-calculator.html','vi/calculators/basic-calculator.html','te/calculators/basic-calculator.html','gu/calculators/basic-calculator.html','kn/calculators/basic-calculator.html'];
 for(const file of pages){const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');assert.match(html,/hreflang="gu"/);assert.match(html,/hreflang="kn"/);}
});


test('language selector is synchronized with the canonical 50-language catalogue', () => {
  const catalogue = require('../config/language-catalogue.json');
  const objectBody = key => {
    const start = shell.indexOf(key);
    assert.notEqual(start, -1, 'Missing ' + key);
    const bodyStart = start + key.length;
    const end = shell.indexOf('};', bodyStart);
    assert.notEqual(end, -1, 'Unclosed ' + key);
    return shell.slice(bodyStart, end);
  };
  const names = [...objectBody('const localeNames={').matchAll(/(?:^|,)([a-z]{2,3}):/g)].map(match => match[1]);
  const enabled = [...objectBody('const supportedUiLocales={').matchAll(/(?:^|,)([a-z]{2,3}):1/g)].map(match => match[1]);
  const routed = [...objectBody('const localeHome={').matchAll(/(?:^|,)([a-z]{2,3}):/g)].map(match => match[1]);
  assert.equal(names.length, catalogue.locales.length);
  assert.deepEqual(new Set(names), new Set(catalogue.locales.map(locale => locale.code)));
  assert.deepEqual(enabled.sort(), catalogue.locales.filter(locale => locale.status === 'available').map(locale => locale.code).sort());
  assert.deepEqual(routed.sort(), enabled.sort());
  assert.ok(shell.includes("fetch('/config/language-catalogue.json'"));
  assert.ok(shell.includes("option.disabled=locale.status!=='available'"));
  assert.ok(shell.includes('option.textContent=locale.nativeName'));
  const directory = fs.readFileSync(path.join(__dirname, '..', 'calculator', 'languages.html'), 'utf8');
  assert.equal((directory.match(/class="status-live"/g) || []).length, catalogue.locales.filter(locale => locale.status === 'available').length - 1);
  assert.equal((directory.match(/class="status-configured"/g) || []).length, 1);
  assert.equal((directory.match(/class="status-soon"/g) || []).length, catalogue.locales.filter(locale => locale.status === 'planned').length);
  for (const locale of catalogue.locales) assert.ok(directory.includes(locale.nativeName), 'Language directory is missing ' + locale.code);
});


test('configured language editions have complete shared navigation and footer dictionaries', () => {
  const match = shell.match(/const chrome=\{([\s\S]*?)\n\};/);
  assert.ok(match, 'Expected shared chrome dictionaries');
  for (const locale of ['zh','ur','tr','it','ko']) {
    const entry = match[1].match(new RegExp('(?:^|\\n)' + locale + ':\\{([^}]+)\\}'));
    assert.ok(entry, 'Missing shared navigation translation for ' + locale);
    for (const key of ['home','login','all','search','finance','tax','business','global','everyday','blog','embed','forBusiness','api','plans','about','contact','admin','language','choose','change','footer']) {
      assert.ok(entry[1].includes(key + ':'), 'Missing ' + key + ' for ' + locale);
    }
    assert.equal((entry[1].match(/,/g) || []).length > 15, true);
    assert.match(entry[1], /footer:\[/);
  }
  const catalogue = require('../config/language-catalogue.json');
  for (const locale of ['zh','ur','tr','it','ko']) {
    assert.equal(catalogue.locales.find(item => item.code === locale).status, 'available');
  }
});


test('five configured language editions retain localized homepages and working basic calculators', () => {
  const catalogue = require('../config/language-catalogue.json');
  const expected = {
    zh: ['让计算更简单、更清晰。', '基础计算器', '计算方法'],
    ur: ['حساب کو آسان اور واضح بنائیں۔', 'بنیادی کیلکولیٹر', 'حساب کیسے کام کرتا ہے'],
    tr: ['Hesaplamayı daha anlaşılır hâle getirin.', 'Temel hesap makinesi', 'Nasıl çalışır?'],
    it: ['Rendi i calcoli più semplici e chiari.', 'Calcolatore di base', 'Come funziona'],
    ko: ['계산을 더 쉽고 명확하게.', '기본 계산기', '계산 방식']
  };
  for (const [locale, phrases] of Object.entries(expected)) {
    assert.equal(catalogue.locales.find(item => item.code === locale).status, 'available');
    const home = fs.readFileSync(path.join(__dirname, '..', locale, 'index.html'), 'utf8');
    const calculator = fs.readFileSync(path.join(__dirname, '..', locale, 'calculators', 'basic-calculator.html'), 'utf8');
    assert.match(home, new RegExp('<html lang="' + locale + '"'));
    assert.match(calculator, new RegExp('<html lang="' + locale + '"'));
    assert.match(home, /name="robots" content="index,follow,max-image-preview:large"/);
    assert.match(calculator, /name="robots" content="noindex,follow"/);
    assert.match(home, new RegExp('rel="canonical" href="https://friendlycalculator\\.in/' + locale + '/index\\.html"'));
    assert.match(calculator, new RegExp('rel="canonical" href="https://friendlycalculator\\.in/' + locale + '/calculators/basic-calculator\\.html"'));
    for (const phrase of phrases) {
      assert.ok(home.includes(phrase) || calculator.includes(phrase), 'Missing localized phrase for ' + locale + ': ' + phrase);
    }
    assert.match(calculator, /data-action="equals"/);
    assert.match(calculator, /site-shell\.js/);
    if (locale === 'ur') {
      assert.match(home, /dir="rtl"/);
      assert.match(calculator, /dir="rtl"/);
    }
  }
  assert.ok(['zh','ur','tr','it','ko'].every(locale => shell.includes(locale + ":'/" + locale + "/index.html'")), 'Missing staged locale home route');
  assert.match(shell, /ur\|fa\|ps\|he\|sd/);
  const footerBlock = shell.slice(shell.indexOf('const footerLabels={'), shell.indexOf('const footerPaths='));
  for (const locale of ['zh','ur','tr','it','ko']) {
    assert.ok(footerBlock.includes(locale + ':['), 'Missing footer labels for ' + locale);
    assert.match(shell, new RegExp(locale + ":'" + (locale === 'zh' ? '菜单' : locale === 'ur' ? 'مینو' : locale === 'tr' ? 'Menü' : locale === 'it' ? 'Menu' : '메뉴') + "'"));
    const home = fs.readFileSync(path.join(__dirname, '..', locale, 'index.html'), 'utf8');
    for (const anchor of ['business','finance','tax','everyday']) assert.ok(home.includes('id="' + anchor + '"'), locale + ' homepage missing ' + anchor + ' navigation target');
  }
});


test('Staged Chinese, Urdu, Turkish, Italian and Korean Unit Converters are localized and functional', () => {
  const phrases = {
    zh: ['在线单位换算器', '换算单位', '长度', '温度'],
    ur: ['آن لائن اکائیوں کا کنورٹر', 'اکائیاں تبدیل کریں', 'لمبائی', 'درجہ حرارت'],
    tr: ['Çevrimiçi Birim Dönüştürücü', 'Birimleri dönüştür', 'Uzunluk', 'Sıcaklık'],
    it: ['Convertitore di unità online', 'Converti unità', 'Lunghezza', 'Temperatura'],
    ko: ['온라인 단위 변환기', '단위 변환', '길이', '온도']
  };
  for (const [locale, expected] of Object.entries(phrases)) {
    const file = path.join(__dirname, '..', locale, 'calculators', 'unit-converter.html');
    assert.ok(fs.existsSync(file), 'Missing ' + locale + ' Unit Converter');
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, new RegExp('<html lang="' + locale + '"'));
    assert.match(html, /name="robots" content="noindex,follow"/);
    assert.ok(html.includes('https://friendlycalculator.in/' + locale + '/calculators/unit-converter.html'));
    assert.match(html, /@type":"WebApplication"/);
    assert.match(html, /id="category"/);
    assert.match(html, /id="amount"/);
    assert.match(html, /id="from"/);
    assert.match(html, /id="to"/);
    assert.match(html, /id="convert"/);
    assert.match(html, /id="swap"/);
    assert.match(html, /id="result"/);
    assert.match(html, /site-shell\.js/);
    for (const phrase of expected) assert.ok(html.includes(phrase), 'Missing localized Unit Converter phrase for ' + locale + ': ' + phrase);
    assert.ok(!html.includes('${JSON.stringify'), 'Unresolved template marker in ' + locale);
    if (locale === 'ur') assert.match(html, /dir="rtl"/);
  }
});


test('Each staged locale homepage links to its localized Unit Converter', () => {
  for (const locale of ['zh','ur','tr','it','ko']) {
    const home = fs.readFileSync(path.join(__dirname, '..', locale, 'index.html'), 'utf8');
    assert.ok(home.includes('/' + locale + '/calculators/unit-converter.html'), locale + ' homepage must expose its Unit Converter');
  }
});


test('staged Chinese, Urdu, Turkish, Italian and Korean percentage calculators are linked from localized homepages', () => {
  const locales = {
    zh: ['百分比计算器', '计算百分比'],
    ur: ['فیصد کیلکولیٹر', 'فیصد معلوم کریں'],
    tr: ['Yüzde Hesaplayıcı', 'Yüzdeyi hesapla'],
    it: ['Calcolatore percentuale', 'Calcola percentuale'],
    ko: ['백분율 계산기', '백분율 계산']
  };
  for (const [locale, phrases] of Object.entries(locales)) {
    const calculator = fs.readFileSync(path.join(__dirname, '..', locale, 'calculators', 'percentage-calculator.html'), 'utf8');
    const homepage = fs.readFileSync(path.join(__dirname, '..', locale, 'index.html'), 'utf8');
    assert.match(calculator, new RegExp('<html lang="' + locale + '"'));
    assert.match(calculator, /name="robots" content="noindex,follow"/);
    assert.match(calculator, /rel="canonical"/);
    assert.match(calculator, /data-mode="of"/);
    assert.match(calculator, /data-mode="is"/);
    assert.match(calculator, /data-mode="change"/);
    assert.match(calculator, /data-mode="difference"/);
    assert.match(calculator, /site-shell\.js/);
    for (const phrase of phrases) {
      assert.ok(calculator.includes(phrase), 'Missing localized calculator phrase: ' + phrase);
    }
    assert.ok(homepage.includes(phrases[0]), 'Missing localized homepage link phrase: ' + phrases[0]);
    assert.ok(homepage.includes('/' + locale + '/calculators/percentage-calculator.html'));
  }
  const urdu = fs.readFileSync(path.join(__dirname, '..', 'ur', 'calculators', 'percentage-calculator.html'), 'utf8');
  assert.match(urdu, /<html lang="ur" dir="rtl">/);
});


test('sitemap hreflang grouping recognizes every published locale prefix', () => {
  const generator = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'generate-sitemaps.cjs'), 'utf8');
  const prefixes = generator.match(/const LANGUAGE_PREFIXES = new Set\(\[([^\]]+)\]\);/);
  assert.ok(prefixes, 'Expected sitemap language-prefix catalogue');
  const actual = [...prefixes[1].matchAll(/'([a-z]{2,3})'/g)].map(match => match[1]);
  const catalogue = require('../config/language-catalogue.json');
  assert.deepEqual(actual, catalogue.locales.map(locale => locale.code).filter(code => code !== 'en' && code !== 'uk'));
});
