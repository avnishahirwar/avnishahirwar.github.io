-- Razorpay sandbox subscription support. Apply only after confirming this migration has not already been run.
CREATE TABLE IF NOT EXISTS billing_plans (
  plan_code TEXT PRIMARY KEY CHECK (plan_code IN ('pro_monthly','pro_annual')),
  provider_plan_id TEXT NOT NULL UNIQUE,
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  provider_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  processed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type, received_at);
