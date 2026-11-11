# Supabase database migrations

This repository began tracking the database security-hardening migration on 2026-11-11.

- `20261111033242_tighten_public_grants_least_privilege_20261111.sql` is already applied to the connected Supabase project.
- `20261111033843_consolidate_api_dashboard_rls_policies_20261111.sql` is already applied to the connected Supabase project.
- Earlier migrations are recorded in the hosted project's migration history, but their SQL files were not present in this repository when this directory was created.

**Important:** restore the earlier migration files before using `supabase db push` or treating this folder as a complete local migration history. Do not reset or recreate the hosted database from this partial directory.
