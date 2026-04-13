create extension if not exists btree_gist;

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
  constraint caf_files_document_type_check
    check (document_type in ('boleta', 'factura', 'nota_credito', 'boleta_compra', 'factura_compra')),
  constraint caf_files_range_check
    check (
      folio_start > 0
      and folio_end >= folio_start
      and current_folio >= folio_start
      and current_folio <= folio_end + 1
    ),
  constraint caf_files_caf_xml_not_blank
    check (btrim(caf_xml) <> ''),
  constraint caf_files_private_key_not_blank
    check (btrim(private_key) <> '')
);

create index if not exists idx_caf_files_business_document_type
  on public.caf_files (business_id, document_type, created_at desc);

create index if not exists idx_caf_files_business_current_folio
  on public.caf_files (business_id, document_type, current_folio);

alter table public.caf_files
  add constraint caf_files_no_overlapping_ranges
  exclude using gist (
    business_id with =,
    document_type with =,
    int8range(folio_start, folio_end, '[]') with &&
  );

alter table if exists public.caf_files enable row level security;

drop policy if exists caf_files_select_business_managers on public.caf_files;
create policy caf_files_select_business_managers
on public.caf_files for select
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists caf_files_insert_business_managers on public.caf_files;
create policy caf_files_insert_business_managers
on public.caf_files for insert
to authenticated
with check (
  public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists caf_files_update_business_managers on public.caf_files;
create policy caf_files_update_business_managers
on public.caf_files for update
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
)
with check (
  public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists caf_files_delete_business_managers on public.caf_files;
create policy caf_files_delete_business_managers
on public.caf_files for delete
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
);

alter table public.business_documents
  add column if not exists caf_file_id uuid references public.caf_files (id) on delete set null;

create index if not exists idx_business_documents_caf_file_id
  on public.business_documents (caf_file_id);

create or replace function public.assign_or_validate_business_document_caf_folio()
returns trigger
language plpgsql
as $$
declare
  v_caf public.caf_files%rowtype;
  v_requested_folio bigint;
  v_duplicate_document_id uuid;
  v_nil_uuid constant uuid := '00000000-0000-0000-0000-000000000000'::uuid;
begin
  if new.direction <> 'emitted' or new.sii_dte_code is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and new.business_id = old.business_id
    and new.direction = old.direction
    and new.document_type = old.document_type
    and coalesce(new.sii_dte_code, -1) = coalesce(old.sii_dte_code, -1)
    and coalesce(new.folio, '') = coalesce(old.folio, '')
    and coalesce(new.caf_file_id, v_nil_uuid) = coalesce(old.caf_file_id, v_nil_uuid) then
    return new;
  end if;

  if new.folio is null or btrim(new.folio) = '' then
    if new.caf_file_id is not null then
      select *
        into v_caf
      from public.caf_files
      where id = new.caf_file_id
      for update;
    else
      select *
        into v_caf
      from public.caf_files
      where business_id = new.business_id
        and document_type = new.document_type
        and current_folio <= folio_end
      order by folio_start asc, created_at asc
      limit 1
      for update;
    end if;

    if v_caf.id is null then
      raise exception using
        errcode = '23514',
        message = 'No authorized CAF is available to assign a folio for this DTE.',
        detail = format(
          'business_id=%s, document_type=%s, sii_dte_code=%s',
          new.business_id,
          new.document_type,
          new.sii_dte_code
        );
    end if;

    if v_caf.business_id <> new.business_id then
      raise exception using
        errcode = '23514',
        message = 'CAF does not belong to the same business as the DTE.',
        detail = format(
          'document business_id=%s, caf business_id=%s, caf_file_id=%s',
          new.business_id,
          v_caf.business_id,
          v_caf.id
        );
    end if;

    if v_caf.document_type <> new.document_type then
      raise exception using
        errcode = '23514',
        message = 'CAF document type does not match the DTE document type.',
        detail = format(
          'document_type=%s, caf document_type=%s, caf_file_id=%s',
          new.document_type,
          v_caf.document_type,
          v_caf.id
        );
    end if;

    if v_caf.current_folio < v_caf.folio_start or v_caf.current_folio > v_caf.folio_end then
      raise exception using
        errcode = '23514',
        message = 'CAF folio range is exhausted or invalid for automatic folio assignment.',
        detail = format(
          'caf_file_id=%s, folio_start=%s, folio_end=%s, current_folio=%s',
          v_caf.id,
          v_caf.folio_start,
          v_caf.folio_end,
          v_caf.current_folio
        );
    end if;

    v_requested_folio := v_caf.current_folio;
    new.folio := v_requested_folio::text;
    new.caf_file_id := v_caf.id;

    update public.caf_files
    set current_folio = v_requested_folio + 1
    where id = v_caf.id;
  else
    v_requested_folio := public.try_parse_bigint(new.folio);

    if v_requested_folio is null then
      raise exception using
        errcode = '23514',
        message = 'DTE folio must be numeric when using CAF authorization.',
        detail = format('folio=%s', new.folio);
    end if;

    if new.caf_file_id is not null then
      select *
        into v_caf
      from public.caf_files
      where id = new.caf_file_id
      for update;
    else
      select *
        into v_caf
      from public.caf_files
      where business_id = new.business_id
        and document_type = new.document_type
        and v_requested_folio between folio_start and folio_end
      order by folio_start asc, created_at asc
      limit 1
      for update;
    end if;

    if v_caf.id is null then
      raise exception using
        errcode = '23514',
        message = 'The provided folio is not covered by an authorized CAF for this DTE.',
        detail = format(
          'business_id=%s, document_type=%s, folio=%s',
          new.business_id,
          new.document_type,
          v_requested_folio
        );
    end if;

    if v_caf.business_id <> new.business_id then
      raise exception using
        errcode = '23514',
        message = 'CAF does not belong to the same business as the DTE.',
        detail = format(
          'document business_id=%s, caf business_id=%s, caf_file_id=%s',
          new.business_id,
          v_caf.business_id,
          v_caf.id
        );
    end if;

    if v_caf.document_type <> new.document_type then
      raise exception using
        errcode = '23514',
        message = 'CAF document type does not match the DTE document type.',
        detail = format(
          'document_type=%s, caf document_type=%s, caf_file_id=%s',
          new.document_type,
          v_caf.document_type,
          v_caf.id
        );
    end if;

    if tg_op = 'INSERT' and v_requested_folio < v_caf.current_folio then
      raise exception using
        errcode = '23514',
        message = 'The provided folio is behind the current CAF folio cursor.',
        detail = format(
          'caf_file_id=%s, requested_folio=%s, current_folio=%s',
          v_caf.id,
          v_requested_folio,
          v_caf.current_folio
        );
    end if;

    new.caf_file_id := v_caf.id;

    if v_requested_folio >= v_caf.current_folio then
      update public.caf_files
      set current_folio = v_requested_folio + 1
      where id = v_caf.id;
    end if;
  end if;

  select d.id
    into v_duplicate_document_id
  from public.business_documents d
  where d.business_id = new.business_id
    and d.direction = new.direction
    and d.document_type = new.document_type
    and d.folio = new.folio
    and (tg_op = 'INSERT' or d.id <> new.id)
  limit 1;

  if v_duplicate_document_id is not null then
    raise exception using
      errcode = '23505',
      message = 'A DTE with the same folio already exists for this business and document type.',
      detail = format(
        'business_id=%s, direction=%s, document_type=%s, folio=%s, existing_document_id=%s',
        new.business_id,
        new.direction,
        new.document_type,
        new.folio,
        v_duplicate_document_id
      );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_business_documents_assign_caf_folio on public.business_documents;
create trigger trg_business_documents_assign_caf_folio
before insert or update on public.business_documents
for each row
execute function public.assign_or_validate_business_document_caf_folio();

comment on table public.caf_files is
'Archivos CAF por negocio y tipo documental. Base para asignacion controlada de folios autorizados por el SII.';

comment on column public.caf_files.current_folio is
'Siguiente folio disponible dentro del rango CAF. Puede quedar en folio_end + 1 cuando el CAF se agota.';

comment on column public.caf_files.private_key is
'Llave privada asociada al CAF. TODO: mover a almacenamiento cifrado o gestionado antes de operar DTE en produccion.';

comment on column public.business_documents.caf_file_id is
'CAF utilizado para validar o asignar automaticamente el folio del DTE emitido.';

comment on function public.assign_or_validate_business_document_caf_folio() is
'Asigna o valida folios usando CAF para documentos emitidos con sii_dte_code, asegurando rango autorizado y evitando duplicados.';
