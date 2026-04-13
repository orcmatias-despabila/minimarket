alter table public.business_documents
  add column if not exists dte_status text not null default 'draft',
  add column if not exists dte_xml text null,
  add column if not exists dte_xml_document_id text null,
  add column if not exists dte_last_submission_id uuid null references public.business_document_sii_submissions (id) on delete set null,
  add column if not exists dte_track_id text null,
  add column if not exists dte_generated_at timestamptz null,
  add column if not exists dte_signed_at timestamptz null,
  add column if not exists dte_sent_at timestamptz null,
  add column if not exists dte_responded_at timestamptz null,
  add column if not exists dte_last_error text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_documents_dte_status_check'
  ) then
    alter table public.business_documents
      add constraint business_documents_dte_status_check
      check (dte_status in ('draft', 'xml_generated', 'signed', 'sent', 'accepted', 'rejected', 'failed'));
  end if;
end $$;

create index if not exists idx_business_documents_dte_status
  on public.business_documents (business_id, dte_status, issue_date desc);

create index if not exists idx_business_documents_dte_track_id
  on public.business_documents (dte_track_id)
  where dte_track_id is not null;

comment on column public.business_documents.dte_status is
'Estado tecnico del flujo DTE. Se mantiene separado del estado comercial del documento.';

comment on column public.business_documents.dte_xml is
'Ultimo XML DTE firmado generado para el documento.';

comment on column public.business_documents.dte_last_submission_id is
'Ultimo envio registrado del DTE hacia el SII o mock de integracion.';
