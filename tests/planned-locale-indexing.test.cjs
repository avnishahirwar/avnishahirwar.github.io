const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const catalogue = require('../config/language-catalogue.json');
const planned = catalogue.locales.filter(item => item.status === 'planned').map(item => item.code);

function walk(dir, rel = '') {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['.git','node_modules','tests','admin','avnish-ai','vendor','_site'].includes(entry.name)) continue;
    const next = rel ? rel + '/' + entry.name : entry.name;
    if (entry.isDirectory()) files.push(...walk(path.join(dir, entry.name), next));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(next);
  }
  return files;
}

test('planned language editions are not indexable until reviewed translations are available', () => {
  const pages = walk(root);
  const failures = [];
  for (const file of pages) {
    const locale = file.split('/')[0];
    if (!planned.includes(locale)) continue;
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const robots = (html.match(/<meta\\b(?=[^>]*\\bname=["']robots["'])[^>]*>/i) || [])[0] || '';
    if (!/noindex/i.test(robots)) failures.push(file);
  }
  assert.deepEqual(failures, [], 'Planned locale pages must carry noindex until translation QA is complete');
});

test('generated sitemaps do not list planned locale routes', () => {
  for (const file of fs.readdirSync(root).filter(name => /^sitemap.*\\.xml$/.test(name))) {
    const xml = fs.readFileSync(path.join(root, file), 'utf8');
    for (const locale of planned) {
      assert.doesNotMatch(xml, new RegExp('https://friendlycalculator\\.in/' + locale + '/'), file + ' contains planned locale ' + locale);
    }
  }
});
