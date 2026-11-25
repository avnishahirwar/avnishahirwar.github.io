# Friendly Calculator — Production SEO and Locale Publication Audit

**Audit date:** 25 November 2026  
**Scope:** Read-only crawl of the production homepage, locale landing pages, representative calculator pages, sitemap indexes and locale sitemaps. This is a sampled publication audit, not a complete crawl of every HTML file.

## Executive findings

- The production homepage has a descriptive title and description, index,follow, a self-canonical URL, Open Graph/Twitter metadata and an x-default hreflang.
- The homepage advertises **48 language alternates plus x-default**. All 48 destinations were fetched successfully in this audit; each returned a self-canonical URL, an indexable robots directive and a self-referencing hreflang entry.
- **21 of 48 locale landing pages** had localized title and description metadata in the sampled crawl.
- **27 of 48 locale landing pages** still used the English fallback title and description. Their locale-specific sitemaps each contained only the locale landing page, not translated calculator pages.
- Hindi and Arabic have larger locale sitemaps (166 and 101 URLs respectively); the English sitemap had 1,922 URLs. The sitemap index exposed 49 locale sitemap files, including English.
- The production Site Directory page had a title, description, canonical and robots directive, but the sampled head did not contain Open Graph or Twitter card metadata.
- The homepage text reported 3,971 calculators while the Site Directory reported 3,970. This needs a catalogue-source reconciliation; do not guess which count is correct.

## Locales with localized title and description metadata in this sample

zh, hi, es, ar, fr, bn, pt, id, ur, ru, de, ja, mr, vi, te, tr, ta, ko, it, gu, kn.

This classification is based on the sampled title/description metadata. It does **not** certify that every calculator page, formula explanation, FAQ, unit, or legal/jurisdictional assumption is fully translated.

## Locale landing pages still using English fallback metadata

pcm, arz, sw, ha, pa, fil, yue, wuu, fa, am, th, jv, yo, bho, nl, pl, ml, or, ne, si, uz, ps, so, he, my, ro, sd.

Each of these locale sitemaps contained only its /locale/index.html landing page in the sampled production sitemap fetch. The pages returned a matching language attribute, self-canonical URL, index,follow and a reciprocal hreflang cluster, but their visible title/description fell back to English.

## Representative technical checks

| Page family | Observed result |
|---|---|
| Root homepage | Title, description, canonical, robots, OG/Twitter and x-default present |
| Hindi landing page | Hindi title, description, self-canonical, indexable |
| Arabic landing page | Arabic title, description, self-canonical, indexable |
| Loan EMI calculator | Page-specific title/description, self-canonical, OG/Twitter |
| GST calculator | Page-specific title/description, self-canonical, OG/Twitter |
| Site Directory | Title/description/canonical/robots present; OG/Twitter metadata missing in sampled head |
| Hindi locale sitemap | 166 URLs |
| Arabic locale sitemap | 101 URLs |
| English locale sitemap | 1,922 URLs |
| Sample one-page locale sitemaps (pcm, pa, nl, am) | One landing page each |

## Required next actions

1. Reconcile the catalogue count from one authoritative calculator registry and derive homepage, directory and sitemap counts from that source.
2. Run the repository's additive social-metadata repair against the full HTML tree, then re-run node scripts/repair-public-social-metadata.cjs --check. Preserve existing page titles, descriptions, canonical URLs and content.
3. Audit all 48 locale landing pages and their calculator routes for real translated content, not only html lang, metadata or route existence.
4. For the 27 English-fallback locales, prepare accurate translations and human review before treating them as published language editions.
5. **Do not remove hreflang entries, remove sitemap URLs, add noindex, redirect, or delete locale pages without the owner's explicit approval.** Those actions can affect indexation and existing search visibility.
6. Validate hreflang clusters for route equivalence and reciprocal links on every translated page family, not just the homepage.
7. Run the public SEO metadata quality workflow and full locale audit on the final merge candidate.
8. After deployment, repeat the same checks on the production domain and distinguish deployment success from production verification.

## Limitations

- The 48 locale landing-page checks are live fetches of page heads and metadata; they do not establish translation quality across every calculator page.
- Sitemap counts are per fetched sitemap file and must not be summed as a unique catalogue count without deduplicating URLs across the sitemap index.
- No production files were modified by this audit.


## Locale catalogue status reconciliation

The repository's canonical config/language-catalogue.json currently defines 50 unique locale codes and marks all 50 as available. The production homepage's sampled hreflang cluster contains 48 language codes plus x-default, so the config and published alternate cluster do not match exactly. In addition, 27 of the fetched locale landing pages still use English fallback title/description metadata and their locale sitemaps contain only one landing page. Therefore the catalogue's "available" status must not be interpreted as proof of complete translation or full calculator coverage.

The existing locale-coverage test in this branch still expects 17 available and 33 planned, which does not match the current canonical config. Update that test to validate the config schema and report actual content/metadata coverage separately; do not change the 50 locale statuses or remove locale routes/hreflang without explicit owner approval.
