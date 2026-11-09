-- AVNISH AI D1 schema (SQLite)
-- Safe foundation only: no production data, credentials, or provider tokens are included.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  email_verified_at TEXT,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  disabled_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_seen_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS social_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('instagram','facebook','youtube','linkedin','x','threads','pinterest')),
  provider_account_id TEXT NOT NULL,
  display_name TEXT,
  granted_scopes_json TEXT NOT NULL DEFAULT '[]',
  connected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  disconnected_at TEXT,
  UNIQUE(user_id, provider, provider_account_id)
);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_provider ON social_accounts(user_id, provider);

-- Store only envelope-encrypted token ciphertext. Encryption keys belong in a managed secret store,
-- never in D1, source control, browser code, or chat.
CREATE TABLE IF NOT EXISTS oauth_credentials (
  social_account_id TEXT PRIMARY KEY REFERENCES social_accounts(id) ON DELETE CASCADE,
  access_token_ciphertext TEXT NOT NULL,
  refresh_token_ciphertext TEXT,
  expires_at TEXT,
  encryption_key_version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  consent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_customers_owner ON customers(owner_user_id, created_at);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  totals_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(owner_user_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS idx_invoices_owner ON invoices(owner_user_id, created_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL CHECK (plan_code IN ('pro_monthly','pro_annual')),
  provider TEXT,
  provider_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive','pending','active','past_due','cancelled','expired')),
  period_start TEXT,
  period_end TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_owner ON subscriptions(owner_user_id, status);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('success','failure','denied')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_user_id, created_at);

-- IMPORTANT:
-- * Every tenant-owned query must constrain owner_user_id on the server.
-- * Never store raw passwords, session tokens, OTPs, card numbers, CVV, or unencrypted OAuth tokens.
-- * Do not enable real customer collection until authentication, authorization, consent,
--   deletion/retention workflows, rate limits, and security tests are implemented.
-- * Do not mark a subscription active from a browser redirect; verify signed provider webhooks server-side.
