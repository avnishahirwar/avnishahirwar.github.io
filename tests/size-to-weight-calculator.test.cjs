const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const route = '/calculators/size-to-weight-calculator-rectangular-box.html';
const page = fs.readFileSync(path.join(root, route.slice(1)), 'utf8');
const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
const runtime = fs.readFileSync(path.join(root, 'assets/size-to-weight-calculator.js'), 'utf8');

function calculator() {
  const sandbox = { window: {}, document: { getElementById: () => null } };
  vm.runInNewContext(runtime, sandbox, { timeout: 1000 });
  return sandbox.window.FriendlySizeToWeight.calculate;
}

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

test('rectangular-block example calculates volume, mass and weight force', () => {
  const result = calculator()({ length: 1, width: 0.5, height: 0.2, lengthUnit: 'm', densityKgM3: 500 });
  close(result.volumeM3, 0.1);
  close(result.massKg, 50);
  close(result.massLb, 110.23113109243879);
  close(result.weightN, 490.3325);
  close(result.weightLbf, 110.2311314706075);
});

test('dimension units convert consistently to cubic metres', () => {
  const calc = calculator();
  const metric = calc({ length: 1000, width: 500, height: 200, lengthUnit: 'mm', densityKgM3: 500 });
  const imperial = calc({ length: 12, width: 6, height: 4, lengthUnit: 'in', densityKgM3: 1000 });
  close(metric.volumeM3, 0.1);
  close(metric.massKg, 50);
  close(imperial.volumeM3, 0.004719474432);
  close(imperial.massKg, 4.719474432);
});

test('invalid dimensions, density, units and overflow are rejected', () => {
  const calc = calculator();
  for (const input of [
    { length: 0, width: 1, height: 1, lengthUnit: 'm', densityKgM3: 500 },
    { length: 1, width: -1, height: 1, lengthUnit: 'm', densityKgM3: 500 },
    { length: 1, width: 1, height: 1, lengthUnit: 'm', densityKgM3: 0 },
    { length: 1, width: 1, height: 1, lengthUnit: 'yard', densityKgM3: 500 },
    { length: 1e308, width: 1e308, height: 1, lengthUnit: 'm', densityKgM3: 500 }
  ]) assert.throws(() => calc(input), error => error.name === 'RangeError');
});

test('page is indexed, linked from both directories and present in sitemap', () => {
  const item = index.find(entry => entry.url === route);
  assert.ok(item, 'missing search-index record');
  assert.equal(item.name, 'Size to Weight Calculator (Rectangular Box)');
  const siteDirectory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const newCalculators = fs.readFileSync(path.join(root, 'calculator/new-calculators.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.ok(siteDirectory.includes(`href="${route}"`));
  assert.ok(newCalculators.includes(`href="${route}"`));
  assert.ok(sitemap.includes(`https://friendlycalculator.in${route}`));
  assert.ok(page.includes(`rel="canonical" href="https://friendlycalculator.in${route}"`));
  assert.ok(page.includes('application/ld+json'));
  assert.ok(page.includes('hollow box'));
  assert.ok(page.includes('material density'));
});
