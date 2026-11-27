'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const pages = [
  {
    file: 'calculators/basic-calculator.html',
    history: 'https://www.whipplemuseum.cam.ac.uk/explore-whipple-collections/calculating-devices/mechanical-calculation',
    facts: 'automatic carry mechanism',
  },
  {
    file: 'calculators/simple-interest-calculator.html',
    history: 'https://www.bancaditalia.it/servizi-cittadino/musei-e-visite/museo-moneta/tavolette-mesopotamiche/index.html?com.dotmarketing.htmlpage.language=1',
    facts: 'original principal',
  },
  {
    file: 'calculators/compound-interest-calculator.html',
    history: 'https://www.bancaditalia.it/servizi-cittadino/musei-e-visite/museo-moneta/tavolette-mesopotamiche/index.html?com.dotmarketing.htmlpage.language=1',
    facts: 'Rule of 72',
  },
  {
    file: 'calculators/gst-calculator.html',
    history: 'https://gstcouncil.gov.in/about-us',
    facts: 'input tax credit',
  },
  {
    file: 'calculators/percentage-calculator.html',
    history: 'https://escholarship.org/uc/item/63c4h4g8',
    facts: 'percentage points',
  },
];

test('priority calculator pages preserve formulas and worked examples and add history and facts', () => {
  for (const item of pages) {
    const html = fs.readFileSync(path.join(ROOT, item.file), 'utf8');
    assert.match(html, /<h[2-4][^>]*>[^<]*(?:formula|how .* calculated|calculation method)[^<]*<\/h[2-4]>/i, item.file + ' retains a calculation explanation');
    assert.match(html, /<h[2-4][^>]*>[^<]*(?:worked example|worked sample|examples?)[^<]*<\/h[2-4]>/i, item.file + ' retains an example');
    assert.match(html, /<h2[^>]*>History[^<]*<\/h2>/i, item.file + ' includes a history section');
    assert.match(html, /<h2[^>]*>Interesting Facts[^<]*<\/h2>/i, item.file + ' includes an interesting facts section');
    assert.ok(html.includes(item.history), item.file + ' links a relevant historical source');
    assert.ok(html.toLowerCase().includes(item.facts.toLowerCase()), item.file + ' includes a topic-specific fact');
    assert.equal((html.match(/class="[^"]*fc-history-facts/g) || []).length, 1, item.file + ' has one education section');
  }
});

test('all external source links in the new education sections are protected', () => {
  for (const item of pages) {
    const html = fs.readFileSync(path.join(ROOT, item.file), 'utf8');
    const start = html.indexOf('fc-history-facts');
    const end = html.indexOf('</section>', start);
    assert.ok(start >= 0 && end > start, item.file + ' has an education section');
    const section = html.slice(start, end);
    for (const link of section.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gi)) {
      assert.match(link[0], /rel="noopener noreferrer"/i, item.file + ' external references must be isolated');
    }
  }
});

test('read-only coverage audit counts only substantive content under educational headings', () => {
  const audit = require(path.join(ROOT, 'scripts/audit-calculator-education.cjs'));
  const summary = audit.runAudit();
  assert.ok(summary.totalPages >= pages.length);
  assert.ok(summary.history >= pages.length);
  assert.ok(summary.interestingFacts >= pages.length);
  assert.ok(summary.allFour <= summary.totalPages);
  assert.equal(summary.scope, 'Root English calculator pages only; localized routes are not included.');
});
