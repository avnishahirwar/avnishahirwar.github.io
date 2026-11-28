#!/usr/bin/env python3
"""Prune only invalid hreflang annotations; preserve page content and all other metadata."""
import json
import os
import re
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(os.environ.get("FC_HREFLANG_ROOT", Path(__file__).resolve().parent.parent)).resolve()
ORIGIN = "https://friendlycalculator.in"
IGNORED = {".git", ".github", "node_modules", "tests", "vendor", "_site", "admin", "avnish-ai", "artifacts", "docs"}
ATTR = re.compile(r"""([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')""", re.I)
TAG = re.compile(r"<(?:link|meta)\b[^>]*>", re.I)
LINK = re.compile(r"<link\b[^>]*>", re.I)
HTML_LANG = re.compile(r"<html\b[^>]*>", re.I)
HEAD_END = re.compile(r"</head\s*>", re.I)
LOCALE_FALLBACK = {"hi", "de", "es", "fr", "pt", "ar", "id", "bn", "ta", "ja", "ru"}
# Google hreflang language identifiers use two-letter ISO 639-1 language codes
# (plus optional script/region subtags); x-default is handled separately.
SUPPORTED_HREFLANG = re.compile(r"^[a-z]{2}(?:-[a-z0-9]{2,8})*$", re.I)

# Review-confirmed translated-page gaps from the reciprocal-link repair.
# Keep this narrow and explicit: do not infer that an entire locale is missing.
KNOWN_UNTRANSLATED = {
    "/calculators/rd-calculator.html": {"am", "de"},
    "/id/calculators/emi-calculator.html": {"ja", "fa", "vi"},
    "/pt/calculators/emi-calculator.html": {"ja", "fa", "vi"},
}

def attrs(tag):
    return {m.group(1).lower(): (m.group(2) if m.group(2) is not None else m.group(3))
            for m in ATTR.finditer(tag)}

def head(html):
    m = HEAD_END.search(html)
    return html[:m.start()] if m else html

def noindex(html):
    for tag in TAG.findall(head(html)):
        if not tag.lower().startswith("<meta"):
            continue
        a = attrs(tag)
        if a.get("name", "").lower() in {"robots", "googlebot"} and re.search(r"\bnoindex\b", a.get("content", ""), re.I):
            return True
    return False

def lang(html, file):
    for tag in HTML_LANG.findall(head(html)):
        value = attrs(tag).get("lang")
        if value:
            return value.lower()
    try:
        first = file.relative_to(ROOT).parts[0].lower()
    except (ValueError, IndexError):
        first = ""
    return first if first in LOCALE_FALLBACK else "en"

def canonical(html):
    for tag in LINK.findall(head(html)):
        a = attrs(tag)
        if "canonical" in a.get("rel", "").lower().split() and a.get("href"):
            return normalized_url(a["href"])
    return None

def known_untranslated_source(file, html, hreflang):
    source = canonical(html)
    source_path = urlsplit(source).path if source else "/" + file.relative_to(ROOT).as_posix()
    return hreflang in KNOWN_UNTRANSLATED.get(source_path, set())

def normalized_url(value):
    try:
        parts = urlsplit(urljoin(ORIGIN + "/", value))
        if parts.scheme != "https" or parts.netloc.lower() != "friendlycalculator.in" or parts.query or parts.fragment:
            return None
        return parts.geturl()
    except ValueError:
        return None

def local_file(value):
    url = normalized_url(value)
    if not url:
        return None
    path = unquote(urlsplit(url).path)
    if path == "/":
        path = "/index.html"
    elif path.endswith("/"):
        path += "index.html"
    target = (ROOT / path.lstrip("/")).resolve()
    try:
        target.relative_to(ROOT)
    except ValueError:
        return None
    return target if target.is_file() else None

def alternate_tags(html):
    result = []
    for match in LINK.finditer(head(html)):
        a = attrs(match.group(0))
        if "alternate" in a.get("rel", "").lower().split() and a.get("hreflang") and a.get("href"):
            result.append((match.start(), match.end(), a["hreflang"].lower(), a["href"]))
    return result

def remove_ranges(html, ranges):
    for start, end in sorted(ranges, reverse=True):
        html = html[:start] + html[end:]
    return html

def main():
    files = []
    for current, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in IGNORED]
        files.extend(Path(current) / name for name in names if name.lower().endswith(".html"))
    cache = {p: p.read_text(encoding="utf-8", errors="replace") for p in files}
    stats = {"pages_scanned": len(files), "noindex_sources": 0, "removed_noindex_source": 0,
             "removed_noindex_target": 0, "removed_language_mismatch": 0,
             "removed_noncanonical_target": 0, "removed_missing_canonical_source": 0,
             "removed_unsupported_language_code": 0, "removed_known_untranslated_target": 0,
             "removed_duplicate": 0, "pages_changed": 0}

    # Pass 1: remove annotations that cannot describe an indexable, language-matching target.
    for file, html in list(cache.items()):
        tags = alternate_tags(html)
        if not tags:
            continue
        if noindex(html):
            stats["noindex_sources"] += 1
            stats["removed_noindex_source"] += len(tags)
            updated = remove_ranges(html, [(a, b) for a, b, _, _ in tags])
        elif not canonical(html):
            stats["removed_missing_canonical_source"] += len(tags)
            updated = remove_ranges(html, [(a, b) for a, b, _, _ in tags])
        else:
            remove = []
            for start, end, hreflang, href in tags:
                if hreflang == "x-default":
                    continue
                if not SUPPORTED_HREFLANG.fullmatch(hreflang):
                    stats["removed_unsupported_language_code"] += 1
                    remove.append((start, end))
                    continue
                if known_untranslated_source(file, html, hreflang):
                    stats["removed_known_untranslated_target"] += 1
                    remove.append((start, end))
                    continue
                target = local_file(href)
                if not target or target not in cache:
                    continue
                target_html = cache[target]
                if noindex(target_html):
                    stats["removed_noindex_target"] += 1
                    remove.append((start, end))
                    continue
                if lang(target_html, target) != hreflang:
                    stats["removed_language_mismatch"] += 1
                    remove.append((start, end))
                    continue
                if canonical(target_html) != normalized_url(href):
                    stats["removed_noncanonical_target"] += 1
                    remove.append((start, end))
            updated = remove_ranges(html, remove)
            # A hreflang value must be unique per page. Keep the first remaining
            # annotation for a language; later duplicates are ambiguous.
            seen = set()
            duplicate_ranges = []
            for start, end, hreflang, href in alternate_tags(updated):
                if hreflang in seen:
                    duplicate_ranges.append((start, end))
                else:
                    seen.add(hreflang)
            stats["removed_duplicate"] += len(duplicate_ranges)
            updated = remove_ranges(updated, duplicate_ranges)
        if updated != html:
            cache[file] = updated
            stats["pages_changed"] += 1

    # Pass 2: remove links whose destination already assigns the source language
    # to a different URL. The additive repair can safely fill an absent reciprocal.
    for file, html in list(cache.items()):
        if noindex(html):
            continue
        source_lang = lang(html, file)
        source_canonical = canonical(html)
        if not source_canonical:
            continue
        remove = []
        for start, end, hreflang, href in alternate_tags(html):
            if hreflang == "x-default":
                continue
            target = local_file(href)
            if not target or target not in cache:
                continue
            target_links = alternate_tags(cache[target])
            reciprocal = [item for item in target_links if item[2] == source_lang]
            if reciprocal and not any(normalized_url(item[3]) == source_canonical for item in reciprocal):
                remove.append((start, end))
        updated = remove_ranges(html, remove)
        if updated != html:
            cache[file] = updated
            stats["pages_changed"] += 1

    if os.environ.get("FC_HREFLANG_DRY_RUN") != "1":
        for file, original in cache.items():
            if original != file.read_text(encoding="utf-8", errors="replace"):
                file.write_text(original, encoding="utf-8")
    print("Invalid hreflang cleanup: " + json.dumps(stats, sort_keys=True))
    if os.environ.get("FC_HREFLANG_DRY_RUN") == "1":
        print("Dry run only. No files were changed.")

if __name__ == "__main__":
    main()
