# AdSense readiness audit

This repository includes a **read-only** inventory script:

```sh
node scripts/adsense-readiness-audit.cjs
node --test tests/adsense-readiness-audit.test.cjs
```

The report checks:
- Root `ads.txt` presence and Google DIRECT seller-line syntax.
- AdSense publisher association meta tags and whether their publisher IDs match the seller ID in `ads.txt`.
- Presence of the standard AdSense loader (informational only; account-side setup may use another supported integration).
- Privacy/cookie policy signals, including an explicitly unpublished European consent message.
- Presence of key trust/help pages.
- Indexable HTML pages with fewer than 150 raw visible-text words as a **manual review queue**.

## Safety guarantees

The script only reads files and writes JSON to standard output. It never modifies HTML, inserts ad code, removes pages, changes robots directives, edits sitemaps, or deploys anything. The low-text threshold is not a Google rule and must never be used by itself to noindex or remove a page.

## What this cannot verify

A repository scan cannot confirm:
- AdSense account ownership, age eligibility, account activation, Site review state or Policy Center issues.
- Whether the live `ads.txt` returns HTTP 200 over both HTTP and HTTPS, is crawlable, or has been processed by Google.
- Whether the CMP is published in the publisher account, certified for the relevant use, integrated with IAB TCF, and functioning in real regional browser sessions.
- Live production responses, actual cookies/network requests, or whether deployed content matches the current branch.

These checks require the publisher/account holder and live production verification. Follow Google's current official documentation:
- [Site readiness](https://support.google.com/adsense/answer/7299563)
- [Programme policies](https://support.google.com/adsense/answer/48182)
- [Certified CMP requirements](https://support.google.com/adsense/answer/13554116)
- [CMP setup](https://support.google.com/adsense/answer/7670013)
- [ads.txt crawling](https://support.google.com/adsense/answer/7679060)

Never promise approval. Keep all production changes behind a separately approved deployment.
