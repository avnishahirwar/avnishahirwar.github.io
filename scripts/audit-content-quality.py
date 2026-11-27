#!/usr/bin/env python3
"""Content-quality audit for Friendly Calculator.

Identifies thin, duplicate, boilerplate-heavy and non-functional pages and
writes docs/content-quality/low-value-pages.csv plus SUMMARY.md.

Definitions (all computed from the checked-in HTML, nothing is fetched):
  unique_words   words in <main> after removing paragraphs that appear verbatim
                 on more than 20 other pages (site-wide boilerplate)
  duplicate      page whose canonical URL points at a different page
  non_functional equation calculator whose formulas the in-browser engine
                 cannot evaluate at all (see assets/generated-equation-calculator.js)

Usage: python3 scripts/audit-content-quality.py
"""
import collections
import csv
import hashlib
import html as htmllib
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SKIP = {'.git', 'node_modules', 'tests', 'artifacts', 'supabase', 'docs', 'admin', 'config', '_data', 'avnish-ai'}
OUT = os.path.join(ROOT, 'docs', 'content-quality')
BOILERPLATE_MIN_PAGES = 20

NOISE = re.compile(r'<(script|style|noscript|svg)\b.*?</\1>', re.S | re.I)
CHROME = re.compile(r'<(nav|header|footer)\b.*?</\1>', re.S | re.I)
TAGS = re.compile(r'<[^>]+>')


def words(text):
    return re.sub(r'\s+', ' ', htmllib.unescape(TAGS.sub(' ', text))).strip()


def attr(h, name, prop='name'):
    for m in re.finditer(r'<meta\b[^>]*>', h, re.I):
        tag = m.group(0)
        if re.search(prop + r'=["\']' + name + r'["\']', tag, re.I):
            c = re.search(r'content=["\']([^"\']*)', tag, re.I)
            return htmllib.unescape(c.group(1)).strip() if c else ''
    return ''


def canonical(h):
    for m in re.finditer(r'<link\b[^>]*>', h, re.I):
        tag = m.group(0)
        if re.search(r'rel=["\']canonical["\']', tag, re.I):
            c = re.search(r'href=["\']([^"\']+)', tag, re.I)
            return c.group(1) if c else ''
    return ''


def solvable_equations(path):
    """Ask the real engine how many of the page's equations it can evaluate."""
    js = (
        "const E=require(%s);const fs=require('fs');"
        "const h=fs.readFileSync(process.argv[1],'utf8');"
        "const m=h.match(/window\\.FC_EQUATION_CONFIG=(\"(?:[^\"\\\\]|\\\\.)*\")/);"
        "if(!m){process.exit(3)}"
        "const c=JSON.parse(JSON.parse(m[1]));const eqs=E.prepare(c);"
        "console.log(JSON.stringify([eqs.length,eqs.filter(e=>e.fn).length]));"
    ) % json.dumps(os.path.join(ROOT, 'assets', 'generated-equation-calculator.js'))
    r = subprocess.run(['node', '-e', js, path], capture_output=True, text=True)
    if r.returncode != 0:
        return None
    return json.loads(r.stdout)


def main():
    pages = []
    for dp, dn, fn in os.walk(ROOT):
        rel = os.path.relpath(dp, ROOT)
        if rel != '.' and rel.split(os.sep)[0] in SKIP:
            dn[:] = []
            continue
        dn[:] = [d for d in dn if d not in {'.git', 'node_modules'}]
        for f in fn:
            if f.endswith('.html'):
                pages.append(os.path.normpath(os.path.join(rel, f)))
    para_pages = collections.defaultdict(set)
    data = {}
    for p in pages:
        h = open(os.path.join(ROOT, p), encoding='utf-8', errors='replace').read()
        mm = re.search(r'<main\b.*?</main>', h, re.S | re.I)
        body = mm.group(0) if mm else CHROME.sub(' ', NOISE.sub(' ', h))
        body = NOISE.sub(' ', body)
        paras = []
        for para in re.findall(r'<(?:p|li)\b[^>]*>(.*?)</(?:p|li)>', body, re.S | re.I):
            t = words(para)
            if len(t) > 50:
                k = hashlib.md5(t.encode()).hexdigest()
                paras.append((k, len(t.split())))
                para_pages[k].add(p)
        data[p] = dict(
            h=h, body=body, paras=paras,
            title=words(re.search(r'<title[^>]*>(.*?)</title>', h, re.S | re.I).group(1)) if re.search(r'<title', h, re.I) else '',
            canon=canonical(h),
            robots=attr(h, 'robots'),
            total=len(words(CHROME.sub(' ', body)).split()),
            eq='FC_EQUATION_CONFIG' in h,
        )
    rows = []
    titles = collections.defaultdict(list)
    for p, d in data.items():
        titles[d['title']].append(p)
    for p, d in sorted(data.items()):
        boiler = sum(w for k, w in d['paras'] if len(para_pages[k]) > BOILERPLATE_MIN_PAGES)
        paratotal = sum(w for _, w in d['paras']) or 1
        unique_words = max(d['total'] - boiler, 0)
        url = 'https://friendlycalculator.in/' + p.replace(os.sep, '/')
        canon_other = bool(d['canon']) and d['canon'].rstrip('/') != url.rstrip('/') and not d['canon'].endswith('/' + p.replace(os.sep, '/'))
        noindex = 'noindex' in d['robots'].lower()
        reasons = []
        tier = 'ok'
        if d['eq']:
            r = solvable_equations(os.path.join(ROOT, p))
            if r and r[1] == 0:
                tier = 'non-functional'
                reasons.append('no equation can be evaluated in the browser')
            elif r and r[1] < r[0]:
                reasons.append('%d of %d equations unsupported' % (r[0] - r[1], r[0]))
        if canon_other:
            tier = 'duplicate'
            reasons.append('canonical points to ' + d['canon'])
        elif noindex:
            tier = 'excluded'
            reasons.append('noindex / redirect / utility page')
        elif tier == 'ok':
            if unique_words < 150:
                tier = 'thin'
                reasons.append('under 150 unique words')
            elif unique_words < 300:
                tier = 'light'
                reasons.append('150-299 unique words')
        if len(titles[d['title']]) > 1 and d['title'] and not canon_other and not noindex:
            reasons.append('title shared with %d other pages' % (len(titles[d['title']]) - 1))
        if boiler / paratotal > 0.6 and tier == 'ok':
            reasons.append('over 60% of paragraphs are repeated site-wide')
        rows.append(dict(
            url=url, directory=p.split(os.sep)[0] if os.sep in p else '(root)',
            kind='equation' if d['eq'] else 'page', words_total=d['total'], unique_words=unique_words,
            boilerplate_share=round(boiler / paratotal, 2), tier=tier, reasons='; '.join(reasons)))
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'low-value-pages.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in rows:
            if r['tier'] != 'ok' or r['reasons']:
                w.writerow(r)
    c = collections.Counter(r['tier'] for r in rows)
    en = [r for r in rows if r['directory'] == 'calculators']
    ce = collections.Counter(r['tier'] for r in en)
    with open(os.path.join(OUT, 'SUMMARY.md'), 'w', encoding='utf-8') as f:
        f.write('# Content-quality audit\n\nGenerated by `scripts/audit-content-quality.py`. Re-run after every content batch.\n\n')
        f.write('## All public pages (%d)\n\n| Tier | Pages |\n|---|---|\n' % len(rows))
        for t in ['ok', 'light', 'thin', 'non-functional', 'duplicate', 'excluded']:
            f.write('| %s | %d |\n' % (t, c.get(t, 0)))
        f.write('\n## English calculator pages (/calculators/, %d)\n\n| Tier | Pages |\n|---|---|\n' % len(en))
        for t in ['ok', 'light', 'thin', 'non-functional', 'duplicate', 'excluded']:
            f.write('| %s | %d |\n' % (t, ce.get(t, 0)))
        f.write('\nTier meaning: **ok** 300+ unique words; **light** 150-299; **thin** under 150; '
                '**non-functional** calculator cannot compute anything in the browser; '
                '**duplicate** canonical points at another URL; **excluded** noindex, redirect or utility page.\n'
                '\nUnique words exclude paragraphs repeated verbatim on more than %d pages.\n' % BOILERPLATE_MIN_PAGES)
    print(dict(c))
    print('english calculators', dict(ce))


if __name__ == '__main__':
    sys.exit(main())
