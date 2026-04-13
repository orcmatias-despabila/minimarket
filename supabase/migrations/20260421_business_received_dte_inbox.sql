create table if not exists public.business_received_dte_inbox (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  document_id uuid references public.business_documents (id) on delete set null,
  reception_status text not null default 'received',
  source_channel text not null default 'manual',
  raw_xml text not null,
  issuer_tax_id text,
  issuer_tax_id_normalized text generated always as (
    case
      when issuer_tax_id is null or btrim(issuer_tax_id) = '' then null
      else upper(regexp_replace(issuer_tax_id, '[^0-9A-Za-z]', '', 'g'))
    end
  ) stored,
  issuer_legal_name text,
  issuer_business_line text,
  issuer_address text,
  issuer_district text,
  issuer_city text,
  sii_dte_code integer,
  document_type text,
  folio text,
  issue_date date,
  net_amount numeric(14, 2),
  tax_amount numeric(14, 2),
  exempt_amount numeric(14, 2),
  total_amount numeric(14, 2),
  parsed_payload jsonb,
  received_at timestamptz not null default now(),
  responded_at timestamptz,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_received_dte_inbox_status_check
    check (reception_status in ('received', 'accepted', 'claimed')),
  constraint business_received_dte_inbox_source_channel_check
    check (source_channel in ('manual', 'email', 'imported', 'sii')),
  constraint business_received_dte_inbox_document_type_check
    check (
      document_type is null
      or document_type in ('factura', 'factura_compra', 'nota_credito', 'boleta', 'boleta_compra', 'other')
    ),
  constraint business_received_dte_inbox_raw_xml_not_blank
    check (btrim(raw_xml) <> '')
);

create index if not exists idx_business_received_dte_inbox_business_status
  on public.business_received_dte_inbox (business_id, reception_status, received_at desc);

create index if not exists idx_business_received_dte_inbox_business_supplier
  on public.business_received_dte_inbox (business_id, supplier_id);

create index if not exists idx_business_received_dte_inbox_business_issuer_tax_id
  on public.business_received_dte_inbox (business_id, issuer_tax_id_normalized);

create index if not exists idx_business_received_dte_inbox_document
  on public.business_received_dte_inbox (document_id);

drop trigger if exists trg_business_received_dte_inbox_set_updated_at on public.business_received_dte_inbox;
create trigger trg_business_received_dte_inbox_set_updated_at
before update on public.business_received_dte_inbox
for each row
execute function public.set_updated_at();

alter table if exists public.business_received_dte_inbox enable row level security;

drop policy if exists business_received_dte_inbox_select_admin_or_reports on public.business_received_dte_inbox;
create policy business_received_dte_inbox_select_admin_or_reports
on public.business_received_dte_inbox for select
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
  or public.has_business_permission(business_id, 'reports:read')
);

drop policy if exists business_received_dte_inbox_insert_admin_only on public.business_received_dte_inbox;
create policy business_received_dte_inbox_insert_admin_only
on public.business_received_dte_inbox for insert
to authenticated
with check (
  public.has_business_permission(business_id, 'users:manage')
  and (created_by_user_id is null or created_by_user_id = auth.uid())
);

drop policy if exists business_received_dte_inbox_update_admin_only on public.business_received_dte_inbox;
create policy business_received_dte_inbox_update_admin_only
on public.business_received_dte_inbox for update
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
)
with check (
  public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists business_received_dte_inbox_delete_admin_only on public.business_received_dte_inbox;
create policy business_received_dte_inbox_delete_admin_only
on public.business_received_dte_inbox for delete
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
);

comment on table public.business_received_dte_inbox is
'Bandeja base de DTE recibidos desde proveedores. Guarda XML crudo, datos parseados, asociacion a proveedor y estado administrativo de recepcion.';

comment on column public.business_received_dte_inbox.document_id is
'Documento comercial interno asociado cuando el DTE recibido ya fue incorporado a business_documents.';

comment on column public.business_received_dte_inbox.parsed_payload is
'Payload parseado desde el XML recibido para trazabilidad y futura integracion con procesos SII.';
