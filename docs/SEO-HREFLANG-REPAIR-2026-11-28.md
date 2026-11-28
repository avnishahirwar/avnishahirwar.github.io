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

## Approved noindex cleanup — completed

The first dry-run exposed a parser limitation: it detected noindex pages but failed to recognize their existing `<link rel="alternate" hreflang>` tags. The scanner was corrected to parse link-tag attributes independently of attribute order and to detect robots/googlebot noindex directives robustly.

The corrected dry-run scanned 12,232 HTML files, detected 5,941 noindex pages, and identified **55 pages containing 110 hreflang tags** to remove. The approved cleanup was applied on the PR branch by [workflow run 46114251911](https://github.com/avnishahirwar/avnishahirwar.github.io/actions/runs/46114251911). Both `tests/international-seo.test.cjs` and `tests/international-seo-diagnostic.test.cjs` passed; the full hreflang audit reported **0 defects** (12,218 pages scanned, 2,901 pages with alternates, 48,386 alternate references).

## Deployment status

These changes are committed to the PR branch only. They are **not merged** and **not deployed to production**. Full PR CI must pass before merge.


## Sitemap and catalogue regeneration — completed on PR branch

The PR validation workflow had regenerated the sitemap in its temporary runner workspace but did not commit the generated file, leaving the checked-in sitemap stale. A branch-scoped workflow now regenerates and commits the canonical sitemap, calculator directory, physics directory, and catalogue counters together.

- Generated `sitemap.xml`: 3,191 unique canonical URLs from 12,206 HTML files, with 131 language clusters.
- Rebuilt `calculator/site-directory.html`: 1,615 unique calculator links across 20 categories.
- Rebuilt `calculator/physics-calculators.html`: 364 verified calculator links.
- Synchronized published catalogue count: 1,618 calculators across 35 public count surfaces.
- Validation: sitemap check, site-directory check, count sync check, locale sitemap check, and 12 targeted sitemap/catalogue/physics tests all passed.
- Workflow run: [46114340512](https://github.com/avnishahirwar/avnishahirwar.github.io/actions/runs/46114340512). Generated sitemap/directory commit: `5fb29a19b0066b43e282aff4c6856f5cafdaf3ee`.

These changes remain on PR #930; no production deployment has occurred.
