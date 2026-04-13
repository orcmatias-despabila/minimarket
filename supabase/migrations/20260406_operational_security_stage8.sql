create table if not exists public.sales (
  id text primary key,
  business_id uuid references public.businesses (id) on delete cascade,
  created_by_user_id uuid references auth.users (id) on delete set null,
  document_number text,
  status text not null default 'paid',
  payment_method text not null,
  subtotal numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  tax_total numeric(12, 2) not null default 0,
  grand_total numeric(12, 2) not null default 0,
  received_amount numeric(12, 2) not null default 0,
  change_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id text primary key,
  sale_id text not null references public.sales (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  product_id text not null,
  product_name text not null,
  unit_measure text not null,
  quantity numeric(12, 3) not null,
  unit_price numeric(12, 2) not null,
  cost_price numeric(12, 2) not null default 0,
  subtotal numeric(12, 2) not null default 0
);

create table if not exists public.inventory_movements (
  id text primary key,
  business_id uuid references public.businesses (id) on delete cascade,
  created_by_user_id uuid references auth.users (id) on delete set null,
  product_id text not null,
  product_name text not null,
  type text not null,
  quantity numeric(12, 3) not null,
  reason text not null,
  associated_cost numeric(12, 2),
  created_at timestamptz not null default now()
);

create table if not exists public.cash_sessions (
  id text primary key,
  business_id uuid references public.businesses (id) on delete cascade,
  business_date date not null,
  opened_at timestamptz not null default now(),
  opened_by_user_id uuid references auth.users (id) on delete set null,
  opening_amount numeric(12, 2) not null default 0,
  status text not null default 'open',
  closed_at timestamptz,
  closed_by_user_id uuid references auth.users (id) on delete set null,
  actual_cash_counted numeric(12, 2)
);

alter table if exists public.sales
  add column if not exists business_id uuid references public.businesses (id) on delete cascade,
  add column if not exists created_by_user_id uuid references auth.users (id) on delete set null,
  add column if not exists document_number text,
  add column if not exists status text not null default 'paid',
  add column if not exists payment_method text,
  add column if not exists subtotal numeric(12, 2) not null default 0,
  add column if not exists discount_total numeric(12, 2) not null default 0,
  add column if not exists tax_total numeric(12, 2) not null default 0,
  add column if not exists grand_total numeric(12, 2) not null default 0,
  add column if not exists received_amount numeric(12, 2) not null default 0,
  add column if not exists change_amount numeric(12, 2) not null default 0,
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.sale_items
  add column if not exists business_id uuid references public.businesses (id) on delete cascade,
  add column if not exists product_id text,
  add column if not exists product_name text,
  add column if not exists unit_measure text,
  add column if not exists quantity numeric(12, 3) not null default 0,
  add column if not exists unit_price numeric(12, 2) not null default 0,
  add column if not exists cost_price numeric(12, 2) not null default 0,
  add column if not exists subtotal numeric(12, 2) not null default 0;

alter table if exists public.inventory_movements
  add column if not exists business_id uuid references public.businesses (id) on delete cascade,
  add column if not exists created_by_user_id uuid references auth.users (id) on delete set null,
  add column if not exists product_id text,
  add column if not exists product_name text,
  add column if not exists type text,
  add column if not exists quantity numeric(12, 3) not null default 0,
  add column if not exists reason text not null default '',
  add column if not exists associated_cost numeric(12, 2),
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.cash_sessions
  add column if not exists business_id uuid references public.businesses (id) on delete cascade,
  add column if not exists business_date date not null default current_date,
  add column if not exists opened_at timestamptz not null default now(),
  add column if not exists opened_by_user_id uuid references auth.users (id) on delete set null,
  add column if not exists opening_amount numeric(12, 2) not null default 0,
  add column if not exists status text not null default 'open',
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by_user_id uuid references auth.users (id) on delete set null,
  add column if not exists actual_cash_counted numeric(12, 2);

create index if not exists idx_sales_business_created_at
  on public.sales (business_id, created_at desc);
create index if not exists idx_sales_created_by_user_id
  on public.sales (created_by_user_id);
create index if not exists idx_sale_items_business_sale_id
  on public.sale_items (business_id, sale_id);
create index if not exists idx_inventory_movements_business_created_at
  on public.inventory_movements (business_id, created_at desc);
create index if not exists idx_inventory_movements_product_id
  on public.inventory_movements (product_id);
create index if not exists idx_cash_sessions_business_opened_at
  on public.cash_sessions (business_id, opened_at desc);

alter table if exists public.sales
  drop constraint if exists sales_status_check;
alter table if exists public.sales
  add constraint sales_status_check check (status in ('draft', 'paid', 'cancelled'));

alter table if exists public.sales
  drop constraint if exists sales_payment_method_check;
alter table if exists public.sales
  add constraint sales_payment_method_check
  check (payment_method in ('cash', 'debit', 'credit', 'transfer'));

alter table if exists public.inventory_movements
  drop constraint if exists inventory_movements_type_check;
alter table if exists public.inventory_movements
  add constraint inventory_movements_type_check
  check (type in ('stock_in', 'manual_adjustment', 'waste', 'sale_output'));

alter table if exists public.cash_sessions
  drop constraint if exists cash_sessions_status_check;
alter table if exists public.cash_sessions
  add constraint cash_sessions_status_check check (status in ('open', 'closed'));

with inferred_sales as (
  select
    si.sale_id,
    (array_agg(p.business_id order by p.business_id))[1] as business_id
  from public.sale_items si
  join public.products p on p.id = si.product_id
  where p.business_id is not null
  group by si.sale_id
)
update public.sales s
set business_id = inferred_sales.business_id
from inferred_sales
where s.id = inferred_sales.sale_id
  and s.business_id is null;

update public.sale_items si
set business_id = coalesce(s.business_id, p.business_id)
from public.sales s, public.products p
where si.sale_id = s.id
  and p.id = si.product_id
  and si.business_id is null
  and coalesce(s.business_id, p.business_id) is not null;

update public.inventory_movements im
set business_id = p.business_id
from public.products p
where im.product_id = p.id
  and im.business_id is null
  and p.business_id is not null;

with single_business as (
  select (array_agg(id order by id))[1] as business_id
  from public.businesses
  having count(*) = 1
)
update public.cash_sessions cs
set business_id = sb.business_id
from single_business sb
where cs.business_id is null;

alter table if exists public.sales enable row level security;
alter table if exists public.sale_items enable row level security;
alter table if exists public.inventory_movements enable row level security;
alter table if exists public.cash_sessions enable row level security;

drop policy if exists sales_select_business_members on public.sales;
create policy sales_select_business_members
on public.sales for select
to authenticated
using (
  business_id is not null
  and (
    public.has_business_permission(business_id, 'sales:read')
    or public.has_business_permission(business_id, 'cash:open')
    or public.has_business_permission(business_id, 'cash:close')
    or public.has_business_permission(business_id, 'reports:read')
  )
);

drop policy if exists sales_insert_cashiers_or_admins on public.sales;
create policy sales_insert_cashiers_or_admins
on public.sales for insert
to authenticated
with check (
  business_id is not null
  and created_by_user_id = auth.uid()
  and public.has_business_permission(business_id, 'sales:create')
);

drop policy if exists sale_items_select_business_members on public.sale_items;
create policy sale_items_select_business_members
on public.sale_items for select
to authenticated
using (
  business_id is not null
  and (
    public.has_business_permission(business_id, 'sales:read')
    or public.has_business_permission(business_id, 'reports:read')
    or public.has_business_permission(business_id, 'cash:open')
    or public.has_business_permission(business_id, 'cash:close')
  )
);

drop policy if exists sale_items_insert_cashiers_or_admins on public.sale_items;
create policy sale_items_insert_cashiers_or_admins
on public.sale_items for insert
to authenticated
with check (
  business_id is not null
  and public.has_business_permission(business_id, 'sales:create')
);

drop policy if exists inventory_movements_select_allowed_roles on public.inventory_movements;
create policy inventory_movements_select_allowed_roles
on public.inventory_movements for select
to authenticated
using (
  business_id is not null
  and (
    public.has_business_permission(business_id, 'inventory:read')
    or public.has_business_permission(business_id, 'reports:read')
    or public.has_business_permission(business_id, 'users:manage')
  )
);

drop policy if exists inventory_movements_insert_allowed_roles on public.inventory_movements;
create policy inventory_movements_insert_allowed_roles
on public.inventory_movements for insert
to authenticated
with check (
  business_id is not null
  and created_by_user_id = auth.uid()
  and (
    public.has_business_permission(business_id, 'inventory:write')
    or public.has_business_permission(business_id, 'sales:create')
  )
);

drop policy if exists cash_sessions_select_allowed_roles on public.cash_sessions;
create policy cash_sessions_select_allowed_roles
on public.cash_sessions for select
to authenticated
using (
  business_id is not null
  and (
    public.has_business_permission(business_id, 'cash:open')
    or public.has_business_permission(business_id, 'cash:close')
    or public.has_business_permission(business_id, 'reports:read')
    or public.has_business_permission(business_id, 'users:manage')
  )
);

drop policy if exists cash_sessions_insert_allowed_roles on public.cash_sessions;
create policy cash_sessions_insert_allowed_roles
on public.cash_sessions for insert
to authenticated
with check (
  business_id is not null
  and opened_by_user_id = auth.uid()
  and public.has_business_permission(business_id, 'cash:open')
);

drop policy if exists cash_sessions_update_allowed_roles on public.cash_sessions;
create policy cash_sessions_update_allowed_roles
on public.cash_sessions for update
to authenticated
using (
  business_id is not null
  and public.has_business_permission(business_id, 'cash:close')
)
with check (
  business_id is not null
  and closed_by_user_id = auth.uid()
  and public.has_business_permission(business_id, 'cash:close')
);
