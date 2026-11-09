# AVNISH AI Authentication Setup

Status: backend API implementation in progress; not production-ready.

## Implemented in the feature branch

- D1-backed registration with PBKDF2-SHA-256 password hashing (310,000 iterations).
- Email verification token generation and one-time token consumption.
- Login restricted to verified, enabled users.
- Opaque random session tokens; only SHA-256 hashes are stored in D1.
- HttpOnly, Secure session cookie; server-side logout and expiry.
- Forgot-password responses designed not to disclose whether an email exists.
- One-time password-reset tokens; successful reset revokes all user sessions.
- Basic per-IP rate limits using Cloudflare's CF-Connecting-IP.
- `GET /api/auth/me` for a private user profile.

## Required environment configuration

Set these on the Cloudflare Worker using the authorized Cloudflare dashboard or CLI:

- `APP_ORIGIN`: exact browser origin, currently `https://avnishahirwar.github.io` (origin only; no path).
- `RESEND_API_KEY`: Resend API key, stored as a Worker secret.
- `EMAIL_FROM`: verified sender, e.g. a sender address on a domain verified in Resend.

Do not put `RESEND_API_KEY` in source control, D1, browser code, screenshots, or chat. Do not use a real customer account until sender/domain verification and email delivery are tested.

## Development database migration

The base tables were created manually in D1 Studio. The next additive migration is `migrations/0002_authentication.sql`. It adds `users.password_hash`, `auth_tokens`, and `auth_rate_limits`.

Before using authentication, run the contents of this migration exactly once against the **avnish-ai-db-dev** database in Cloudflare D1 Studio. Confirm the new column/table names afterwards. Because the base schema was created manually, do not assume Wrangler migration history reflects `0001_initial_schema.sql`; reconcile migration history before running Wrangler migrations in bulk. Do not apply this to production.

## API routes

All POST routes require an exact matching Origin and JSON content type.

- `POST /api/auth/register` — body: `{ "email": "...", "password": "...", "displayName": "..." }`
- `POST /api/auth/verify-email` — body: `{ "token": "..." }`
- `POST /api/auth/login` — body: `{ "email": "...", "password": "..." }`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password` — body: `{ "email": "..." }`
- `POST /api/auth/reset-password` — body: `{ "token": "...", "password": "..." }`

Passwords must be 12–128 characters. Tokens expire after 30 minutes. Sessions expire after 14 days.

## Important deployment limitation

The current frontend is on GitHub Pages and the API is on a separate `workers.dev` host. The API sets a Secure, HttpOnly, SameSite=None cookie and uses credentialed CORS, but browser third-party-cookie restrictions may prevent reliable session persistence across these different sites. A same-site custom domain/reverse proxy is recommended before enabling real users. The UI also needs to be wired to these endpoints and the email verification/reset query parameters.

## Not yet complete

- Apply and verify `0002_authentication.sql` in D1.
- Configure and test Resend sender and Worker secrets.
- Wire the website's registration, login, verification, logout, forgot/reset password and dashboard UI.
- Configure same-site API hosting or test cookie behavior on supported browsers.
- Add integration tests, review rate limiting and session revocation, and perform security review.
- No production deployment or real user onboarding is enabled.


## Razorpay subscriptions — Test Mode only

The feature branch now contains a server-side subscription flow in `src/billing.ts`:

- `POST /api/billing/create-subscription`: requires a verified signed-in user, creates/caches the Razorpay monthly or annual plan, then creates a pending subscription.
- `POST /api/billing/verify-subscription`: verifies the Checkout HMAC signature. This does **not** grant Pro access.
- `POST /api/billing/webhook`: verifies `X-Razorpay-Signature`, deduplicates events by `x-razorpay-event-id`, and updates subscription state only from provider webhook events.

Pricing configured in code:
- `pro_monthly`: ₹299 / month (29,900 paise).
- `pro_annual`: ₹2,999 / year (299,900 paise).

The Worker refuses to call Razorpay unless `RAZORPAY_KEY_ID` begins with `rzp_test_`. Live keys are deliberately rejected.

### Additional Worker secrets / variables

- `RAZORPAY_KEY_ID`: Razorpay **Test** Key ID (not a live key).
- `RAZORPAY_KEY_SECRET`: Razorpay **Test** Key Secret, stored only as a Worker secret.
- `RAZORPAY_WEBHOOK_SECRET`: webhook signing secret configured in the Razorpay Test Dashboard.
- `APP_ORIGIN`: exact browser origin allowed to call the Worker.

Never paste any of these values into chat or commit them. Configure webhook URL as the Worker endpoint `/api/billing/webhook` and subscribe to `subscription.activated`, `subscription.charged`, `subscription.halted`, `subscription.cancelled`, and `subscription.completed`.

### Additive D1 migration

Apply `migrations/0003_billing.sql` exactly once to **avnish-ai-db-dev**. It creates `billing_plans` and `billing_events`; it does not alter existing customer data. Do not rerun if both tables already exist. Because earlier schema changes were applied manually in D1 Studio, do not run the entire Wrangler migration history blindly.

### Not yet enabled for real customers

The static website has not yet been wired to the billing endpoints or to a verified sign-in UI. Authentication also needs a same-site API origin/reverse proxy: GitHub Pages and `workers.dev` are different sites, and browser third-party-cookie restrictions can block the session cookie. The checkout flow must remain a sandbox test until the site/API origin, email verification, D1 migration, webhook delivery, duplicate-event handling, cancellation/refund lifecycle, and full end-to-end tests are verified. Do not accept live payments.
