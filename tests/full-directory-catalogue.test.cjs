const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('All published English calculator routes are present in the static directory catalogue', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'assets/calculator-search-index.json'), 'utf8'));
  const directory = fs.readFileSync(path.join(root, 'calculator/site-directory.html'), 'utf8');
  const core = index.filter(item => item.url.startsWith('/calculators/'));
  const links = [...directory.matchAll(/href="([^"]+)"/g)].map(match => match[1]).filter(url => url.startsWith('/calculators/') && url.endsWith('.html'));
  assert.equal(core.length, 2478, 'The canonical search index must contain all published English calculator routes');
  assert.equal(new Set(core.map(item => item.url)).size, core.length, 'Canonical calculator URLs must be unique');
  for (const item of core) assert.ok(links.includes(item.url), 'Directory is missing ' + item.url);
  assert.equal(new Set(links).size, core.length, 'Every calculator must appear once in the complete directory');
  assert.match(directory, /Browse all 2,478 calculator tools/);
  assert.match(directory, /Showing all 2,478 calculators across 36 categories/);
  assert.ok(directory.includes('id="complete-calculator-catalogue"'));
  assert.ok(directory.includes('disclosure.open=!!q&&hasMatch'), 'Search should open only categories containing matching results');
  const close = directory.lastIndexOf('</html>');
  assert.ok(close >= 0, 'The document must have a closing HTML tag');
  assert.equal(directory.slice(close + '</html>'.length).trim(), '', 'No calculator cards may be stranded outside the HTML document');
});
