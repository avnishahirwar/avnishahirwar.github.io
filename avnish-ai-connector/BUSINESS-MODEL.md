# Avnish AI — Business Model & Go-to-Market Plan
Version: 1.0
Status: proposed business model; not a launched or revenue-generating service.

## Executive decision

Build Avnish AI as a hybrid B2B business: a focused SaaS product, paid implementation services, and a metered API layer.

### Initial market wedge
Start with independent hotels, resorts, boutique stays, and hospitality operators that receive enquiries through their websites and social channels but manage responses manually or inconsistently.

Expand later to other appointment- and enquiry-driven small businesses only after the hospitality workflow is validated.

### Initial product
**Avnish AI Guest Enquiry Assistant** — a business-facing enquiry capture and response workflow that:
- Answers approved, factual FAQs from a hotel's own approved content.
- Captures a guest's enquiry and preferred contact channel with clear consent.
- Routes qualified enquiries to the hotel's staff.
- Helps staff draft consistent replies and follow-up messages.
- Provides a simple enquiry dashboard and basic conversion reporting.
- Starts with human approval for outbound messages; no autonomous promises, reservations, or payments.

The product is not a hotel booking engine, payment processor, or guarantee of more bookings. It helps teams respond to enquiries more consistently.

## 1. Customer and problem

### Ideal first customer
An independent hotel, resort, boutique property, or small hospitality group with:
- A public website and a steady stream of enquiries.
- A small sales/reservations team.
- Repetitive questions about rooms, facilities, location, policies, events, and availability.
- A need to track enquiry status and follow-up.

### Buyer and users
- Buyer: owner, general manager, sales/marketing head, or reservations manager.
- Users: reservations and sales staff.
- Later buyers: multi-property operators and hospitality agencies.

### Customer pain to validate
- Enquiries arrive across multiple channels.
- Replies are delayed or inconsistent.
- Staff repeat the same answers.
- Leads are not always assigned or followed up.
- Management lacks a clear view of enquiry outcomes.

These are hypotheses to validate in discovery interviews, not proven market findings.

## 2. Value proposition

"Help hospitality teams respond to guest enquiries faster, keep follow-ups organized, and give managers visibility — while staff retain control over customer communication."

Measure value through:
- Median first-response time.
- Percentage of enquiries receiving a response.
- Follow-up completion rate.
- Enquiry-to-qualified-lead rate.
- Staff time spent on repetitive FAQs.
- Customer-reported usefulness and satisfaction.

Do not claim increased bookings until customer data demonstrates it.

## 3. Revenue model

Use three revenue streams, introduced in this order:

### A. Setup and implementation services — first revenue path
Charge for onboarding, approved FAQ/content setup, workflow configuration, staff training, and integration work.
- One-time implementation fee.
- Written scope, deliverables, acceptance criteria, timeline, and support boundary.
- Charge separately for custom integrations and out-of-scope changes.

### B. SaaS subscriptions — recurring revenue
Illustrative test pricing only; validate willingness to pay with pilot customers before publishing:
- Starter: ₹1,499/month — one property, basic enquiry inbox, FAQ assistant, limited usage.
- Growth: ₹3,999/month — more usage, staff seats, follow-up workflow, reports.
- Pro: ₹8,999/month — multiple teams or properties, advanced controls, priority support.
- International test bands: US$29 / US$79 / US$179 per month, adjusted after local validation, taxes, currency, support costs, and competitor research.

These are pricing hypotheses, not current offers or verified market prices. Define fair usage limits and overage rules before sale. Avoid lifetime plans.

### C. API and partner revenue — later stage
Offer API access only after stable authentication, tenant isolation, usage metering, documentation, quotas, and support are in place.
- Meter by successful request or agreed usage unit.
- Publish limits and service status.
- Offer partner/agency plans only after operational support is ready.

## 4. Packaging

| Package | Target | Included |
| --- | --- | --- |
| Pilot | First design partners | Time-limited evaluation, agreed success metrics, staff feedback |
| Starter | Single-property operator | FAQ assistant, enquiry capture, basic inbox |
| Growth | Busy property | Staff workflow, follow-up reminders, reporting |
| Pro | Multi-team operator | Multiple properties/teams, admin controls, integrations |
| Custom | Larger operator/agency | Scoped implementation, API/integration work, support agreement |

A pilot should be free or paid only under clear written terms, with no misleading claims. Obtain permission before using customer names, logos, testimonials, or performance data.

## 5. Go-to-market

### First 30 days: discovery, not mass selling
1. Interview 10–15 hospitality decision-makers.
2. Ask how enquiries arrive, who responds, what gets missed, current tools, and what measurable result would justify payment.
3. Observe one real enquiry workflow with permission.
4. Obtain 2–3 design partners willing to test a prototype.
5. Select one narrow workflow and define baseline metrics.

### Days 31–60: prototype and pilot
1. Build an enquiry dashboard and approved FAQ knowledge base.
2. Add consent-aware enquiry capture.
3. Add staff review/approval before outbound messages.
4. Pilot with 1–3 properties using test data first.
5. Measure response time, staff effort, follow-up completion, and user feedback.
6. Fix reliability and onboarding issues before charging for recurring access.

### Days 61–90: paid validation
1. Convert only satisfied pilot customers to a clearly scoped paid plan.
2. Publish a transparent pricing page and service terms.
3. Add billing only after legal/payment-provider eligibility and business onboarding are complete.
4. Build a repeatable onboarding checklist.
5. Create one documented case study only with written customer permission and verified metrics.
6. Expand to more properties only if retention and support capacity are healthy.

These are execution stages, not guaranteed deadlines or revenue milestones.

## 6. Product architecture

### Existing foundation
The repository currently has an isolated Cloudflare Worker MCP connector version 0.2.0 with five read-only public-website tools, MCP endpoint, health endpoint, local smoke tests, and a successful Cloudflare feature-preview deployment record. The latest feature branch is still a draft PR and is not a production business platform.

### Proposed paid application
- Public marketing site: product explanation, transparent plans, privacy, terms, support.
- Customer app: organization/property setup, staff seats, enquiry inbox, FAQ content, reporting.
- Backend: authenticated API with strict tenant isolation.
- Database: customers, organizations, properties, users, roles, enquiries, consent, usage, subscriptions, audit events.
- AI layer: retrieval only from customer-approved content; citations/source links where possible; safe fallback when unsure.
- Integrations: add one channel/provider at a time, only with official APIs and customer authorization.
- Admin: support tools with role-based access and audit trail.
- Billing: hosted checkout and verified webhooks; never store raw card details.
- Operations: staging/production separation, monitoring, backups, rate limits, incident response, and rollback.

Keep the current public MCP connector isolated from private customer data. Do not turn a public endpoint into a private customer-data service without authentication and authorization.

## 7. Security, privacy, and compliance

- Collect only data required for the enquiry workflow.
- Clearly disclose what is collected, why, and how long it is retained.
- Obtain appropriate consent before storing or contacting an enquiry.
- Provide correction/deletion and opt-out processes where required.
- Use role-based access, tenant isolation, encryption in transit and at rest, secret management, audit logs, and tested backups.
- Never put API keys, OAuth secrets, passwords, OTPs, recovery codes, or payment credentials in source code, browser code, or chat.
- Follow provider terms and approved API scopes. Do not scrape or automate platforms in ways that violate their terms.
- Start with human approval for outbound communication.
- Obtain qualified legal/accounting advice for business formation, contracts, taxes, privacy, consumer rules, and cross-border sales.

Any contract, payment account, KYC, business registration, or provider authorization that requires an adult or legal entity must be handled by an eligible parent/guardian or authorized adult business representative. Do not misstate age or bypass platform eligibility rules.

## 8. Payment and subscription design

Payment gateway is a future integration, not currently configured.
Required flow:
1. Customer chooses a plan.
2. Server creates a hosted checkout session.
3. Payment provider processes payment.
4. Server verifies signed webhook and idempotency.
5. Subscription state is updated on the server.
6. Entitlements and usage limits are enforced server-side.
7. Customer receives invoice/receipt and can manage cancellation.

Test sandbox payments, duplicate webhooks, failed payments, refunds, cancellation, renewal, tax invoices, and reconciliation before live billing. Select a provider only after confirming the legal account owner's eligibility, business documentation, supported countries, fees, and product restrictions.

## 9. Cost discipline

Do not buy expensive infrastructure or multiple paid connectors before customer discovery.
- Begin with existing repository/hosting where appropriate.
- Use free or low-cost development tiers within their terms.
- Track AI usage, hosting, messaging, payment fees, support time, and refunds.
- Set usage caps and alerts.
- Keep a monthly operating-cost sheet and calculate gross margin per customer.
- Do not assume any connector, paid plan, or third-party authorization is automatically available.

## 10. Key business metrics

North-star metric: **qualified guest enquiries successfully handled with staff oversight**.

Track:
- Number of active paying properties.
- Time to first useful response.
- Enquiry capture and follow-up completion.
- Weekly active staff users.
- Trial-to-paid conversion.
- Monthly recurring revenue (MRR) and churn.
- Gross margin after AI, hosting, messaging, and support costs.
- Support tickets per property.
- Refunds and payment failures.

Do not optimize vanity metrics such as registrations without activation or retention.

## 11. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Hotels do not see enough value | Validate pain and willingness to pay before building broadly |
| AI gives incorrect property details | Use approved source content, citations, and human escalation |
| Customer messages are mishandled | Consent, human approval, audit logs, opt-out |
| Integration access is restricted | Official APIs, one integration at a time, no bypass |
| Support costs exceed subscription | Usage caps, onboarding fee, clear support tiers |
| Payment or tax setup delayed | Keep billing sandbox-only until approved |
| Too many features too early | One customer segment and one workflow first |

## 12. Immediate priorities

1. Verify live MCP handshake and all five tools against the preview.
2. Conduct discovery interviews and choose the exact first enquiry workflow.
3. Create clickable product specification and customer journey.
4. Build a secure, tenant-aware prototype with test data.
5. Run a pilot and measure outcomes.
6. Only then implement live subscriptions and expand integrations.

## 13. Explicit current status

Implemented: public read-only MCP connector scaffold, CI checks recorded for an earlier code commit, and feature-preview deployment records.

Not implemented: paid SaaS app, customer accounts, private data integrations, database, payment gateway, subscriptions, production billing, or revenue.

No revenue, customer, integration approval, or payment capability is claimed by this document.
