-- Browser-facing dashboards now use the authenticated api-management Edge Function.
-- Keep API key hashes and usage history accessible only to trusted backend/service-role code.
revoke all privileges on table public.api_keys from anon, authenticated;
revoke all privileges on table public.api_usage from anon, authenticated;
