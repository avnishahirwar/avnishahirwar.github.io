const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('additive hreflang repair has no remaining unambiguous reciprocal additions', () => {
  const output = execFileSync(process.execPath, ['scripts/add-hreflang-reciprocals.cjs'], {
    cwd: root, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024
  });
  const match = output.match(/Additive hreflang reciprocal repair: (\{[^\n]+\})/);
  assert.ok(match, 'repair script must report a JSON summary');
  const summary = JSON.parse(match[1]);
  assert.equal(summary.added, 0, 'all unambiguous additive reciprocal tags should already be present');
  assert.ok(summary.alreadyPresent > 0, 'existing reciprocal tags should be recognized');
  assert.match(output, /Dry run only\. No files were changed\./);
});

test('hreflang page edits preserve every original byte except the inserted alternate tags', t => {
  if (process.env.CHECK_HREFLANG_ADDITIVE_REPAIR !== 'true') { t.skip('Historical byte-preservation check was verified on PR #453; do not compare unrelated future page edits against the current main branch.'); return; }
  const baseRef = process.env.GITHUB_BASE_REF;
  if (!baseRef) { t.skip('byte-preservation comparison is a pull-request-only check'); return; }
  const changed = execFileSync('git', ['diff', '--name-only', 'origin/' + baseRef + '...HEAD', '--', '*.html'], {
    cwd: root, encoding: 'utf8'
  }).trim().split('\n').filter(Boolean);
  assert.ok(changed.length > 0, 'expected repaired HTML pages');

  for (const file of changed) {
    const original = execFileSync('git', ['show', 'origin/main:' + file], { cwd: root, encoding: 'utf8' });
    let current = fs.readFileSync(path.join(root, file), 'utf8');
    const originalCounts = new Map();
    const alternateTag = /<link\b[^>]*\brel=["']alternate["'][^>]*>/gi;
    for (const match of original.matchAll(alternateTag)) {
      originalCounts.set(match[0], (originalCounts.get(match[0]) || 0) + 1);
    }
    const seenCounts = new Map();
    for (const match of [...current.matchAll(alternateTag)]) {
      const tag = match[0];
      const count = (seenCounts.get(tag) || 0) + 1;
      seenCounts.set(tag, count);
      if (count > (originalCounts.get(tag) || 0)) current = current.replace(tag, '');
    }

    const originalHead = original.indexOf('</head>');
    const currentHead = current.indexOf('</head>');
    if (originalHead >= 0 && currentHead >= 0) {
      const originalPrefix = original.slice(0, originalHead);
      const currentPrefix = current.slice(0, currentHead);
      const newlineCount = value => (value.match(/\n+$/) || [''])[0].length;
      const extra = newlineCount(currentPrefix) - newlineCount(originalPrefix);
      if (extra > 0) {
        const closing = current.indexOf('</head>');
        current = current.slice(0, closing - extra) + current.slice(closing);
      }
    }
    assert.equal(current, original, 'unexpected non-additive page change: ' + file);
  }
});
