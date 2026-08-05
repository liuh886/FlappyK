revoke all on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "Clients cannot access entitlement grants" on public.entitlement_grants;
create policy "Clients cannot access entitlement grants"
  on public.entitlement_grants
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "Clients cannot access webhook events" on public.stripe_webhook_events;
create policy "Clients cannot access webhook events"
  on public.stripe_webhook_events
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);
