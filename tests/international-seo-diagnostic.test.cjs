const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('additive hreflang repair has no remaining unambiguous reciprocal additions', () => {
  const output = execFileSync(process.execPath, ['scripts/add-hreflang-reciprocals.cjs'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 5 * 1024 * 1024
  });
  const match = output.match(/Additive hreflang reciprocal repair: (\{[^\n]+\})/);
  assert.ok(match, 'repair script must report a JSON summary');
  const summary = JSON.parse(match[1]);
  assert.equal(summary.added, 0, 'all unambiguous additive reciprocal tags should already be present');
  assert.ok(summary.alreadyPresent > 0, 'existing reciprocal tags should be recognized');
  assert.ok(summary.skippedConflict >= 0);
  assert.match(output, /Dry run only\. No files were changed\./);
});
