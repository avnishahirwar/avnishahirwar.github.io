#!/usr/bin/env python3
"""Remove hreflang alternates that point at noindex pages, and all hreflang from noindex pages
(Google ignores hreflang to noindex URLs and requires clusters of indexable pages)."""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
skip = {'.git', 'node_modules', 'tests', 'artifacts', 'docs'}
files = []
for d, ds, fs in os.walk(ROOT):
    ds[:] = [x for x in ds if x not in skip]
    files += [os.path.join(d, f) for f in fs if f.endswith('.html')]
nx = re.compile(r'<meta\s+name="robots"\s+content="[^"]*noindex', re.I)
link = re.compile(r'[ \t]*<link\b[^>]*\brel="alternate"[^>]*\bhreflang="[^"]*"[^>]*>[ \t]*\n?|[ \t]*<link\b[^>]*\bhreflang="[^"]*"[^>]*\brel="alternate"[^>]*>[ \t]*\n?', re.I)
hre = re.compile(r'href="([^"]*)"')
def url_to_file(u):
    u = re.sub(r'^https://friendlycalculator\.in', '', u).split('#')[0].split('?')[0]
    return os.path.join(ROOT, u.lstrip('/') or 'index.html') if not u.endswith('/') else os.path.join(ROOT, u.lstrip('/'), 'index.html')
noidx = set()
for f in files:
    if nx.search(open(f, encoding='utf8', errors='ignore').read(4000)): noidx.add(os.path.normpath(f))
changed = 0
for f in files:
    s = open(f, encoding='utf8', errors='ignore').read()
    if 'hreflang' not in s: continue
    self_noindex = os.path.normpath(f) in noidx
    def sub(m):
        h = hre.search(m.group(0))
        if self_noindex: return ''
        if h and os.path.normpath(url_to_file(h.group(1))) in noidx: return ''
        return m.group(0)
    t = link.sub(sub, s)
    if t != s:
        open(f, 'w', encoding='utf8').write(t); changed += 1
print('pages changed', changed, 'noindex pages', len(noidx))
