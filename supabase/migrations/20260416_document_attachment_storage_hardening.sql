create or replace function public.try_parse_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;

  return value::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function public.document_attachment_storage_business_id(object_name text)
returns uuid
language plpgsql
stable
as $$
declare
  parts text[];
  business_uuid uuid;
  document_uuid uuid;
  attachment_uuid uuid;
begin
  parts := storage.foldername(object_name);

  if coalesce(array_length(parts, 1), 0) <> 5 then
    return null;
  end if;

  if parts[1] <> 'businesses' or parts[3] <> 'documents' then
    return null;
  end if;

  business_uuid := public.try_parse_uuid(parts[2]);
  document_uuid := public.try_parse_uuid(parts[4]);
  attachment_uuid := public.try_parse_uuid(parts[5]);

  if business_uuid is null or document_uuid is null or attachment_uuid is null then
    return null;
  end if;

  return business_uuid;
end;
$$;

drop policy if exists business_document_attachments_storage_select on storage.objects;
create policy business_document_attachments_storage_select
on storage.objects for select
to authenticated
using (
  bucket_id = 'business-document-attachments'
  and public.document_attachment_storage_business_id(name) is not null
  and (
    public.has_business_permission(public.document_attachment_storage_business_id(name), 'users:manage')
    or public.has_business_permission(public.document_attachment_storage_business_id(name), 'reports:read')
  )
);

drop policy if exists business_document_attachments_storage_insert on storage.objects;
create policy business_document_attachments_storage_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'business-document-attachments'
  and public.document_attachment_storage_business_id(name) is not null
  and public.has_business_permission(public.document_attachment_storage_business_id(name), 'users:manage')
);

drop policy if exists business_document_attachments_storage_update on storage.objects;
create policy business_document_attachments_storage_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'business-document-attachments'
  and public.document_attachment_storage_business_id(name) is not null
  and public.has_business_permission(public.document_attachment_storage_business_id(name), 'users:manage')
)
with check (
  bucket_id = 'business-document-attachments'
  and public.document_attachment_storage_business_id(name) is not null
  and public.has_business_permission(public.document_attachment_storage_business_id(name), 'users:manage')
);

drop policy if exists business_document_attachments_storage_delete on storage.objects;
create policy business_document_attachments_storage_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'business-document-attachments'
  and public.document_attachment_storage_business_id(name) is not null
  and public.has_business_permission(public.document_attachment_storage_business_id(name), 'users:manage')
);

comment on function public.try_parse_uuid(text) is
'Helper defensivo para evitar casts inseguros a uuid en policies y funciones.';

comment on function public.document_attachment_storage_business_id(text) is
'Extrae business_id desde una ruta Storage valida. Convencion requerida: businesses/<business_id>/documents/<document_id>/<attachment_id>/<file_name>. Devuelve null si la ruta es invalida.';
