const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const calc = require('../assets/curated-category-calculators.js');
const root = path.resolve(__dirname, '..');
const closeTo = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);

const routes = [
  'growing-degree-units-calculator',
  'concrete-tube-calculator',
  'crore-to-million-converter',
  'flight-carbon-footprint-calculator',
  'average-collection-period-calculator',
  'alcohol-by-volume-calculator',
  'body-adiposity-index-calculator',
  'distributive-property-calculator',
  'pert-calculator',
  'projectile-time-of-flight-calculator',
  'earned-run-average-calculator',
  'frequency-distribution-calculator'
];

 test('GDU applies base and upper cutoff consistently and rejects mismatched days', () => {
  const standard = calc.calculateGdu({ highs: '80', lows: '60', base: '50' });
  assert.equal(standard.days[0].daily, 20);
  const capped = calc.calculateGdu({ highs: '100', lows: '40', base: '50', upperCap: '86' });
  assert.equal(capped.days[0].daily, 18);
  assert.throws(() => calc.calculateGdu({ highs: '80,70', lows: '60', base: '50' }), /same number/);
});

test('concrete tube uses inside-radius geometry and separates optional allowance', () => {
  const r = calc.calculateConcreteTube({ diameterIn: 12, lengthFt: 8, tubeCount: 1, allowancePercent: 0 });
  closeTo(r.geometricFt3, Math.PI * 2.0);
  closeTo(r.geometricYd3, (Math.PI * 2.0) / 27);
  const withAllowance = calc.calculateConcreteTube({ diameterIn: 12, lengthFt: 8, tubeCount: 2, allowancePercent: 10 });
  closeTo(withAllowance.totalWithAllowanceFt3, withAllowance.geometricFt3 * 1.1);
  assert.throws(() => calc.calculateConcreteTube({ diameterIn: 0, lengthFt: 8, tubeCount: 1, allowancePercent: 0 }), /greater than zero/);
});

test('crore conversion preserves sign and scales to million and underlying count', () => {
  const r = calc.calculateCroreToMillion('3.5');
  assert.equal(r.million, 35);
  assert.equal(r.underlyingCount, 35000000);
  assert.equal(calc.calculateCroreToMillion('-2').underlyingCount, -20000000);
});

test('flight emissions requires a factor note and returns a user-factor estimate', () => {
  const r = calc.calculateFlightEmissions({ distanceKm: 1200, factor: 0.15, factorNotes: 'Illustrative only' });
  assert.equal(r.emissionsKg, 180);
  assert.equal(r.emissionsTonnes, 0.18);
  assert.throws(() => calc.calculateFlightEmissions({ distanceKm: 1200, factor: 0.15 }), /source or scope/);
});

test('average collection period uses average receivables and period days', () => {
  const r = calc.calculateAverageCollectionPeriod({ beginningReceivables: 8000, endingReceivables: 12000, netCreditSales: 100000, periodDays: 365 });
  assert.equal(r.averageReceivables, 10000);
  assert.equal(r.days, 36.5);
  assert.throws(() => calc.calculateAverageCollectionPeriod({ beginningReceivables: 1, endingReceivables: 1, netCreditSales: 0, periodDays: 365 }), /greater than zero/);
});

test('ABV calculator provides primary gravity-based estimate and shortcut', () => {
  const r = calc.calculateAbv({ originalGravity: 1.048, finalGravity: 1.012 });
  closeTo(r.abvPercent, 4.801, 0.01);
  closeTo(r.shortcutPercent, 4.725, 1e-10);
  assert.throws(() => calc.calculateAbv({ originalGravity: 1.01, finalGravity: 1.02 }), /original gravity greater/);
});

test('BAI converts centimeters to meters and returns a non-diagnostic index', () => {
  const r = calc.calculateBai({ hipCm: 97, heightCm: 173 });
  assert.equal(r.heightM, 1.73);
  closeTo(r.bai, 24.63, 0.02);
});

test('distributive property expands numeric terms and rejects symbolic input', () => {
  const r = calc.calculateDistributive({ multiplier: 3, terms: '2,4' });
  assert.deepEqual(r.products, [6, 12]);
  assert.equal(r.total, 18);
  assert.throws(() => calc.calculateDistributive({ multiplier: 3, terms: 'x,4' }), /finite number/);
});

test('distributive browser renderer formats expansion without using map index as precision', () => {
  function makeNode(tagName) {
    const node = {
      tagName,
      children: [],
      _text: '',
      appendChild(child) { this.children.push(child); return child; },
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; }
    };
    Object.defineProperty(node, 'textContent', {
      get() { return this._text + this.children.map(child => child.textContent).join(''); },
      set(value) { this._text = String(value ?? ''); this.children = []; }
    });
    return node;
  }
  const form = makeNode('form');
  form.elements = { multiplier: { value: '3' }, terms: { value: '2,4' } };
  form.addEventListener = (name, handler) => { form.submitHandler = handler; };
  form.requestSubmit = () => form.submitHandler({ preventDefault() {} });
  const nodes = { calcForm: form, calcStatus: makeNode('p'), calcResults: makeNode('section') };
  const document = { readyState: 'complete', body: { dataset: { calculator: 'distributive' } }, createElement: tag => makeNode(tag), getElementById: id => nodes[id] };
  const source = fs.readFileSync(path.join(root, 'assets/curated-category-calculators.js'), 'utf8');
  vm.runInNewContext(source, { window: {}, document, Number, Math, Map, String, Object, Error });
  assert.match(nodes.calcResults.textContent, /3 × \(2 \+ 4\) = 6 \+ 12 = 18/);
  assert.match(nodes.calcStatus.textContent, /Calculation complete/);
});

test('PERT weights the most-likely duration four times', () => {
  const r = calc.calculatePert({ optimistic: 2, mostLikely: 4, pessimistic: 8, unit: 'days' });
  closeTo(r.expected, 26 / 6);
  assert.equal(r.unit, 'days');
  assert.throws(() => calc.calculatePert({ optimistic: 5, mostLikely: 4, pessimistic: 8 }), /optimistic/);
});

test('projectile time of flight uses equal-height idealized model', () => {
  const r = calc.calculateTimeOfFlight({ speed: 20, angleDegrees: 30, gravity: 9.81 });
  closeTo(r.seconds, 2.0387359837, 1e-8);
  assert.throws(() => calc.calculateTimeOfFlight({ speed: 20, angleDegrees: 91, gravity: 9.81 }), /between 0° and 90°/);
});

test('ERA handles outs as thirds and zero outs as undefined', () => {
  const r = calc.calculateEra({ earnedRuns: 3, outs: 17 });
  closeTo(r.era, 81 / 17);
  assert.deepEqual(calc.calculateEra({ earnedRuns: 1, outs: 0 }), { earnedRuns: 1, outs: 0, defined: false, era: null });
});

test('frequency distribution separates numeric cumulative tables from nominal categories', () => {
  const data = [
    ...Array(3).fill(2), ...Array(5).fill(3), ...Array(3).fill(4),
    ...Array(6).fill(5), ...Array(2).fill(6), 7
  ].join(',');
  const numeric = calc.calculateFrequencyDistribution(data);
  assert.equal(numeric.numeric, true);
  assert.equal(numeric.total, 20);
  assert.deepEqual(numeric.rows.map(row => row.frequency), [3, 5, 3, 6, 2, 1]);
  assert.equal(numeric.rows.at(-1).cumulativeFrequency, 20);
  const nominal = calc.calculateFrequencyDistribution('blue, red, blue, green');
  assert.equal(nominal.numeric, false);
  assert.equal(nominal.rows.find(row => row.value === 'blue').frequency, 2);
  assert.equal(nominal.rows[0].cumulativeFrequency, null);
});

test('all 12 routes have a working page, formula, example, limitations, citations and unique catalogue entries', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const slug of routes) {
    const url = `/calculators/${slug}.html`;
    const page = fs.readFileSync(path.join(root, url.slice(1)), 'utf8');
    assert.equal(index.filter(item => item.url === url).length, 1, `${url} search entry`);
    assert.equal(directory.split(`href="${url}"`).length - 1, 1, `${url} directory entry`);
    assert.equal(about.split(`href="${url}"`).length - 1, 1, `${url} About entry`);
    assert.ok(sitemap.includes(`https://friendlycalculator.in${url}`), `${url} sitemap URL`);
    assert.match(page, /<form id="calcForm"/);
    assert.match(page, /curated-category-calculators\.js/);
    assert.match(page, /<h2>Formula[^<]*<\/h2>/i);
    assert.match(page, /worked example|example/i);
    assert.match(page, /limitations|assumptions/i);
    assert.ok((page.match(/href="https?:\/\//g) || []).length >= 2, `${url} should have at least two external source links`);
  }
  assert.equal(index.filter(item => item.url.startsWith('/calculators/')).length, 567);
  assert.equal(index.length, 568);
  assert.equal(new Set(index.map(item => item.url)).size, 568);
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /Search all 567 calculators/);
  assert.match(directory, /Showing all 567 calculators/);
  assert.match(about, /567 public calculators/);
});
