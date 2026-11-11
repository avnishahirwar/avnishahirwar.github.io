-- Keep the legacy direct-table dashboard safe during the staged frontend rollout.
-- New customers cannot self-assign elevated scopes, RPM limits or grandfathered access.
create or replace function public.guard_customer_api_key_mutations()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $$
declare
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
begin
  if auth.role() = 'service_role' or v_role = 'admin' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is null or new.owner_id is distinct from auth.uid() then
      raise exception 'API keys can only be created for the signed-in owner.';
    end if;
    new.rate_limit_per_minute := 60;
    new.scopes := array['calculators:read'];
    new.legacy_access := false;
    return new;
  end if;

  if new.owner_id is distinct from old.owner_id
    or new.key_hash is distinct from old.key_hash
    or new.key_prefix is distinct from old.key_prefix
    or new.scopes is distinct from old.scopes
    or new.rate_limit_per_minute is distinct from old.rate_limit_per_minute
    or new.legacy_access is distinct from old.legacy_access
    or new.expires_at is distinct from old.expires_at
    or new.created_at is distinct from old.created_at
    or new.last_used_at is distinct from old.last_used_at then
    raise exception 'API key security fields can only be changed by an administrator.';
  end if;

  if old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at then
    raise exception 'A revoked API key cannot be reactivated.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_customer_api_key_mutations on public.api_keys;
create trigger guard_customer_api_key_mutations
before insert or update on public.api_keys
for each row execute function public.guard_customer_api_key_mutations();

revoke all on function public.guard_customer_api_key_mutations() from public, anon, authenticated;
