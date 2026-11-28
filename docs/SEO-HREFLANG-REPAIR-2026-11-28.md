# Friendly Calculator — additive hreflang repair report

**Date:** 28 November 2026  
**Branch:** `fix/gst-inr-label-consistency-20261128`  
**PR:** [#930](https://github.com/avnishahirwar/avnishahirwar.github.io/pull/930)  
**Repair workflow:** [Run 46114011085](https://github.com/avnishahirwar/avnishahirwar.github.io/actions/runs/46114011085)

## Verified result

The repository's existing additive-only hreflang repair script was run in a non-mutating dry run, then applied in a dedicated GitHub Actions job. The script only adds missing reciprocal alternate links where both source and target are indexable, same-domain, self-canonical, resolvable, and language-matched. It skips noindex pages and ambiguous/conflicting clusters.

| Metric | Result |
|---|---:|
| HTML pages scanned | 12,218 |
| Existing hreflang links examined | 43,942 |
| Missing reciprocal hreflang tags added | 4,444 |
| Target HTML pages changed | 115 |
| Existing reciprocal tags already present | 33,898 |
| Noindex pages skipped | 5,927 |
| Missing targets / language mismatches / canonical mismatches / conflicts | 0 |
| Test result | `tests/international-seo-diagnostic.test.cjs` passed |
| Diff whitespace validation | `git diff --check` passed |

The repair was additive: no calculator formulas, page copy, canonical URLs, robots directives, navigation, header/footer, or sitemap entries were intentionally modified. The generated diff showed 115 HTML files changed with 4,446 insertions and 2 line replacements around the closing head tags.

## Noindex cleanup decision

A separate dry-run of `scripts/prune-noindex-hreflang.py` scanned 12,232 HTML files and detected 5,884 noindex pages, but found **0** hreflang tags to remove and **0** pages to change. Therefore no cleanup was applied.

## Deployment status

These changes are committed to the PR branch only. They are **not merged** and **not deployed to production**. Full PR CI must pass before merge.
