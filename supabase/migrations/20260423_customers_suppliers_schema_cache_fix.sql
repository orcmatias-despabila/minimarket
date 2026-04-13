create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  tax_id text not null,
  tax_id_normalized text generated always as (
    upper(regexp_replace(tax_id, '[^0-9A-Za-z]', '', 'g'))
  ) stored,
  legal_name text not null,
  business_line text,
  address_line_1 text,
  district text,
  city text,
  phone text,
  email text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users (id) on delete set null,
  updated_by_user_id uuid references auth.users (id) on delete set null,
  constraint customers_status_check check (status in ('active', 'inactive')),
  constraint customers_tax_id_not_blank check (btrim(tax_id) <> ''),
  constraint customers_legal_name_not_blank check (btrim(legal_name) <> '')
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  tax_id text not null,
  tax_id_normalized text generated always as (
    upper(regexp_replace(tax_id, '[^0-9A-Za-z]', '', 'g'))
  ) stored,
  legal_name text not null,
  business_line text,
  address_line_1 text,
  district text,
  city text,
  phone text,
  email text,
  contact_name text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users (id) on delete set null,
  updated_by_user_id uuid references auth.users (id) on delete set null,
  constraint suppliers_status_check check (status in ('active', 'inactive')),
  constraint suppliers_tax_id_not_blank check (btrim(tax_id) <> ''),
  constraint suppliers_legal_name_not_blank check (btrim(legal_name) <> '')
);

create unique index if not exists idx_customers_business_tax_id_unique
  on public.customers (business_id, tax_id_normalized);
create index if not exists idx_customers_business_id
  on public.customers (business_id);
create index if not exists idx_customers_business_legal_name
  on public.customers (business_id, legal_name);

create unique index if not exists idx_suppliers_business_tax_id_unique
  on public.suppliers (business_id, tax_id_normalized);
create index if not exists idx_suppliers_business_id
  on public.suppliers (business_id);
create index if not exists idx_suppliers_business_legal_name
  on public.suppliers (business_id, legal_name);

alter table if exists public.customers enable row level security;
alter table if exists public.suppliers enable row level security;

grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.suppliers to authenticated;

notify pgrst, 'reload schema';
