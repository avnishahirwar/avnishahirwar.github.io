const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const origin = 'https://friendlycalculator.in';
const localeDirs = ['hi','de','es','fr','pt','ar','id','bn','ta','ja','ru','mr','vi','te','gu','kn','ur'];
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const head = html => {
  const end = html.toLowerCase().indexOf('</head>');
  return end < 0 ? html : html.slice(0, end);
};
const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? match[2] : null;
};
const lang = html => {
  const tag = head(html).match(/<html\b[^>]*>/i);
  return tag ? attr(tag[0], 'lang').toLowerCase() : null;
};
const canonical = html => {
  const tag = head(html).match(/<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i);
  assert.ok(tag, 'Expected a canonical link');
  return new URL(tag[1], origin).href;
};
const alternates = html => [...head(html).matchAll(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["']([^"']+)["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi)]
  .map(match => ({ lang: match[1].toLowerCase(), href: new URL(match[2], origin).href }));
const noindex = html => /<meta\b[^>]*\bname=["'](?:robots|googlebot)["'][^>]*\bcontent=["'][^"']*\bnoindex\b/i.test(head(html)) ||
  /<meta\b[^>]*\bcontent=["'][^"']*\bnoindex\b[^>]*\bname=["'](?:robots|googlebot)["']/i.test(head(html));

test('published age-calculator pages no longer show unrelated vehicle-consumption disclaimers', () => {
  const cases = {
    es: {
      old: 'Los resultados son estimaciones basadas en las fechas y valores introducidos. El consumo real depende del vehículo, el tráfico, la ruta y las condiciones de conducción.',
      corrected: 'El resultado muestra la diferencia de calendario entre las dos fechas en años, meses y días.'
    },
    fr: {
      old: 'Les résultats sont des estimations fondées sur les dates et valeurs saisies. La consommation réelle dépend du véhicule, du trafic, de l’itinéraire et de la conduite.',
      corrected: 'Le résultat exprime en années, mois et jours l’écart calendaire entre les deux dates.'
    },
    pt: {
      old: 'Os resultados são estimativas com base nas datas e valores informados. O consumo real depende do veículo, trânsito, rota e condições de condução.',
      corrected: 'O resultado mostra, em anos, meses e dias, a diferença de calendário entre as duas datas.'
    },
    id: {
      old: 'Hasil adalah perkiraan berdasarkan tanggal dan nilai yang dimasukkan. Konsumsi sebenarnya bergantung pada kendaraan, lalu lintas, rute, dan kondisi berkendara.',
      corrected: 'Hasil menampilkan selisih kalender antara dua tanggal dalam tahun, bulan, dan hari.'
    },
    bn: {
      old: 'ফলাফল প্রদত্ত তারিখ ও মানের ভিত্তিতে অনুমান। প্রকৃত খরচ গাড়ি, যানজট, রাস্তা ও চালনার অবস্থার ওপর নির্ভর করে।',
      corrected: 'ফলাফলে ক্যালেন্ডার অনুযায়ী বছর, মাস ও দিনের পার্থক্য দেখানো হয়।'
    },
    ta: {
      old: 'முடிவுகள் உள்ளிட்ட தேதிகள் மற்றும் மதிப்புகளின் அடிப்படையிலான மதிப்பீடுகள். உண்மையான பயன்பாடு வாகனம், போக்குவரத்து, பாதை மற்றும் ஓட்டும் சூழலைப் பொறுத்தது.',
      corrected: 'முடிவு, உள்ளிடப்பட்ட தேதிகளுக்கிடையிலான காலண்டர் வேறுபாட்டை ஆண்டுகள், மாதங்கள், நாட்களாகக் காட்டும்.'
    }
  };
  for (const [locale, strings] of Object.entries(cases)) {
    const html = read(`${locale}/calculators/age-calculator.html`);
    assert.ok(!html.includes(strings.old), `${locale} retains unrelated vehicle copy`);
    assert.ok(html.includes(strings.corrected), `${locale} is missing the age-specific explanation`);
  }
});

test('published return and age-difference FAQs contain no unrelated calculator questions', () => {
  const phrases = {
    fr: { absolute: 'Qu’est-ce que le rendement absolu ?', age: 'Comment calculer un écart d’âge ?', circle: 'Qu’est-ce que l’aire d’un cercle ?' },
    pt: { absolute: 'O que é retorno absoluto?', age: 'Como a diferença de idade é calculada?', circle: 'O que é a área de um círculo?' },
    ar: { absolute: 'ما العائد المطلق؟', age: 'كيف يُحسب فرق العمر؟', circle: 'ما مساحة الدائرة؟' },
    id: { absolute: 'Apa itu imbal hasil absolut?', age: 'Bagaimana selisih usia dihitung?', circle: 'Apa itu luas lingkaran?' },
    bn: { absolute: 'অ্যাবসোলিউট রিটার্ন কী?', age: 'বয়সের পার্থক্য কীভাবে হিসাব হয়?', circle: 'বৃত্তের ক্ষেত্রফল কী?' },
    ta: { absolute: 'முழுமையான வருவாய் என்றால் என்ன?', age: 'வயது வித்தியாசம் எவ்வாறு கணக்கிடப்படுகிறது?', circle: 'வட்டத்தின் பரப்பளவு என்றால் என்ன?' }
  };
  for (const [locale, q] of Object.entries(phrases)) {
    const returns = read(`${locale}/calculators/absolute-return-calculator.html`);
    const ages = read(`${locale}/calculators/age-difference-calculator.html`);
    assert.ok(returns.includes(q.absolute), `${locale} lost its relevant return FAQ`);
    assert.ok(ages.includes(q.age), `${locale} lost its relevant age-difference FAQ`);
    assert.ok(!returns.includes(q.age), `${locale} return page retains an age FAQ`);
    assert.ok(!ages.includes(q.absolute), `${locale} age page retains a return FAQ`);
    assert.ok(!returns.includes(q.circle), `${locale} return page retains a circle-area FAQ`);
    assert.ok(!ages.includes(q.circle), `${locale} age page retains a circle-area FAQ`);
  }
});

function publishedRouteFiles(route) {
  const localeFiles = fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && fs.existsSync(path.join(root, entry.name, route)))
    .map(entry => path.join(entry.name, route));
  return [route, ...localeFiles];
}

function alternateMap(html) {
  const items = alternates(html);
  const map = new Map(items.map(item => [item.lang, item.href]));
  assert.equal(map.size, items.length, 'Hreflang entries must be unique');
  return map;
}

test('existing localized landing routes have self-canonicals and reciprocal hreflang clusters', () => {
  const routes = [
    'calculator/business-calculators.html',
    'calculator/free-tools-research.html',
    'calculator/languages.html',
    'calculator/methodology.html',
    'calculator/tax.html',
    'calculators/percentage-calculator.html'
  ];
  for (const route of routes) {
    const pages = publishedRouteFiles(route).map(file => ({ file, html: read(file) }))
      .filter(page => !noindex(page.html));
    const canonicalByLang = new Map();
    for (const page of pages) {
      const code = lang(page.html);
      assert.ok(code, `Missing html lang on ${page.file}`);
      const expectedCanonical = page.file === route
        ? `${origin}/${route}`
        : `${origin}/${page.file}`;
      assert.equal(canonical(page.html), expectedCanonical, `${page.file} must canonicalize to its own locale URL`);
      assert.ok(!canonicalByLang.has(code), `${route} has duplicate lang ${code}`);
      canonicalByLang.set(code, expectedCanonical);
    }
    assert.ok(canonicalByLang.has('en'), `${route} needs an English route`);
    for (const page of pages) {
      const code = lang(page.html);
      const expected = new Map(canonicalByLang);
      expected.set('x-default', canonicalByLang.get('en'));
      if (route === 'calculator/methodology.html' && page.file === route) {
        expected.set('hi', `${origin}/hi/methodology.html`);
      }
      if (route === 'calculator/methodology.html' && page.file === 'hi/calculator/methodology.html') {
        expected.delete('en');
      }
      const actual = alternateMap(page.html);
      for (const [alternateLang, href] of expected) {
        assert.equal(actual.get(alternateLang), href, `${page.file} has an incorrect ${alternateLang} alternate`);
      }
      assert.equal(actual.size, expected.size, `${page.file} has unexpected alternate entries`);
    }
  }
  const legacyHindi = read('hi/methodology.html');
  const englishMethodology = read('calculator/methodology.html');
  assert.equal(alternateMap(englishMethodology).get('hi'), canonical(legacyHindi));
  assert.equal(alternateMap(legacyHindi).get('en'), canonical(englishMethodology));
});

test('existing article and guide routes expose reciprocal English/Hindi alternates', () => {
  const routes = [
    'blog/home-loan-prepayment.html',
    'blog/index.html',
    'blog/old-vs-new-tax-regime.html',
    'blog/sip-vs-fd.html',
    'guides/index.html'
  ];
  let checked = 0;
  for (const route of routes) {
    const enFile = path.join(root, route);
    const hiFile = path.join(root, 'hi', route);
    if (!fs.existsSync(enFile) || !fs.existsSync(hiFile)) continue;
    const enHtml = read(route);
    const hiHtml = read(path.join('hi', route));
    if (noindex(enHtml) || noindex(hiHtml)) continue;
    for (const [label, html] of [['English', enHtml], ['Hindi', hiHtml]]) {
      const byLang = alternateMap(html);
      assert.equal(byLang.get('en'), canonical(enHtml), `${label} ${route} needs its English alternate`);
      assert.equal(byLang.get('hi'), canonical(hiHtml), `${label} ${route} needs its Hindi alternate`);
      assert.equal(byLang.get('x-default'), canonical(enHtml), `${label} ${route} needs its English x-default`);
    }
    checked++;
  }
  assert.ok(checked > 0, 'Expected at least one published English/Hindi article or guide route pair');
});

function metaContent(html, key) {
  const keyAttr = key.toLowerCase().startsWith('og:') ? 'property' : 'name';
  for (const match of head(html).matchAll(/<meta\b[^>]*>/gi)) {
    if (attr(match[0], keyAttr)?.toLowerCase() === key.toLowerCase()) return attr(match[0], 'content');
  }
  return null;
}

function decodeEntities(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

test('translated landing pages use localized Open Graph and Twitter metadata', () => {
  const routes = [
    'calculator/business-calculators.html',
    'calculator/free-tools-research.html',
    'calculator/languages.html',
    'calculator/methodology.html',
    'calculator/tax.html',
    'calculators/percentage-calculator.html'
  ];
  let checked = 0;
  for (const route of routes) {
    for (const file of publishedRouteFiles(route).filter(file => file !== route)) {
      const html = read(file);
      if (noindex(html)) continue;
      const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
      const description = metaContent(html, 'description');
      const pageCanonical = canonical(html);
      assert.ok(title, `${file} is missing a title`);
      assert.ok(description, `${file} is missing a meta description`);
      assert.equal(metaContent(html, 'og:url'), pageCanonical, `${file} Open Graph URL must match its canonical`);
      for (const key of ['og:title', 'twitter:title']) {
        assert.equal(decodeEntities(metaContent(html, key)), decodeEntities(title), `${file} ${key} must match its localized title`);
      }
      for (const key of ['og:description', 'twitter:description']) {
        assert.equal(decodeEntities(metaContent(html, key)), decodeEntities(description), `${file} ${key} must match its localized description`);
      }
      checked++;
    }
  }
  assert.ok(checked > 0, 'Expected localized landing pages to validate');
});
