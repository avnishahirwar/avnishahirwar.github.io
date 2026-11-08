# AVNISH AI — Zero-Budget MVP Specification

**Working positioning:** Global AI, Technology & Everyday Solutions  
**Tagline:** Make useful technology easier for everyone.  
**Status:** Planning specification; not a launched commercial product.

## 1. Launch principle
Start with one useful, narrow product and validate demand before expanding. Do not attempt to launch 100 business lines at once. Build a reusable platform and add products only when customers demonstrate a real need.

## 2. First product
**Avnish AI Business Desk** — a lightweight enquiry and knowledge assistant for independent hotels, resorts, and other enquiry-driven small businesses.

### MVP user journey
1. A business owner submits public business information and approved FAQs.
2. The system displays a simple branded enquiry page.
3. A visitor submits a question and contact details with clear consent.
4. The business receives the enquiry in a basic dashboard or email notification.
5. AI-generated reply suggestions are grounded in the approved FAQ content.
6. A human reviews and sends the reply; no autonomous booking, pricing, refund, or payment promises.
7. The business can review enquiry counts and response status.

## 3. MVP scope
### Include
- Public landing page explaining the product.
- Business profile and approved FAQ setup.
- Enquiry form with consent notice and data minimisation.
- Basic enquiry list and status labels.
- Human-approved reply drafts.
- Simple usage limits and privacy notice.
- Accessible, mobile-first interface.

### Exclude from first release
- Payment collection or subscriptions.
- Social account connections or publishing.
- Automated WhatsApp, email, or social DMs.
- Autonomous booking or transaction handling.
- Sensitive personal data, identity documents, or payment data.
- Claims of guaranteed revenue, bookings, or AI accuracy.

## 4. Initial customer validation
Interview 10 local businesses and ask:
- How do customers currently enquire?
- Which questions are repeated most often?
- How many enquiries are missed or delayed?
- Who is allowed to answer and approve replies?
- Would a simple enquiry dashboard solve a meaningful problem?
Do not collect customer personal data during discovery. Obtain permission before using any business name, logo, content, or testimonial.

## 5. Free-first technical approach
- Keep the existing read-only public MCP connector separate from the customer-facing product.
- Use the existing GitHub repository for source control and issue tracking.
- Use free-tier hosting and storage only after reviewing current limits and terms.
- Never store secrets in Git, frontend code, logs, or chat.
- Add server-side validation, rate limiting, abuse prevention, deletion/export procedures, and privacy disclosures before accepting real customer data.
- No paid services until a validated need and budget approval exist.

## 6. Trust, privacy, and safety requirements
- Collect only the minimum data needed.
- Show a clear purpose and consent notice on enquiry forms.
- Provide a contact route for correction/deletion requests.
- Restrict dashboard access; do not expose enquiries publicly.
- Do not use submitted data to train models without separate, informed permission.
- Human review is required before any customer-facing AI response.
- Do not provide regulated legal, medical, financial, or tax advice.
- Follow applicable laws, platform terms, age requirements, and provider policies. Any adult-restricted legal, payment, KYC, or contract steps must be handled by an eligible adult/authorized representative.

## 7. Acceptance criteria for a prototype
- Mobile layout works at common phone widths.
- Business profile and FAQ content can be previewed.
- Enquiry form validates required fields and consent.
- Test enquiries appear only in an authorized dashboard.
- Reply draft clearly identifies itself as AI-generated and requires human approval.
- No payment, social OAuth, or public deployment is implied by a local prototype.
- Basic tests cover validation, access control, and data deletion.

## 8. Release gates
1. Customer interviews completed.
2. Prototype tested with synthetic data.
3. Privacy and security review completed.
4. Adult/authorized review of any contracts, accounts, payments, or compliance requirements.
5. Explicit release approval before production deployment.

## 9. Success measures
- Number of businesses interviewed.
- Number confirming the problem is frequent and costly.
- Prototype task completion rate.
- Enquiry response time before and during pilot.
- Pilot retention and willingness to pay.
- Support burden and privacy/security incidents.

## 10. Honest status
This document is a product plan. It does not mean the product is built, production-ready, connected to social accounts, accepting payments, or generating revenue.
