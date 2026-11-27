# AdSense page-quality audit

Run locally:

    node --test tests/adsense-page-quality-audit.test.cjs
    node scripts/adsense-page-quality-audit.cjs

The audit inventories English root calculator routes and scores source-level signals: unique visible text, formula explanation, worked example, FAQ, assumptions and limitations, authoritative-source references, meaningful input labels, calculator markup, canonical metadata and priority calculator slugs.

The report ranks 250 candidate pages for human review. Remaining pages form a proposed noindex review queue. This ranking is a triage heuristic, not a Google score, not a guarantee of AdSense approval, and not permission to noindex pages automatically. It does not apply page changes.

Locale pages are excluded from the English shortlist. Their translations, canonical URLs and reciprocal hreflang clusters must be reviewed separately; partial translations must not be treated as equivalent content.

The audit does not change or delete HTML, robots directives, XML sitemaps, routes, Header/Footer, the SEO Content Calendar, production hosting or AdSense account settings. It does not verify calculation correctness, live browser behaviour, Search Console metrics or publisher account status.
