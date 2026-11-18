const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const calc = require('../assets/curated-category-calculators.js');
const root = path.resolve(__dirname, '..');
const closeTo = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);

const routes = [
  ['cricket-thermometer', 'crickets-chirping-thermometer-calculator', 'Cricket Chirp Temperature Estimator'],
  ['countersink-depth', 'countersink-depth-calculator', 'Countersink Depth Calculator'],
  ['inch-foot-torque', 'inch-pounds-to-foot-pounds-calculator', 'Inch-Pounds to Foot-Pounds Converter'],
  ['dollars-words', 'dollars-in-words-converter', 'Dollars in Words Converter'],
  ['gmroi', 'gmroi-calculator', 'GMROI Calculator'],
  ['butter-stick', 'butter-stick-converter', 'Butter Stick Converter'],
  ['bri', 'body-roundness-index-calculator', 'Body Roundness Index (BRI) Calculator'],
  ['modular-inverse', 'multiplicative-inverse-modulo-calculator', 'Multiplicative Inverse Modulo Calculator'],
  ['gsd', 'ground-sample-distance-calculator', 'Ground Sample Distance (GSD) Calculator'],
  ['impulse-momentum', 'impulse-and-momentum-calculator', 'Impulse and Momentum Calculator'],
  ['ops', 'ops-calculator-baseball', 'Baseball OPS Calculator'],
  ['coin-toss-streak', 'coin-toss-streak-probability-calculator', 'Coin Toss Streak Probability Calculator']
];

test('12 formula engines return the documented worked examples', () => {
  const cricket = calc.calculateCricketTemperature({ chirps: 25 });
  assert.equal(cricket.fahrenheit, 65);
  closeTo(cricket.celsius, 18.3333333333, 1e-9);
  closeTo(calc.calculateCountersinkDepth({ majorDiameter: 12, pilotDiameter: 5, angleDegrees: 90 }).depth, 3.5);
  assert.equal(calc.calculateInchPounds(120).footPounds, 10);
  const money = calc.calculateDollarWords('130.45');
  assert.equal(money.checkStyle, 'one hundred thirty dollars and 45/100');
  assert.equal(money.spokenStyle, 'one hundred thirty dollars and forty five cents');
  assert.equal(calc.calculateDollarWords('1.01').checkStyle, 'one dollar and 01/100');
  const gmroi = calc.calculateGmroi({ netSales: 100000, cogs: 60000, beginningInventory: 20000, endingInventory: 30000 });
  assert.equal(gmroi.averageInventory, 25000);
  assert.equal(gmroi.gmroi, 1.6);
  const butter = calc.calculateButterConversion({ amount: 1, unit: 'sticks' });
  assert.equal(butter.cups, 0.5);
  assert.equal(butter.tablespoons, 8);
  assert.equal(butter.grams, 113.4);
  closeTo(calc.calculateBri({ waistCm: 85, heightCm: 170 }).bri, 3.3588030217, 1e-9);
  const inverse = calc.calculateModularInverse({ a: 17, modulus: 43 });
  assert.equal(inverse.inverse, '38');
  assert.equal(inverse.verification, '1');
  assert.throws(() => calc.calculateModularInverse({ a: 6, modulus: 15 }), /No multiplicative inverse/);
  assert.equal(calc.calculateGsd({ heightM: 120, sensorWidthMm: 13.2, focalLengthMm: 8.8, imageWidthPx: 4000 }).cmPerPixel, 4.5);
  const impulse = calc.calculateImpulseMomentum({ mass: 2, initialVelocity: 3, finalVelocity: -1, deltaTime: 0.5 });
  assert.equal(impulse.impulse, -8);
  assert.equal(impulse.averageForce, -16);
  const ops = calc.calculateOps({ atBats: 500, singles: 80, doubles: 30, triples: 5, homeRuns: 25, walks: 70, hitByPitch: 5, sacrificeFlies: 5 });
  assert.equal(ops.totalBases, 255);
  closeTo(ops.onBasePercentage, 215 / 580);
  assert.equal(ops.sluggingPercentage, 0.51);
  closeTo(ops.ops, 215 / 580 + 0.51);
  closeTo(calc.calculateCoinTossStreak({ tosses: 20, streak: 5, headsProbability: 0.5 }).probability, 0.24987030029296875);
});

test('new calculators reject invalid inputs and handle boundary probabilities', () => {
  assert.throws(() => calc.calculateCricketTemperature({ chirps: 1.5 }), /whole number/);
  assert.throws(() => calc.calculateCountersinkDepth({ majorDiameter: 5, pilotDiameter: 12, angleDegrees: 90 }), /larger than/);
  assert.throws(() => calc.calculateDollarWords('12.345'), /no more than two decimal places/);
  assert.throws(() => calc.calculateDollarWords('-1.00'), /non-negative USD/);
  assert.throws(() => calc.calculateGmroi({ netSales: 1, cogs: 1, beginningInventory: 0, endingInventory: 0 }), /greater than zero/);
  assert.throws(() => calc.calculateButterConversion({ amount: 1, unit: 'litres' }), /Choose/);
  assert.throws(() => calc.calculateBri({ waistCm: 600, heightCm: 100 }), /real-valued range/);
  assert.throws(() => calc.calculateGsd({ heightM: 1, sensorWidthMm: 1, focalLengthMm: 1, imageWidthPx: 1.5 }), /whole number/);
  assert.equal(calc.calculateImpulseMomentum({ mass: 2, initialVelocity: 3, finalVelocity: 1 }).averageForce, null);
  assert.throws(() => calc.calculateOps({ atBats: 1, singles: 2, doubles: 0, triples: 0, homeRuns: 0, walks: 0, hitByPitch: 0, sacrificeFlies: 0 }), /cannot exceed at-bats/);
  assert.equal(calc.calculateCoinTossStreak({ tosses: 4, streak: 5, headsProbability: 0.5 }).probability, 0);
  assert.equal(calc.calculateCoinTossStreak({ tosses: 10, streak: 3, headsProbability: 0 }).probability, 0);
  assert.equal(calc.calculateCoinTossStreak({ tosses: 3, streak: 3, headsProbability: 1 }).probability, 1);
  assert.throws(() => calc.calculateCoinTossStreak({ tosses: 10, streak: 3, headsProbability: 1.1 }), /from 0 to 1/);
});

test('all 12 new browser forms initialize and render their calculation results', () => {
  const samples = {
    'cricket-thermometer': { chirps: '25' },
    'countersink-depth': { majorDiameter: '12', pilotDiameter: '5', angleDegrees: '90', lengthUnit: 'mm' },
    'inch-foot-torque': { inchPounds: '120' },
    'dollars-words': { amount: '130.45' },
    gmroi: { netSales: '100000', cogs: '60000', beginningInventory: '20000', endingInventory: '30000' },
    'butter-stick': { amount: '1', unit: 'sticks' },
    bri: { waistCm: '85', heightCm: '170' },
    'modular-inverse': { a: '17', modulus: '43' },
    gsd: { heightM: '120', sensorWidthMm: '13.2', focalLengthMm: '8.8', imageWidthPx: '4000' },
    'impulse-momentum': { mass: '2', initialVelocity: '3', finalVelocity: '-1', deltaTime: '0.5' },
    ops: { atBats: '500', singles: '80', doubles: '30', triples: '5', homeRuns: '25', walks: '70', hitByPitch: '5', sacrificeFlies: '5' },
    'coin-toss-streak': { tosses: '20', streak: '5', headsProbability: '0.5' }
  };
  function makeNode(tagName) {
    const node = { tagName, children: [], _text: '', hidden: true, className: '', appendChild(child) { this.children.push(child); return child; }, append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children = children; } };
    Object.defineProperty(node, 'textContent', { get() { return this._text + this.children.map(child => child.textContent).join(''); }, set(value) { this._text = String(value ?? ''); this.children = []; } });
    return node;
  }
  const source = fs.readFileSync(path.join(root, 'assets/curated-category-calculators.js'), 'utf8');
  for (const [key] of routes) {
    const form = makeNode('form');
    form.elements = Object.fromEntries(Object.entries(samples[key]).map(([name, value]) => [name, { value }]));
    form.addEventListener = (name, handler) => { if (name === 'submit') form.submitHandler = handler; };
    form.requestSubmit = () => form.submitHandler({ preventDefault() {} });
    const nodes = { calcForm: form, calcStatus: makeNode('p'), calcResults: makeNode('section') };
    const document = { readyState: 'complete', body: { dataset: { calculator: key } }, createElement: tag => makeNode(tag), getElementById: id => nodes[id] };
    vm.runInNewContext(source, { window: {}, document, Number, Math, Map, String, Object, Error, BigInt });
    assert.match(nodes.calcStatus.textContent, /Calculation complete/, `${key} status`);
    assert.ok(nodes.calcResults.textContent.length > 0, `${key} output`);
  }
});

test('all 12 pages are unique, cited, formula-complete and integrated into every catalogue surface', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'calculator/about.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const [key, slug, name] of routes) {
    const url = `/calculators/${slug}.html`;
    const page = fs.readFileSync(path.join(root, url.slice(1)), 'utf8');
    assert.equal(index.filter(item => item.url === url).length, 1, `${url} search route`);
    assert.equal(index.find(item => item.url === url).name, name);
    assert.equal(directory.split(`href="${url}"`).length - 1, 1, `${url} directory link`);
    assert.equal(about.split(`href="${url}"`).length - 1, 1, `${url} About link`);
    assert.ok(sitemap.includes(`https://friendlycalculator.in${url}`), `${url} sitemap URL`);
    assert.match(page, new RegExp(`data-calculator="${key}"`));
    assert.match(page, /<form id="calcForm"/);
    assert.match(page, /curated-category-calculators\.js/);
    assert.match(page, /<h2>Formula<\/h2>/);
    assert.match(page, /Worked example/);
    assert.match(page, /Assumptions and limitations/);
    assert.ok((page.match(/href="https?:\/\//g) || []).length >= 2, `${url} citations`);
  }
  assert.equal(index.filter(item => item.url.startsWith('/calculators/')).length, 592);
  assert.equal(index.length, 593);
  assert.equal(new Set(index.map(item => item.url)).size, 593);
  assert.match(homepage, /Search all 592 calculators/);
  assert.match(directory, /Showing all 592 calculators in 20 categories/);
  assert.match(about, /592 public calculators/);
  assert.equal((sitemap.match(/<url>/g) || []).length, 1487);
});
