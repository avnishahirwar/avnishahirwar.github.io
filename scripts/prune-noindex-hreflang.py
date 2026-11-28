#!/usr/bin/env python3
"""Safely report or prune hreflang tags on noindex pages/destinations.

Default mode is a non-mutating dry run. Pass --apply only after reviewing the report.
"""
import argparse
import json
import os
import re
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {'.git', 'node_modules', 'tests', 'artifacts', 'docs'}
TAG_RE = re.compile(r'<link\b[^>]*>', re.IGNORECASE)

class TagReader(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = []
    def handle_starttag(self, tag, attrs):
        self.tags.append((tag.lower(), {str(k).lower(): (v or '') for k, v in attrs}))
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

def parse_tags(source):
    parser = TagReader()
    parser.feed(source)
    return parser.tags

def is_noindex(source):
    for tag, attrs in parse_tags(source[:12000]):
        if tag == 'meta' and attrs.get('name', '').strip().lower() == 'robots':
            if re.search(r'\bnoindex\b', attrs.get('content', ''), re.IGNORECASE):
                return True
    return False

def html_files():
    found = []
    for directory, dirs, names in os.walk(ROOT):
        dirs[:] = [name for name in dirs if name not in SKIP_DIRS]
        found.extend(os.path.join(directory, name) for name in names if name.lower().endswith(('.html', '.htm')))
    return sorted(found)

def url_to_file(url, source_file):
    parts = urlsplit(url)
    if parts.scheme and parts.netloc and parts.netloc.lower() not in {'friendlycalculator.in', 'www.friendlycalculator.in'}:
        return None
    path = unquote(parts.path or '/')
    if not path.startswith('/'):
        path = os.path.join(os.path.dirname(os.path.relpath(source_file, ROOT)), path)
    relative = path.lstrip('/')
    if path.endswith('/') or not os.path.splitext(relative)[1]:
        relative = os.path.join(relative, 'index.html')
    candidate = os.path.normpath(os.path.join(ROOT, relative))
    if os.path.commonpath([ROOT, candidate]) != ROOT:
        return None
    return candidate

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='write the reviewed cleanup changes')
    parser.add_argument('--report', help='optional JSON report path')
    args = parser.parse_args()
    files = html_files()
    contents = {}
    noindex = set()
    for path in files:
        with open(path, encoding='utf-8', errors='ignore') as handle:
            source = handle.read()
        contents[path] = source
        if is_noindex(source):
            noindex.add(os.path.normpath(path))
    changes = []
    for path, original in contents.items():
        if '<link' not in original.lower() or 'hreflang' not in original.lower():
            continue
        self_noindex = os.path.normpath(path) in noindex
        counts = {'self_noindex': 0, 'noindex_destination': 0}
        def prune(match):
            tag = match.group(0)
            parsed = parse_tags(tag)
            attrs = parsed[0][1] if parsed else {}
            if parsed and parsed[0][0] == 'link' and 'alternate' in attrs.get('rel', '').lower().split() and attrs.get('hreflang') is not None:
                if self_noindex:
                    counts['self_noindex'] += 1
                    return ''
                target = url_to_file(attrs.get('href', ''), path)
                if target and os.path.normpath(target) in noindex:
                    counts['noindex_destination'] += 1
                    return ''
            return tag
        updated = TAG_RE.sub(prune, original)
        if updated != original:
            changes.append({'file': os.path.relpath(path, ROOT).replace(os.sep, '/'), 'removed_self_noindex': counts['self_noindex'], 'removed_noindex_destination': counts['noindex_destination'], 'removed_total': sum(counts.values()), 'path': path, 'content': updated})
    report = {'mode': 'apply' if args.apply else 'dry-run', 'html_files_scanned': len(files), 'noindex_pages_detected': len(noindex), 'pages_to_change': len(changes), 'hreflang_tags_to_remove': sum(item['removed_total'] for item in changes), 'changes': [{k:v for k,v in item.items() if k not in {'path','content'}} for item in changes]}
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if args.report:
        with open(args.report, 'w', encoding='utf-8') as handle:
            json.dump(report, handle, indent=2, ensure_ascii=False)
    if args.apply:
        for item in changes:
            with open(item['path'], 'w', encoding='utf-8') as handle:
                handle.write(item['content'])
        print('Applied cleanup to %d HTML pages.' % len(changes))
    else:
        print('Dry run only: no repository files were modified.')

if __name__ == '__main__':
    main()
