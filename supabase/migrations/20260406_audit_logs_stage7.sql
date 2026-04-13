alter table if exists public.business_memberships
  add column if not exists visible_code text;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_membership_id uuid references public.business_memberships (id) on delete set null,
  actor_role text,
  actor_visible_code text,
  entity_name text not null,
  entity_id text not null,
  entity_label text,
  action text not null,
  action_type text,
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_business_id on public.audit_logs (business_id, created_at desc);
create index if not exists idx_business_memberships_visible_code on public.business_memberships (business_id, visible_code);

create or replace function public.next_membership_visible_code(target_business_id uuid, role_name text)
returns text
language plpgsql
as $$
declare
  prefix text;
  next_number integer;
begin
  prefix := case role_name
    when 'owner' then 'OWN'
    when 'admin' then 'ADM'
    when 'cashier' then 'CAJ'
    when 'inventory' then 'INV'
    else 'USR'
  end;

  select coalesce(count(*), 0) + 1
    into next_number
  from public.business_memberships
  where business_id = target_business_id
    and role = role_name;

  return prefix || '-' || lpad(next_number::text, 3, '0');
end;
$$;

alter table if exists public.audit_logs enable row level security;

drop policy if exists audit_logs_select_reports_or_managers on public.audit_logs;
create policy audit_logs_select_reports_or_managers
on public.audit_logs for select
to authenticated
using (
  public.has_business_permission(business_id, 'reports:read')
  or public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists audit_logs_insert_members on public.audit_logs;
create policy audit_logs_insert_members
on public.audit_logs for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and (
    public.has_business_permission(business_id, 'sales:create')
    or public.has_business_permission(business_id, 'inventory:write')
    or public.has_business_permission(business_id, 'products:write')
    or public.has_business_permission(business_id, 'users:manage')
  )
);
