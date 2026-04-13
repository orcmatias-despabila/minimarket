-- Stage 9B: new additive shared-model tables for mobile + web.
-- Keeps compatibility with the current operational schema.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses (id) on delete cascade,
  currency_code text not null default 'CLP',
  timezone_name text not null default 'America/Santiago',
  tax_rate numeric(6, 4) not null default 0.19,
  locale_code text not null default 'es-CL',
  receipt_footer text,
  low_stock_alert_enabled boolean not null default true,
  allow_negative_stock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_settings_currency_code_check check (char_length(currency_code) = 3 and btrim(currency_code) = upper(btrim(currency_code))),
  constraint business_settings_tax_rate_check check (tax_rate >= 0 and tax_rate <= 1),
  constraint business_settings_timezone_name_not_blank check (btrim(timezone_name) <> ''),
  constraint business_settings_locale_code_not_blank check (btrim(locale_code) <> '')
);

create index if not exists idx_business_settings_business_id
  on public.business_settings (business_id);

drop trigger if exists trg_business_settings_set_updated_at on public.business_settings;
create trigger trg_business_settings_set_updated_at
before update on public.business_settings
for each row
execute function public.set_updated_at();

alter table if exists public.business_settings enable row level security;

drop policy if exists business_settings_select_members on public.business_settings;
create policy business_settings_select_members
on public.business_settings for select
to authenticated
using (
  public.has_business_permission(business_id, 'reports:read')
  or public.has_business_permission(business_id, 'sales:read')
  or public.has_business_permission(business_id, 'inventory:read')
  or public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists business_settings_mutate_managers on public.business_settings;
create policy business_settings_mutate_managers
on public.business_settings for all
to authenticated
using (public.has_business_permission(business_id, 'users:manage'))
with check (public.has_business_permission(business_id, 'users:manage'));

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_categories_name_not_blank check (btrim(name) <> ''),
  constraint product_categories_slug_not_blank check (btrim(slug) <> '')
);

create unique index if not exists idx_product_categories_business_slug_unique
  on public.product_categories (business_id, slug);
create index if not exists idx_product_categories_business_active
  on public.product_categories (business_id, is_active, name);

drop trigger if exists trg_product_categories_set_updated_at on public.product_categories;
create trigger trg_product_categories_set_updated_at
before update on public.product_categories
for each row
execute function public.set_updated_at();

alter table if exists public.product_categories enable row level security;

drop policy if exists product_categories_select_members on public.product_categories;
create policy product_categories_select_members
on public.product_categories for select
to authenticated
using (
  public.has_business_permission(business_id, 'products:read')
  or public.has_business_permission(business_id, 'inventory:read')
  or public.has_business_permission(business_id, 'sales:create')
  or public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists product_categories_mutate_managers on public.product_categories;
create policy product_categories_mutate_managers
on public.product_categories for all
to authenticated
using (
  public.has_business_permission(business_id, 'products:write')
  or public.has_business_permission(business_id, 'inventory:write')
  or public.has_business_permission(business_id, 'users:manage')
)
with check (
  public.has_business_permission(business_id, 'products:write')
  or public.has_business_permission(business_id, 'inventory:write')
  or public.has_business_permission(business_id, 'users:manage')
);

alter table public.products
  add column if not exists category_id uuid references public.product_categories (id) on delete set null;

create index if not exists idx_products_category_id
  on public.products (category_id);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  code text not null,
  label text not null,
  kind text not null default 'cash',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_methods_code_not_blank check (btrim(code) <> ''),
  constraint payment_methods_label_not_blank check (btrim(label) <> ''),
  constraint payment_methods_kind_check check (kind in ('cash', 'debit', 'credit', 'transfer', 'other'))
);

create unique index if not exists idx_payment_methods_business_code_unique
  on public.payment_methods (business_id, code);
create index if not exists idx_payment_methods_business_active
  on public.payment_methods (business_id, is_active, sort_order, label);

drop trigger if exists trg_payment_methods_set_updated_at on public.payment_methods;
create trigger trg_payment_methods_set_updated_at
before update on public.payment_methods
for each row
execute function public.set_updated_at();

alter table if exists public.payment_methods enable row level security;

drop policy if exists payment_methods_select_members on public.payment_methods;
create policy payment_methods_select_members
on public.payment_methods for select
to authenticated
using (
  public.has_business_permission(business_id, 'sales:read')
  or public.has_business_permission(business_id, 'sales:create')
  or public.has_business_permission(business_id, 'cash:open')
  or public.has_business_permission(business_id, 'cash:close')
  or public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists payment_methods_mutate_managers on public.payment_methods;
create policy payment_methods_mutate_managers
on public.payment_methods for all
to authenticated
using (public.has_business_permission(business_id, 'users:manage'))
with check (public.has_business_permission(business_id, 'users:manage'));

alter table public.sales
  add column if not exists payment_method_id uuid references public.payment_methods (id) on delete set null;

create index if not exists idx_sales_payment_method_id
  on public.sales (payment_method_id);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  cash_session_id text references public.cash_sessions (id) on delete set null,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  movement_type text not null,
  amount numeric(12, 2) not null,
  reference_sale_id text references public.sales (id) on delete set null,
  reason text not null,
  notes text,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint cash_movements_type_check check (movement_type in ('opening', 'sale_income', 'manual_income', 'expense', 'withdrawal', 'closing_adjustment', 'refund')),
  constraint cash_movements_amount_check check (amount >= 0),
  constraint cash_movements_reason_not_blank check (btrim(reason) <> '')
);

create index if not exists idx_cash_movements_business_created_at
  on public.cash_movements (business_id, created_at desc);
create index if not exists idx_cash_movements_session_created_at
  on public.cash_movements (cash_session_id, created_at desc);
create index if not exists idx_cash_movements_sale_id
  on public.cash_movements (reference_sale_id);

alter table if exists public.cash_movements enable row level security;

drop policy if exists cash_movements_select_allowed_roles on public.cash_movements;
create policy cash_movements_select_allowed_roles
on public.cash_movements for select
to authenticated
using (
  public.has_business_permission(business_id, 'cash:open')
  or public.has_business_permission(business_id, 'cash:close')
  or public.has_business_permission(business_id, 'reports:read')
  or public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists cash_movements_insert_allowed_roles on public.cash_movements;
create policy cash_movements_insert_allowed_roles
on public.cash_movements for insert
to authenticated
with check (
  public.has_business_permission(business_id, 'cash:open')
  or public.has_business_permission(business_id, 'cash:close')
  or public.has_business_permission(business_id, 'sales:create')
  or public.has_business_permission(business_id, 'users:manage')
);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_categories_name_not_blank check (btrim(name) <> ''),
  constraint expense_categories_slug_not_blank check (btrim(slug) <> '')
);

create unique index if not exists idx_expense_categories_business_slug_unique
  on public.expense_categories (business_id, slug);
create index if not exists idx_expense_categories_business_active
  on public.expense_categories (business_id, is_active, name);

drop trigger if exists trg_expense_categories_set_updated_at on public.expense_categories;
create trigger trg_expense_categories_set_updated_at
before update on public.expense_categories
for each row
execute function public.set_updated_at();

alter table if exists public.expense_categories enable row level security;

drop policy if exists expense_categories_select_members on public.expense_categories;
create policy expense_categories_select_members
on public.expense_categories for select
to authenticated
using (
  public.has_business_permission(business_id, 'cash:open')
  or public.has_business_permission(business_id, 'cash:close')
  or public.has_business_permission(business_id, 'reports:read')
  or public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists expense_categories_mutate_managers on public.expense_categories;
create policy expense_categories_mutate_managers
on public.expense_categories for all
to authenticated
using (public.has_business_permission(business_id, 'users:manage'))
with check (public.has_business_permission(business_id, 'users:manage'));

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id uuid references public.expense_categories (id) on delete set null,
  cash_session_id text references public.cash_sessions (id) on delete set null,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  document_id uuid references public.business_documents (id) on delete set null,
  amount numeric(12, 2) not null,
  expense_date date not null default current_date,
  title text not null,
  description text,
  status text not null default 'recorded',
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_amount_check check (amount >= 0),
  constraint expenses_title_not_blank check (btrim(title) <> ''),
  constraint expenses_status_check check (status in ('draft', 'recorded', 'cancelled'))
);

create index if not exists idx_expenses_business_date
  on public.expenses (business_id, expense_date desc, created_at desc);
create index if not exists idx_expenses_business_category
  on public.expenses (business_id, category_id);
create index if not exists idx_expenses_cash_session_id
  on public.expenses (cash_session_id);
create index if not exists idx_expenses_supplier_id
  on public.expenses (supplier_id);
create index if not exists idx_expenses_document_id
  on public.expenses (document_id);

drop trigger if exists trg_expenses_set_updated_at on public.expenses;
create trigger trg_expenses_set_updated_at
before update on public.expenses
for each row
execute function public.set_updated_at();

alter table if exists public.expenses enable row level security;

drop policy if exists expenses_select_allowed_roles on public.expenses;
create policy expenses_select_allowed_roles
on public.expenses for select
to authenticated
using (
  public.has_business_permission(business_id, 'cash:open')
  or public.has_business_permission(business_id, 'cash:close')
  or public.has_business_permission(business_id, 'reports:read')
  or public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists expenses_insert_allowed_roles on public.expenses;
create policy expenses_insert_allowed_roles
on public.expenses for insert
to authenticated
with check (
  public.has_business_permission(business_id, 'cash:open')
  or public.has_business_permission(business_id, 'cash:close')
  or public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists expenses_update_allowed_roles on public.expenses;
create policy expenses_update_allowed_roles
on public.expenses for update
to authenticated
using (
  public.has_business_permission(business_id, 'cash:open')
  or public.has_business_permission(business_id, 'cash:close')
  or public.has_business_permission(business_id, 'users:manage')
)
with check (
  public.has_business_permission(business_id, 'cash:open')
  or public.has_business_permission(business_id, 'cash:close')
  or public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists expenses_delete_allowed_roles on public.expenses;
create policy expenses_delete_allowed_roles
on public.expenses for delete
to authenticated
using (public.has_business_permission(business_id, 'users:manage'));

comment on table public.business_settings is
'Configuracion operativa del negocio compartida por la app movil y la web administrativa.';
comment on table public.product_categories is
'Categorias comerciales internas del negocio. Se conserva products.category como legado y category_id como referencia estructurada nueva.';
comment on table public.payment_methods is
'Catalogo de medios de pago habilitados por negocio. sales.payment_method se conserva por compatibilidad y payment_method_id se agrega como referencia estructurada.';
comment on table public.cash_movements is
'Movimientos de caja distintos a la sola apertura/cierre: ingresos manuales, retiros, gastos, devoluciones y ajustes.';
comment on table public.expense_categories is
'Categorias de gasto configurables por negocio para reportes y control de caja.';
comment on table public.expenses is
'Gastos operativos del negocio con opcion de asociar proveedor, documento y sesion de caja.';

-- Deferred on purpose:
-- inventory_stocks, purchases, purchase_items, product_supplier_links and sale_payments.
-- Those additions should wait until the remote product primary key and the current
-- overlap between sales and business_documents are fully reconciled.

notify pgrst, 'reload schema';
