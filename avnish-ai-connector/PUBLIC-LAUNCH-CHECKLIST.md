# AVNISH AI — Strict-Privacy Public Launch Checklist

Status: preparation document. This is not legal advice, a security certification, or evidence that production launch is complete.

## Launch boundary
The current public website may describe the product concept and show a fictional, local-only demo. Until the items below are complete and reviewed, it must not collect customer or visitor personal data, accept payments, create customer accounts, promise live AI functionality, or claim commercial availability.

## Current verified baseline
- Repository: avnishahirwar/avnishahirwar.github.io
- Feature branch: feat/avnish-ai-mcp-scaffold
- Website prototype: /avnish-ai/index.html
- PR #2 remains a draft and is not merged into main.
- The latest reviewed PR head at the time this checklist was prepared was 4aec64c153bae07e77d3829280808d022434cd75.
- GitHub Actions validation run #39 completed successfully for the connector workflow.
- Deployment bots reported preview builds for the PR head. Preview URLs are not production URLs.
- Direct browser verification of the preview URLs was not available during this review; do not mark live functional verification complete based only on deployment notifications.

## Privacy requirements before collecting any data
- Publish a reviewed privacy notice that identifies the responsible operator and contact channel.
- Document exact data fields, purposes, lawful basis/consent, processors, retention period, deletion process, and user rights.
- Avoid collecting personal information until the backend, access controls, and retention/deletion workflow are operational.
- Do not put personal phone numbers, private email addresses, credentials, API keys, OTPs, or tokens in frontend source code.
- Do not use third-party analytics, tracking pixels, session replay, or advertising tags without documented review and appropriate notice/consent.
- Use HTTPS and verify hosting, DNS, TLS, and security headers.
- Keep public demo data fictional and ensure all demo interactions remain local-only.

## Application security requirements before customer onboarding
- Separate staging and production environments.
- Server-side authentication and authorization.
- Tenant isolation tested with negative cross-tenant access tests.
- Role-based access and least privilege.
- Encryption in transit and at rest where supported.
- Secrets stored in provider secret management, never in source control or browser code.
- Input validation, output encoding, CSRF protections where relevant, rate limits, abuse controls, and secure error handling.
- Audit logging without logging unnecessary personal data or secrets.
- Backup and restore test.
- Dependency and vulnerability review.
- Incident response and account recovery procedure.
- Data export and deletion procedure.
- Human approval for outbound customer communication and business commitments.

## Commercial readiness before paid launch
- Confirm business/account eligibility and adult/authorized representative requirements.
- Review contracts, terms, refund/cancellation rules, taxes, and applicable privacy/consumer requirements with a qualified adult and professional adviser.
- Confirm payment provider eligibility and supported business model before integration.
- Use hosted checkout; never store raw card details.
- Verify signed webhooks, idempotency, subscription state transitions, refunds, cancellation, and invoices.
- Publish only features and prices that are actually available and tested.

## Public launch gates
1. Website copy and mobile/accessibility QA completed.
2. Privacy and legal notices reviewed by an eligible adult and qualified adviser where needed.
3. No live personal-data form until the secure processing workflow is ready.
4. Security checks and monitoring completed.
5. Production hosting and deployment configuration reviewed.
6. User gives explicit final approval for public production publication.
7. After publication, verify the exact production URL, all routes, language switch, demo, TLS, and headers.

## Current release status
- Prototype website: implemented on feature branch.
- CI: latest recorded connector workflow run #39 passed.
- Preview deployments: provider bots reported ready for the PR head.
- Production launch: not approved or completed.
- Customer data collection: not enabled.
- Customer login, database, live AI, billing, and integrations: not implemented.
