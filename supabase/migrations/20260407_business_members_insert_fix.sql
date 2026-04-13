alter table if exists public.business_members enable row level security;

drop policy if exists business_members_insert_owner_admin on public.business_members;
create policy business_members_insert_owner_admin
on public.business_members for insert
to authenticated
with check (
  profile_id = auth.uid()
  or public.can_manage_business(business_id)
);
