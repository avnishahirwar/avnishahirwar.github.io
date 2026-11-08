# Avnish AI Connector

Version: **0.2.0**

A read-only Model Context Protocol (MCP) service for public information published on the Avnish Ahirwar website.

## Current release

- MCP transport: Streamable HTTP at `/mcp`.
- Health check: `GET /health`.
- Five read-only tools for public website metadata, public sections, published social links, fixed public resources, and connector capabilities.
- Fixed resource allowlist: `robots.txt`, `sitemap.xml`, and `feed.xml`.
- Resource requests have an 8-second timeout and a 20,000-byte response limit.
- Unknown URL paths return 404; the health endpoint accepts GET and HEAD only.
- No database, account tokens, private data access, or write operations.
- Automated local HTTP smoke tests cover health GET/HEAD, method restrictions, security headers, and 404 routing.

## Architecture and security boundary

The existing portfolio remains hosted separately on GitHub Pages. This Worker is an independent service.

The current MCP endpoint is intentionally **public and read-only**. Anyone who can reach a deployed endpoint can call the public-information tools. Do not add private user data, account integrations, customer records, inbox access, publishing, bookings, payments, or write tools until OAuth authentication, per-user authorization, explicit consent, audit logging, abuse controls, and a data-retention policy have been implemented and reviewed.

For a future authenticated MCP release, use the OAuth 2.1 authorization flow documented by Cloudflare Workers OAuth Provider. The authorization server and MCP resource server must be configured and deployed together. Identity-provider registration, redirect URLs, scopes, consent screens, and production secrets require the account owner to configure them; they are not fabricated or committed here.

## Tools

| Tool | Purpose |
| --- | --- |
| `get_public_site_profile` | Basic public website profile |
| `list_public_site_sections` | Public website section list |
| `get_public_social_links` | Social links already published on the website |
| `get_public_site_resource` | Read one of the three fixed public resources |
| `get_connector_capabilities` | Connector version, endpoints, and security boundaries |

## Local development

Requirements: Node.js 20 or newer.

```bash
cd avnish-ai-connector
npm install
npm run validate
npm run dev
```

Local endpoints:
- Health: `http://localhost:8787/health`
- MCP: `http://localhost:8787/mcp`

To inspect MCP tools locally, start the Worker with `npm run dev`, then launch the MCP Inspector in a separate terminal:

```bash
npx @modelcontextprotocol/inspector@latest
```

Connect it to the local Streamable HTTP endpoint. The Inspector test is a manual local verification step; it is not represented as completed by the GitHub CI build.

## GitHub Actions

The workflow at `.github/workflows/avnish-ai-connector.yml` runs dependency installation, TypeScript validation, Wrangler's dry-run build, and local Worker HTTP smoke tests for connector changes and pull requests targeting `main`. Run the same full check locally with `npm run validate`.

## Deployment status

- Cloudflare Git integration reported a successful feature-branch preview deployment for commit `cf7ac4cd8e1d306be69c9cd5690f8244826b3861` on 2026-11-08.
- Branch preview: [https://feat-avnish-ai-mcp-scaffold-avnishahirwar.avnishahirwar.workers.dev](https://feat-avnish-ai-mcp-scaffold-avnishahirwar.avnishahirwar.workers.dev).
- Commit preview: [https://36247f8b-avnishahirwar.avnishahirwar.workers.dev](https://36247f8b-avnishahirwar.avnishahirwar.workers.dev).
- GitHub Actions run #33 passed TypeScript validation, Wrangler dry-run build, and local Worker HTTP smoke tests.
- These results confirm preview deployment/build and automated local checks; they do **not** confirm a live MCP Inspector handshake or production release.
- The pull request remains Draft and is not merged to `main`.

## Security and deployment prerequisites

The public endpoint exposes only public website information. Do not add private data or write capabilities until authentication, per-user authorization, explicit consent, audit logging, abuse controls, and data-retention rules have been implemented and reviewed.

For a manual deployment from an authorized Cloudflare session:

```bash
npx wrangler login
npm run deploy
```

Never send passwords, one-time codes, API tokens, OAuth secrets, or recovery codes in chat or commit them to this repository.

## Validation status

- TypeScript validation: passed in GitHub Actions run #33.
- Wrangler dry-run build: passed in GitHub Actions run #33.
- Local Worker HTTP smoke tests: passed in GitHub Actions run #33.
- Cloudflare feature-branch preview deployment: reported successful for commit `cf7ac4c`.
- MCP Inspector handshake and live tool invocation: pending.
- OAuth authorization server, provider apps, credentials, token vault, and live social account authorization: not implemented.
- Database, private analytics, inbox, publishing, and write tools: intentionally out of scope for this read-only release.

## Next phases

1. Complete an MCP Inspector handshake and invoke all five tools against the preview endpoint.
2. Design and implement OAuth 2.1 authorization, consent, token validation, revocation, and scoped permissions.
3. Add provider adapters one at a time, read-only first, only where official APIs and account authorization permit.
4. Add database-backed capabilities only with explicit consent, data minimization, retention controls, and audit logging.
