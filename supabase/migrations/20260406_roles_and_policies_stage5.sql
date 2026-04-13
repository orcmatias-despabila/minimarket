alter table if exists public.business_memberships
  drop constraint if exists business_memberships_role_check;

alter table if exists public.business_memberships
  add constraint business_memberships_role_check
  check (role in ('owner', 'admin', 'cashier', 'inventory'));

alter table if exists public.business_invitations
  drop constraint if exists business_invitations_role_check;

alter table if exists public.business_invitations
  add constraint business_invitations_role_check
  check (role in ('owner', 'admin', 'cashier', 'inventory'));

create or replace function public.get_business_role(target_business_id uuid)
returns text
language sql
stable
as $$
  select
    case
      when exists (
        select 1
        from public.businesses b
        where b.id = target_business_id
          and b.owner_user_id = auth.uid()
      ) then 'owner'
      else (
        select bm.role
        from public.business_memberships bm
        where bm.business_id = target_business_id
          and bm.user_id = auth.uid()
        limit 1
      )
    end
$$;

create or replace function public.has_business_permission(target_business_id uuid, permission_name text)
returns boolean
language sql
stable
as $$
  select case public.get_business_role(target_business_id)
    when 'owner' then true
    when 'admin' then permission_name in (
      'sales:create','sales:read','inventory:read','inventory:write',
      'products:read','products:write','reports:read','cash:open','cash:close','users:manage'
    )
    when 'cashier' then permission_name in ('sales:create','sales:read','products:read','cash:open','cash:close')
    when 'inventory' then permission_name in ('inventory:read','inventory:write','products:read','products:write')
    else false
  end
$$;

alter table if exists public.businesses enable row level security;
alter table if exists public.business_memberships enable row level security;
alter table if exists public.business_invitations enable row level security;
alter table if exists public.products enable row level security;

drop policy if exists businesses_select_member on public.businesses;
create policy businesses_select_member
on public.businesses for select
to authenticated
using (
  owner_user_id = auth.uid()
  or exists (
    select 1 from public.business_memberships bm
    where bm.business_id = businesses.id and bm.user_id = auth.uid()
  )
);

drop policy if exists business_memberships_select_allowed on public.business_memberships;
create policy business_memberships_select_allowed
on public.business_memberships for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists business_memberships_insert_owner_or_admin on public.business_memberships;
create policy business_memberships_insert_owner_or_admin
on public.business_memberships for insert
to authenticated
with check (
  public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists business_memberships_update_owner_or_admin on public.business_memberships;
create policy business_memberships_update_owner_or_admin
on public.business_memberships for update
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
)
with check (
  public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists business_invitations_select_allowed on public.business_invitations;
create policy business_invitations_select_allowed
on public.business_invitations for select
to authenticated
using (
  lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists business_invitations_insert_owner_or_admin on public.business_invitations;
create policy business_invitations_insert_owner_or_admin
on public.business_invitations for insert
to authenticated
with check (
  public.has_business_permission(business_id, 'users:manage')
);

drop policy if exists business_invitations_update_owner_or_admin_or_self on public.business_invitations;
create policy business_invitations_update_owner_or_admin_or_self
on public.business_invitations for update
to authenticated
using (
  public.has_business_permission(business_id, 'users:manage')
  or lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
)
with check (
  public.has_business_permission(business_id, 'users:manage')
  or lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
);

drop policy if exists products_select_business_members on public.products;
create policy products_select_business_members
on public.products for select
to authenticated
using (
  business_id is not null
  and (
    public.has_business_permission(business_id, 'products:read')
    or public.has_business_permission(business_id, 'inventory:read')
    or public.has_business_permission(business_id, 'sales:create')
  )
);

drop policy if exists products_insert_allowed_roles on public.products;
create policy products_insert_allowed_roles
on public.products for insert
to authenticated
with check (
  business_id is not null
  and (
    public.has_business_permission(business_id, 'products:write')
    or public.has_business_permission(business_id, 'inventory:write')
  )
);

drop policy if exists products_update_allowed_roles on public.products;
create policy products_update_allowed_roles
on public.products for update
to authenticated
using (
  business_id is not null
  and (
    public.has_business_permission(business_id, 'products:write')
    or public.has_business_permission(business_id, 'inventory:write')
  )
)
with check (
  business_id is not null
  and (
    public.has_business_permission(business_id, 'products:write')
    or public.has_business_permission(business_id, 'inventory:write')
  )
);
