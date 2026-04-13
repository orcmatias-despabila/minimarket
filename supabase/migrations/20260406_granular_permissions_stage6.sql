alter table if exists public.business_memberships
  add column if not exists permissions text[];

create or replace function public.default_role_permissions(role_name text)
returns text[]
language sql
stable
as $$
  select case role_name
    when 'owner' then array[
      'can_sell','can_add_stock','can_create_products',
      'can_edit_products','can_view_reports','can_manage_users'
    ]
    when 'admin' then array[
      'can_sell','can_add_stock','can_create_products',
      'can_edit_products','can_view_reports','can_manage_users'
    ]
    when 'cashier' then array['can_sell']
    when 'inventory' then array['can_add_stock','can_create_products','can_edit_products']
    else array[]::text[]
  end
$$;

create or replace function public.resolved_membership_permissions(target_business_id uuid)
returns text[]
language sql
stable
as $$
  select
    case
      when public.get_business_role(target_business_id) = 'owner' then public.default_role_permissions('owner')
      else coalesce(
        (
          select bm.permissions
          from public.business_memberships bm
          where bm.business_id = target_business_id
            and bm.user_id = auth.uid()
          limit 1
        ),
        public.default_role_permissions(public.get_business_role(target_business_id))
      )
    end
$$;

create or replace function public.has_business_permission(target_business_id uuid, permission_name text)
returns boolean
language sql
stable
as $$
  select case
    when public.get_business_role(target_business_id) = 'owner' then true
    when permission_name = 'sales:create' then 'can_sell' = any(public.resolved_membership_permissions(target_business_id))
    when permission_name = 'sales:read' then 'can_sell' = any(public.resolved_membership_permissions(target_business_id))
    when permission_name = 'cash:open' then 'can_sell' = any(public.resolved_membership_permissions(target_business_id))
    when permission_name = 'cash:close' then 'can_sell' = any(public.resolved_membership_permissions(target_business_id))
    when permission_name = 'products:read' then public.resolved_membership_permissions(target_business_id) && array['can_sell','can_add_stock','can_create_products','can_edit_products']
    when permission_name = 'products:write' then public.resolved_membership_permissions(target_business_id) && array['can_create_products','can_edit_products']
    when permission_name = 'inventory:read' then public.resolved_membership_permissions(target_business_id) && array['can_add_stock','can_create_products','can_edit_products']
    when permission_name = 'inventory:write' then public.resolved_membership_permissions(target_business_id) && array['can_add_stock','can_edit_products']
    when permission_name = 'reports:read' then 'can_view_reports' = any(public.resolved_membership_permissions(target_business_id))
    when permission_name = 'users:manage' then 'can_manage_users' = any(public.resolved_membership_permissions(target_business_id))
    when permission_name = 'exports:run' then 'can_view_reports' = any(public.resolved_membership_permissions(target_business_id))
    else false
  end
$$;
