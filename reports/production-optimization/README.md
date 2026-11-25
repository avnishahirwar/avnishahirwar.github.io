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

## Latest repository-wide static audit (CI run 45615653139)

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
