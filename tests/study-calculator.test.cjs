const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = require('node:path').resolve(__dirname, '..');
const catalogueCounts = require('./catalogue-counts.cjs')(root);
const { } = catalogueCounts;

test('Study Calculator is indexed, discoverable and uses the published catalogue count', () => {
  const index = JSON.parse(fs.readFileSync(root + '/assets/calculator-search-index.json', 'utf8'));
  const page = fs.readFileSync(root + '/calculators/study-calculator.html', 'utf8');
  const directory = fs.readFileSync(root + '/calculator/site-directory.html', 'utf8');
  const home = fs.readFileSync(root + '/index.html', 'utf8');
  assert.ok(index.length >= 3000, 'Search index should include the current public calculator catalogue.');
  assert.equal(new Set(index.map(item => item.url)).size, index.length, 'Search index URLs must be unique.');
  assert.ok(index.some(item => item.name === 'Study Calculator' && item.url === '/calculators/study-calculator.html'));
  assert.match(directory, /href="\/calculators\/study-calculator\.html"/);
  assert.ok(home.includes('Search all calculators'), 'Homepage search label must remain catalogue-driven rather than hard-coded to a fixed count.');
  assert.match(page, /name="robots" content="index,follow/);
  assert.match(page, /rel="canonical"/);
  assert.match(page, /EducationalApplication/);
});

test('Goal, deep-work and running search terms resolve to existing calculators without duplicates', () => {
  const index = JSON.parse(fs.readFileSync(root + '/assets/calculator-search-index.json', 'utf8'));
  const lookup = term => index.filter(item => item.keywords.toLowerCase().includes(term));
  assert.ok(lookup('goal calculator').some(item => item.url === '/calculators/goal-success-calculator.html'));
  assert.ok(lookup('deep work calculator').some(item => item.url === '/calculators/pomodoro-session-planner.html'));
  assert.ok(lookup('running calculator').some(item => item.url === '/calculators/pace-calculator.html'));
  assert.equal(index.filter(item => item.name === 'Goal Calculator').length, 0);
  assert.equal(index.filter(item => item.name === 'Deep Work Calculator').length, 0);
  assert.equal(index.filter(item => item.name === 'Running Calculator').length, 0);
});

test('Study Calculator totals focus, breaks and weekly schedule correctly and validates inputs', () => {
  const html = fs.readFileSync(root + '/calculators/study-calculator.html', 'utf8');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(value => value.includes("const $=id=>document.getElementById(id)"));
  assert.ok(script, 'study calculation script exists');
  const elements = Object.fromEntries(['sessions','focus','break','days','calculate','daily','summary'].map(id => [id, {value:({sessions:'3',focus:'30',break:'10',days:'5'})[id] || '',textContent:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}}]));
  const sandbox = {document:{getElementById:id=>elements[id]},location:{pathname:'/calculators/study-calculator.html'}};
  vm.runInNewContext(script, sandbox, {timeout:1000});
  assert.equal(elements.daily.textContent, '1 hr 30 min');
  assert.match(elements.summary.textContent, /Weekly focus: 7 hr 30 min/);
  assert.match(elements.summary.textContent, /Weekly breaks: 1 hr 40 min/);
  elements.sessions.value='9';
  elements.calculate.handlers.click();
  assert.equal(elements.daily.textContent, 'Check the entered values');
});
