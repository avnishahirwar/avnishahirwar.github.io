const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const shell = fs.readFileSync(path.join(__dirname, '..', 'assets', 'site-shell.js'), 'utf8');

test('global language selector supports all configured locales', () => {
  for (const locale of ['en','de','hi','es','fr','pt','ar','id','bn','ta','ja','ru']) {
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
  assert.match(shell, /location\.href=localeHome\[next\]/);
  assert.match(shell, /fc-language-notice/);
});

test('URL locale remains authoritative and language switching does not auto-redirect', () => {
  assert.match(shell, /The URL is the source of truth for the active language/);
  assert.doesNotMatch(shell, /navigator\.languages/);
  assert.doesNotMatch(shell, /location\.replace\(localeHome\[detected\]\)/);
  assert.match(shell, /routeLanguageSelect\.value=currentLocale/);
  assert.match(shell, /setItem\('fc-language-source','manual'\)/);
  assert.doesNotMatch(shell, /localeRoutes\[p\]/);
});

test('Search Calculator is localized across all supported locales', () => {
  for (const label of ['Search Calculator','Rechner suchen','कैलकुलेटर खोजें','Buscar calculadoras','Rechercher un calculateur','Pesquisar calculadoras','البحث عن حاسبة','Cari kalkulator','ক্যালকুলেটর খুঁজুন','கணிப்பானைத் தேடு','計算ツールを検索','Поиск калькулятора']) {
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
