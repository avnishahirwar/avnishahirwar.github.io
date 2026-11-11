update public.subscription_plans
set api_credits_per_cycle = 50,
    features = jsonb_set(coalesce(features, '{}'::jsonb), '{api_access}', 'true'::jsonb, true),
    updated_at = now()
where code = 'free';
