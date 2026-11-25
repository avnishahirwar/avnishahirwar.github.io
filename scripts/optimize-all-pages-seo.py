#!/usr/bin/env python3
"""Comprehensive, non-destructive SEO optimizer for all public HTML pages on friendlycalculator.in."""
import html as html_mod
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {
    ".git", ".github", "tests", "avnish-ai", "admin", "artifacts",
    "node_modules", "supabase", "scripts", "seo", "schema",
}
SKIP_FILES = {
    "google09d3278d6d57b1a4.html",
    "seo-meta-tags.html",
    "404.html",
    "offline.html",
}

TITLE_RE = re.compile(r"(<title[^>]*>)(.*?)(</title>)", re.I | re.S)
DESC_RE = re.compile(
    r'(<meta\b[^>]*\bname=["\']description["\'][^>]*\bcontent=["\'])([^"\']*)(["\'][^>]*>)'
    r'|(<meta\b[^>]*\bcontent=["\'])([^"\']*)(["\'][^>]*\bname=["\']description["\'][^>]*>)',
    re.I | re.S,
)
CANON_RE = re.compile(
    r'<link\b[^>]*\brel=["\']canonical["\'][^>]*\bhref=["\']([^"\']+)["\']'
    r'|<link\b[^>]*\bhref=["\']([^"\']+)["\'][^>]*\brel=["\']canonical["\']',
    re.I | re.S,
)
LANG_RE = re.compile(r'<html\b[^>]*\blang=["\']([^"\']+)["\']', re.I)
NOINDEX_RE = re.compile(r'<meta\b[^>]*\bname=["\']robots["\'][^>]*\bcontent=["\'][^"\']*noindex', re.I)
REFRESH_RE = re.compile(r'<meta\b[^>]*\bhttp-equiv=["\']refresh["\']', re.I)
TW_CARD_RE = re.compile(r'<meta\b[^>]*\bname=["\']twitter:card["\']', re.I)
JSONLD_RE = re.compile(r'<script\b[^>]*\btype=["\']application/ld\+json["\']', re.I)
HEAD_CLOSE_RE = re.compile(r"</head>", re.I)


def trim_at_word(text: str, max_len: int) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= max_len:
        return text
    cut = text[: max_len - 1].rsplit(" ", 1)[0].rstrip(" ,;:-–—|")
    if len(cut) < max_len // 2:
        cut = text[: max_len - 1].rstrip(" ,;:-–—|")
    return cut


def build_jsonld(title: str, desc: str, canonical: str, lang: str, rel_path: str) -> str:
    clean_title = html_mod.unescape(re.sub(r"\s+", " ", title).strip())
    clean_desc = html_mod.unescape(re.sub(r"\s+", " ", desc).strip())

    # Build breadcrumb items from URL path
    path_part = canonical.replace("https://friendlycalculator.in", "").strip("/")
    crumbs = [
        {
            "@type": "ListItem",
            "position": 1,
            "name": "Friendly Calculator",
            "item": "https://friendlycalculator.in/",
        }
    ]
    if path_part:
        parts = [p for p in path_part.split("/") if p]
        acc = ""
        for idx, seg in enumerate(parts, start=2):
            acc = f"{acc}/{seg}"
            is_last = idx == len(parts) + 1
            label = clean_title.split("|")[0].split("—")[0].strip() if is_last else seg.replace(".html", "").replace("-", " ").title()
            item_url = canonical if is_last else f"https://friendlycalculator.in{acc}/"
            crumbs.append({
                "@type": "ListItem",
                "position": idx,
                "name": label[:80],
                "item": item_url,
            })

    graph = [
        {
            "@type": "WebPage",
            "name": clean_title,
            "description": clean_desc,
            "url": canonical,
            "inLanguage": lang or "en",
            "isPartOf": {
                "@type": "WebSite",
                "name": "Friendly Calculator",
                "url": "https://friendlycalculator.in/",
            },
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": crumbs,
        },
    ]
    payload = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, separators=(",", ":"))
    # Prevent closing script tag injection
    payload = payload.replace("</", "<\\/")
    return f'  <script type="application/ld+json">{payload}</script>\n'


def process_file(abs_path: str, rel_path: str, write: bool) -> dict:
    with open(abs_path, "r", encoding="utf-8", errors="replace") as fh:
        orig = fh.read()

    if REFRESH_RE.search(orig) or NOINDEX_RE.search(orig):
        return {}
    if not HEAD_CLOSE_RE.search(orig):
        return {}

    txt = orig
    stats = {}

    # 1. Title
    tm = TITLE_RE.search(txt)
    title_val = ""
    if tm:
        raw_t = re.sub(r"\s+", " ", tm.group(2)).strip()
        title_val = raw_t
        if len(raw_t) > 70:
            # Keep brand suffix if present
            if " | Friendly Calculator" in raw_t:
                base = raw_t.replace(" | Friendly Calculator", "").strip()
                new_t = f"{trim_at_word(base, 44)} | Friendly Calculator"
            else:
                new_t = trim_at_word(raw_t, 65)
            txt = txt[: tm.start(2)] + new_t + txt[tm.end(2) :]
            title_val = new_t
            stats["trimmed_title"] = 1

    # 2. Description
    dm = DESC_RE.search(txt)
    desc_val = ""
    if dm:
        if dm.group(2) is not None:
            raw_d = re.sub(r"\s+", " ", dm.group(2)).strip()
            d_start, d_end = dm.start(2), dm.end(2)
        else:
            raw_d = re.sub(r"\s+", " ", dm.group(5)).strip()
            d_start, d_end = dm.start(5), dm.end(5)
        desc_val = raw_d

        if len(raw_d) > 170:
            new_d = trim_at_word(raw_d, 158)
            if not new_d.endswith((".", "!", "?", "।")):
                new_d += "."
            txt = txt[:d_start] + new_d + txt[d_end:]
            desc_val = new_d
            stats["trimmed_desc"] = 1
        elif 0 < len(raw_d) < 70 and title_val:
            base_t = html_mod.unescape(title_val.split("|")[0].strip())
            suffix = f" — {base_t} on Friendly Calculator."
            candidate = raw_d.rstrip(".") + "." + suffix
            if len(candidate) > 158:
                candidate = trim_at_word(candidate, 158)
            new_d = html_mod.escape(candidate, quote=True)
            txt = txt[:d_start] + new_d + txt[d_end:]
            desc_val = new_d
            stats["enriched_desc"] = 1

    # 3. Canonical & Lang
    cm = CANON_RE.search(txt)
    canonical = (cm.group(1) or cm.group(2)).strip() if cm else f"https://friendlycalculator.in/{rel_path}"
    lm = LANG_RE.search(txt)
    lang = lm.group(1).strip() if lm else "en"

    # 4. Inject missing Twitter Card and/or JSON-LD before </head>
    injections = []
    if not TW_CARD_RE.search(txt) and title_val:
        esc_t = html_mod.escape(html_mod.unescape(title_val), quote=True)
        esc_d = html_mod.escape(html_mod.unescape(desc_val or title_val), quote=True)
        injections.append(
            '  <meta name="twitter:card" content="summary_large_image" />\n'
            f'  <meta name="twitter:title" content="{esc_t}" />\n'
            f'  <meta name="twitter:description" content="{esc_d}" />\n'
            '  <meta name="twitter:image" content="https://friendlycalculator.in/og-friendly-calculator.png" />\n'
        )
        stats["added_twitter"] = 1

    if not JSONLD_RE.search(txt) and title_val:
        injections.append(build_jsonld(title_val, desc_val or title_val, canonical, lang, rel_path))
        stats["added_jsonld"] = 1

    if injections:
        hm = HEAD_CLOSE_RE.search(txt)
        if hm:
            txt = txt[: hm.start()] + "".join(injections) + txt[hm.start() :]

    if txt != orig:
        stats["files_modified"] = 1
        if write:
            with open(abs_path, "w", encoding="utf-8") as fh:
                fh.write(txt)
    return stats


def main():
    write = "--write" in sys.argv
    totals = {}
    scanned = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for f in filenames:
            if not f.endswith(".html"):
                continue
            rel = os.path.relpath(os.path.join(dirpath, f), ROOT)
            if rel in SKIP_FILES or os.path.basename(rel) == "google09d3278d6d57b1a4.html":
                continue
            scanned += 1
            res = process_file(os.path.join(dirpath, f), rel, write=write)
            for k, v in res.items():
                totals[k] = totals.get(k, 0) + v
    print(f"Scanned {scanned} HTML pages (write={write})")
    for k, v in sorted(totals.items()):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
