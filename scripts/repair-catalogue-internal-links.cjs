#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/calculator-search-index.json'), 'utf8'));
const canonical = index.filter(item => item && typeof item.url === 'string' && item.url.startsWith('/calculators/')).sort((a,b) => a.name.localeCompare(b.name));
const escapeHtml = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const check = process.argv.includes('--check');
const aboutPath = path.join(ROOT, 'calculator/about.html');
const directoryPath = path.join(ROOT, 'calculator/site-directory.html');
let about = fs.readFileSync(aboutPath, 'utf8');
let directory = fs.readFileSync(directoryPath, 'utf8');
if (!check) {
  about = about.replace(/<!-- fc-catalogue-additions-start -->[\s\S]*?<!-- fc-catalogue-additions-end -->/g, '');
  directory = directory.replace(/<!-- fc-directory-additions-start -->[\s\S]*?<!-- fc-directory-additions-end -->/g, '');
}
const aboutListStart = about.indexOf('<h2>Available calculators</h2>');
const aboutOlStart = about.indexOf('<ol>', aboutListStart);
const aboutOlEnd = about.indexOf('</ol>', aboutOlStart);
if (aboutListStart < 0 || aboutOlStart < 0 || aboutOlEnd < 0) throw new Error('About page calculator list was not found.');
const aboutLinks = new Set([...about.slice(aboutOlStart, aboutOlEnd).matchAll(/href=["'](\/calculators\/[^"']+)["']/g)].map(m => m[1]));
const directoryLinks = new Set([...directory.matchAll(/href=["'](\/calculators\/[^"'#]+)["']/g)].map(m => m[1]));
const aboutMissing = canonical.filter(item => !aboutLinks.has(item.url));
const directoryMissing = canonical.filter(item => !directoryLinks.has(item.url));
const aboutItems = aboutMissing.map(item => '<li><a href="' + escapeHtml(item.url) + '">' + escapeHtml(item.name) + '</a></li>').join('\n');
if (aboutMissing.length) {
  about = about.slice(0, aboutOlEnd) + '\n<!-- fc-catalogue-additions-start -->\n' + aboutItems + '\n<!-- fc-catalogue-additions-end -->\n' + about.slice(aboutOlEnd);
}
if (directoryMissing.length) {
  const links = directoryMissing.map(item => '<li><a href="' + escapeHtml(item.url) + '">' + escapeHtml(item.name) + '</a></li>').join('\n');
  const section = '<!-- fc-directory-additions-start -->\n<section class="section directory-additions" id="additional-calculators"><h2>Additional calculators</h2><p>Recently added tools included in the full calculator catalogue.</p><ul>\n' + links + '\n</ul></section>\n<!-- fc-directory-additions-end -->';
  const insertAt = directory.lastIndexOf('</main>') >= 0 ? directory.lastIndexOf('</main>') : directory.lastIndexOf('</body>');
  if (insertAt < 0) throw new Error('Directory insertion point was not found.');
  directory = directory.slice(0, insertAt) + section + '\n' + directory.slice(insertAt);
}
const savingsStart = directory.indexOf('id="savings-investments"');
if (savingsStart >= 0) {
  const savingsEnd = directory.indexOf('</section>', savingsStart);
  if (savingsEnd > savingsStart) {
    let section = directory.slice(savingsStart, savingsEnd);
    section = section.replace(/\b545 calculators\b/, '549 calculators');
    directory = directory.slice(0, savingsStart) + section + directory.slice(savingsEnd);
  }
}
console.log('Catalogue link sync: ' + aboutMissing.length + ' About links and ' + directoryMissing.length + ' directory links missing.');
if (check) {
  if (aboutMissing.length || directoryMissing.length) process.exitCode = 1;
} else {
  if (about !== fs.readFileSync(aboutPath, 'utf8')) fs.writeFileSync(aboutPath, about);
  if (directory !== fs.readFileSync(directoryPath, 'utf8')) fs.writeFileSync(directoryPath, directory);
}
