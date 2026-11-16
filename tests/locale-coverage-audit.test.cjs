const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { auditLocaleCoverage, renderMarkdown } = require('../scripts/audit-locale-coverage.cjs');

test('locale coverage audit compares equivalent paths without counting locale pages as English', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-locales-'));
  try {
    for (const file of ['index.html', 'calculators/emi.html', 'about.html', 'hi/index.html', 'hi/calculators/emi.html', 'fr/index.html']) {
      const target = path.join(root, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, '<html></html>');
    }
    const report = auditLocaleCoverage(root, ['hi', 'fr', 'de']);
    assert.equal(report.englishPageCount, 3);
    assert.equal(report.locales.hi.translatedPageCount, 2);
    assert.equal(report.locales.hi.missingCount, 1);
    assert.deepEqual(report.locales.hi.missingPages, ['about.html']);
    assert.equal(report.locales.fr.coveragePercent, 33.3);
    assert.equal(report.locales.de.coveragePercent, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('audit report explicitly distinguishes route coverage from translation quality', () => {
  const report = auditLocaleCoverage(process.cwd(), []);
  const markdown = renderMarkdown(report);
  assert.match(markdown, /not a translation-quality or legal\/financial accuracy certification/);
});
