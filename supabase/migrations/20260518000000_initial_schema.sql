-- Cherry MVP — initial schema, RLS, storage, auth hooks

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type public.pricing_type as enum ('fixed', 'quote_only');
create type public.estimate_status as enum ('estimate', 'in_production', 'ready');
create type public.fulfillment_type as enum ('delivery', 'pickup');

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'en' check (locale in ('en', 'pt-BR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Business branding / settings (one row per owner)
create table public.business_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  business_name text,
  logo_path text,
  primary_color text default '#b91c1c',
  secondary_color text default '#1f2937',
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_user_id_idx on public.customers (user_id);
create index customers_name_idx on public.customers (user_id, name);

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  pricing_type public.pricing_type not null default 'quote_only',
  base_price numeric(12, 2),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_base_price_check check (
    pricing_type = 'quote_only' or base_price is not null
  )
);

create index products_user_id_idx on public.products (user_id);

-- Product option groups (e.g. Size, Flavor)
create table public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index product_option_groups_product_idx on public.product_option_groups (product_id);

-- Product options within a group
create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid not null references public.product_option_groups (id) on delete cascade,
  label text not null,
  price_delta numeric(12, 2) default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index product_options_group_idx on public.product_options (group_id);

-- Estimates / quotes
create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  status public.estimate_status not null default 'estimate',
  event_date date not null,
  guest_count int,
  party_occasion text,
  delivery_address text,
  fulfillment_type public.fulfillment_type,
  notes text,
  accepted_at timestamptz,
  deposit_received boolean not null default false,
  balance_paid boolean not null default false,
  payment_method_notes text,
  subtotal numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index estimates_user_id_idx on public.estimates (user_id);
create index estimates_customer_id_idx on public.estimates (customer_id);
create index estimates_status_idx on public.estimates (user_id, status);
create index estimates_event_date_idx on public.estimates (user_id, event_date);

-- Estimate line items
create table public.estimate_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  selected_options jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index estimate_lines_estimate_idx on public.estimate_lines (estimate_id);

-- Status history (optional audit)
create table public.estimate_status_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  status public.estimate_status not null,
  changed_at timestamptz not null default now()
);

create index estimate_status_history_estimate_idx on public.estimate_status_history (estimate_id);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger business_settings_updated_at before update on public.business_settings
  for each row execute function public.set_updated_at();

create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create trigger estimates_updated_at before update on public.estimates
  for each row execute function public.set_updated_at();

-- New user: profile + business_settings
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'en'
  );

  insert into public.business_settings (user_id, business_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'business_name', 'My Bakery')
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.business_settings enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.product_option_groups enable row level security;
alter table public.product_options enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_lines enable row level security;
alter table public.estimate_status_history enable row level security;

-- Profiles
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Business settings
create policy "Users manage own business_settings" on public.business_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Customers
create policy "Users manage own customers" on public.customers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Products
create policy "Users manage own products" on public.products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Product option groups
create policy "Users manage own product_option_groups" on public.product_option_groups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Product options
create policy "Users manage own product_options" on public.product_options
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Estimates
create policy "Users manage own estimates" on public.estimates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Estimate lines
create policy "Users manage own estimate_lines" on public.estimate_lines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Estimate status history
create policy "Users manage own estimate_status_history" on public.estimate_status_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket for branding logos
insert into storage.buckets (id, name, public)
values ('branding', 'branding', false)
on conflict (id) do nothing;

create policy "Users upload own branding files"
  on storage.objects for insert
  with check (
    bucket_id = 'branding'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own branding files"
  on storage.objects for select
  using (
    bucket_id = 'branding'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own branding files"
  on storage.objects for update
  using (
    bucket_id = 'branding'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own branding files"
  on storage.objects for delete
  using (
    bucket_id = 'branding'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
