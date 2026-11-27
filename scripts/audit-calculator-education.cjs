#!/usr/bin/env node
'use strict';

// Read-only coverage audit for the four educational areas requested on calculator pages.
// It reports source HTML coverage; it does not infer quality or generate page copy.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'calculators');

function stripMarkup(value) {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeadings(html) {
  const matches = [];
  const pattern = /<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    matches.push({
      level: Number(match[1]),
      title: stripMarkup(match[2]),
      start: match.index,
      end: pattern.lastIndex,
    });
  }
  return matches;
}

function hasSubstantiveSection(html, headings, pattern) {
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    if (!pattern.test(heading.title)) continue;
    const next = headings[index + 1];
    const body = html.slice(heading.end, next ? next.start : html.length);
    const text = stripMarkup(body);
    if (text.split(/\s+/).filter(Boolean).length >= 8) return true;
  }
  return false;
}

function auditFile(file) {
  const html = fs.readFileSync(file, 'utf8');
  const headings = extractHeadings(html);
  return {
    file: path.relative(root, file).split(path.sep).join('/'),
    calculation: hasSubstantiveSection(html, headings, /formula|calculation method|how .* calculated|how it works|calculation steps?/i),
    example: hasSubstantiveSection(html, headings, /worked (?:example|sample)|\bexamples?\b/i),
    history: hasSubstantiveSection(html, headings, /\bhistory\b|historical|origins?|\btimeline\b/i),
    facts: hasSubstantiveSection(html, headings, /interesting facts?|did you know|quick facts/i),
  };
}

function runAudit() {
  const files = fs.readdirSync(directory)
    .filter(name => name.toLowerCase().endsWith('.html'))
    .sort()
    .map(name => path.join(directory, name));
  const rows = files.map(auditFile);
  const summary = {
    scope: 'Root English calculator pages only; localized routes are not included.',
    totalPages: rows.length,
    calculation: rows.filter(row => row.calculation).length,
    example: rows.filter(row => row.example).length,
    history: rows.filter(row => row.history).length,
    interestingFacts: rows.filter(row => row.facts).length,
    allFour: rows.filter(row => row.calculation && row.example && row.history && row.facts).length,
    missingHistoryOrFacts: rows.filter(row => !row.history || !row.facts).length,
    sampleMissingHistoryOrFacts: rows.filter(row => !row.history || !row.facts).slice(0, 30).map(row => ({
      file: row.file,
      missing: [
        ...(!row.history ? ['history'] : []),
        ...(!row.facts ? ['interesting facts'] : []),
      ],
    })),
  };
  return summary;
}

if (require.main === module) {
  const summary = runAudit();
  console.log('Friendly Calculator — educational content coverage');
  console.log(JSON.stringify(summary, null, 2));
}

module.exports = { runAudit, auditFile, extractHeadings, stripMarkup };
