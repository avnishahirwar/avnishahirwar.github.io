#!/usr/bin/env node
/**
 * Generate review-only HTML translation drafts for locales marked `planned` in
 * config/language-catalogue.json. This script never writes into public locale
 * folders and never changes catalogue availability.
 *
 * Provider: any OpenAI-compatible Chat Completions endpoint configured via
 * TRANSLATION_API_BASE, TRANSLATION_API_KEY and TRANSLATION_MODEL.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGUE = path.join(ROOT, 'config/language-catalogue.json');
const DRAFTS = path.join(ROOT, 'translation-drafts');
const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'template', 'code', 'pre', 'kbd', 'samp', 'textarea', 'svg', 'math']);
const TOKEN_RE = /\{\{[^{}]+\}\}|\$\{[^{}]+\}|\{[A-Za-z_][\w.-]*\}|\bhttps?:\/\/[^\s<>]+|\b[A-Z][A-Z0-9_]{1,}\b|\b\d+(?:[.,]\d+)*(?:%|\b)/g;
const HTML_TOKEN_RE = /<!--[\s\S]*?-->|<![^>]*>|<\?[\s\S]*?\?>|<\/?[A-Za-z][^>]*>/g;

export async function loadPlannedLocales(cataloguePath = CATALOGUE) {
  const catalogue = JSON.parse(await fs.readFile(cataloguePath, 'utf8'));
  if (!Array.isArray(catalogue.locales) || catalogue.total !== catalogue.locales.length) {
    throw new Error('Language catalogue is malformed or its total does not match its locale list.');
  }
  return catalogue.locales.filter(x => x.code !== catalogue.defaultLocale && x.status === 'planned');
}

export function protectedText(text) {
  const kept = [];
  const input = text.replace(TOKEN_RE, value => {
    const key = `ZXQKEEP${kept.length}QXZ`;
    kept.push([key, value]);
    return key;
  });
  return { input, kept };
}

export function restoreProtectedText(text, kept) {
  let result = text;
  for (const [key, value] of kept) {
    const count = result.split(key).length - 1;
    if (count !== 1) throw new Error(`Translation did not preserve protected token ${key} exactly once.`);
    result = result.replace(key, value);
  }
  if (/ZXQKEEP\d+QXZ/.test(result)) throw new Error('Translation returned an unknown protected token.');
  return result;
}

/** Split at markup boundaries and replace only eligible text nodes. */
export function tokenizeHtml(html) {
  const pieces = [];
  let cursor = 0;
  let skip = [];
  for (const match of html.matchAll(HTML_TOKEN_RE)) {
    if (match.index > cursor) {
      const raw = html.slice(cursor, match.index);
      const eligible = skip.length === 0 && raw.trim().length > 0 && !/^\s*$/.test(raw);
      pieces.push({ type: eligible ? 'text' : 'raw', value: raw });
    }
    const rawTag = match[0];
    pieces.push({ type: 'raw', value: rawTag });
    const parsed = rawTag.match(/^<\s*(\/?)\s*([\w:-]+)/);
    if (parsed) {
      const closing = parsed[1] === '/';
      const tag = parsed[2].toLowerCase();
      if (closing) {
        const index = skip.lastIndexOf(tag);
        if (index >= 0) skip = skip.slice(0, index);
      } else if (SKIP_TAGS.has(tag) && !/\/\s*>$/.test(rawTag)) {
        skip.push(tag);
      }
    }
    cursor = match.index + rawTag.length;
  }
  if (cursor < html.length) {
    const raw = html.slice(cursor);
    pieces.push({ type: skip.length === 0 && raw.trim() ? 'text' : 'raw', value: raw });
  }
  return pieces;
}

function htmlUnescape(value) {
  return value.replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/gi, entity => {
    const name = entity.slice(1, -1).toLowerCase();
    if (name === 'amp') return '&';
    if (name === 'lt') return '<';
    if (name === 'gt') return '>';
    if (name === 'quot') return '"';
    if (name === 'apos') return "'";
    if (name === 'nbsp') return '\u00a0';
    if (name.startsWith('#x')) return String.fromCodePoint(parseInt(name.slice(2), 16));
    if (name.startsWith('#')) return String.fromCodePoint(parseInt(name.slice(1), 10));
    return entity;
  });
}

function htmlEscape(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function safeDraftShell(html, locale) {
  if (!/<html\b[^>]*>/i.test(html) || !/<head\b[^>]*>/i.test(html)) {
    throw new Error('Source must contain both <html> and <head> elements so the draft can be marked noindex.');
  }
  let result = html.replace(/<html\b([^>]*)>/i, (whole, attrs) => {
    let next = attrs.replace(/\s+lang\s*=\s*(["'])[^"']*\1/i, '').replace(/\s+dir\s*=\s*(["'])[^"']*\1/i, '');
    next += ` lang="${locale.code}" dir="${locale.direction}"`;
    return `<html${next}>`;
  });
  result = result.replace(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/gi, '');
  if (/<head\b[^>]*>/i.test(result)) {
    result = result.replace(/<head\b[^>]*>/i, '$&\n<meta name="robots" content="noindex,nofollow">\n<!-- MACHINE-TRANSLATED REVIEW DRAFT: DO NOT PUBLISH -->');
  }
  return result;
}

export async function buildDraft(html, locale, translateStrings) {
  const pieces = tokenizeHtml(html);
  const slots = pieces.filter(piece => piece.type === 'text' && htmlUnescape(piece.value).trim());
  const sources = slots.map(piece => htmlUnescape(piece.value));
  const translated = await translateStrings(sources);
  if (!Array.isArray(translated) || translated.length !== sources.length || translated.some(x => typeof x !== 'string' || !x.trim())) {
    throw new Error(`Expected ${sources.length} non-empty translated text strings.`);
  }
  let index = 0;
  for (const piece of pieces) {
    if (piece.type === 'text' && htmlUnescape(piece.value).trim()) {
      piece.value = htmlEscape(translated[index++]);
    }
  }
  return safeDraftShell(pieces.map(piece => piece.value).join(''), locale);
}

function parseArgs(argv) {
  const args = { sources: [], locales: [], dryRun: false, batchSize: 24, concurrency: 2, output: DRAFTS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const take = () => { if (!argv[i + 1]) throw new Error(`Missing value for ${arg}`); return argv[++i]; };
    if (arg === '--source') args.sources.push(take());
    else if (arg === '--locale') args.locales.push(...take().split(',').map(x => x.trim()).filter(Boolean));
    else if (arg === '--output') args.output = path.resolve(take());
    else if (arg === '--batch-size') args.batchSize = Number(take());
    else if (arg === '--concurrency') args.concurrency = Number(take());
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:\n  node scripts/translate-locales.mjs --source index.html [--locale ur,zh]\n\n` +
    `By default, translates each source to all 33 locales marked planned, writing review-only drafts under translation-drafts/.\n` +
    `Options: --source FILE (repeatable), --locale CODE[,CODE], --output DIR, --batch-size N, --concurrency N, --dry-run, --help\n` +
    `Provider environment: TRANSLATION_API_BASE, TRANSLATION_API_KEY, TRANSLATION_MODEL.\n` +
    `Drafts are noindex and never change public locale pages or catalogue availability.`;
}

async function translateBatch(items, locale, config) {
  const protectedItems = items.map(protectedText);
  const endpoint = `${config.base.replace(/\/+$/, '')}/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${config.key}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: `Translate from English into ${locale.name} (${locale.nativeName}). Translate the supplied text strings faithfully and naturally. Return a JSON object exactly of the form {"translations":[...]} with one translated string for each input, in the same order. Keep every ZXQKEEP...QXZ token exactly once in its matching string. Do not add commentary. Do not alter numbers, units, formulas, brand names, or factual meaning. These are calculator website interface and educational text.` },
        { role: 'user', content: JSON.stringify(protectedItems.map(x => x.input)) },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Translation API HTTP ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Translation API returned no message content.');
  let decoded;
  try { decoded = JSON.parse(content); } catch { throw new Error('Translation API did not return valid JSON.'); }
  if (!Array.isArray(decoded.translations) || decoded.translations.length !== items.length) {
    throw new Error(`Translation API returned ${decoded.translations?.length ?? 'no'} strings; expected ${items.length}.`);
  }
  return decoded.translations.map((text, i) => restoreProtectedText(text, protectedItems[i].kept));
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function run(args) {
  if (args.help) { console.log(usage()); return; }
  if (!args.sources.length) throw new Error('At least one --source file is required.');
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 100) throw new Error('--batch-size must be an integer from 1 to 100.');
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 8) throw new Error('--concurrency must be an integer from 1 to 8.');

  const locales = await loadPlannedLocales();
  const selected = args.locales.length ? locales.filter(x => args.locales.includes(x.code)) : locales;
  const invalid = args.locales.filter(code => !selected.some(x => x.code === code));
  if (invalid.length) throw new Error(`These locales are not marked planned in the catalogue: ${invalid.join(', ')}. No files changed.`);
  if (!selected.length) throw new Error('No planned locales selected.');

  const sources = args.sources.map(source => path.resolve(ROOT, source));
  for (const source of sources) {
    if (!source.startsWith(ROOT + path.sep)) throw new Error(`Source must be inside repository: ${source}`);
    const stat = await fs.stat(source);
    if (!stat.isFile() || !source.toLowerCase().endsWith('.html')) throw new Error(`Source must be an HTML file: ${source}`);
  }
  if (args.dryRun) {
    for (const source of sources) {
      const html = await fs.readFile(source, 'utf8');
      const texts = tokenizeHtml(html).filter(x => x.type === 'text' && htmlUnescape(x.value).trim());
      console.log(`${path.relative(ROOT, source)}: ${texts.length} translatable text nodes × ${selected.length} locales`);
    }
    console.log(`Selected planned locales: ${selected.map(x => x.code).join(', ')}`);
    console.log('Dry run only: no network requests or files written.');
    return;
  }

  const config = {
    base: process.env.TRANSLATION_API_BASE,
    key: process.env.TRANSLATION_API_KEY,
    model: process.env.TRANSLATION_MODEL,
  };
  if (!config.base || !config.key || !config.model) throw new Error('Set TRANSLATION_API_BASE, TRANSLATION_API_KEY, and TRANSLATION_MODEL. No files changed.');
  const jobs = selected.flatMap(locale => sources.map(source => ({ locale, source })));
  const failures = [];
  await mapLimit(jobs, args.concurrency, async ({ locale, source }) => {
    try {
      const original = await fs.readFile(source, 'utf8');
      const pieces = tokenizeHtml(original);
      const slots = pieces.filter(x => x.type === 'text' && htmlUnescape(x.value).trim());
      const values = slots.map(x => htmlUnescape(x.value));
      const output = [];
      for (let i = 0; i < values.length; i += args.batchSize) {
        output.push(...await translateBatch(values.slice(i, i + args.batchSize), locale, config));
      }
      const draft = await buildDraft(original, locale, async () => output);
      const relative = path.relative(ROOT, source);
      const destination = path.join(args.output, locale.code, relative);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, draft, { flag: 'wx' });
      console.log(`Draft written: ${path.relative(ROOT, destination)} (${values.length} text nodes)`);
    } catch (error) {
      failures.push(`${locale.code}/${path.relative(ROOT, source)}: ${error.message}`);
      console.error(`FAILED ${locale.code}/${path.relative(ROOT, source)}: ${error.message}`);
    }
  });
  if (failures.length) throw new Error(`${failures.length} draft(s) failed; successful drafts remain in the review-only output directory.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run(parseArgs(process.argv.slice(2))).catch(error => { console.error(`Error: ${error.message}`); process.exitCode = 1; });
}
