# Smart Regional Experience System (SRES)

Status: staged implementation; not production verified.

## Product objective
Deliver a privacy-conscious, auto-first regional experience across Friendly Calculator. The system must make sensible first-visit choices while keeping every preference understandable, reversible and user-controlled.

## Preference precedence
1. Explicit locale URL (for example, /hi/ or /de/) is authoritative for page language and SEO.
2. A visitor's saved manual preference is authoritative for the matching setting.
3. Browser/device locale preferences are used when no manual preference exists.
4. Safe site defaults are used when the browser does not expose a usable value.

Do not infer a user's country from IP or request GPS for display preferences. Do not silently change a manually selected preference.

## Regional dimensions
- Language: use the best supported browser language on the root homepage; preserve explicit localized routes. Unsupported translations must be clearly labelled rather than pretending translated content exists.
- Country and format: derive a country region from BCP 47 locale tags, including script subtags (for example, zh-Hant-TW); use Intl APIs for number and date formatting.
- Currency: choose a sensible display currency from a country-to-currency map. Display currency is formatting only; it must never imply conversion of calculator inputs or results. Any future conversion feature must disclose rate provider, timestamp, fees/rounding assumptions and source currency.
- Units: default to metric except customary-unit regions (US, Liberia and Myanmar); calculator-specific statutory or industry units take precedence where relevant. Preserve manual unit choice.
- Accessibility: honor prefers-reduced-motion, prefers-contrast and forced-colors. Keep keyboard focus visible, labels and accessible names clear, and user-selected accessibility preferences persistent.

## User controls
- Each setting must be independently changeable.
- Provide one action to return regional settings to automatic defaults.
- Reset must not clear unrelated accessibility, theme, text-size, favourites or calculator data.
- Clearly explain that country/format is distinct from website language and display currency does not perform conversion.

## Engineering requirements
- Keep detection and formatting in the shared global locale module; avoid duplicate per-page implementations.
- Expose stable read-only getters and explicit setters through window.FCLocale.
- Dispatch documented locale/unit change events when a setting changes.
- Handle localStorage denial, invalid values, missing Intl.Locale and missing browser language lists without throwing.
- Avoid geolocation, third-party fingerprinting and unnecessary network requests.
- Keep all current calculator formulas, URLs, canonical/hreflang behavior, header/footer, SEO calendar, analytics and payment configuration unchanged.

## QA acceptance criteria
- First visit with en-US, en-GB, hi-IN, fr-CA and zh-Hant-TW locale examples selects a sensible supported locale, country, currency, format and unit default.
- Saved manual choices survive reload and override browser defaults.
- Explicit locale URLs remain authoritative even if a saved language preference differs.
- Automatic reset clears only language/country/currency/format/units preference keys.
- Currency formatting is never described as currency conversion.
- Date and number formatting use Intl.NumberFormat and Intl.DateTimeFormat.
- Metric/customary defaults are covered by tests; explicit manual unit selection remains persistent.
- Reduced-motion, increased-contrast, forced-colors, keyboard navigation and screen-reader labels are checked in supported browsers.
- Run regression, locale coverage, mobile, cross-browser and Lighthouse checks before merge.
- Verify the production domain after deployment; a PR preview is not production verification.

## Current staged work
PR #805 contains automatic regional reset, accessibility media-query support, improved browser region detection (including script subtags), and tests for non-US customary-unit regions. It remains stacked on PR #730 and is not merged or deployed.


## Non-negotiable SEO protection gate

The regional experience must not create SEO regressions. Treat these as release-blocking acceptance criteria:

1. **URL stability:** browser locale detection may choose the root homepage language experience only. An explicit locale route remains authoritative; automatic preference reset must not rewrite, redirect or canonicalize a URL to another locale.
2. **Metadata immutability:** the regional preference runtime must not rewrite document.title, meta description, robots directives, canonical links, Open Graph/Twitter metadata, JSON-LD or hreflang tags.
3. **Canonical integrity:** every indexable localized page keeps its correct self/approved canonical. Never canonicalize all translated pages to English by default.
4. **Hreflang integrity:** include only live, genuinely translated equivalents; require valid language/region codes, reciprocal links, self-reference and appropriate x-default behavior. No planned/untranslated locale may be advertised as a completed alternate.
5. **Sitemap integrity:** sitemap entries must resolve to unique, canonical, indexable HTTP 200 pages. Do not add redirects, noindex pages, duplicate variants, thin placeholders or planned locales.
6. **Per-page metadata:** every indexable HTML page needs a unique, accurate title and description, correct robots policy and social metadata. Preserve good existing copy; repair only verified defects.
7. **Content quality:** translated calculator pages must localize the actual calculator labels, explanation, formula, examples, FAQs, assumptions, units and error messages. A translated menu alone is not a translated page.
8. **Structured data:** keep JSON-LD consistent with visible page content and locale; validate syntax and required properties. Do not promise rich results or ranking from schema alone.
9. **Internal discovery:** important calculators remain reachable via crawlable HTML links and relevant category hubs, not only client-side search.
10. **Performance:** test representative mobile and desktop page families. Track LCP, INP and CLS separately; never report lab TBT as field INP.
11. **Release gates:** run the public SEO metadata quality check, sitemap validation, locale/hreflang coverage audit, page-level metadata checks, calculator regressions, mobile/cross-browser tests and Lighthouse. Investigate failures; do not weaken tests to obtain a green result.
12. **Production verification:** after merge/deployment, independently verify representative English and localized URLs on https://friendlycalculator.in/, including status, canonical, robots, hreflang, title, description, structured data and sitemap inclusion.

## Existing SEO baseline to keep visible
The 21 Nov project audit recorded 4,165 HTML files scanned and 688 flagged for social metadata repair, with 17 published locales and 33 planned. It also recorded uneven translation coverage and historical mobile lab concerns (homepage CLS 0.108 and Income Tax LCP 4.2 s). These are historical audit figures, not a fresh current crawl. Keep them as a triage baseline until a new full inventory is produced; do not claim every webpage is already SEO-perfect.
