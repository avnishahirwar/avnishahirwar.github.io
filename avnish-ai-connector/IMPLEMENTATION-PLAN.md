# AVNISH AI — Secure Backend & Authorization Plan

Status: architecture plan only. No customer data, provider tokens, payment credentials, or production secrets are stored in this repository.

## Decisions

- Database: managed PostgreSQL (Neon) as the proposed alternative to D1/Supabase.
- Runtime/API: Cloudflare Worker, connected to PostgreSQL through Cloudflare Hyperdrive.
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
2. Create the Neon project and production/non-production database separation.
3. Configure Worker-to-Postgres connectivity with Hyperdrive and secrets in provider dashboards.
4. Implement and test login, email verification, session expiry, CSRF, rate limits, account deletion, and tenant isolation.
5. Complete manual MCP Inspector handshake and invoke each existing read-only tool.
6. Register one provider app at a time; test read-only authorization with a designated test account.
7. Complete privacy/security review and provider reviews before production data or broader scopes.
8. Payment activation remains separately gated on adult merchant approval and end-to-end webhook tests.
9. Submit the verified production URL and sitemap to Google Search Console after the production URL/canonical are confirmed.

## Current status

This document is a design/implementation checklist only. It does not claim that Neon, OAuth apps, customer login, payments, subscriptions, Search Console, or live social connections are active. The existing feature-branch MCP connector remains public and read-only; production is not changed.
