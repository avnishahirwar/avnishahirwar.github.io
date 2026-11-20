# Machine-translation draft generator

`scripts/translate-locales.mjs` generates **review-only HTML drafts** for languages whose status is `planned` in `config/language-catalogue.json`. The default set is the current 33 planned locales. It deliberately does not enable languages, overwrite published locale files, publish drafts, or change the public language selector.

## Requirements

- Node.js 18+ (uses built-in `fetch`; no npm dependencies).
- Access to an OpenAI-compatible Chat Completions endpoint and a model you have selected for translation.
- Environment variables: `TRANSLATION_API_BASE` (base URL before `/chat/completions`), `TRANSLATION_API_KEY`, and `TRANSLATION_MODEL`.

Never place API keys in this repository or command-line arguments. Keep them in local environment variables or a secrets manager. API requests incur charges according to the selected provider/model.

## Preview first

```sh
node scripts/translate-locales.mjs --source index.html --dry-run
```

This reports text-node counts for all 33 planned languages and performs no network calls or writes. To create drafts for a limited pilot:

```sh
TRANSLATION_API_BASE="https://api.example.com/v1" \
TRANSLATION_API_KEY="$YOUR_TRANSLATION_KEY" \
TRANSLATION_MODEL="your-selected-model" \
node scripts/translate-locales.mjs --source index.html --locale sw,ha --output /tmp/friendly-translation-drafts
```

`--source` is repeatable. The script preserves HTML tags and attributes, excludes executable/code-like element contents, protects common placeholders, URLs, identifiers and numbers, and writes drafts into `<output>/<locale>/<source-relative-path>`. Existing draft files are never overwritten; choose a new output directory to regenerate. Concurrency defaults to 2 and batch size to 24 text nodes.

## Review and publication gate

Each generated document is marked with the locale's `lang` and text direction, receives `noindex,nofollow`, and includes a `MACHINE-TRANSLATED REVIEW DRAFT: DO NOT PUBLISH` comment. These outputs are drafts only. Review visible copy with a competent speaker, verify that placeholders survived, and run calculator/formula checks before manually integrating anything into a public locale directory.

This initial version translates HTML text nodes only. It intentionally does not translate metadata attributes (such as `meta description`, Open Graph fields, `alt`, or `aria-label`), JavaScript-generated strings, embedded JSON, PDFs, images, or formulas. Those require separate extraction and review workflows. No locale should be changed from `planned` to `available` until its actual page coverage and quality meet the site's acceptance criteria.
