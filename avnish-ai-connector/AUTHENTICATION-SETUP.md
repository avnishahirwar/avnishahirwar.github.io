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
