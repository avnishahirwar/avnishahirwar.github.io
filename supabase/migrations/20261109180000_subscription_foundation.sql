-- Friendly Calculator subscription foundation
-- Additive migration: does not enable checkout or grant paid entitlements.
create extension if not exists pgcrypto;

create table if not exists public.subscription_plans (
  code text primary key,
  name text not null,
  billing_interval text not null check (billing_interval in ('free','monthly','yearly')),
  amount_paise integer not null default 0 check (amount_paise >= 0),
  currency text not null default 'INR' check (currency = 'INR'),
  api_credits_per_cycle integer not null default 0 check (api_credits_per_cycle >= 0),
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.subscription_plans
(code,name,billing_interval,amount_paise,currency,api_credits_per_cycle,features)
values
('free','Free','free',0,'INR',0,'{"ad_free":false,"saved_history":false,"advanced_reports":false,"export":false,"api_access":false}'::jsonb),
('starter_monthly','Starter','monthly',9900,'INR',0,'{"ad_free":true,"saved_history":true,"advanced_reports":false,"export":false,"api_access":false}'::jsonb),
('starter_yearly','Starter','yearly',99900,'INR',0,'{"ad_free":true,"saved_history":true,"advanced_reports":false,"export":false,"api_access":false}'::jsonb),
('professional_monthly','Professional','monthly',19900,'INR',0,'{"ad_free":true,"saved_history":true,"advanced_reports":true,"export":true,"api_access":false}'::jsonb),
('professional_yearly','Professional','yearly',199900,'INR',0,'{"ad_free":true,"saved_history":true,"advanced_reports":true,"export":true,"api_access":false}'::jsonb),
('business_monthly','Business','monthly',49900,'INR',1000,'{"ad_free":true,"saved_history":true,"advanced_reports":true,"export":true,"api_access":true}'::jsonb),
('business_yearly','Business','yearly',499900,'INR',1000,'{"ad_free":true,"saved_history":true,"advanced_reports":true,"export":true,"api_access":true}'::jsonb)
on conflict (code) do update set
 name=excluded.name,billing_interval=excluded.billing_interval,
 amount_paise=excluded.amount_paise,currency=excluded.currency,
 api_credits_per_cycle=excluded.api_credits_per_cycle,
 features=excluded.features,updated_at=now();

create table if not exists public.user_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 plan_code text not null references public.subscription_plans(code),
 razorpay_plan_id text,
 razorpay_subscription_id text unique,
 status text not null default 'created'
   check (status in ('created','authenticated','active','pending','halted','paused','cancelled','completed','expired')),
 quantity integer not null default 1 check (quantity between 1 and 100),
 current_start timestamptz,
 current_end timestamptz,
 charge_at timestamptz,
 ended_at timestamptz,
 cancel_at_cycle_end boolean not null default false,
 notes jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists user_subscriptions_user_status_idx
 on public.user_subscriptions(user_id,status);
create index if not exists user_subscriptions_razorpay_plan_idx
 on public.user_subscriptions(razorpay_plan_id);

create table if not exists public.payment_transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 subscription_id uuid references public.user_subscriptions(id) on delete set null,
 razorpay_payment_id text unique,
 razorpay_order_id text,
 amount_paise integer not null check (amount_paise >= 0),
 currency text not null default 'INR' check (currency = 'INR'),
 status text not null check (status in ('created','authorized','captured','failed','refunded','partially_refunded')),
 method text,
 captured_at timestamptz,
 created_at timestamptz not null default now(),
 metadata jsonb not null default '{}'::jsonb
);
create index if not exists payment_transactions_user_created_idx
 on public.payment_transactions(user_id,created_at desc);

create table if not exists public.webhook_events (
 id uuid primary key default gen_random_uuid(),
 provider text not null default 'razorpay',
 event_id text not null,
 event_type text not null,
 payload jsonb not null,
 processed_at timestamptz,
 processing_error text,
 received_at timestamptz not null default now(),
 unique(provider,event_id)
);
create index if not exists webhook_events_unprocessed_idx
 on public.webhook_events(received_at) where processed_at is null;

create table if not exists public.feature_entitlements (
 user_id uuid not null references auth.users(id) on delete cascade,
 feature_code text not null,
 enabled boolean not null default false,
 quota integer,
 valid_until timestamptz,
 source_subscription_id uuid references public.user_subscriptions(id) on delete set null,
 updated_at timestamptz not null default now(),
 primary key(user_id,feature_code)
);

alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.webhook_events enable row level security;
alter table public.feature_entitlements enable row level security;

drop policy if exists "Public can read active subscription plans" on public.subscription_plans;
create policy "Public can read active subscription plans"
 on public.subscription_plans for select to anon, authenticated using (active = true);

drop policy if exists "Users can read own subscriptions" on public.user_subscriptions;
create policy "Users can read own subscriptions"
 on public.user_subscriptions for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own transactions" on public.payment_transactions;
create policy "Users can read own transactions"
 on public.payment_transactions for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own entitlements" on public.feature_entitlements;
create policy "Users can read own entitlements"
 on public.feature_entitlements for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.webhook_events from anon, authenticated;
revoke insert, update, delete on public.user_subscriptions from anon, authenticated;
revoke insert, update, delete on public.payment_transactions from anon, authenticated;
revoke insert, update, delete on public.feature_entitlements from anon, authenticated;
grant select on public.subscription_plans to anon, authenticated;
grant select on public.user_subscriptions, public.payment_transactions, public.feature_entitlements to authenticated;
