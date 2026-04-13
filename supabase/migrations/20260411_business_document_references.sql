create table if not exists public.business_document_references (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.business_documents (id) on delete cascade,
  referenced_document_id uuid references public.business_documents (id) on delete set null,
  referenced_document_type text not null,
  referenced_folio text not null,
  referenced_issue_date date,
  reference_reason text not null,
  reference_code text,
  created_at timestamptz not null default now(),
  constraint business_document_references_document_type_check
    check (referenced_document_type in ('boleta', 'factura', 'nota_credito', 'boleta_compra', 'factura_compra', 'other')),
  constraint business_document_references_folio_not_blank
    check (btrim(referenced_folio) <> ''),
  constraint business_document_references_reason_not_blank
    check (btrim(reference_reason) <> ''),
  constraint business_document_references_not_self_check
    check (
      referenced_document_id is null
      or referenced_document_id <> document_id
    )
);

create index if not exists idx_business_document_references_document_id
  on public.business_document_references (document_id);

create index if not exists idx_business_document_references_referenced_document_id
  on public.business_document_references (referenced_document_id);

create index if not exists idx_business_document_references_referenced_folio
  on public.business_document_references (referenced_folio);

alter table if exists public.business_document_references enable row level security;

drop policy if exists business_document_references_select_admin_or_reports on public.business_document_references;
create policy business_document_references_select_admin_or_reports
on public.business_document_references for select
to authenticated
using (
  exists (
    select 1
    from public.business_documents d
    where d.id = business_document_references.document_id
      and (
        public.has_business_permission(d.business_id, 'users:manage')
        or public.has_business_permission(d.business_id, 'reports:read')
      )
  )
);

drop policy if exists business_document_references_insert_admin_only on public.business_document_references;
create policy business_document_references_insert_admin_only
on public.business_document_references for insert
to authenticated
with check (
  exists (
    select 1
    from public.business_documents d
    where d.id = business_document_references.document_id
      and public.has_business_permission(d.business_id, 'users:manage')
  )
);

drop policy if exists business_document_references_update_admin_only on public.business_document_references;
create policy business_document_references_update_admin_only
on public.business_document_references for update
to authenticated
using (
  exists (
    select 1
    from public.business_documents d
    where d.id = business_document_references.document_id
      and public.has_business_permission(d.business_id, 'users:manage')
  )
)
with check (
  exists (
    select 1
    from public.business_documents d
    where d.id = business_document_references.document_id
      and public.has_business_permission(d.business_id, 'users:manage')
  )
);

drop policy if exists business_document_references_delete_admin_only on public.business_document_references;
create policy business_document_references_delete_admin_only
on public.business_document_references for delete
to authenticated
using (
  exists (
    select 1
    from public.business_documents d
    where d.id = business_document_references.document_id
      and public.has_business_permission(d.business_id, 'users:manage')
  )
);

comment on table public.business_document_references is
'Referencias entre documentos comerciales. Permite relacionar notas de credito con documentos previos, ya sea mediante FK interna o solo como referencia informativa.';

comment on column public.business_document_references.referenced_document_id is
'FK opcional al documento referenciado cuando existe dentro del sistema.';

comment on column public.business_document_references.reference_code is
'Codigo opcional de referencia, pensado para futura compatibilidad con reglas DTE/SII.';
