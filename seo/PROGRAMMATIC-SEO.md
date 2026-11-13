# Programmatic SEO guide pages

The curated scenario data lives in `seo/programmatic-pages.json`.

To regenerate the static EMI examples after editing that data:

```sh
node scripts/generate-programmatic-seo.cjs
node --test tests/programmatic-seo.test.cjs
```

Keep the cohort selective. Each page must provide a distinct worked example, explicit calculation assumptions, a canonical URL, and an internal link to the relevant interactive calculator. Add new clusters only after checking search intent and actual user value. Do not generate mass near-duplicate or university-specific pages without an authoritative conversion rule.
