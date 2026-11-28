#!/usr/bin/env python3
"""Safely prune hreflang tags on noindex pages and links to noindex destinations.

Default mode is a non-mutating dry run. Pass --apply only after reviewing the report.
"""
import argparse
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {".git", "node_modules", "tests", "artifacts", "docs"}
NOINDEX_RE = re.compile(
    r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*\bnoindex\b',
    re.IGNORECASE,
)
LINK_RE = re.compile(
    r'[ \t]*<link\b[^>]*\brel=["\']alternate["\'][^>]*\bhreflang=["\'][^"\']+["\'][^>]*>[ \t]*\n?'
    r'|[ \t]*<link\b[^>]*\bhreflang=["\'][^"\']+["\'][^>]*\brel=["\']alternate["\'][^>]*>[ \t]*\n?',
    re.IGNORECASE,
)
HREF_RE = re.compile(r'\bhref=["\']([^"\']*)["\']', re.IGNORECASE)


def html_files():
    found = []
    for directory, dirs, names in os.walk(ROOT):
        dirs[:] = [name for name in dirs if name not in SKIP_DIRS]
        found.extend(
            os.path.join(directory, name)
            for name in names
            if name.lower().endswith((".html", ".htm"))
        )
    return sorted(found)


def url_to_file(url):
    url = re.sub(r'^https://friendlycalculator\.in', '', url, flags=re.IGNORECASE)
    url = url.split("#", 1)[0].split("?", 1)[0]
    if not url:
        url = "/"
    if url.startswith("/"):
        relative = url.lstrip("/")
    else:
        relative = url
    if url.endswith("/") or not os.path.splitext(relative)[1]:
        relative = os.path.join(relative, "index.html")
    return os.path.normpath(os.path.join(ROOT, relative))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="write the reviewed cleanup changes")
    parser.add_argument("--report", help="optional JSON report path")
    args = parser.parse_args()

    files = html_files()
    noindex = set()
    for path in files:
        with open(path, encoding="utf-8", errors="ignore") as handle:
            if NOINDEX_RE.search(handle.read(4000)):
                noindex.add(os.path.normpath(path))

    changes = []
    for path in files:
        with open(path, encoding="utf-8", errors="ignore") as handle:
            original = handle.read()
        if "hreflang" not in original.lower():
            continue

        self_noindex = os.path.normpath(path) in noindex
        removed = {"self_noindex": 0, "noindex_destination": 0}

        def prune(match):
            href = HREF_RE.search(match.group(0))
            if self_noindex:
                removed["self_noindex"] += 1
                return ""
            if href and os.path.normpath(url_to_file(href.group(1))) in noindex:
                removed["noindex_destination"] += 1
                return ""
            return match.group(0)

        updated = LINK_RE.sub(prune, original)
        if updated != original:
            changes.append({
                "file": os.path.relpath(path, ROOT).replace(os.sep, "/"),
                "removed_self_noindex": removed["self_noindex"],
                "removed_noindex_destination": removed["noindex_destination"],
                "removed_total": sum(removed.values()),
                "content": updated,
                "path": path,
            })

    report = {
        "mode": "apply" if args.apply else "dry-run",
        "html_files_scanned": len(files),
        "noindex_pages_detected": len(noindex),
        "pages_to_change": len(changes),
        "hreflang_tags_to_remove": sum(item["removed_total"] for item in changes),
        "changes": [
            {key: value for key, value in item.items() if key not in {"content", "path"}}
            for item in changes
        ],
    }

    print(json.dumps(report, indent=2, ensure_ascii=False))
    if args.report:
        with open(args.report, "w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2, ensure_ascii=False)

    if args.apply:
        for item in changes:
            with open(item["path"], "w", encoding="utf-8") as handle:
                handle.write(item["content"])
        print(f"Applied cleanup to {len(changes)} HTML pages.")
    else:
        print("Dry run only: no repository files were modified. Use --apply after reviewing the report.")


if __name__ == "__main__":
    main()
