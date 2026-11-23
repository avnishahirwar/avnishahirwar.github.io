create table if not exists public.business_quotes (
  id uuid primary key default gen_random_uuid(),
  service_type text not null default 'custom_calculator' check (service_type = 'custom_calculator'),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 120),
  customer_email text not null check (char_length(customer_email) <= 254 and customer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  project_scope text not null check (char_length(trim(project_scope)) between 10 and 6000),
  quoted_terms text not null check (char_length(trim(quoted_terms)) between 10 and 6000),
  amount_paise integer not null check (amount_paise >= 100),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'sent' check (status in ('sent', 'paid', 'fulfilled', 'cancelled', 'expired')),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  razorpay_receipt text not null unique check (char_length(razorpay_receipt) <= 40),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  order_create_started_at timestamptz,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_quotes_created_at_idx
  on public.business_quotes (created_at desc);
create index if not exists business_quotes_status_idx
  on public.business_quotes (status, expires_at);

alter table public.business_quotes enable row level security;
revoke all on table public.business_quotes from anon, authenticated;
grant all privileges on table public.business_quotes to service_role;

create or replace function public.claim_business_quote_order(p_quote_id uuid, p_token_hash text)
returns table (
  quote_id uuid,
  claim_state text,
  amount_paise integer,
  currency text,
  customer_name text,
  customer_email text,
  project_scope text,
  quoted_terms text,
  expires_at timestamptz,
  razorpay_receipt text,
  razorpay_order_id text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.business_quotes%rowtype;
begin
  select * into q
  from public.business_quotes bq
  where bq.id = p_quote_id and bq.token_hash = p_token_hash
  for update;

  if not found or q.status = 'cancelled' or q.expires_at <= now() then
    return query select null::uuid, 'unavailable', null::integer, null::text,
      null::text, null::text, null::text, null::text, null::timestamptz, null::text, null::text;
    return;
  end if;

  if q.status in ('paid', 'fulfilled') then
    return query select q.id, 'already_paid', q.amount_paise, q.currency,
      q.customer_name, q.customer_email, q.project_scope, q.quoted_terms,
      q.expires_at, q.razorpay_receipt, q.razorpay_order_id;
    return;
  end if;

  if q.razorpay_order_id is not null then
    return query select q.id, 'existing_order', q.amount_paise, q.currency,
      q.customer_name, q.customer_email, q.project_scope, q.quoted_terms,
      q.expires_at, q.razorpay_receipt, q.razorpay_order_id;
    return;
  end if;

  if q.order_create_started_at is not null and q.order_create_started_at > now() - interval '90 seconds' then
    return query select q.id, 'in_progress', q.amount_paise, q.currency,
      q.customer_name, q.customer_email, q.project_scope, q.quoted_terms,
      q.expires_at, q.razorpay_receipt, q.razorpay_order_id;
    return;
  end if;

  update public.business_quotes bq
  set order_create_started_at = now(), updated_at = now()
  where bq.id = q.id;

  return query select q.id, 'create', q.amount_paise, q.currency,
    q.customer_name, q.customer_email, q.project_scope, q.quoted_terms,
    q.expires_at, q.razorpay_receipt, q.razorpay_order_id;
end;
$$;

revoke all on function public.claim_business_quote_order(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_business_quote_order(uuid, text) to service_role;
