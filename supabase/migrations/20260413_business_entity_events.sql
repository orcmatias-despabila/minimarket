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
  constraint business_entity_events_entity_type_check
    check (
      entity_type in (
        'document',
        'document_line',
        'document_reference',
        'document_attachment',
        'customer',
        'supplier',
        'other'
      )
    ),
  constraint business_entity_events_action_type_check
    check (
      action_type in (
        'created',
        'updated',
        'status_changed',
        'deleted',
        'attachment_uploaded',
        'attachment_deleted',
        'other'
      )
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

comment on table public.business_entity_events is
'Auditoria append-only para el backoffice web. Registra eventos relevantes sobre documentos, clientes, proveedores y adjuntos sin interferir con audit_logs usado por mobile.';

comment on column public.business_entity_events.previous_data is
'Snapshot opcional del estado previo. Recomendado para updates, status_changed y delete.';

comment on column public.business_entity_events.new_data is
'Snapshot opcional del estado nuevo. Recomendado para create, update, status_changed y attachment_uploaded.';

comment on policy business_entity_events_insert_admin_only on public.business_entity_events is
'Insercion restringida a users:manage. TODO: revisar permisos finos si el modulo documental incorpora acciones separadas por rol.';
