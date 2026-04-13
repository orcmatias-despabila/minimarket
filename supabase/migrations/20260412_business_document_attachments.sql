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
  constraint business_document_attachments_storage_bucket_not_blank
    check (btrim(storage_bucket) <> ''),
  constraint business_document_attachments_storage_path_not_blank
    check (btrim(storage_path) <> ''),
  constraint business_document_attachments_file_name_not_blank
    check (btrim(file_name) <> ''),
  constraint business_document_attachments_mime_type_not_blank
    check (btrim(mime_type) <> ''),
  constraint business_document_attachments_file_size_check
    check (file_size >= 0)
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

insert into storage.buckets (id, name, public)
values ('business-document-attachments', 'business-document-attachments', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists business_document_attachments_storage_select on storage.objects;
create policy business_document_attachments_storage_select
on storage.objects for select
to authenticated
using (
  bucket_id = 'business-document-attachments'
  and (storage.foldername(name))[1] = 'businesses'
  and array_length(storage.foldername(name), 1) >= 2
  and (
    public.has_business_permission(((storage.foldername(name))[2])::uuid, 'users:manage')
    or public.has_business_permission(((storage.foldername(name))[2])::uuid, 'reports:read')
  )
);

drop policy if exists business_document_attachments_storage_insert on storage.objects;
create policy business_document_attachments_storage_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'business-document-attachments'
  and (storage.foldername(name))[1] = 'businesses'
  and array_length(storage.foldername(name), 1) >= 2
  and public.has_business_permission(((storage.foldername(name))[2])::uuid, 'users:manage')
);

drop policy if exists business_document_attachments_storage_update on storage.objects;
create policy business_document_attachments_storage_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'business-document-attachments'
  and (storage.foldername(name))[1] = 'businesses'
  and array_length(storage.foldername(name), 1) >= 2
  and public.has_business_permission(((storage.foldername(name))[2])::uuid, 'users:manage')
)
with check (
  bucket_id = 'business-document-attachments'
  and (storage.foldername(name))[1] = 'businesses'
  and array_length(storage.foldername(name), 1) >= 2
  and public.has_business_permission(((storage.foldername(name))[2])::uuid, 'users:manage')
);

drop policy if exists business_document_attachments_storage_delete on storage.objects;
create policy business_document_attachments_storage_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'business-document-attachments'
  and (storage.foldername(name))[1] = 'businesses'
  and array_length(storage.foldername(name), 1) >= 2
  and public.has_business_permission(((storage.foldername(name))[2])::uuid, 'users:manage')
);

comment on table public.business_document_attachments is
'Metadatos de adjuntos asociados a documentos comerciales. El archivo real vive en Supabase Storage.';

comment on column public.business_document_attachments.storage_path is
'Ruta interna del archivo en Storage. Convencion recomendada: businesses/<business_id>/documents/<document_id>/<attachment_id>/<file_name>.';

comment on policy business_document_attachments_storage_select on storage.objects is
'Bucket privado por defecto. TODO: revisar permisos finos por modulo documental si se separan de users:manage y reports:read.';
