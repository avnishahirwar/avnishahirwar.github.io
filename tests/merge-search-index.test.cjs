'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const sourceScript = path.resolve(__dirname, '../scripts/merge-search-index.cjs');

test('search-index rebuild preserves stored plain-text metadata and is repeatable', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-search-index-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const folder of ['scripts', 'assets', 'calculators']) {
    fs.mkdirSync(path.join(root, folder), {recursive: true});
  }
  const script = path.join(root, 'scripts/merge-search-index.cjs');
  fs.copyFileSync(sourceScript, script);
  fs.writeFileSync(path.join(root, 'calculators/demo.html'),
    '<!doctype html><html lang="en"><head><title>Demo</title><link rel="canonical" href="https://friendlycalculator.in/calculators/demo.html"></head><body><h1>Demo</h1></body></html>');
  fs.writeFileSync(path.join(root, 'sitemap.xml'),
    '<?xml version="1.0"?><urlset><url><loc>https://friendlycalculator.in/calculators/demo.html</loc></url></urlset>');
  const entry = {
    name: 'Values < 5 or > 10 Calculator',
    url: '/calculators/demo.html',
    category: 'Physics &amp; Engineering',
    keywords: 'values < threshold and > limit &amp; comparison',
    description: 'Preserve stored symbols such as < and > and entity text &amp;.'
  };
  fs.writeFileSync(path.join(root, 'assets/calculator-search-index.json'), JSON.stringify([entry], null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'assets/calculator-search-index-additions.json'), '[]\n');

  const run = args => spawnSync(process.execPath, [script, ...args], {cwd: root, encoding: 'utf8'});
  const firstBuild = run([]);
  assert.equal(firstBuild.status, 0, firstBuild.stderr || firstBuild.stdout);
  const indexFile = path.join(root, 'assets/calculator-search-index.json');
  const firstOutput = fs.readFileSync(indexFile, 'utf8');
  const [rebuilt] = JSON.parse(firstOutput);
  assert.equal(rebuilt.name, entry.name);
  assert.equal(rebuilt.category, entry.category);
  assert.equal(rebuilt.keywords, entry.keywords);
  assert.equal(rebuilt.description, entry.description);

  const secondBuild = run([]);
  assert.equal(secondBuild.status, 0, secondBuild.stderr || secondBuild.stdout);
  assert.equal(fs.readFileSync(indexFile, 'utf8'), firstOutput, 'second rebuild must not alter stored text');
  const check = run(['--check']);
  assert.equal(check.status, 0, check.stderr || check.stdout);
});
