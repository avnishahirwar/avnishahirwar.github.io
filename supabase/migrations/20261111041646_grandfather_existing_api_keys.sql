-- Preserve pre-existing API keys when the new plan/quota gate is introduced.
-- Existing raw keys and hashes are not rotated or returned.
alter table public.api_keys
  add column if not exists legacy_access boolean not null default false;

-- Only keys that existed before this migration are grandfathered.
update public.api_keys
set legacy_access = true
where legacy_access = false
  and revoked_at is null
  and created_at < timestamptz '2026-11-11 04:16:00+00';

create or replace function public.reserve_api_request(p_api_key_id uuid, p_endpoint text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_owner_id uuid; v_key_rpm integer; v_legacy_access boolean := false;
  v_access public.api_customer_access%rowtype;
  v_entitlement public.feature_entitlements%rowtype; v_plan_code text;
  v_quota integer := 0; v_rpm integer := 60; v_used bigint := 0;
  v_minute_used bigint := 0; v_usage_id bigint;
  v_cycle_start timestamptz := date_trunc('month', now());
  v_cycle_end timestamptz := date_trunc('month', now()) + interval '1 month';
begin
  perform pg_advisory_xact_lock(hashtextextended(p_api_key_id::text, 0));
  select k.owner_id, k.rate_limit_per_minute, k.legacy_access
    into v_owner_id, v_key_rpm, v_legacy_access
  from public.api_keys k where k.id = p_api_key_id and k.revoked_at is null
    and (k.expires_at is null or k.expires_at > now());
  if not found then return jsonb_build_object('allowed', false, 'status', 401, 'error', 'API key is invalid, expired or revoked.'); end if;

  select * into v_access from public.api_customer_access where user_id = v_owner_id;
  if found then
    if not v_access.enabled or (v_access.valid_until is not null and v_access.valid_until <= now()) then
      insert into public.api_usage(api_key_id, endpoint, status_code) values (p_api_key_id, left(coalesce(p_endpoint, 'unknown'), 200), 403);
      return jsonb_build_object('allowed', false, 'status', 403, 'error', 'API access is not enabled for this account. Contact the account administrator.');
    end if;
    v_plan_code := v_access.plan_code; v_quota := v_access.monthly_quota;
    v_rpm := least(v_key_rpm, v_access.rate_limit_per_minute);
  elsif v_legacy_access then
    -- The previous API had per-minute limiting but no monthly quota.
    v_plan_code := 'legacy'; v_quota := 10000000; v_rpm := v_key_rpm;
  else
    select s.plan_code, p.api_credits_per_cycle into v_plan_code, v_quota
    from public.user_subscriptions s join public.subscription_plans p on p.code = s.plan_code
    where s.user_id = v_owner_id and s.status = 'active' and p.active = true
      and coalesce((p.features ->> 'api_access')::boolean, false) = true
      and p.api_credits_per_cycle > 0
      and (s.current_start is null or s.current_start <= now())
      and (s.current_end is null or s.current_end > now())
    order by s.current_start desc nulls last, s.created_at desc limit 1;
    if found then
      v_quota := case when exists (
        select 1 from public.user_subscriptions s join public.subscription_plans p on p.code=s.plan_code
        where s.user_id=v_owner_id and s.status='active' and p.code=v_plan_code and p.billing_interval='yearly'
          and (s.current_end is null or s.current_end>now())
      ) then greatest(1, ceil(v_quota::numeric / 12)::integer) else v_quota end;
      v_rpm := v_key_rpm;
    else
      select * into v_entitlement from public.feature_entitlements
      where user_id = v_owner_id and feature_code = 'api_access' and enabled = true
        and (valid_until is null or valid_until > now());
      if not found or coalesce(v_entitlement.quota, 0) <= 0 then
        insert into public.api_usage(api_key_id, endpoint, status_code) values (p_api_key_id, left(coalesce(p_endpoint, 'unknown'), 200), 403);
        return jsonb_build_object('allowed', false, 'status', 403, 'error', 'API access is not enabled for this account. Contact the account administrator.');
      end if;
      v_plan_code := 'custom'; v_quota := v_entitlement.quota; v_rpm := v_key_rpm;
    end if;
  end if;

  if coalesce(v_quota, 0) <= 0 then
    insert into public.api_usage(api_key_id, endpoint, status_code) values (p_api_key_id, left(coalesce(p_endpoint, 'unknown'), 200), 403);
    return jsonb_build_object('allowed', false, 'status', 403, 'error', 'API access has no active request quota.');
  end if;
  select count(*) into v_used from public.api_usage
    where api_key_id = p_api_key_id and created_at >= v_cycle_start and status_code not in (403, 429);
  if v_used >= v_quota then
    insert into public.api_usage(api_key_id, endpoint, status_code) values (p_api_key_id, left(coalesce(p_endpoint, 'unknown'), 200), 429);
    return jsonb_build_object('allowed', false, 'status', 429, 'error', 'Monthly API quota exceeded.', 'quota', v_quota, 'used', v_used, 'remaining', 0, 'retry_after_seconds', extract(epoch from (v_cycle_end - now()))::integer);
  end if;
  select count(*) into v_minute_used from public.api_usage
    where api_key_id = p_api_key_id and created_at >= now() - interval '1 minute' and status_code not in (403, 429);
  if v_minute_used >= v_rpm then
    insert into public.api_usage(api_key_id, endpoint, status_code) values (p_api_key_id, left(coalesce(p_endpoint, 'unknown'), 200), 429);
    return jsonb_build_object('allowed', false, 'status', 429, 'error', 'Per-minute rate limit exceeded. Try again shortly.', 'rate_limit_per_minute', v_rpm, 'retry_after_seconds', 60);
  end if;
  insert into public.api_usage(api_key_id, endpoint, status_code) values (p_api_key_id, left(coalesce(p_endpoint, 'unknown'), 200), 102) returning id into v_usage_id;
  return jsonb_build_object('allowed', true, 'usage_id', v_usage_id, 'plan_code', v_plan_code, 'quota', v_quota, 'used', v_used + 1, 'remaining', greatest(0, v_quota - v_used - 1), 'rate_limit_per_minute', v_rpm);
end;
$$;
revoke all on function public.reserve_api_request(uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_api_request(uuid, text) to service_role;
