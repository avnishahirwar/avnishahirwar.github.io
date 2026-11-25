#!/usr/bin/env python3
"""Launch the full core set of calculators (96+ calculators) across all 50 locales."""
import html as html_mod
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOGUE_PATH = os.path.join(ROOT, "config", "language-catalogue.json")

EXTRA_TOP = [
    "basic-calculator.html",
    "percentage-calculator.html",
    "age-calculator.html",
    "bmi-calculator.html",
    "home-loan-emi-calculator.html",
    "car-loan-calculator.html",
    "gst-calculator.html",
    "sip-calculator.html",
    "compound-interest-calculator.html",
    "simple-interest-calculator.html",
    "discount-calculator.html",
    "unit-converter.html",
    "calorie-calculator.html",
    "salary-calculator.html",
]

HTML_TAG_RE = re.compile(r"<html\b[^>]*>", re.I)
TITLE_RE = re.compile(r"(<title[^>]*>)(.*?)(</title>)", re.I | re.S)
DESC_RE = re.compile(
    r'(<meta\b[^>]*\bname=["\']description["\'][^>]*\bcontent=["\'])([^"\']*)(["\'][^>]*>)',
    re.I | re.S,
)
CANON_RE = re.compile(
    r'(<link\b[^>]*\brel=["\']canonical["\'][^>]*\bhref=["\'])([^"\']*)(["\'][^>]*>)',
    re.I | re.S,
)
OG_URL_RE = re.compile(
    r'(<meta\b[^>]*\bproperty=["\']og:url["\'][^>]*\bcontent=["\'])([^"\']*)(["\'][^>]*>)',
    re.I | re.S,
)
OG_TITLE_RE = re.compile(
    r'(<meta\b[^>]*\bproperty=["\']og:title["\'][^>]*\bcontent=["\'])([^"\']*)(["\'][^>]*>)',
    re.I | re.S,
)
OG_DESC_RE = re.compile(
    r'(<meta\b[^>]*\bproperty=["\']og:description["\'][^>]*\bcontent=["\'])([^"\']*)(["\'][^>]*>)',
    re.I | re.S,
)
TW_TITLE_RE = re.compile(
    r'(<meta\b[^>]*\bname=["\']twitter:title["\'][^>]*\bcontent=["\'])([^"\']*)(["\'][^>]*>)',
    re.I | re.S,
)
TW_DESC_RE = re.compile(
    r'(<meta\b[^>]*\bname=["\']twitter:description["\'][^>]*\bcontent=["\'])([^"\']*)(["\'][^>]*>)',
    re.I | re.S,
)
HREFLANG_RE = re.compile(r'\s*<link\b[^>]*\brel=["\']alternate["\'][^>]*\bhreflang=["\'][^"\']+["\'][^>]*>', re.I)
HEAD_CLOSE_RE = re.compile(r"</head>", re.I)


def get_core_calculators() -> list[str]:
    slugs = set(EXTRA_TOP)
    es_dir = os.path.join(ROOT, "es", "calculators")
    if os.path.isdir(es_dir):
        for f in os.listdir(es_dir):
            if f.endswith(".html"):
                slugs.add(f)
    return sorted(slugs)


def build_hreflang_block(slug: str, all_codes: list[str]) -> str:
    lines = [
        f'<link rel="alternate" hreflang="en" href="https://friendlycalculator.in/calculators/{slug}">',
        f'<link rel="alternate" hreflang="x-default" href="https://friendlycalculator.in/calculators/{slug}">',
    ]
    for code in all_codes:
        if code == "en":
            continue
        lines.append(
            f'<link rel="alternate" hreflang="{code}" href="https://friendlycalculator.in/{code}/calculators/{slug}">'
        )
    return "\n" + "\n".join(lines) + "\n"


def localize_html(src_html: str, slug: str, loc: dict, all_codes: list[str]) -> str:
    code = loc["code"]
    native = loc["nativeName"]
    direction = loc.get("direction", "ltr")
    target_url = f"https://friendlycalculator.in/{code}/calculators/{slug}"

    out = src_html

    if direction == "rtl":
        out = HTML_TAG_RE.sub(f'<html lang="{code}" dir="rtl">', out, count=1)
    else:
        out = HTML_TAG_RE.sub(f'<html lang="{code}">', out, count=1)

    tm = TITLE_RE.search(out)
    new_title = ""
    if tm:
        base_t = re.sub(r"\s+", " ", html_mod.unescape(tm.group(2))).strip()
        short_base = base_t.split("|")[0].strip()
        new_title = f"{short_base} ({native}) | Friendly Calculator"
        if len(new_title) > 68:
            new_title = f"{short_base} ({native}) | Friendly Calc"
        esc_t = html_mod.escape(new_title, quote=True)
        out = out[: tm.start(2)] + esc_t + out[tm.end(2) :]

    dm = DESC_RE.search(out)
    new_desc = ""
    if dm:
        base_d = re.sub(r"\s+", " ", html_mod.unescape(dm.group(2))).strip()
        prefix = f"[{native}] "
        candidate = prefix + base_d
        if len(candidate) > 160:
            candidate = candidate[:157].rsplit(" ", 1)[0].rstrip(" ,;:-") + "."
        new_desc = html_mod.escape(candidate, quote=True)
        out = out[: dm.start(2)] + new_desc + out[dm.end(2) :]

    out = CANON_RE.sub(rf"\g<1>{target_url}\g<3>", out, count=1)
    out = OG_URL_RE.sub(rf"\g<1>{target_url}\g<3>", out, count=1)
    if new_title:
        esc_t = html_mod.escape(new_title, quote=True)
        out = OG_TITLE_RE.sub(rf"\g<1>{esc_t}\g<3>", out, count=1)
        out = TW_TITLE_RE.sub(rf"\g<1>{esc_t}\g<3>", out, count=1)
    if new_desc:
        out = OG_DESC_RE.sub(rf"\g<1>{new_desc}\g<3>", out, count=1)
        out = TW_DESC_RE.sub(rf"\g<1>{new_desc}\g<3>", out, count=1)

    en_url = f"https://friendlycalculator.in/calculators/{slug}"
    out = out.replace(f'"{en_url}"', f'"{target_url}"')

    out = HREFLANG_RE.sub("", out)
    hm = HEAD_CLOSE_RE.search(out)
    if hm:
        out = out[: hm.start()] + build_hreflang_block(slug, all_codes) + out[hm.start() :]

    return out


def main():
    write = "--write" in sys.argv
    with open(CATALOGUE_PATH, "r", encoding="utf-8") as fh:
        cat = json.load(fh)
    locales = cat["locales"]
    all_codes = [x["code"] for x in locales]
    core_slugs = get_core_calculators()

    created = 0
    skipped = 0
    for slug in core_slugs:
        src_path = os.path.join(ROOT, "calculators", slug)
        if not os.path.exists(src_path):
            continue
        with open(src_path, "r", encoding="utf-8", errors="replace") as fh:
            src_html = fh.read()

        for loc in locales:
            code = loc["code"]
            if code == "en":
                continue
            dest_dir = os.path.join(ROOT, code, "calculators")
            dest_path = os.path.join(dest_dir, slug)
            if os.path.exists(dest_path):
                skipped += 1
                continue
            created += 1
            if write:
                os.makedirs(dest_dir, exist_ok=True)
                localized = localize_html(src_html, slug, loc, all_codes)
                with open(dest_path, "w", encoding="utf-8") as fh:
                    fh.write(localized)

    print(f"Core {len(core_slugs)} calculators across {len(locales)} locales (write={write}): created={created}, already_existed={skipped}")


if __name__ == "__main__":
    main()
