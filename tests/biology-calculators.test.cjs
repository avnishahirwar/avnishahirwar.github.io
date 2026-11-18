'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const biology = require('../assets/biology-calculators.js');

const root = path.resolve(__dirname, '..');
const pages = [
  'sheep-gestation-calculator', 'dog-age-calculator', 'dog-nutrition-calculator',
  'dog-chocolate-toxicity-calculator', 'dog-heat-cycle-calculator',
  'metacam-dosage-calculator-for-dogs', 'dog-raisin-toxicity-calculator',
  'dog-water-intake-calculator', 'quiz-dog-size-calculator',
  'tramadol-for-dogs-calculator', 'cat-age-calculator', 'cat-calorie-calculator',
  'metacam-dosage-calculator-for-cats', 'quiz-cat-age-calculator', 'bird-age-calculator'
];
pages.push('dry-matter-calculator', 'feed-conversion-ratio-calculator');

function value(result, label) {
  const row = result.rows.find((item) => item.label.includes(label));
  assert.ok(row, 'Missing result row: ' + label);
  return row.value;
}

test('sheep gestation adds the published average and planning-window days', () => {
  const r = biology.calculate('sheep-gestation', { matingDate: '2024-01-01' });
  assert.equal(value(r, '147-day average'), '2024-05-27');
  assert.equal(value(r, '144 days'), '2024-05-24');
  assert.equal(value(r, '151 days'), '2024-05-31');
});

test('dry matter calculator uses net same-unit sample masses and labels moisture by difference', () => {
  const r = biology.calculate('dry-matter', { asFedMass: '100', dryMass: '40', massUnit: 'g' });
  assert.equal(value(r, 'Dry matter content'), '40.00');
  assert.equal(value(r, 'Moisture by difference'), '60.00');
  assert.match(r.warnings.join(' '), /volatile substances/i);
  assert.ok(biology.calculate('dry-matter', { asFedMass: '100', dryMass: '101', massUnit: 'g' }).error);
  assert.ok(biology.calculate('dry-matter', { asFedMass: '0', dryMass: '0', massUnit: 'g' }).error);
});

test('feed conversion ratio requires positive gain and states the selected feed basis', () => {
  const r = biology.calculate('feed-conversion-ratio', { feedMassKg: '10', startWeightKg: '40', endWeightKg: '45', feedBasis: 'asFed' });
  assert.equal(value(r, 'Feed conversion ratio'), '2.00');
  assert.match(r.rows.find((row) => row.label.includes('Feed conversion ratio')).unit, /kg as-fed feed\/kg liveweight gain/);
  assert.ok(biology.calculate('feed-conversion-ratio', { feedMassKg: '10', startWeightKg: '45', endWeightKg: '45', feedBasis: 'asFed' }).error);
  assert.ok(biology.calculate('feed-conversion-ratio', { feedMassKg: '10', startWeightKg: '45', endWeightKg: '40', feedBasis: 'dryMatter' }).error);
  assert.match(r.warnings.join(' '), /not a target.*benchmark/i);
});

test('dog age methods are explicit and return distinct approximate estimates', () => {
  assert.equal(value(biology.calculate('dog-age', { ageYears: '1', method: 'chart' }), 'human-age equivalent'), '15.0');
  const log = Number(value(biology.calculate('dog-age', { ageYears: '2', method: 'methylation' }), 'human-age equivalent'));
  assert.ok(Math.abs(log - (16 * Math.log(2) + 31)) < 0.06);
});

test('dog nutrition applies RER and adult-factor range, rejecting unsupported categories', () => {
  const r = biology.calculate('dog-nutrition', { weightKg: '10', status: 'neutered', foodKcalPer100g: '350' });
  assert.equal(value(r, 'Resting energy'), '394');
  assert.match(value(r, 'daily energy estimate'), /^551–630$/);
  assert.ok(r.rows.some((x) => x.unit.includes('g/day')));
  assert.ok(biology.calculate('dog-nutrition', { weightKg: '10', status: 'puppy' }).error);
});

test('dog chocolate estimate includes urgent guidance and never declares a safe result', () => {
  const r = biology.calculate('dog-chocolate-toxicity', { weightKg: '10', chocolateType: 'dark', amountG: '10' });
  assert.equal(value(r, 'Estimated exposure per body weight'), '5.60');
  assert.match(r.warnings.join(' '), /promptly/i);
  assert.match(value(r, 'reference-band context'), /does NOT mean safe/);
});

test('dog heat-cycle interval is calendar-based and date order is validated', () => {
  const r = biology.calculate('dog-heat-cycle', { lastHeatStart: '2024-01-31', today: '2024-03-01' });
  assert.equal(value(r, 'Days since'), 30);
  assert.equal(value(r, 'population interval'), '2024-06-30 to 2024-12-31');
  assert.ok(biology.calculate('dog-heat-cycle', { lastHeatStart: '2025-01-01', today: '2024-12-31' }).error);
});

test('prescription-only meloxicam arithmetic has no default dose and labels concentration scope', () => {
  const r = biology.calculate('metacam-dogs', { weightKg: '10', prescribedMgKg: '0.1' });
  assert.equal(value(r, 'Calculated amount'), '1.000');
  assert.equal(value(r, 'Calculated volume'), '0.667');
  assert.match(r.warnings.join(' '), /does not select, recommend/i);
  assert.ok(biology.calculate('metacam-dogs', { weightKg: '10', prescribedMgKg: '' }).error);
});

test('raisin exposure accepts either optional quantity and offers no risk score or safe amount', () => {
  const r = biology.calculate('dog-raisin-toxicity', { weightKg: '10', count: '2', massG: '' });
  assert.equal(value(r, 'fruit pieces per body weight'), '0.20');
  assert.doesNotMatch(JSON.stringify(r.rows), /toxic|safe|risk score/i);
  assert.match(r.warnings.join(' '), /no established safe amount/i);
  assert.match(r.warnings.join(' '), /immediately/i);
});

test('dog water estimator uses the selected maintenance-fluid equation and cautions against drinking-target use', () => {
  const r = biology.calculate('dog-water-intake', { weightKg: '10', method: 'linear' });
  assert.equal(r.rows[0].value, '370');
  assert.match(r.warnings.join(' '), /not a validated target.*drink/i);
});

test('tramadol only performs arithmetic from an entered prescription', () => {
  const r = biology.calculate('tramadol-dogs', { weightKg: '10', prescribedMgKg: '2', concentrationMgMl: '20' });
  assert.equal(value(r, 'prescribed dose'), '20.000');
  assert.equal(value(r, 'liquid volume'), '1.000');
  assert.match(r.warnings.join(' '), /does not recommend a dose/i);
  assert.ok(biology.calculate('tramadol-dogs', { weightKg: '10', prescribedMgKg: '' }).error);
});

test('cat age reports the selected chart convention and cat calories calculate RER/MER', () => {
  assert.equal(value(biology.calculate('cat-age', { ageYears: '2', method: 'international' }), 'human-age equivalent'), '24.0');
  assert.equal(value(biology.calculate('cat-age', { ageYears: '2', method: 'cornell' }), 'human-age equivalent'), '21.0');
  const r = biology.calculate('cat-calorie', { weightKg: '4', status: 'neutered' });
  assert.equal(value(r, 'Resting energy'), '198');
  assert.equal(value(r, 'daily energy'), '238');
});

test('cat Metacam arithmetic requires a user-entered prescription and states U.S. label limits', () => {
  const r = biology.calculate('metacam-cats', { weightKg: '4', prescribedMgKg: '0.3' });
  assert.equal(value(r, 'Calculated amount'), '1.200');
  assert.equal(value(r, 'Calculated volume'), '0.240');
  assert.match(r.warnings.join(' '), /does not select, recommend/i);
  assert.match(r.warnings.join(' '), /repeat dosing.*not approved/i);
});

test('bird chronological age handles a leap-day hatch date without inventing a human-age equivalent', () => {
  const r = biology.calculate('bird-age', { hatchDate: '2024-02-29', today: '2025-02-28' });
  assert.equal(value(r, 'Chronological age'), '1 years, 0 months, 0 days');
  assert.match(r.warnings.join(' '), /does not convert bird age to human years/i);
  assert.ok(biology.calculate('bird-age', { hatchDate: '2025-01-01', today: '2024-12-31' }).error);
});

test('both quiz routes return bounded scores', () => {
  assert.equal(value(biology.calculate('quiz-dog-size', { q1: 'serial', q2: 'varies', q3: 'vet' }), 'Score'), '3 / 3');
  assert.equal(value(biology.calculate('quiz-cat-age', { q1: '24', q2: 'differ' }), 'Score'), '2 / 2');
});

test('all new pages use the shared runtime, canonical URL and direct searchable route', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const slug of pages) {
    const html = fs.readFileSync(path.join(root, 'calculators', slug + '.html'), 'utf8');
    assert.match(html, /<html lang="en">/);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /data-biology-form=/);
    assert.match(html, /assets\/biology-calculators\.js/);
    assert.match(html, /name="robots" content="index,follow/);
    assert.match(html, /Worked example/);
    assert.match(html, /<details><summary>/);
    const record = index.find((item) => item.url === '/calculators/' + slug + '.html');
    assert.ok(record, 'Search index missing route ' + slug);
    assert.ok(sitemap.includes('https://friendlycalculator.in/calculators/' + slug + '.html'), 'Sitemap missing route ' + slug);
  }
  assert.ok(fs.existsSync(path.join(root, 'calculators/crickets-chirping-thermometer-calculator.html')));
  assert.ok(!fs.existsSync(path.join(root, 'calculators/crickets-chirping-thermometer.html')));
});
