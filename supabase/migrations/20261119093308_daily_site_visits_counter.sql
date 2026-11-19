create table if not exists public.daily_site_visits (
  visit_date date not null,
  session_id uuid not null,
  created_at timestamptz not null default now(),
  constraint daily_site_visits_pkey primary key (visit_date, session_id)
);

create index if not exists daily_site_visits_visit_date_idx
  on public.daily_site_visits (visit_date);

alter table public.daily_site_visits enable row level security;

revoke all on table public.daily_site_visits from anon, authenticated;
grant all on table public.daily_site_visits to service_role;
