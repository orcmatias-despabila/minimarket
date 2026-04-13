-- Stage 9A: Safe schema reconciliation for missing backoffice tables.
-- Additive only. No destructive changes.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on table public.business_memberships is
'Legacy membership table kept for compatibility. Canonical membership model should converge on public.business_members after data reconciliation.';

create table if not exists public.business_document_attachments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.business_documents (id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null,
  uploaded_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint business_document_attachments_storage_bucket_not_blank check (btrim(storage_bucket) <> ''),
  constraint business_document_attachments_storage_path_not_blank check (btrim(storage_path) <> ''),
  constraint business_document_attachments_file_name_not_blank check (btrim(file_name) <> ''),
  constraint business_document_attachments_mime_type_not_blank check (btrim(mime_type) <> ''),
  constraint business_document_attachments_file_size_check check (file_size >= 0)
);

create unique index if not exists idx_business_document_attachments_storage_unique
  on public.business_document_attachments (storage_bucket, storage_path);
create index if not exists idx_business_document_attachments_document_id
  on public.business_document_attachments (document_id);
create index if not exists idx_business_document_attachments_uploaded_by
  on public.business_document_attachments (uploaded_by_user_id);

alter table if exists public.business_document_attachments enable row level security;

drop policy if exists business_document_attachments_select_admin_or_reports on public.business_document_attachments;
create policy business_document_attachments_select_admin_or_reports
on public.business_document_attachments for select
to authenticated
using (
  exists (
    select 1
    from public.business_documents d
    where d.id = business_document_attachments.document_id
      and (
        public.has_business_permission(d.business_id, 'users:manage')
        or public.has_business_permission(d.business_id, 'reports:read')
      )
  )
);

drop policy if exists business_document_attachments_insert_admin_only on public.business_document_attachments;
create policy business_document_attachments_insert_admin_only
on public.business_document_attachments for insert
to authenticated
with check (
  (uploaded_by_user_id is null or uploaded_by_user_id = auth.uid())
  and exists (
    select 1
    from public.business_documents d
    where d.id = business_document_attachments.document_id
      and public.has_business_permission(d.business_id, 'users:manage')
  )
);

drop policy if exists business_document_attachments_delete_admin_only on public.business_document_attachments;
create policy business_document_attachments_delete_admin_only
on public.business_document_attachments for delete
to authenticated
using (
  exists (
    select 1
    from public.business_documents d
    where d.id = business_document_attachments.document_id
      and public.has_business_permission(d.business_id, 'users:manage')
  )
);

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
  constraint business_document_sii_submissions_environment_check check (environment in ('mock', 'certification', 'production')),
  constraint business_document_sii_submissions_provider_mode_check check (provider_mode in ('mock', 'real')),
  constraint business_document_sii_submissions_status_check check (submission_status in ('pending', 'sent', 'accepted', 'rejected')),
  constraint business_document_sii_submissions_request_xml_not_blank check (btrim(request_xml) <> '')
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
  constraint business_received_dte_inbox_status_check check (reception_status in ('received', 'accepted', 'claimed')),
  constraint business_received_dte_inbox_source_channel_check check (source_channel in ('manual', 'email', 'imported', 'sii')),
  constraint business_received_dte_inbox_document_type_check check (
    document_type is null
    or document_type in ('factura', 'factura_compra', 'nota_credito', 'boleta', 'boleta_compra', 'other')
  ),
  constraint business_received_dte_inbox_raw_xml_not_blank check (btrim(raw_xml) <> '')
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

create table if not exists public.business_entity_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action_type text not null,
  previous_data jsonb,
  new_data jsonb,
  actor_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint business_entity_events_entity_type_check check (
    entity_type in ('document', 'document_line', 'document_reference', 'document_attachment', 'customer', 'supplier', 'other')
  ),
  constraint business_entity_events_action_type_check check (
    action_type in ('created', 'updated', 'status_changed', 'deleted', 'attachment_uploaded', 'attachment_deleted', 'other')
  )
);

create index if not exists idx_business_entity_events_business_created_at
  on public.business_entity_events (business_id, created_at desc);
create index if not exists idx_business_entity_events_entity_lookup
  on public.business_entity_events (entity_type, entity_id, created_at desc);
create index if not exists idx_business_entity_events_actor_user_id
  on public.business_entity_events (actor_user_id);

alter table if exists public.business_entity_events enable row level security;

drop policy if exists business_entity_events_select_admin_or_reports on public.business_entity_events;
create policy business_entity_events_select_admin_or_reports
on public.business_entity_events for select
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
  or public.has_business_permission(business_id, 'reports:read')
);

drop policy if exists business_entity_events_insert_admin_only on public.business_entity_events;
create policy business_entity_events_insert_admin_only
on public.business_entity_events for insert
to authenticated
with check (
  public.has_business_permission(business_id, 'users:manage')
  and (actor_user_id is null or actor_user_id = auth.uid())
);

create or replace function public.try_parse_bigint(value text)
returns bigint
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;
  if btrim(value) ~ '^[0-9]+$' then
    return btrim(value)::bigint;
  end if;
  return null;
end;
$$;

create table if not exists public.caf_files (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  document_type text not null,
  folio_start bigint not null,
  folio_end bigint not null,
  current_folio bigint not null,
  caf_xml text not null,
  private_key text not null,
  created_at timestamptz not null default now(),
  constraint caf_files_document_type_check check (document_type in ('boleta', 'factura', 'nota_credito', 'boleta_compra', 'factura_compra')),
  constraint caf_files_range_check check (
    folio_start > 0 and folio_end >= folio_start and current_folio >= folio_start and current_folio <= folio_end + 1
  ),
  constraint caf_files_caf_xml_not_blank check (btrim(caf_xml) <> ''),
  constraint caf_files_private_key_not_blank check (btrim(private_key) <> '')
);

create index if not exists idx_caf_files_business_document_type
  on public.caf_files (business_id, document_type, created_at desc);
create index if not exists idx_caf_files_business_current_folio
  on public.caf_files (business_id, document_type, current_folio);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'caf_files_no_overlapping_ranges') then
    alter table public.caf_files
      add constraint caf_files_no_overlapping_ranges
      exclude using gist (
        business_id with =,
        document_type with =,
        int8range(folio_start, folio_end, '[]') with &&
      );
  end if;
end
$$;

alter table if exists public.caf_files enable row level security;

drop policy if exists caf_files_select_business_managers on public.caf_files;
create policy caf_files_select_business_managers
on public.caf_files for select
to authenticated
using (public.has_business_permission(business_id, 'users:manage'));

drop policy if exists caf_files_insert_business_managers on public.caf_files;
create policy caf_files_insert_business_managers
on public.caf_files for insert
to authenticated
with check (public.has_business_permission(business_id, 'users:manage'));

drop policy if exists caf_files_update_business_managers on public.caf_files;
create policy caf_files_update_business_managers
on public.caf_files for update
to authenticated
using (public.has_business_permission(business_id, 'users:manage'))
with check (public.has_business_permission(business_id, 'users:manage'));

drop policy if exists caf_files_delete_business_managers on public.caf_files;
create policy caf_files_delete_business_managers
on public.caf_files for delete
to authenticated
using (public.has_business_permission(business_id, 'users:manage'));

alter table public.business_documents
  add column if not exists caf_file_id uuid references public.caf_files (id) on delete set null;

create index if not exists idx_business_documents_caf_file_id
  on public.business_documents (caf_file_id);

notify pgrst, 'reload schema';
