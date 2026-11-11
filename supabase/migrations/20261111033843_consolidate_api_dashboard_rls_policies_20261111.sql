-- Applied to Supabase project gtuycqunlihegsbvvsol on 2026-11-11.
-- Combine overlapping owner/admin policies without changing the authorization rules.

DROP POLICY IF EXISTS "admins can manage api keys" ON public.api_keys;
DROP POLICY IF EXISTS "users can create own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "users can read own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "users can revoke own api keys" ON public.api_keys;

CREATE POLICY "api keys select own or admin"
ON public.api_keys FOR SELECT TO authenticated
USING (
  ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  OR (SELECT auth.uid()) = owner_id
);

CREATE POLICY "api keys insert own or admin"
ON public.api_keys FOR INSERT TO authenticated
WITH CHECK (
  ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  OR (SELECT auth.uid()) = owner_id
);

CREATE POLICY "api keys update own or admin"
ON public.api_keys FOR UPDATE TO authenticated
USING (
  ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  OR (SELECT auth.uid()) = owner_id
)
WITH CHECK (
  ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  OR (SELECT auth.uid()) = owner_id
);

DROP POLICY IF EXISTS "admins can read api usage" ON public.api_usage;
DROP POLICY IF EXISTS "users can read own api usage" ON public.api_usage;

CREATE POLICY "api usage select own or admin"
ON public.api_usage FOR SELECT TO authenticated
USING (
  ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  OR EXISTS (
    SELECT 1
    FROM public.api_keys k
    WHERE k.id = api_usage.api_key_id
      AND k.owner_id = (SELECT auth.uid())
  )
);
