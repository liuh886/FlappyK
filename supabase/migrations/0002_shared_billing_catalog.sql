-- Shared billing catalog for Hao Apps.
-- One Supabase Auth user and Stripe customer can hold independent or bundled
-- subscriptions across FlappyK, Ownly, RhythmCoach, NewsFlow and AlphaEngine.

create table if not exists public.billing_products (
  product_code text primary key,
  name text not null,
  stripe_product_id text not null unique,
  app_url text not null,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_prices (
  price_id text primary key,
  product_code text not null references public.billing_products(product_code) on delete cascade,
  currency text not null check (char_length(currency) = 3),
  unit_amount integer not null check (unit_amount >= 0),
  recurring_interval text not null check (recurring_interval in ('day', 'week', 'month', 'year')),
  active boolean not null default true,
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_prices_one_default_per_product_idx
  on public.billing_prices (product_code)
  where is_default and active;

create table if not exists public.billing_product_entitlements (
  product_code text not null references public.billing_products(product_code) on delete cascade,
  entitlement_code text not null,
  created_at timestamptz not null default now(),
  primary key (product_code, entitlement_code)
);

create table if not exists public.entitlement_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_code text not null,
  source text not null,
  source_ref text not null,
  active boolean not null default false,
  valid_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement_code, source, source_ref)
);

create index if not exists entitlement_grants_user_active_idx
  on public.entitlement_grants (user_id, active, valid_until);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text
);

alter table public.subscriptions
  add column if not exists livemode boolean not null default false,
  add column if not exists stripe_product_id text,
  add column if not exists ended_at timestamptz;

create or replace function public.refresh_effective_entitlements(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.entitlements (
    user_id,
    entitlement_code,
    active,
    valid_until,
    source,
    source_ref,
    created_at,
    updated_at
  )
  select
    g.user_id,
    g.entitlement_code,
    bool_or(g.active and (g.valid_until is null or g.valid_until > now())) as active,
    case
      when bool_or(g.active and g.valid_until is null) then null
      else max(g.valid_until) filter (where g.active and g.valid_until > now())
    end as valid_until,
    'aggregate',
    null,
    now(),
    now()
  from public.entitlement_grants g
  where g.user_id = p_user_id
  group by g.user_id, g.entitlement_code
  on conflict (user_id, entitlement_code) do update
  set active = excluded.active,
      valid_until = excluded.valid_until,
      source = 'aggregate',
      source_ref = null,
      updated_at = now();

  update public.entitlements e
  set active = false,
      valid_until = null,
      source = 'aggregate',
      source_ref = null,
      updated_at = now()
  where e.user_id = p_user_id
    and not exists (
      select 1
      from public.entitlement_grants g
      where g.user_id = e.user_id
        and g.entitlement_code = e.entitlement_code
        and g.active
        and (g.valid_until is null or g.valid_until > now())
    );
end;
$$;

revoke all on function public.refresh_effective_entitlements(uuid) from public, anon, authenticated;
grant execute on function public.refresh_effective_entitlements(uuid) to service_role;

alter table public.billing_products enable row level security;
alter table public.billing_prices enable row level security;
alter table public.billing_product_entitlements enable row level security;
alter table public.entitlement_grants enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "Public reads active billing products" on public.billing_products;
create policy "Public reads active billing products"
  on public.billing_products for select
  to anon, authenticated
  using (active);

drop policy if exists "Public reads active billing prices" on public.billing_prices;
create policy "Public reads active billing prices"
  on public.billing_prices for select
  to anon, authenticated
  using (active);

drop policy if exists "Public reads active product entitlements" on public.billing_product_entitlements;
create policy "Public reads active product entitlements"
  on public.billing_product_entitlements for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.billing_products p
      where p.product_code = billing_product_entitlements.product_code
        and p.active
    )
  );

revoke all on public.billing_products from anon, authenticated;
revoke all on public.billing_prices from anon, authenticated;
revoke all on public.billing_product_entitlements from anon, authenticated;
revoke all on public.entitlement_grants from anon, authenticated;
revoke all on public.stripe_webhook_events from anon, authenticated;

grant select on public.billing_products to anon, authenticated;
grant select on public.billing_prices to anon, authenticated;
grant select on public.billing_product_entitlements to anon, authenticated;

insert into public.billing_products (product_code, name, stripe_product_id, app_url, active, metadata)
values
  ('flappyk', 'FlappyK Pro', 'prod_V18PnyUIj0M3E6', 'https://liuh886.github.io/FlappyK/', true, '{"membership_version":1}'::jsonb),
  ('ownly', 'Ownly Pro', 'prod_V18PBJrgntbCDI', 'https://liuh886.github.io/ownly/app/', true, '{"membership_version":1,"local_first":true}'::jsonb),
  ('rhythmcoach', 'RhythmCoach Pro', 'prod_V18PqsWC6OjGrn', 'https://liuh886.github.io/RhythmCoach/', true, '{"membership_version":1,"local_audio":true}'::jsonb),
  ('newsflow', 'NewsFlow Pro', 'prod_V18PhocvN8anmj', 'https://liuh886.github.io/NewsFlow/', true, '{"membership_version":1}'::jsonb),
  ('alpha_engine', 'AlphaEngine Pro', 'prod_V18QTPRr95Oyxl', 'https://liuh886.github.io/alpha_engine/', true, '{"membership_version":1,"research_only":true}'::jsonb)
on conflict (product_code) do update
set name = excluded.name,
    stripe_product_id = excluded.stripe_product_id,
    app_url = excluded.app_url,
    active = excluded.active,
    metadata = excluded.metadata,
    updated_at = now();

insert into public.billing_prices (price_id, product_code, currency, unit_amount, recurring_interval, active, is_default)
values
  ('price_1U168tRdfGz8HSmGzVdWZnu3', 'flappyk', 'usd', 100, 'month', true, true),
  ('price_1U168zRdfGz8HSmGZZ22c353', 'ownly', 'usd', 100, 'month', true, true),
  ('price_1U1694RdfGz8HSmGrisd1OZs', 'rhythmcoach', 'usd', 100, 'month', true, true),
  ('price_1U1698RdfGz8HSmGtafHGHIi', 'newsflow', 'usd', 100, 'month', true, true),
  ('price_1U169FRdfGz8HSmG4DtXgxZc', 'alpha_engine', 'usd', 100, 'month', true, true)
on conflict (price_id) do update
set product_code = excluded.product_code,
    currency = excluded.currency,
    unit_amount = excluded.unit_amount,
    recurring_interval = excluded.recurring_interval,
    active = excluded.active,
    is_default = excluded.is_default,
    updated_at = now();

insert into public.billing_product_entitlements (product_code, entitlement_code)
values
  ('flappyk', 'flappyk.pro'),
  ('ownly', 'ownly.pro'),
  ('rhythmcoach', 'rhythmcoach.pro'),
  ('rhythmcoach', 'rhythmcoach.recording_download'),
  ('newsflow', 'newsflow.pro'),
  ('alpha_engine', 'alpha_engine.pro')
on conflict do nothing;
