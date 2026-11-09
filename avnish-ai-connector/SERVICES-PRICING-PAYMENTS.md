# AVNISH AI — Services, Pricing and Checkout Readiness

Status: implementation specification. This is not a live offer, payment facility, or claim that services are currently purchasable.

## Customer journey
1. Visitor understands the product and intended audience.
2. Visitor reviews the specific service, inclusions, exclusions, and availability status.
3. Visitor compares indicative plans and usage boundaries.
4. Visitor requests a pilot or a written implementation quote through an approved contact channel once that channel is published.
5. After a service is operational and commercial terms are approved, the customer can accept terms and proceed to hosted checkout.
6. The server verifies payment provider webhooks before granting access.
7. Customer can access invoices, renewal details, cancellation and support instructions.

## Service catalogue
### First commercial product: Business Enquiry Assistant
Intended customers: independent hotels, resorts, and enquiry-driven service businesses.
Planned scope:
- Organised enquiry inbox with source, status, timestamps and assignment.
- FAQ/reply drafts based only on customer-approved business information.
- Human review before any outbound message.
- Follow-up reminders and basic operational reporting.
Not included unless separately scoped: booking engine, guaranteed bookings, payment processing, autonomous external messaging, or 24/7 staffed support.

### Digital Business Setup
A scoped implementation service for approved website enquiry workflows, FAQ/content setup, staff onboarding and agreed integrations. Every engagement requires written scope, deliverables, acceptance criteria, timeline, support boundary and price.

### Future modules
Everyday AI, Learning AI, Creator AI and Enterprise AI remain planned until implemented, tested and explicitly released. Do not accept payment for unavailable modules.

## Indicative pricing hypotheses
These are internal validation ranges only, not active offers:
- Free: public information and sample demonstrations.
- Individual/Creator: ₹199–₹999/month after the relevant modules exist.
- Business: ₹1,499 / ₹3,999 / ₹8,999 per month as initial hypotheses, subject to pilot validation and usage-cost analysis.
- Implementation: from ₹5,000 one-time, only after written scope and quote.
Before publication, specify GST/tax treatment, billing period, included seats, usage caps, overage pricing, support hours, cancellation, refunds and renewal rules.

## Payment integration architecture
Payment provider selection is pending eligible merchant-account ownership and onboarding. For India, evaluate providers such as Razorpay only after reviewing current eligibility, product category acceptance, fees, settlement, recurring billing support and legal requirements.

Required flow:
1. Authenticated server creates a hosted checkout session from a server-side price catalogue.
2. Browser receives only the provider checkout URL/session identifier; never a secret key.
3. Provider handles card/UPI details; the application never stores raw card data or UPI PINs.
4. Provider sends signed webhook to server.
5. Server verifies signature, amount, currency, order/subscription reference, event freshness and idempotency.
6. Server records payment state and grants the matching entitlement only after verified success.
7. Failed, pending, duplicate, refunded, disputed and cancelled events are handled explicitly.
8. Customer can view invoice/receipt, plan, renewal date and cancellation route.

## Mandatory pre-live checklist
- Eligible adult/legal entity owns merchant account and completes KYC/bank verification.
- Legal review of entity, terms, privacy notice, refund/cancellation policy, tax/invoicing and consumer obligations.
- Authentication, tenant isolation, role-based access and server-side entitlements.
- Secrets stored only in deployment secret manager; never in Git, browser code, or chat.
- Signed webhook verification, idempotency, replay protection and audit logs.
- Sandbox tests for success, failure, pending, duplicate webhook, refund, cancellation, renewal, tax and reconciliation.
- Monitoring, backups, incident response and support process.
- Explicit production launch approval.

## Current status
- Service and pricing information can be displayed as indicative/proposed.
- No customer checkout, merchant account, live payment, subscription entitlement, invoice, refund workflow or payment webhook is currently implemented.
- Do not show a working "Pay now" button until the complete server-side flow is tested.
- No payment credentials or customer payment data should be requested in chat.
