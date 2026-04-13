create table if not exists public.business_document_lines (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.business_documents (id) on delete cascade,
  line_number integer not null,
  product_id text references public.products (id) on delete set null,
  sku text,
  barcode text,
  description text not null,
  quantity numeric(14, 3) not null default 1,
  unit_price numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  tax_rate numeric(6, 3),
  line_net_amount numeric(14, 2) not null default 0,
  line_tax_amount numeric(14, 2) not null default 0,
  line_total_amount numeric(14, 2) not null default 0,
  unit_label text,
  created_at timestamptz not null default now(),
  constraint business_document_lines_line_number_check
    check (line_number > 0),
  constraint business_document_lines_description_not_blank
    check (btrim(description) <> ''),
  constraint business_document_lines_quantity_check
    check (quantity > 0),
  constraint business_document_lines_unit_price_check
    check (unit_price >= 0),
  constraint business_document_lines_discount_amount_check
    check (discount_amount >= 0),
  constraint business_document_lines_tax_rate_check
    check (tax_rate is null or tax_rate >= 0),
  constraint business_document_lines_amounts_check
    check (
      line_net_amount >= 0
      and line_tax_amount >= 0
      and line_total_amount >= 0
    )
);

create unique index if not exists idx_business_document_lines_document_line_unique
  on public.business_document_lines (document_id, line_number);

create index if not exists idx_business_document_lines_document_id
  on public.business_document_lines (document_id);

create index if not exists idx_business_document_lines_product_id
  on public.business_document_lines (product_id);

alter table if exists public.business_document_lines enable row level security;

drop policy if exists business_document_lines_select_admin_or_reports on public.business_document_lines;
create policy business_document_lines_select_admin_or_reports
on public.business_document_lines for select
to authenticated
using (
  exists (
    select 1
    from public.business_documents d
    where d.id = business_document_lines.document_id
      and (
        public.has_business_permission(d.business_id, 'users:manage')
        or public.has_business_permission(d.business_id, 'reports:read')
      )
  )
);

drop policy if exists business_document_lines_insert_admin_only on public.business_document_lines;
create policy business_document_lines_insert_admin_only
on public.business_document_lines for insert
to authenticated
with check (
  exists (
    select 1
    from public.business_documents d
    where d.id = business_document_lines.document_id
      and public.has_business_permission(d.business_id, 'users:manage')
  )
);

drop policy if exists business_document_lines_update_admin_only on public.business_document_lines;
create policy business_document_lines_update_admin_only
on public.business_document_lines for update
to authenticated
using (
  exists (
    select 1
    from public.business_documents d
    where d.id = business_document_lines.document_id
      and public.has_business_permission(d.business_id, 'users:manage')
  )
)
with check (
  exists (
    select 1
    from public.business_documents d
    where d.id = business_document_lines.document_id
      and public.has_business_permission(d.business_id, 'users:manage')
  )
);

drop policy if exists business_document_lines_delete_admin_only on public.business_document_lines;
create policy business_document_lines_delete_admin_only
on public.business_document_lines for delete
to authenticated
using (
  exists (
    select 1
    from public.business_documents d
    where d.id = business_document_lines.document_id
      and public.has_business_permission(d.business_id, 'users:manage')
  )
);

comment on table public.business_document_lines is
'Detalle de lineas por documento comercial. Soporta productos del catalogo o lineas libres para carga manual/importada.';

comment on column public.business_document_lines.product_id is
'Referencia opcional al producto del sistema. Puede quedar nula para lineas libres.';
