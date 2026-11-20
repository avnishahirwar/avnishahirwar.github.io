'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

test('homepage calculator search inline script parses and loads the fresh catalogue', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const marker = "<script>\n(()=>{'use strict';\nconst input=document.getElementById('fc-home-tool-search');";
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, 'homepage search script should be present');
  const codeStart = start + '<script>'.length;
  const end = html.indexOf('</script>', codeStart);
  assert.notEqual(end, -1, 'homepage search script should close');
  const script = html.slice(codeStart, end);

  assert.doesNotMatch(script, /;\\nconst escapeHtml=/, 'inline JavaScript must use a real line break, not an escaped newline');
  assert.doesNotThrow(() => new vm.Script(script), 'homepage search script must be valid JavaScript');
  assert.match(script, /calculator-search-index\.json\?v=20261120-searchfix5/);
  assert.match(script, /cache:'no-store'/);
  assert.match(script, /restrictedSearchContent/);
  assert.match(script, /home-search-group/);
  assert.match(script, /input\.addEventListener\('input'/);
});
