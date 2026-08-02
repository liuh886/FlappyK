-- Shared membership foundation for FlappyK and RhythmCoach.
-- Apply this migration to one Supabase project and reuse the same Auth users.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  best_excess numeric,
  runs_completed integer not null default 0 check (runs_completed >= 0),
  markets_beaten integer not null default 0 check (markets_beaten >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null default 'flappyk',
  local_signature text not null,
  mode text not null default 'normal',
  total_return_pct numeric not null,
  total_excess_pct numeric not null,
  games jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, local_signature)
);

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'stripe',
  customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'stripe',
  product_code text not null,
  customer_id text not null,
  price_id text,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_code text not null,
  active boolean not null default false,
  valid_until timestamptz,
  source text not null default 'stripe',
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement_code)
);

create index if not exists game_runs_user_completed_idx
  on public.game_runs (user_id, completed_at desc);
create index if not exists subscriptions_user_product_idx
  on public.subscriptions (user_id, product_code);
create index if not exists entitlements_user_active_idx
  on public.entitlements (user_id, active);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists billing_customers_set_updated_at on public.billing_customers;
create trigger billing_customers_set_updated_at
  before update on public.billing_customers
  for each row execute procedure public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at
  before update on public.entitlements
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.game_runs enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users read own game runs" on public.game_runs;
create policy "Users read own game runs"
  on public.game_runs for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own game runs" on public.game_runs;
create policy "Users insert own game runs"
  on public.game_runs for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users read own billing customer" on public.billing_customers;
create policy "Users read own billing customer"
  on public.billing_customers for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users read own subscriptions" on public.subscriptions;
create policy "Users read own subscriptions"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users read own entitlements" on public.entitlements;
create policy "Users read own entitlements"
  on public.entitlements for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.billing_customers from anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;
revoke all on public.entitlements from anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.game_runs to authenticated;
grant select on public.billing_customers to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.entitlements to authenticated;

comment on table public.game_runs is
  'Personal cloud history only. Browser-submitted runs are not trusted for public rankings.';
comment on table public.entitlements is
  'Trusted feature access written only by service-role payment reconciliation.';
