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

The workflow at `.github/workflows/avnish-ai-connector.yml` runs dependency installation, TypeScript validation, and Wrangler's dry-run build for connector changes and pull requests targeting `main`.

## Deployment prerequisites

Deployment is intentionally not automated from GitHub. Before deployment:
1. The account owner creates and verifies a Cloudflare account and reviews the applicable terms.
2. The account owner selects the hosting account and confirms the intended public endpoint.
3. The code owner completes the local MCP Inspector smoke test.
4. OAuth architecture and identity-provider choice are agreed before any private or write capabilities are added.
5. Production secrets, if later required, are entered directly into the hosting provider's secret manager and never committed to Git.

After those prerequisites, deploy from this directory using the account owner's authenticated Cloudflare session:

```bash
npx wrangler login
npm run deploy
```

Never send passwords, one-time codes, API tokens, OAuth secrets, or recovery codes in chat or commit them to this repository.

## Validation status

- GitHub Actions: TypeScript typecheck and Wrangler dry-run build passed for the current CI run.
- MCP Inspector: pending local interactive test.
- Cloudflare deployment: pending account setup and owner approval.
- OAuth: design prerequisite documented; not configured.
- Database and write tools: intentionally out of scope for this public read-only release.

## Next phases

1. Run local health and MCP Inspector smoke tests.
2. Select and configure an OAuth identity provider with the account owner.
3. Implement and test OAuth 2.1 authorization and scoped permissions.
4. Add only those external account integrations whose providers support approved APIs and whose account owners authorize them.
5. Add database-backed capabilities only with explicit consent, data minimization, retention controls, and audit logging.
