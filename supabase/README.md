# Supabase database migrations

This repository began tracking the database security-hardening migration on 2026-11-11.

- `20261111033242_tighten_public_grants_least_privilege_20261111.sql` is already applied to the connected Supabase project.
- `20261111033843_consolidate_api_dashboard_rls_policies_20261111.sql` is already applied to the connected Supabase project.
- `20261111040104_customer_api_quota_management.sql` adds the API access-control table, usage timing, and atomic monthly-quota / per-key rate-limit reservation. It is already applied to the connected Supabase project.
- `20261111041600_grandfather_existing_api_keys.sql` preserves pre-existing keys without rotating secrets while new keys remain plan-gated. It is already applied to the connected Supabase project.
- `20261111041800_guard_customer_api_key_mutations.sql` protects legacy direct-table clients during the frontend rollout: customers cannot set their own elevated scopes, RPM limits or grandfathered access. It is already applied to the connected Supabase project.
- `20261111042000_revoke_direct_api_table_access.sql` removes browser-role access to API key hashes and usage rows now that all customer/admin screens use the authenticated Edge Function. It is already applied to the connected Supabase project.
- Earlier migrations are recorded in the hosted project's migration history, but their SQL files were not present in this repository when this directory was created.

**Important:** restore the earlier migration files before using `supabase db push` or treating this folder as a complete local migration history. Do not reset or recreate the hosted database from this partial directory.
