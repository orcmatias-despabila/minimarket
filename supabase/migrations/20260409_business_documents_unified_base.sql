create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.business_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  direction text not null,
  document_type text not null,
  sii_dte_code integer,
  folio text,
  issue_date date not null,
  due_date date,
  customer_id uuid references public.customers (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  counterparty_rut text,
  counterparty_rut_normalized text generated always as (
    case
      when counterparty_rut is null or btrim(counterparty_rut) = '' then null
      else upper(regexp_replace(counterparty_rut, '[^0-9A-Za-z]', '', 'g'))
    end
  ) stored,
  counterparty_name text,
  currency_code text not null default 'CLP',
  net_amount numeric(14, 2) not null default 0,
  tax_amount numeric(14, 2) not null default 0,
  exempt_amount numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  payment_method text,
  status text not null default 'draft',
  notes text,
  source_origin text not null default 'manual',
  created_by_user_id uuid references auth.users (id) on delete set null,
  updated_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_documents_direction_check
    check (direction in ('emitted', 'received')),
  constraint business_documents_document_type_check
    check (document_type in ('boleta', 'factura', 'nota_credito', 'boleta_compra', 'factura_compra', 'other')),
  constraint business_documents_status_check
    check (status in ('draft', 'recorded', 'partially_paid', 'paid', 'cancelled', 'voided')),
  constraint business_documents_source_origin_check
    check (source_origin in ('manual', 'imported', 'generated')),
  constraint business_documents_payment_method_check
    check (
      payment_method is null
      or payment_method in ('cash', 'debit', 'credit', 'transfer', 'other')
    ),
  constraint business_documents_currency_code_check
    check (char_length(currency_code) = 3 and btrim(currency_code) = upper(btrim(currency_code))),
  constraint business_documents_amounts_check
    check (
      net_amount >= 0
      and tax_amount >= 0
      and exempt_amount >= 0
      and total_amount >= 0
    ),
  constraint business_documents_direction_counterparty_check
    check (
      (direction = 'emitted' and supplier_id is null)
      or (direction = 'received' and customer_id is null)
    ),
  constraint business_documents_due_date_check
    check (due_date is null or due_date >= issue_date)
);

create unique index if not exists idx_business_documents_business_direction_type_folio_unique
  on public.business_documents (business_id, direction, document_type, folio)
  where folio is not null and btrim(folio) <> '';

create index if not exists idx_business_documents_business_issue_date
  on public.business_documents (business_id, issue_date desc);
create index if not exists idx_business_documents_business_document_type
  on public.business_documents (business_id, document_type);
create index if not exists idx_business_documents_business_direction
  on public.business_documents (business_id, direction);
create index if not exists idx_business_documents_business_folio
  on public.business_documents (business_id, folio);
create index if not exists idx_business_documents_business_status
  on public.business_documents (business_id, status);
create index if not exists idx_business_documents_business_customer
  on public.business_documents (business_id, customer_id);
create index if not exists idx_business_documents_business_supplier
  on public.business_documents (business_id, supplier_id);
create index if not exists idx_business_documents_business_counterparty_rut
  on public.business_documents (business_id, counterparty_rut_normalized);

drop trigger if exists trg_business_documents_set_updated_at on public.business_documents;
create trigger trg_business_documents_set_updated_at
before update on public.business_documents
for each row
execute function public.set_updated_at();

alter table if exists public.business_documents enable row level security;

drop policy if exists business_documents_select_admin_or_reports on public.business_documents;
create policy business_documents_select_admin_or_reports
on public.business_documents for select
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
  or public.has_business_permission(business_id, 'reports:read')
);

drop policy if exists business_documents_insert_admin_only on public.business_documents;
create policy business_documents_insert_admin_only
on public.business_documents for insert
to authenticated
with check (
  public.has_business_permission(business_id, 'users:manage')
  and (created_by_user_id is null or created_by_user_id = auth.uid())
  and (updated_by_user_id is null or updated_by_user_id = auth.uid())
);

drop policy if exists business_documents_update_admin_only on public.business_documents;
create policy business_documents_update_admin_only
on public.business_documents for update
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
)
with check (
  public.has_business_permission(business_id, 'users:manage')
  and (updated_by_user_id is null or updated_by_user_id = auth.uid())
);

drop policy if exists business_documents_delete_admin_only on public.business_documents;
create policy business_documents_delete_admin_only
on public.business_documents for delete
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
);

comment on table public.business_documents is
'Tabla unificada para documentos comerciales emitidos y recibidos. Base para boletas, facturas y notas de credito, con trazabilidad futura compatible con DTE.';

comment on column public.business_documents.direction is
'Sentido del documento respecto del negocio: emitted o received.';

comment on column public.business_documents.document_type is
'Tipo documental de negocio. Separado de sii_dte_code para permitir evolucion futura sin romper el modelo interno.';

comment on column public.business_documents.counterparty_rut_normalized is
'Valor normalizado del RUT de contraparte para busqueda, conciliacion y reportes.';

comment on policy business_documents_select_admin_or_reports on public.business_documents is
'Acceso inicial de lectura para administracion y reportes. TODO: revisar permisos documentales finos cuando existan modulos separados por accion.';
