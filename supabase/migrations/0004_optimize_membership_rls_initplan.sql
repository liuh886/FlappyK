drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users read own game runs" on public.game_runs;
create policy "Users read own game runs"
  on public.game_runs for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own game runs" on public.game_runs;
create policy "Users insert own game runs"
  on public.game_runs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users read own billing customer" on public.billing_customers;
create policy "Users read own billing customer"
  on public.billing_customers for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users read own subscriptions" on public.subscriptions;
create policy "Users read own subscriptions"
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users read own entitlements" on public.entitlements;
create policy "Users read own entitlements"
  on public.entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);
