'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const blockedDomain = ['omni', 'calculator', '.com'].join('');
const blockedUrl = new RegExp('(?:https?:)?\\/\\/(?:www\\.)?' +
  blockedDomain.replaceAll('.', '\\.') + '(?:[\\/:?#]|$)', 'i');
const textExtensions = new Set([
  '.html', '.js', '.css', '.json', '.xml', '.md', '.yml', '.yaml', '.txt'
]);
const ignoredDirectories = new Set(['.git', 'node_modules', '.next', 'dist', 'coverage']);

function collectFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) collectFiles(path.join(directory, entry.name), files);
      continue;
    }
    if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(path.join(directory, entry.name));
    }
  }
  return files;
}

test('public site source contains no Omni Calculator outbound URLs', () => {
  const matches = [];
  for (const file of collectFiles(root)) {
    const content = fs.readFileSync(file, 'utf8');
    if (blockedUrl.test(content)) matches.push(path.relative(root, file));
  }
  assert.deepEqual(matches, [], 'Remove competitor URLs and links from site source: ' + matches.join(', '));
});
