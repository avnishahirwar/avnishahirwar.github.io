const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const shell = fs.readFileSync(path.join(__dirname, '..', 'assets', 'site-shell.js'), 'utf8');

test('global language selector supports all configured locales', () => {
  for (const locale of ['en','de','hi','es','fr','pt','ar','id','bn','ta','ja','ru','mr']) {
    assert.ok(shell.includes(locale + ':'));
  }
  assert.match(shell, /fc-language-select/);
  assert.match(shell, /fc-language-preference/);
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
  assert.match(shell, /p==='\/'\?preferredUiLocale:'en'/);
  assert.match(shell, /if\(p==='\/'&&currentLocale!=='en'\)location\.replace\(localeHome\[currentLocale\]/);
  assert.match(shell, /routeLanguageSelect\.value=currentLocale/);
  assert.match(shell, /setItem\('fc-language-source','manual'\)/);
  assert.match(shell, /p\.startsWith\('\/hi\/'\)/);
});

test('Search Calculator is localized across all supported locales', () => {
  for (const label of ['Search Calculator','Rechner suchen','कैलकुलेटर खोजें','Buscar calculadoras','Rechercher un calculateur','Pesquisar calculadoras','البحث عن حاسبة','Cari kalkulator','ক্যালকুলেটর খুঁজুন','கணிப்பானைத் தேடு','計算ツールを検索','Поиск калькулятора','कॅल्क्युलेटर शोधा']) {
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
  assert.ok(shell.includes("const localeCodes=['hi','es','fr','pt','ar','id','bn','ta','ja','ru']"));
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
    ru: ['Базовый калькулятор', 'сложение', 'Как это работает']
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
  assert.ok(shell.includes("const routeLocaleMatch=/^\\/(hi|de|es|fr|pt|ar|id|bn|ta|ja|ru)\\//.exec(p);"));
  assert.ok(shell.includes("document.documentElement.lang=routeLocale;"));
  assert.ok(shell.includes("document.documentElement.dir=routeLocale==='ar'?'rtl':'ltr';"));
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


test('every homepage locale alternate cluster includes the Marathi edition and x-default', () => {
  const pages = ['index.html','hi/index.html','es/index.html','fr/index.html','pt/index.html','ar/index.html','id/index.html','bn/index.html','ta/index.html','de/index.html','ja/index.html','ru/index.html','mr/index.html'];
  for (const file of pages) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    for (const locale of ['en','hi','es','fr','pt','ar','id','bn','ta','de','ja','ru','mr','x-default']) {
      assert.match(html, new RegExp('hreflang="' + locale + '"'), file + ' missing ' + locale + ' alternate');
    }
  }
});
