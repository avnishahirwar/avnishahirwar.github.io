#!/usr/bin/env node
'use strict';
/*
 * Adds a page-specific "Formulas used" reference to every English equation
 * calculator (pages that define window.FC_EQUATION_CONFIG).
 *
 * The text is derived from each page's own equations, so no two pages share
 * the same body: it lists the real formulas, a glossary of the input names and
 * an honest note about any relation the in-browser engine cannot evaluate.
 *
 * Usage: node scripts/enrich-equation-pages.cjs [--check]
 *   --check  exit 1 if any page would change (used by tests/CI)
 */
const fs = require('fs');
const path = require('path');
const engine = require('../assets/generated-equation-calculator.js');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'calculators');
const CHECK = process.argv.includes('--check');
const SECTION_RE = /\n?<section class="content" id="formula-reference"[\s\S]*?<\/section>/;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function readConfig(html) {
  const m = html.match(/window\.FC_EQUATION_CONFIG=("(?:[^"\\]|\\.)*")/);
  if (!m) return null;
  try { return JSON.parse(JSON.parse(m[1])); } catch (_) { return null; }
}

function prettyFormula(f) {
  return String(f).replace(/\*/g, ' × ').replace(/\s+/g, ' ').replace(/\^/g, '^').trim();
}

function build(title, cfg) {
  const eqs = engine.prepare(cfg);
  const ok = eqs.filter((e) => e.fn);
  const skipped = eqs.length - ok.length;
  // one formula per solved variable, shortest first, so the list stays readable
  const seen = new Set();
  const listed = [];
  ok.slice().sort((a, b) => a.formula.length - b.formula.length).forEach((e) => {
    if (seen.has(e.lhs) || listed.length >= 8) return;
    seen.add(e.lhs);
    listed.push(e);
  });
  const parts = [];
  parts.push('<section class="content" id="formula-reference">');
  parts.push('<h2>Formulas used by this calculator</h2>');
  if (!ok.length) {
    parts.push(`<p>The ${esc(title)} page lists ${cfg.variables.length} inputs, but every relation behind it depends on a lookup table or helper routine that the in-browser solver cannot evaluate, so it cannot return a dependable result. Use the related calculators linked on this page, or check the figures against an authoritative reference.</p>`);
  } else {
    parts.push(`<p>The ${esc(title)} works with ${cfg.variables.length} quantities and ${ok.length} relation${ok.length === 1 ? '' : 's'} between them. Enter the values you know, leave the one you want to find blank, and press Calculate. Blank fields are never treated as zero. Each formula below is solved for one quantity.</p>`);
    parts.push('<ul>');
    listed.forEach((e) => {
      parts.push(`<li><strong>${esc(engine.humanize(e.lhs))}</strong> (<code>${esc(e.lhs)}</code>) = <code>${esc(prettyFormula(e.formula))}</code></li>`);
    });
    parts.push('</ul>');
    if (ok.length > listed.length && ok.length > seen.size) {
      parts.push(`<p>${ok.length - listed.length} further rearrangement${ok.length - listed.length === 1 ? '' : 's'} of the same relations let you solve for other quantities.</p>`);
    }
  }
  parts.push('<h2>Inputs</h2>');
  parts.push('<table><thead><tr><th>Field</th><th>Name in formulas</th><th>Can be solved for</th></tr></thead><tbody>');
  const solvable = new Set(ok.map((e) => e.lhs));
  cfg.variables.slice(0, 40).forEach((v) => {
    parts.push(`<tr><td>${esc(engine.humanize(v))}</td><td><code>${esc(v)}</code></td><td>${solvable.has(v) ? 'Yes' : 'Input only'}</td></tr>`);
  });
  parts.push('</tbody></table>');
  if (cfg.variables.length > 40) parts.push(`<p>${cfg.variables.length - 40} more inputs are available in the calculator form.</p>`);
  if (skipped > 0 && ok.length) {
    parts.push(`<p><strong>Limitation:</strong> ${skipped} of the ${eqs.length} underlying relations rely on lookup tables or helper routines that run only on the original source calculator, so this page skips them. Quantities that depend on those relations are not solved here.</p>`);
  }
  parts.push('</section>');
  return parts.join('\n');
}

let changed = 0;
let total = 0;
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.html'));
for (const f of files) {
  const p = path.join(DIR, f);
  const html = fs.readFileSync(p, 'utf8');
  const cfg = readConfig(html);
  if (!cfg || !Array.isArray(cfg.variables) || !Array.isArray(cfg.equations)) continue;
  total += 1;
  const t = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1];
  const title = (t || f.replace(/\.html$/, '').replace(/-/g, ' ')).replace(/<[^>]+>/g, '').trim();
  const section = build(title, cfg);
  let next;
  if (SECTION_RE.test(html)) next = html.replace(SECTION_RE, () => '\n' + section);
  else if (html.includes('</main>')) next = html.replace('</main>', () => '\n' + section + '</main>');
  else continue;
  if (next !== html) {
    changed += 1;
    if (!CHECK) fs.writeFileSync(p, next);
  }
}
console.log(`${total} equation pages scanned, ${changed} ${CHECK ? 'would change' : 'updated'}`);
if (CHECK && changed) process.exit(1);
