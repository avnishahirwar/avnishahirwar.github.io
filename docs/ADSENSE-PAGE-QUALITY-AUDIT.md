# AdSense page-quality audit

Run locally:

    node --test tests/adsense-page-quality-audit.test.cjs
    node scripts/adsense-page-quality-audit.cjs

The audit inventories English root calculator routes and scores source-level signals: page-specific visible text after subtracting repeated paragraphs, formula explanation, worked example, FAQ, assumptions and limitations, authoritative-source references, readable input labels, working calculator markup, title and description, one meaningful H1, heading hierarchy, canonical URL, existing noindex/redirect state and duplicate metadata.

The 250-page shortlist is selected only from pages that pass the source-level eligibility gate. The gate excludes existing noindex pages, refresh redirects, non-self canonicals, duplicate title/description/canonical values, stale year-specific primary pages, missing title/description/H1, generic template copy and raw placeholder labels. Rate-sensitive pages also need an update marker and an authoritative source signal. The ranking is a triage heuristic, not a Google score, guarantee of AdSense approval or substitute for formula/runtime verification. If fewer than 200 pages pass, the report records the smaller true count rather than padding the shortlist.

The report separates:
- Candidate shortlist for page-by-page manual validation.
- Suggested noindex review candidates with multiple thin-template quality signals.
- Manual-review pages that do not yet meet the hard-thin criteria.
- Pages already noindex or redirect-only.
- Topic routes excluded from this public report.

The noindex recommendation list is advisory until reviewed. Applying it must preserve every HTML file and public route; only the robots directive and related generated catalogue/sitemap surfaces may change. Localized pages are not modified by this English audit; their translations, canonical URLs and reciprocal hreflang clusters require a separate assessment.

The audit does not change or delete HTML, robots directives, XML sitemaps, routes, Header/Footer, the SEO Content Calendar, production hosting or AdSense account settings. It does not verify calculation correctness, live browser behaviour, Search Console metrics or publisher account status.
