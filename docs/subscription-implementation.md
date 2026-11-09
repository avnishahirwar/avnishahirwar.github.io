# Friendly Calculator Subscription Foundation

## Current release status
This branch adds the initial INR plan catalogue, a public pricing page, and database tables for subscriptions, transactions, webhook deduplication, and feature entitlements. It deliberately does **not** enable checkout or paid entitlements.

## Approved INR catalogue
- Free: ₹0
- Starter: ₹99/month or ₹999/year
- Professional: ₹199/month or ₹1,999/year
- Business: ₹499/month or ₹4,999/year
- Business API allowance: 1,000 credits per billing cycle (planned allowance; not yet metered or available).

Amounts in the database are paise. Monthly and annual price points have been approved. The prices do not mean checkout or paid features are currently available.

## Required before any test checkout
1. An authorised adult account owner/admin completes merchant onboarding and confirms eligibility for Razorpay Subscriptions.
2. Configure test-only secrets in Supabase Edge Function secrets:
   - RAZORPAY_MODE=test
   - RAZORPAY_KEY_ID=rzp_test_...
   - RAZORPAY_KEY_SECRET
   - RAZORPAY_WEBHOOK_SECRET
3. Create Razorpay plans using the plan catalogue, storing returned plan IDs server-side.
4. Implement and deploy subscription endpoints with user JWT verification for create/manage actions.
5. Configure a webhook endpoint with raw-body HMAC verification and event-id deduplication.
6. Verify subscription and payment status server-side before granting entitlements.
7. Test renewals, payment failures, cancellation, pause/resume, replay and duplicate/out-of-order webhooks.

## Security model
- Never expose Razorpay secrets or Supabase service-role/secret keys in browser code.
- Browser users may read active plan metadata and their own subscription, payment and entitlement rows.
- Client-side writes to billing and entitlement tables are revoked; server-side service role functions own all mutations.
- Webhook events are private and deduplicated by provider + event ID.
- Do not grant paid access from a browser checkout callback.

## Global market
This release prices plans in INR only. Global visitors can view the plans, but multi-currency checkout and international recurring-payment eligibility require separate merchant approval and implementation. Do not advertise multi-currency billing as active.

## Not included in this branch
- Signup/login UI and email confirmation flows
- Razorpay subscription checkout
- Webhook event processor
- API usage-based billing and credit enforcement
- Invoice generation and tax handling
- Live payment activation

These are explicit blockers, not completed features. The existing calculator API remains a separately approved/manual-key service and must not be treated as subscription-metered until its entitlement checks are added.
