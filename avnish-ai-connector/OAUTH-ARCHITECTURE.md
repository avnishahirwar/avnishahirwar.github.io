# Social OAuth Architecture — Avnish AI Connector

Status: design prepared; provider applications, credentials, and live account authorization are NOT configured.

## Current boundary
The five existing MCP tools expose public website information only. They do not connect to social accounts. No provider tokens, private data access, or write actions are configured.

## Proposed architecture
- MCP authorization server: Cloudflare Workers OAuth Provider v1; authenticate users, show consent, issue scoped tokens, and support revocation.
- MCP resource server: protect /mcp; validate bearer tokens and enforce scopes on every tool call.
- Provider adapters: isolated server-side integrations per provider.
- Token vault: encrypted server-side storage; never expose refresh tokens to MCP clients or browsers.
- Audit: record consent, scopes, provider, account identifier, revocation, and action metadata without logging secrets.

Use authorization code + PKCE where supported, exact HTTPS redirect URIs, cryptographically random state, strict state validation, one-time codes, least-privilege scopes, server-side token exchange, token expiry/revocation, and per-tool scope checks.

## Provider preparation matrix
| Provider | OAuth direction | Initial scope policy | External prerequisites |
| --- | --- | --- | --- |
| Instagram | Meta Instagram API login flow for eligible account type | Read profile/media first; publishing excluded initially | Meta developer app, eligible account, approved permissions, HTTPS callback |
| Facebook | Meta Login / Graph API | Only explicitly selected Page read permissions | Meta developer app, Page access, app review/permissions, HTTPS callback |
| Threads | Meta Threads API OAuth | Read profile/media first; publishing excluded initially | Meta developer app, Threads API access, HTTPS callback |
| YouTube | Google OAuth 2.0 web-server flow | youtube.readonly initially | Google Cloud project, YouTube Data API enabled, OAuth consent setup, possible verification |
| LinkedIn | LinkedIn 3-legged OAuth | Only product-approved member permissions actually required | Developer app, product access approval, exact HTTPS redirect URI |
| X | OAuth 2.0 Authorization Code + PKCE where supported | users.read and tweet.read for read-only initial use | Developer project/app, API plan/endpoint entitlement, callback URL |
| Pinterest | OAuth Authorization Code | Read-only board/pin scopes initially | Developer app, registered redirect URI, approved scopes |

Provider scopes, API entitlements, review requirements, and availability can change. Verify the current provider console and official documentation before enabling an adapter. OAuth approval does not guarantee every API endpoint.

## Proposed callback paths
These are placeholders until the final HTTPS auth hostname and deployment topology are selected:
- /oauth/meta/instagram/callback
- /oauth/meta/facebook/callback
- /oauth/meta/threads/callback
- /oauth/google/youtube/callback
- /oauth/linkedin/callback
- /oauth/x/callback
- /oauth/pinterest/callback

## Implementation phases
1. Independently verify the five public MCP tools.
2. Deploy and test the Cloudflare OAuth authorization server and protected MCP resource server in a non-production environment.
3. Add sign-in, consent UI, token validation, revocation, and scope enforcement.
4. Add one provider adapter at a time, read-only first.
5. Test denied consent, invalid state, expired/revoked token, insufficient scope, provider outage, and token refresh.
6. Consider write/publishing actions only after separate review, explicit per-action approval, and audit logging.

## Account-owner authorization and safety
A responsible account owner must own each provider app, review provider terms, approve permissions, configure callback URLs, and complete any required verification. Do not share passwords, one-time codes, client secrets, or tokens in chat. Use provider consent screens and the hosting provider's secret manager. Never bypass provider age, identity, account eligibility, or review requirements; an eligible parent/guardian or organization administrator must handle any approvals that require an adult or account owner.

## Not implemented
- OAuth authorization server and consent UI
- Provider app registrations and credentials
- Encrypted token vault and account linking/revocation
- Social API adapters and live provider tests
- Private analytics, inbox, publishing, or write tools

This document is a preparation plan, not a claim that any social account is connected.
