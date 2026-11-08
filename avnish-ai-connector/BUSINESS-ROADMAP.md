# Avnish AI — Hybrid SaaS + Services Business Roadmap

Status: planning baseline; this document is not a claim that the listed features are implemented or that revenue is available.

## 1. Business direction

Build Avnish AI as a hybrid business serving customers in India and internationally:
- SaaS: self-serve subscription access to clearly defined AI/data-integration tools.
- API: metered access for developers and businesses where usage can be measured reliably.
- Services: paid discovery, implementation, and custom business-automation projects.

The initial product must solve one narrow, repeatable problem before expanding into a broad automation platform.

## 2. Current verified baseline

The repository contains an isolated Cloudflare Worker MCP connector (version 0.2.0) with:
- Streamable HTTP endpoint at /mcp.
- /health and root status endpoints.
- Five read-only tools for public website profile, sections, published social links, fixed public resources, and connector capabilities.
- TypeScript validation, Wrangler dry-run build, and local HTTP smoke-test coverage recorded in GitHub Actions run #27 for commit cf7ac4c.
- Cloudflare feature-preview deployment reported successful for latest commit 189f0a4.

Not yet verified/implemented:
- Live MCP Inspector handshake and live invocation of all five tools.
- Customer authentication, tenant isolation, database, billing, payment gateway, subscription enforcement, invoices, refunds, admin console, customer dashboard, usage metering, support workflow, provider OAuth integrations, and production launch.
- The existing connector is public/read-only and is not a customer-facing paid product.

## 3. Product sequencing

### Phase 0 — Validate the problem
- Interview a small set of prospective business users and developers.
- Choose one initial use case based on repeated pain, willingness to pay, and API feasibility.
- Define measurable outcomes and a narrow MVP boundary.
- Do not advertise unsupported features or promise revenue.

### Phase 1 — Technical verification and foundation
- Complete MCP protocol handshake against the preview deployment.
- Invoke all five tools and test error handling, timeouts, and resource limits.
- Add automated protocol-level tests.
- Review public endpoint abuse/rate limiting and operational logging.
- Keep the current public connector separate from customer/private data.

### Phase 2 — Multi-tenant SaaS foundation
- Define customer, organization, membership, role, plan, subscription, usage, invoice, and audit entities.
- Implement authentication and authorization with tenant isolation.
- Add customer dashboard and admin support views.
- Add rate limits, quotas, observability, backup/restore, privacy notice, terms, and data retention controls.
- Use least-privilege access and never expose provider tokens to browsers or MCP clients.

### Phase 3 — Monetization
- Select a payment provider only after legal business/account eligibility and provider requirements are confirmed.
- Implement hosted checkout, signed webhook verification, idempotency, payment state reconciliation, subscription lifecycle, cancellation, invoices, refunds, and failed-payment handling.
- Enforce plan limits on the server, not only in the UI.
- Test in sandbox before any live payment.
- Do not store raw card details.
- Do not activate live billing until an eligible legal account owner completes provider onboarding and required KYC.

### Phase 4 — Hybrid services
- Publish a clear services catalogue: discovery, integration assessment, fixed-scope implementation, and support.
- Use written scope, deliverables, acceptance criteria, timeline, support boundaries, and change-control for each project.
- Separate service invoices from automated SaaS subscriptions where accounting or provider rules require it.

### Phase 5 — Launch and growth
- Run a closed pilot with a small number of consenting customers.
- Track activation, successful task completion, weekly active customers, retention, support burden, gross margin, and paid conversion.
- Fix reliability and onboarding issues before paid public launch.
- Expand to international customers only after tax, privacy, consumer, export, and payment-provider requirements are reviewed for target markets.

## 4. Initial architecture proposal

- Frontend: customer dashboard and public product/pricing pages.
- Backend/API: authenticated application API and tenant-aware authorization layer.
- Data: relational database with tenant-scoped access controls.
- Jobs: background processing for integrations, webhooks, and usage aggregation.
- Payments: hosted checkout plus verified webhooks from a supported payment provider.
- MCP: keep public read-only tools isolated; add authenticated tools only behind scoped authorization.
- Secrets: provider-managed secret store; no credentials in source control, browser storage, or chat.
- Operations: CI, staging, production separation, monitoring, audit logs, backups, and incident procedures.

Technology choices should be finalized only after the first use case and hosting constraints are validated.

## 5. Security, privacy, and account eligibility gates

- Collect the minimum customer data needed.
- Obtain explicit authorization for each external account integration.
- Respect each provider's API terms, review, age, identity, and account eligibility requirements; never bypass them.
- Any account, payment, KYC, contract, or legal action requiring an adult or legal business representative must be handled by an eligible parent/guardian or authorized adult business representative. Do not share passwords, OTPs, recovery codes, payment credentials, or API secrets in chat.
- Start with read-only integrations; treat publishing, messaging, transactions, and other write actions as separate high-risk features requiring explicit consent and additional review.
- Obtain qualified legal/accounting advice for business registration, tax, privacy, consumer protection, and cross-border sales before commercial launch.

## 6. Release gates

A release is not ready for paid customers until:
1. End-to-end product flows pass staging tests.
2. Tenant isolation and authorization tests pass.
3. Payment sandbox and webhook tests pass.
4. Subscription limits are enforced server-side.
5. Privacy, terms, support, refund, and incident processes are published.
6. Production monitoring, backups, and rollback are tested.
7. The business/payment account owner has completed all required provider approvals.

## 7. Planning estimates

Indicative engineering ranges, not commitments:
- Technical verification and product discovery: 1–2 weeks.
- Narrow multi-tenant MVP: 3–6 additional weeks.
- Billing, subscription lifecycle, and operational hardening: 2–4 additional weeks.
- Pilot and iteration: 2–4 weeks.

Actual timing depends on the selected use case, implementation complexity, provider approvals, and testing findings. First revenue is not guaranteed by a launch date.

## 8. Decisions still required

Before implementation expands beyond the existing connector:
- Select the first customer problem and target buyer.
- Confirm whether the first paid offer is API access, a SaaS workflow, or a defined integration service.
- Confirm an eligible adult/legal business representative for any required contracts, payment-provider onboarding, KYC, and account ownership.
- Agree on the first pilot success metric and support capacity.

## 9. Current release discipline

The existing GitHub pull request remains Draft and unmerged. Keep production/main unchanged until end-to-end tests, security review, and explicit release approval are complete.
