create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
create index if not exists idx_customers_created_by_user_id
  on public.customers (created_by_user_id);

create unique index if not exists idx_suppliers_business_tax_id_unique
  on public.suppliers (business_id, tax_id_normalized);
create index if not exists idx_suppliers_business_id
  on public.suppliers (business_id);
create index if not exists idx_suppliers_business_legal_name
  on public.suppliers (business_id, legal_name);
create index if not exists idx_suppliers_created_by_user_id
  on public.suppliers (created_by_user_id);

drop trigger if exists trg_customers_set_updated_at on public.customers;
create trigger trg_customers_set_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

drop trigger if exists trg_suppliers_set_updated_at on public.suppliers;
create trigger trg_suppliers_set_updated_at
before update on public.suppliers
for each row
execute function public.set_updated_at();

alter table if exists public.customers enable row level security;
alter table if exists public.suppliers enable row level security;

drop policy if exists customers_select_business_managers on public.customers;
create policy customers_select_business_managers
on public.customers for select
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists customers_insert_business_managers on public.customers;
create policy customers_insert_business_managers
on public.customers for insert
to authenticated
with check (
  public.has_business_permission(business_id, 'users:manage')
  and (created_by_user_id is null or created_by_user_id = auth.uid())
  and (updated_by_user_id is null or updated_by_user_id = auth.uid())
);

drop policy if exists customers_update_business_managers on public.customers;
create policy customers_update_business_managers
on public.customers for update
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
)
with check (
  public.has_business_permission(business_id, 'users:manage')
  and (updated_by_user_id is null or updated_by_user_id = auth.uid())
);

drop policy if exists customers_delete_business_managers on public.customers;
create policy customers_delete_business_managers
on public.customers for delete
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists suppliers_select_business_managers on public.suppliers;
create policy suppliers_select_business_managers
on public.suppliers for select
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists suppliers_insert_business_managers on public.suppliers;
create policy suppliers_insert_business_managers
on public.suppliers for insert
to authenticated
with check (
  public.has_business_permission(business_id, 'users:manage')
  and (created_by_user_id is null or created_by_user_id = auth.uid())
  and (updated_by_user_id is null or updated_by_user_id = auth.uid())
);

drop policy if exists suppliers_update_business_managers on public.suppliers;
create policy suppliers_update_business_managers
on public.suppliers for update
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
)
with check (
  public.has_business_permission(business_id, 'users:manage')
  and (updated_by_user_id is null or updated_by_user_id = auth.uid())
);

drop policy if exists suppliers_delete_business_managers on public.suppliers;
create policy suppliers_delete_business_managers
on public.suppliers for delete
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
);

comment on table public.customers is
'Base administrativa de clientes para el backoffice web. Preparada para futura relacion con documentos emitidos.';

comment on table public.suppliers is
'Base administrativa de proveedores para el backoffice web. Preparada para futura relacion con documentos recibidos.';

comment on column public.customers.tax_id_normalized is
'Valor normalizado para busqueda y unicidad por negocio.';

comment on column public.suppliers.tax_id_normalized is
'Valor normalizado para busqueda y unicidad por negocio.';

comment on policy customers_select_business_managers on public.customers is
'Acceso inicial restringido a usuarios con users:manage. TODO: revisar permisos documentales finos cuando exista el modulo administrativo completo.';

comment on policy suppliers_select_business_managers on public.suppliers is
'Acceso inicial restringido a usuarios con users:manage. TODO: revisar permisos documentales finos cuando exista el modulo administrativo completo.';
