# AVNISH AI — Secure Backend & Authorization Plan

Status: architecture plan only. No customer data, provider tokens, payment credentials, or production secrets are stored in this repository.

## Decisions

- Database: Cloudflare D1 (SQLite) on the Workers Free plan as the zero-monthly-cost starting point. A starter migration is provided at `migrations/0001_initial_schema.sql`.
- Runtime/API: Cloudflare Worker + native D1 binding; no separate database vendor or Hyperdrive is needed for the initial version.
- Hosting: use the existing `workers.dev` hostname for non-production testing. The custom domain can be attached later; do not register production OAuth callbacks until the final domain and HTTPS hostname exist.
- Cost boundary: Cloudflare Workers Free currently includes up to 100,000 requests/day; D1 Free currently includes 5 million rows read/day, 100,000 rows written/day, and 5 GB total storage. These are quotas, not an unlimited/free-forever guarantee; requests may fail after limits are reached.
- Authentication: server-side session authentication (Better Auth or equivalent) with verified email, secure HttpOnly cookies, CSRF protection, rate limiting, and explicit account recovery.
- Social integrations: OAuth 2.0 / provider-specific authorization-code flows, implemented one provider at a time, read-only scopes first.
- MCP: keep the existing public MCP endpoint read-only. Add a separate authenticated MCP resource server only after OAuth 2.1 authorization, consent, scope enforcement, token validation, revocation, and audit logging are tested.
- Payments: disabled until a legally eligible adult business owner completes provider onboarding/KYC and approves the live merchant account. No payment credentials or live checkout are part of this phase.

## Proposed data model

- users: id, email, email_verified_at, display_name, created_at, disabled_at
- sessions: id, user_id, hashed_session_token, expires_at, created_at, last_seen_at
- social_accounts: id, user_id, provider, provider_account_id, display_name, granted_scopes, connected_at, disconnected_at
- oauth_credentials: social_account_id, encrypted_access_token, encrypted_refresh_token, expires_at, encryption_key_version
- customers: id, owner_user_id, name, email, phone_optional, consent_at, created_at, deleted_at
- invoices: id, owner_user_id, customer_id, invoice_number, currency, totals_json, status, created_at
- subscriptions: id, owner_user_id, plan_code, provider_subscription_id, status, period_start, period_end
- audit_events: id, actor_user_id, action, resource_type, resource_id, outcome, created_at

All tenant-owned records must be queried by owner_user_id. Do not store card numbers, CVV, raw passwords, OTPs, or unencrypted OAuth tokens. Store only the minimum customer fields required by an enabled feature. Add retention and deletion workflows before real customer data is accepted.

## Social provider authorization checklist

All provider integrations begin with the provider's developer portal, application registration, exact redirect URI registration, minimal scopes, a privacy policy and terms URL, and any provider review/verification required. The account owner must sign in to each provider portal and grant the requested permissions on the provider's own consent screen.

1. Instagram — Meta developer app; enable the applicable Instagram API product and account type; request only the permissions needed for the first read-only feature. Publishing and insights require separate permissions/review where applicable.
2. Facebook — use the same Meta developer app where supported; configure Facebook Login and the required Page permissions; Page access depends on the consenting user's Page role and Meta app review.
3. Threads — Meta developer app with the Threads API product; request only the relevant Threads scopes; complete any Meta review required for production access.
4. YouTube — Google Cloud project, enable YouTube Data API v3, configure OAuth consent screen, create a Web application OAuth client, register callback URI, and request the narrowest YouTube read-only scope first. Google verification may be required for sensitive/restricted scopes.
5. LinkedIn — LinkedIn Developer app, associate the required product(s), configure OAuth 2.0 redirect URL, request only approved member scopes; additional API products and permissions may require LinkedIn approval.
6. X — X Developer account/project/app, enable OAuth 2.0 Authorization Code with PKCE, configure callback and website URLs, and request only the minimum scopes available to the approved app/tier.
7. Pinterest — Pinterest developer app, register redirect URI, select Authorization Code grant, request narrow scopes such as profile/boards read only where supported, and complete app access/review requirements.

Do not assume that one approval grants every platform capability. Read, analytics, publishing, messaging, and ads permissions are separate capabilities and may have different review and eligibility requirements.

## OAuth security requirements

- Use Authorization Code flow; use PKCE wherever supported/required.
- Generate and verify cryptographically random state; use nonce where the provider's OIDC flow requires it.
- Exact redirect URI matching; HTTPS only.
- Exchange authorization codes on the server, never in browser JavaScript.
- Encrypt provider tokens at rest using a managed secret/key service; never commit secrets or place them in frontend code.
- Validate issuer, audience, signature, expiry, and nonce for OIDC identity tokens.
- Enforce provider, user, and granted-scope binding on every API call.
- Implement refresh-token rotation/expiry handling, disconnect, provider revocation, and deletion of stored tokens.
- Log authorization outcomes and security events without logging tokens, codes, or personal data.
- Start with read-only scopes. Publishing and destructive actions require a separate explicit user confirmation and audit event.

## Callback URI policy

Do not register provider callback URLs until the adult account owner has approved a stable API hostname and DNS/HTTPS are verified. Use this pattern only after the host exists:

`https://<approved-api-host>/oauth/callback/<provider>`

Never register a guessed or temporary preview URL for production.

## Payments and subscriptions — gated

Keep plan display and invoice/quotation preview separate from real payment collection. Before enabling checkout:
- Adult business owner completes merchant onboarding, identity/business verification, bank settlement setup, and provider approval directly with the payment provider.
- Adult owner reviews applicable business, tax, refund, cancellation, privacy, and consumer disclosures.
- Use provider-hosted checkout; store provider customer/subscription IDs and payment status only.
- Verify signed webhooks, make webhook handling idempotent, and reconcile subscription status server-side.
- Never store card data or treat a browser redirect as proof of payment.

## Release gates

1. Adult owner confirms legal entity/business details and approved API hostname outside chat.
2. Create a D1 database in the adult account owner's Cloudflare dashboard and apply `migrations/0001_initial_schema.sql`.
3. Add the D1 database binding to `wrangler.jsonc` using the real database ID from Cloudflare; keep development and production databases separate. Store encryption keys and OAuth secrets only in Worker secrets/managed secret storage.
4. Implement and test login, email verification, session expiry, CSRF, rate limits, account deletion, and tenant isolation.
5. Complete manual MCP Inspector handshake and invoke each existing read-only tool.
6. Register one provider app at a time; test read-only authorization with a designated test account.
7. Complete privacy/security review and provider reviews before production data or broader scopes.
8. Payment activation remains separately gated on adult merchant approval and end-to-end webhook tests.
9. Submit the verified production URL and sitemap to Google Search Console after the production URL/canonical are confirmed.

## Current status

This document and the D1 migration are preparation artifacts only. They do not claim that a D1 database has been provisioned, OAuth apps, customer login, payments, subscriptions, Search Console, or live social connections are active. The existing feature-branch MCP connector remains public and read-only; production is not changed.


## No-custom-domain phase

The custom domain is intentionally deferred. Use the current `workers.dev` preview only for safe public endpoint checks and non-production development. Do not promise provider OAuth callbacks will be accepted on a preview hostname; each provider's current redirect URI rules must be checked in its developer console. Production callbacks, canonical URLs, and Search Console submission wait until the final domain is purchased and attached.

## Zero-cost operating rule

Use free tiers only, disable paid add-ons, configure usage alerts where available, and stop/disable features rather than silently upgrading when a quota is reached. Free-tier availability and quotas can change. No service should be described as permanently free.


## Selected integrations (approved direction: 2026-11-08)

### Payment provider: Razorpay

- Selected provider: Razorpay. Do not add Stripe checkout or Stripe-specific code to the customer-facing payment flow unless the owner changes this decision.
- Implementation sequence: (1) build a provider-neutral server-side payment interface, (2) add Razorpay order creation and hosted Checkout in test mode, (3) verify payment signatures server-side, (4) add idempotent signed webhook processing, (5) persist only Razorpay order/payment/subscription references and normalized status in D1, (6) test success, failure, duplicate webhook, refund/cancellation and subscription lifecycle cases.
- The browser must never decide that payment succeeded. The backend must verify the provider response/webhook before granting a paid plan.
- Never store card numbers, CVV, UPI PIN, OTP, raw API keys, or payment credentials in D1, source control, browser storage, or chat. Razorpay Key Secret and webhook secret belong only in Cloudflare Worker secrets configured by the authorized merchant owner.
- Keep live mode disabled. Test mode can be implemented only after secure backend configuration. Live merchant onboarding, KYC, bank settlement, pricing/tax/refund terms and production activation require the legally eligible adult business owner and separate explicit approval.
- Razorpay has no confirmed first-party ChatGPT connector in the current plugin discovery. Use its official API/documentation from the server-side Worker; do not pretend a Razorpay connector is installed.

### Social integrations: Metricool + direct provider OAuth ("Both")

- Metricool is the selected management/analytics route and is already available in the connected app inventory. Use it for supported connected brands, analytics, planning and publishing workflows after the account owner completes Metricool's own account authorization.
- Direct OAuth is a separate AVNISH AI product integration. Build provider-specific authorization-code flows with PKCE where supported, strict state validation, exact HTTPS callback URLs, minimal scopes, encrypted tokens, revocation/disconnect and audit events.
- Initial direct-OAuth order: Meta (Instagram/Facebook/Threads) as one developer-app family where supported; Google/YouTube; LinkedIn; X; Pinterest. Start read-only. Add publishing only after provider approval and explicit per-action user confirmation.
- Metricool authorization does not automatically authorize AVNISH AI to access the same social accounts directly, and direct OAuth does not automatically connect those accounts to Metricool. The account owner must authorize each service independently.
- Do not collect social passwords, OTPs, recovery codes, or app secrets in chat. App credentials must be entered into Cloudflare Worker secrets by the authorized account owner.

### Work sequencing for the selected choices

1. Complete D1 binding and apply the existing migration to the user's actual development database.
2. Implement and test server-side login/session security and tenant isolation before storing customer records.
3. Add Razorpay test-mode server endpoints and signed webhook verification; keep live mode off.
4. Complete Metricool connection and verify which brands/platform actions are actually available to the authorized account.
5. Implement direct OAuth one provider family at a time, beginning with read-only access.
6. Add publishing and paid subscriptions only after security tests, provider approvals, owner authorization and separate release approval.

No payment or social account is considered connected merely because this plan exists.
## Integration verification checkpoint — 2026-11-08

- Metricool connector was successfully queried during development. One Metricool brand was returned with Instagram, YouTube, Facebook, Pinterest, Bluesky and Google Business Profile network identifiers. This verifies a Metricool brand connection exists, but does not yet verify every network's analytics or publishing permissions.
- No posts were created, edited, scheduled, or published during this verification.
- Cloudflare D1 cannot be provisioned or bound through the currently available connected tools. The user-created database's UUID is still required to configure the Worker binding; the migration must only be applied after verifying the target development database.
- No Razorpay connector was found in plugin discovery. Razorpay must be integrated through its official server-side API; no test credentials are currently available, so checkout cannot yet be exercised.
- No direct Cloudflare management or Razorpay merchant connector is available in the connected tool inventory. Do not claim those accounts are configured.
- Direct social OAuth remains unimplemented pending a stable callback hostname, provider app registrations, provider-specific scopes, and account-owner consent.
- Login/registration and dashboard backend are not yet implemented. Do not accept real customer data until authentication, session security, tenant isolation and deletion controls pass tests.


## D1 binding checkpoint — 2026-11-08

- The user supplied the development D1 database ID for `avnish-ai-db-dev`.
- `wrangler.jsonc` now contains a D1 binding named `DB`, pointing to that database ID, with migrations configured from `migrations/`.
- This is a repository configuration change only. The SQL migration has **not** been applied to Cloudflare, and no tables have been created yet.
- The connected tool inventory does not include Cloudflare D1 execution/management or a Cloudflare CLI session. The next required step is to run `npx wrangler d1 migrations apply avnish-ai-db-dev --remote` from the connector project in an authenticated Cloudflare environment, after confirming the selected account and database are the development target.
- Do not run the migration against production. After applying it, verify the expected tables in the D1 dashboard before implementing authentication or accepting any customer data.


## Read-only analytics verification — 2026-11-08

- Metricool brand access was rechecked successfully for the connected brand. Read-only analytics metric catalogs were retrieved for Instagram and YouTube.
- Instagram analytics data was retrieved for 2026-10-09 through 2026-11-08. The returned latest dated row (2026-11-07) included 1,062 followers, 488 views, 153 reach, and 25 total feed-content interactions; other metrics were sparse/null in the returned rows and should not be interpreted as zero unless the connector explicitly returns zero.
- YouTube analytics data was retrieved for the same date window. The latest dated row (2026-11-08) reported 65 subscribers; selected views and interaction metrics were returned as zero for that row. Historical rows include video-view values. These are Metricool-reported values, not independently verified native-platform totals.
- This confirms read-only Metricool analytics retrieval for the connected brand. It does not establish that AVNISH AI's own dashboard backend is implemented or that direct OAuth is active. No content was published or modified.


## Development D1 schema manually provisioned — 2026-11-08

- User executed the SQL statements in the Cloudflare D1 Studio for database `avnish-ai-db-dev`.
- The user-provided verification screenshot shows these eight application tables: `audit_events`, `customers`, `invoices`, `oauth_credentials`, `sessions`, `social_accounts`, `subscriptions`, and `users`. Cloudflare's internal `_cf_KV` table is platform-managed and not an application table.
- The two session indexes `idx_sessions_user_id` and `idx_sessions_expires_at` were also executed successfully.
- This verifies the schema objects exist in the selected D1 database. It does not verify Worker runtime connectivity, auth flows, token encryption implementation, or application-level authorization.
- Important migration bookkeeping: because the SQL was executed manually in Studio rather than through Wrangler migrations, do not assume Wrangler's migration history records `0001_initial_schema.sql` as applied. Before any future Wrangler migration apply, inspect migration history and reconcile safely; the migration SQL uses `IF NOT EXISTS` for the created tables/indexes.


## Authentication backend implementation checkpoint — 2026-11-08

- Added `src/auth.ts` with D1-backed API routes for registration, email verification, login, logout, current-user profile, forgot-password, and reset-password.
- Password storage uses PBKDF2-HMAC-SHA-256 (310,000 iterations) with per-password random salts. Session and one-time email tokens are random opaque values; only SHA-256 hashes are stored in D1.
- Login requires a verified email and enabled account. Password reset invalidates existing sessions. Mutating routes enforce an exact Origin allowlist and per-IP rate limits.
- Added `migrations/0002_authentication.sql` to add `users.password_hash`, `auth_tokens`, and `auth_rate_limits`.
- Routed `/api/auth/*` requests from the Worker entrypoint to the authentication handler.
- Added `AUTHENTICATION-SETUP.md` documenting endpoints, migration instructions, required Cloudflare Worker configuration and release blockers.
- Not yet live: the additive migration must be applied once to `avnish-ai-db-dev`; Resend sender/domain and Worker secrets (`APP_ORIGIN`, `RESEND_API_KEY`, `EMAIL_FROM`) must be configured; the static website UI still needs wiring; session cookie behavior across GitHub Pages and workers.dev requires same-site hosting or browser verification.
- No credentials were added to source control. No production deployment or real user onboarding was enabled.
- Validation is pending: the latest GitHub combined status currently reports Vercel preview as pending; no GitHub Actions run was returned for the latest commit at this checkpoint.


## Authentication schema migration manually applied — 2026-11-08

- User screenshot confirms Cloudflare D1 Studio reports `Executed 1/1` for the batch creating `auth_tokens`, index `idx_auth_tokens_user_purpose`, and `auth_rate_limits`.
- Earlier screenshot confirms `users.password_hash` was added successfully.
- Therefore the additive authentication schema objects appear present in `avnish-ai-db-dev`. This is manual D1 Studio execution; Wrangler migration history still needs reconciliation.
- Next validation must inspect `PRAGMA table_info(users)`, `sqlite_master` for `auth_tokens` and `auth_rate_limits`, then bind the D1 database to the Worker and configure email delivery before endpoint testing.
