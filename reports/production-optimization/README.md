# Friendly Calculator — Production Optimization Baseline & Change Log

Date: 25 November 2026  
Repository: https://github.com/avnishahirwar/avnishahirwar.github.io  
Production: https://friendlycalculator.in  
Branch: production-optimization  
Base commit: e44299358689d63db281ddce6aa8eae03496e859

## Execution status
- Repository identity and Admin permission verified via GitHub repository metadata.
- Branch created from main.
- A local git clone was attempted but this environment could not resolve github.com. Repository inspection uses authenticated GitHub Git-data and contents APIs; no local clone is claimed.
- Existing SEO, localization, formula, site-health and Lighthouse automation was found. This branch adds a repeatable source-level audit harness and CI report.
- This is a baseline/change log, not a claim that production has been optimized or deployed.

## Before vs after
| Dimension | Before (verified evidence) | After this branch | Status |
|---|---|---|---|
| SEO | Existing metadata, canonical, robots, hreflang and sitemap tooling; PR #833 already addresses hreflang/navigation/discovery | Full HTML catalogue static audit and CI artifact report | Pending exact-head CI |
| Performance | Existing Lighthouse evidence: homepage LCP 1.2s / CLS 0.204; Hindi homepage LCP 4.1s / CLS 0.115; Income Tax LCP 4.1s / CLS 0.154; GST CLS 0.155 | No new Lighthouse run; no numerical gain claimed | Pending comparable run |
| Accessibility | PR #831 identifies shared brand-link accessible-name issue | Audit checks missing image alt, unnamed links and buttons | Pending browser verification |
| Security | _headers source includes nosniff, Referrer-Policy, Permissions-Policy and frame-ancestors CSP; HSTS absent in inspected source. GitHub Pages does not automatically apply Cloudflare _headers syntax | Source declarations reported; actual response headers remain a hosting/CDN verification task | Blocked on host-level evidence |
| Mobile | Homepage viewport is present; mobile schema/layout tests exist | Static audit flags missing viewport declarations on other pages | Pending CI |
| Calculator accuracy | Existing formula suites are present; full suite not yet verified on this branch | Existing suites preserved; no formula behavior changed by audit tooling | Pending exact-head CI |

## Files changed
- scripts/production-optimization-audit.cjs — dependency-free repository-wide source audit.
- tests/production-optimization-audit.test.cjs — fixture tests for audit rules.
- .github/workflows/production-optimization-audit.yml — report-only CI workflow.
- reports/production-optimization/README.md — baseline and evidence limitations.

## Latest repository-wide static audit (CI run 45615821814)

The final audit job on branch commit 7cf09fba036e099c94ca46add6a1466db52317ff completed successfully. All 7 audit-rule tests passed.

| Metric | Result |
|---|---:|
| HTML documents scanned | 8,380 |
| Self-canonical indexable pages (source heuristic) | 5,171 |
| Noindex/private pages | 97 |
| URLs in primary sitemap | 5,187 |
| Static audit errors | 0 |
| Static audit warnings | 1,100 |

Warning breakdown:
- 733 meta descriptions outside the 50–160 character heuristic.
- 165 titles outside the 30–60 character heuristic.
- 109 hreflang clusters without a self-reference according to the source parser.
- 54 duplicate descriptions within the same html lang group.
- 38 duplicate titles within the same html lang group.
- 1 missing HSTS declaration in the _headers source file.

The first broad scan reported 75 errors and 10,866 warnings because it treated intentional noindex pages, redirect aliases and HTML metadata fragments as indexable documents. The audit rules were refined to exclude those false-positive classes. This refinement changed the audit scope; it did not rewrite the website's SEO metadata. Zero errors means zero errors under this static audit's indexable-page rules, not a guarantee of Google indexing or complete SEO compliance.

## Performance report
A valid before/after delta requires comparable Lighthouse mobile and desktop runs on the same page set and environment. LCP, INP, CLS, TBT, transfer size and request count must be reported separately. TBT is not INP. CrUX field data and Lighthouse lab data must not be mixed.

## SEO report
The audit runner checks title/description presence and length, canonical host/path consistency, html lang and viewport, duplicate titles/descriptions, hreflang syntax/duplicates/self-reference, JSON-LD parsing, image alt, basic anchor/button accessible names, sitemap uniqueness/host/local target existence, and security-header declarations in source.

## Limitations
- Static source inspection is not browser-rendered accessibility testing.
- LCP, INP and CLS require Lighthouse and/or CrUX.
- Calculator accuracy requires executable regression and browser interaction tests.
- Search Console and GA4 require the verified Friendly Calculator properties and hostname filter.
- AdSense account approval cannot be established from repository files.
- GitHub Pages does not apply Cloudflare Pages _headers / _redirects semantics automatically.
- Open PRs #831 and #833 must be reconciled before overlapping fixes are proposed.
- No DNS, billing, payment, database, authentication, analytics IDs, secrets, domain, SEO calendar, Header/Footer, or repository permissions are changed by this audit harness.


## Execution checkpoint — 25 November 2026, 18:05 UTC

Latest branch head at this checkpoint: `adee5efc0b647cb3b7450b709e514e8b1f5c4182` (16 commits, 9 changed files; PR #834 remains draft/open/unmerged).

### Changes added after the baseline
- Ported the verified global-expansion regression syntax correction, shared brand-link accessible name correction, and Hindi homepage hero loading improvement.
- Updated `scripts/build-site-directory.cjs` to emit crawlable primary navigation with Home, All Calculators, Finance, Tax, Business Tools, Everyday and International Calculators.
- Regenerated the committed `calculator/site-directory.html` output to match the generator. The generated-directory workflow now passes.
- Removed the redundant Home link from the directory's own footer while retaining About, Privacy, Terms and Contact.
- No existing calculator content, SEO calendar, shared Header/Footer implementation, production configuration, or repository permissions were deleted or changed.

### Exact-head CI results — commit `adee5efc0b647cb3b7450b709e514e8b1f5c4182`
Passed:
- Production optimization static audit.
- Public SEO metadata quality.
- Locale coverage audit.
- Search-index additions validation.
- Calculator site-directory generation and freshness check.
- Cross-browser compatibility smoke tests.
- XML sitemap validation/generation.
- Lighthouse mobile lab audit.

Failed:
- Site health: 20 assertions in the repository-wide integrity suite. These include outdated catalogue/category-directory assumptions, homepage category totals (3,130 displayed versus 3,969 canonical sitemap calculator URLs), missing directory quick links/brand illustration, and several discovery/resource-hub assertions. These are not safely resolved by changing test expectations; source/catalogue alignment is required.
- Calculator regression: 6 assertions remain — the ten priority Hindi calculators' metadata/schema checks and four hreflang cluster/reciprocity checks. The additive hreflang diagnostic still reports 101 safe reciprocal additions and the full audit reports 179 defects.

### Lighthouse mobile lab results (PR preview; artifact run 45619149177)
| Page | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| Homepage | 90 | 100 | 96 | 69 | 1.4 s | 0.204 | 0 ms |
| Directory | 92 | 95 | 96 | 69 | 2.4 s | 0.000 | 180 ms |
| Hindi homepage | 95 | 100 | 96 | 69 | 2.2 s | 0.115 | 10 ms |
| GST Calculator | 94 | 100 | 96 | 69 | 1.0 s | 0.155 | 60 ms |
| Income Tax | 79 | 100 | 96 | 69 | 4.2 s | 0.154 | 130 ms |
| International homepage | 98 | 100 | 96 | 69 | 1.9 s | 0.033 | 30 ms |
| Legal Compliance | 96 | 100 | 96 | 69 | 2.3 s | 0.000 | 40 ms |
| Mortgage Calculator | 95 | 100 | 96 | 69 | 1.0 s | 0.090 | 200 ms |

These are Lighthouse lab measurements on a PR preview, not production field Core Web Vitals. TBT is not INP. The SEO score of 69 is associated with the preview's non-crawlable/noindex condition and must not be interpreted as the production domain's SEO score. Priority performance follow-ups are homepage CLS 0.204, GST CLS 0.155, Income Tax LCP 4.2 s, and Hindi homepage CLS 0.115.

### Release decision
PR #834 remains draft and unmerged. The two failed CI gates must be fixed and rerun before release. Production deployment, production browser verification, real response-header verification, Search Console indexing verification, live AdSense approval, and production field CWV remain unverified. The successful CI checks above are not a production deployment claim.


## Follow-up checkpoint — 25 November 2026, 18:15 IST

### Additional directory fixes
- Updated the directory generator and output with the original Friendly Calculator brand illustration (fetchpriority=high, intrinsic 1200×630 dimensions), 20 visible quick links to existing calculator/resource hubs, and an accessible live search-result status.
- The generated-directory workflow passed on commit 3566b59c076c6382458efef08f7a419c21b36422.
- Site-health failures reduced from 20 to 14 on that exact tested commit. The six resolved checks were the image-tools discovery link, Bhopal/MP hub discovery link, directory LCP illustration, accessible category quick links/search status, and related directory resource links.

### Safe hreflang additions
- Enabled the existing one-time additive hreflang workflow for the production-optimization branch.
- The workflow produced commit 81a0e2fd48d43813f44cde60236163c3bbb623f0 (seo: add missing hreflang reciprocals [skip ci]), changing 40 HTML pages. The preceding diagnostic had identified 101 unambiguous reciprocal additions; the workflow commits only additive tags and preserves existing tags.
- This does not resolve conflicting/duplicate/mismatched or noindex hreflang defects. The full international audit and the six calculator test assertions must be rerun against the post-repair head before any claim of completion.

### Exact tested head 3566b59c076c6382458efef08f7a419c21b36422
- Passed: production optimization audit, public SEO metadata, locale coverage, search-index validation, generated directory, outbound-link policy, sitemap validation, Lighthouse mobile lab.
- Cross-browser and site-health workflows completed; site health still failed 14 assertions.
- Calculator regression still failed 6 assertions (priority Hindi calculator metadata/schema and four hreflang/reciprocity checks). This test run was initiated before the generated additive-repair commit 81a0e2f; it is not evidence about post-repair test status.
- Lighthouse mobile lab succeeded. The detailed scores and limitations are in the preceding checkpoint; these remain PR-preview lab data, not production field measurements.

### Remaining site-health failures (14)
- Curated core directory and homepage/About/sitemap catalogue alignment.
- Home-loan prepayment content coverage.
- Homepage category totals and directory category markup (current generator is alphabetical while the homepage still points to 20 category anchors).
- Five new informational calculator discovery/count alignment.
- Nine Biology & Chemistry directory category-count assertions.

### Release gate
PR #834 remains draft/open/unmerged. The directory architecture mismatch and homepage category totals need a coherent source-of-truth repair; do not change expected test values to conceal it. The post-repair hreflang and calculator suite must be rerun before release. Production deployment, live domain QA, actual response headers, Search Console indexing, CrUX field CWV and AdSense account status remain unverified.


## Exact-head recheck — 25 November 2026, 19:16 IST

Branch: `production-optimization` · PR [#834](https://github.com/avnishahirwar/avnishahirwar.github.io/pull/834) · tested head `862fdb4aec15bfb39831635c5d0298d9e164e179`.

### Current check results

Passed:
- Production optimization audit.
- Public SEO metadata quality.
- Locale coverage audit.
- Search-index additions validation.
- Generated site-directory workflow.
- Lighthouse mobile lab.
- Cross-browser smoke tests (Chrome, Chromium, Edge, Firefox, Opera, WebKit and native Safari).
- Cloudflare Pages PR preview deployment: [preview](https://production-optimization.friendly-calculator.pages.dev).

Failed:
- Site health: 14 assertions. The main failure groups are stale catalogue/category-directory contract, homepage category totals (3,130 versus 3,969 canonical sitemap calculator URLs), Home Loan & Loan Prepayment Calculator discovery/content, and Biology & Chemistry batch count labels in the directory.
- Calculator regression: 5 assertions. The priority Hindi calculator hreflang cluster, percentage and simple-interest locale clusters, priority locale reciprocal clusters, and global international hreflang audit (80 defects).
- Netlify preview failed; Vercel is rate-limited by the free deployment quota. Cloudflare Pages preview is available and successful.
- Cloudflare Workers integration check failed; this is separate from the successful Cloudflare Pages preview and is not evidence that the production site failed.

### Required repair sequence

1. Reconcile the generated directory with the existing 20-category data source and canonical calculator URL set. Preserve the category browse experience and the separate curated homepage list; do not change counts to hide mismatches.
2. Fix the Home Loan & Loan Prepayment Calculator explanation and ensure the existing canonical route is discoverable.
3. Resolve the five hreflang assertions using only indexable, same-language, resolvable targets; never add alternates to noindex pages.
4. Rerun all failing tests and the full exact-head CI matrix.
5. Keep PR #834 draft/unmerged until all required gates pass; then verify the exact production domain after merge/deployment.

### Current release boundary

PR #834 is still draft, open and unmerged. The successful Cloudflare Pages deployment is a branch preview only. No production deployment or production visual verification is claimed. No SEO calendar, existing page content, Header/Footer, domain/DNS, billing/payment settings or repository permissions were changed by this checkpoint.
