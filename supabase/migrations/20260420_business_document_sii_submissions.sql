create table if not exists public.business_document_sii_submissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  document_id uuid not null references public.business_documents (id) on delete cascade,
  environment text not null default 'mock',
  provider_mode text not null default 'mock',
  submission_status text not null default 'pending',
  request_xml text not null,
  response_payload jsonb,
  sii_track_id text,
  sent_at timestamptz,
  responded_at timestamptz,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_document_sii_submissions_environment_check
    check (environment in ('mock', 'certification', 'production')),
  constraint business_document_sii_submissions_provider_mode_check
    check (provider_mode in ('mock', 'real')),
  constraint business_document_sii_submissions_status_check
    check (submission_status in ('pending', 'sent', 'accepted', 'rejected')),
  constraint business_document_sii_submissions_request_xml_not_blank
    check (btrim(request_xml) <> '')
);

create index if not exists idx_business_document_sii_submissions_business_status
  on public.business_document_sii_submissions (business_id, submission_status, created_at desc);

create index if not exists idx_business_document_sii_submissions_document_created
  on public.business_document_sii_submissions (document_id, created_at desc);

create index if not exists idx_business_document_sii_submissions_track_id
  on public.business_document_sii_submissions (sii_track_id);

drop trigger if exists trg_business_document_sii_submissions_set_updated_at on public.business_document_sii_submissions;
create trigger trg_business_document_sii_submissions_set_updated_at
before update on public.business_document_sii_submissions
for each row
execute function public.set_updated_at();

alter table if exists public.business_document_sii_submissions enable row level security;

drop policy if exists business_document_sii_submissions_select_admin_or_reports on public.business_document_sii_submissions;
create policy business_document_sii_submissions_select_admin_or_reports
on public.business_document_sii_submissions for select
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
  or public.has_business_permission(business_id, 'reports:read')
);

drop policy if exists business_document_sii_submissions_insert_admin_only on public.business_document_sii_submissions;
create policy business_document_sii_submissions_insert_admin_only
on public.business_document_sii_submissions for insert
to authenticated
with check (
  public.has_business_permission(business_id, 'users:manage')
  and (created_by_user_id is null or created_by_user_id = auth.uid())
);

drop policy if exists business_document_sii_submissions_update_admin_only on public.business_document_sii_submissions;
create policy business_document_sii_submissions_update_admin_only
on public.business_document_sii_submissions for update
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
)
with check (
  public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists business_document_sii_submissions_delete_admin_only on public.business_document_sii_submissions;
create policy business_document_sii_submissions_delete_admin_only
on public.business_document_sii_submissions for delete
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
);

comment on table public.business_document_sii_submissions is
'Historial de envios DTE al SII o a un mock compatible. Guarda XML enviado, estado de envio y respuesta recibida para futura integracion real.';

comment on column public.business_document_sii_submissions.environment is
'Ambiente destino del envio DTE: mock, certification o production.';

comment on column public.business_document_sii_submissions.provider_mode is
'Modo de transporte del envio: mock mientras no existan credenciales reales, real cuando se conecte al SII.';

comment on column public.business_document_sii_submissions.response_payload is
'Respuesta normalizada del SII o del mock de integracion, almacenada como JSONB para trazabilidad.';
