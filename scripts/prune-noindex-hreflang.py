#!/usr/bin/env python3
"""Safely remove hreflang tags on noindex pages and links to noindex destinations.

Default mode is a non-mutating dry run. Pass --apply only after reviewing the report.
"""
import argparse
import json
import os
import re
from urllib.parse import unquote, urljoin, urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {".git", ".github", "node_modules", "tests", "artifacts", "docs"}
NOINDEX_RE = re.compile(
    r'<meta\b(?=[^>]*\bname\s*=\s*["\'](?:robots|googlebot)["\'])'
    r'(?=[^>]*\bcontent\s*=\s*["\'][^"\']*\bnoindex\b)[^>]*>',
    re.IGNORECASE,
)
NOINDEX_RE_REVERSED = re.compile(
    r'<meta\b(?=[^>]*\bcontent\s*=\s*["\'][^"\']*\bnoindex\b)'
    r'(?=[^>]*\bname\s*=\s*["\'](?:robots|googlebot)["\'])[^>]*>',
    re.IGNORECASE,
)
LINK_TAG_RE = re.compile(r'<link\b[^>]*>', re.IGNORECASE)
ATTR_RE = re.compile(r'([\w:-]+)\s*=\s*(["\'])(.*?)\2', re.IGNORECASE)


def html_files():
    found = []
    for directory, dirs, names in os.walk(ROOT):
        dirs[:] = [name for name in dirs if name not in SKIP_DIRS and not name.startswith(".")]
        found.extend(
            os.path.join(directory, name)
            for name in names
            if name.lower().endswith((".html", ".htm"))
        )
    return sorted(found)


def attributes(tag):
    return {match.group(1).lower(): match.group(3) for match in ATTR_RE.finditer(tag)}


def is_noindex(html):
    head_end = html.lower().find("</head>")
    head = html if head_end < 0 else html[:head_end]
    return bool(NOINDEX_RE.search(head) or NOINDEX_RE_REVERSED.search(head))


def target_file(href):
    absolute = urljoin("https://friendlycalculator.in/", href)
    parsed = urlsplit(absolute)
    if parsed.scheme not in ("http", "https") or parsed.netloc.lower() not in (
        "friendlycalculator.in", "www.friendlycalculator.in"
    ):
        return None
    pathname = unquote(parsed.path or "/")
    if pathname == "/":
        pathname = "/index.html"
    elif pathname.endswith("/"):
        pathname += "index.html"
    elif not os.path.splitext(pathname)[1]:
        pathname += "/index.html"
    candidate = os.path.normpath(os.path.join(ROOT, pathname.lstrip("/")))
    if not candidate.startswith(ROOT + os.sep) and candidate != os.path.join(ROOT, "index.html"):
        return None
    return candidate


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="write the reviewed cleanup changes")
    parser.add_argument("--report", help="optional JSON report path")
    args = parser.parse_args()

    files = html_files()
    noindex = set()
    for path in files:
        with open(path, encoding="utf-8", errors="ignore") as handle:
            if is_noindex(handle.read()):
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
            attrs = attributes(match.group(0))
            if attrs.get("rel", "").lower() != "alternate" or not attrs.get("hreflang"):
                return match.group(0)
            if self_noindex:
                removed["self_noindex"] += 1
                return ""
            destination = target_file(attrs.get("href", ""))
            if destination and os.path.normpath(destination) in noindex:
                removed["noindex_destination"] += 1
                return ""
            return match.group(0)

        updated = LINK_TAG_RE.sub(prune, original)
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
