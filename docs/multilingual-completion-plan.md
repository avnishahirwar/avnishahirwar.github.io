# Friendly Calculator — multilingual completion plan

## Target

Every public page should have a genuinely localized counterpart in each published language, including calculators, category hubs, blog articles, About, Methodology, Contact, Privacy, Terms, Disclaimer, API and embed documentation. Shared navigation and controls must remain usable in every supported locale.

## Current verified repository inventory (16 November 2026)

The main-branch HTML inventory contains 1,241 HTML files: 402 root/English pages and 839 files in locale folders.

| Locale | Existing HTML pages |
|---|---:|
| Hindi (hi) | 150 |
| Spanish (es) | 96 |
| French (fr) | 96 |
| Portuguese (pt) | 96 |
| Arabic (ar) | 96 |
| Indonesian (id) | 96 |
| Bengali (bn) | 99 |
| Tamil (ta) | 99 |
| German (de) | 3 |
| Japanese (ja) | 4 |
| Russian (ru) | 4 |

These counts are route inventory only. They do not prove that every page is fully translated, reviewed, or jurisdictionally correct.

## Safe implementation now

- Add a repeatable route-coverage audit that compares each English HTML path with the equivalent locale path.
- Keep URL language selection explicit; do not force redirects based on IP or browser language.
- Preserve the current language selector's route check and visible fallback notice when a translation does not exist.
- Keep INR as the default currency and keep country, language, currency and number/date format as separate preferences.
- Do not generate fake translations by copying English pages into locale folders.
- Do not publish financial/tax translations until terminology, formulas, examples, sources and local jurisdiction assumptions are reviewed.

## Completion sequence

1. Generate the audit report and group missing paths by page type (calculators, hubs, editorial, legal, product).
2. Complete priority locales first: Hindi, Spanish, French, Portuguese, Arabic, Indonesian, Bengali and Tamil.
3. Complete German, Japanese and Russian beyond their current small landing-page sets.
4. Add additional locales only with reviewed navigation, page copy, metadata, structured data, FAQs and support content.
5. For every localized route, verify canonical URL, reciprocal hreflang cluster, sitemap membership, language metadata and working language switch.
6. Run calculator formula regression and locale-specific number/date/currency tests before deployment.

## SEO and content safeguards

- A locale is not "fully supported" merely because its directory exists or its language appears in a dropdown.
- Use one canonical URL per actual localized page; hreflang must only point to real, indexable, equivalent translations.
- Keep x-default on the English/default experience.
- Do not mass-create thin translated pages or claim automatic Google indexing.
- Do not overwrite or remove existing hreflang declarations without explicit approval. The current repository has unresolved duplicate and mismatched hreflang metadata; handle those separately in an approved, reviewed change.

## Acceptance criteria

A page is complete in a locale only when its visible content, labels, error messages, FAQs, metadata, structured data and accessibility labels are translated; calculator outputs remain correct; local tax/financial claims use official sources and dates; internal links stay within the locale where equivalents exist; and tests pass.
