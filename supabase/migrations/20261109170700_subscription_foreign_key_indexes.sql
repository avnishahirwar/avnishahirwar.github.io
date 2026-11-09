-- Cover foreign keys used by subscription joins and deletes.
create index if not exists user_subscriptions_plan_code_idx on public.user_subscriptions(plan_code);
create index if not exists payment_transactions_subscription_id_idx on public.payment_transactions(subscription_id);
create index if not exists feature_entitlements_source_subscription_id_idx on public.feature_entitlements(source_subscription_id);
