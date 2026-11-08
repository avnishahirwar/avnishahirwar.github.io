# Avnish AI Connector

A first, read-only MCP server scaffold for the public Avnish Ahirwar website.

## Current scope

- Public website profile metadata
- Public website section list
- Public social links already published on the site
- Fixed public resources: `robots.txt`, `sitemap.xml`, and `feed.xml`
- Connector capability/status information

The server does **not** currently read private accounts, inboxes, analytics dashboards, customer records, or unpublished content. It does not create enquiries, bookings, posts, or other records. It does not publish or delete content.

## Architecture

- Website remains on GitHub Pages.
- This MCP server runs separately as a Cloudflare Worker.
- Remote MCP transport: Streamable HTTP at `/mcp`.
- The initial tools are read-only and do not require a database.
- Future write tools require authentication, explicit user consent, validation, audit logging, and a persistent database.

## Local development

Requirements: Node.js 20+ and a Cloudflare account for deployment.

```bash
cd avnish-ai-connector
npm install
npm run dev
```

The local MCP endpoint is normally `http://localhost:8787/mcp`.

Use MCP Inspector to test the tools:

```bash
npx @modelcontextprotocol/inspector@latest
```

Connect the Inspector to the local `/mcp` endpoint and list tools.

## Deployment

After reviewing the code and configuring your Cloudflare account:

```bash
npx wrangler login
npm run deploy
```

The Worker will be available on your Cloudflare `workers.dev` subdomain. The deployed endpoint will end in `/mcp`.

Do not add API keys, OAuth client secrets, database credentials, or access tokens to this repository. Configure secrets with Cloudflare Worker secrets.

## Next phases

1. Deploy and test the read-only MCP endpoint.
2. Add OAuth authentication and per-user authorization.
3. Provision a database (Cloudflare D1 or Supabase) for enquiries and booking requests.
4. Add write tools only after authentication and consent checks are in place.
5. Integrate supported private analytics and content providers separately.
6. Add privacy notice, retention policy, rate limits, spam controls and audit logs.

## Important

This is a scaffold, not a deployed production connector. No changes have been made to the existing website files or the `main` branch.
