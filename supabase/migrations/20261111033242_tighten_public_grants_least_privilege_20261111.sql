-- Applied to Supabase project gtuycqunlihegsbvvsol on 2026-11-11.
-- RLS does not protect TRUNCATE, so browser roles must not receive broad table privileges.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Restore only the operations required by the current website access model.
GRANT SELECT, INSERT, UPDATE ON TABLE public.api_keys TO authenticated;
GRANT SELECT ON TABLE public.api_usage TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.contact_submissions TO authenticated;
GRANT SELECT ON TABLE public.subscription_plans TO anon, authenticated;
GRANT SELECT ON TABLE public.feature_entitlements TO authenticated;
GRANT SELECT ON TABLE public.payment_transactions TO authenticated;
GRANT SELECT ON TABLE public.user_subscriptions TO authenticated;

-- Browser clients do not need direct sequence or function privileges.
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Stop future objects created by the postgres migration owner from inheriting broad browser grants.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
