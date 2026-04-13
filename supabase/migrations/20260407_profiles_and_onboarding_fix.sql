create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text not null default '',
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_profile();

insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
on conflict (id) do update
set email = excluded.email;

alter table if exists public.profiles enable row level security;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

alter table if exists public.businesses enable row level security;

drop policy if exists businesses_insert_owner on public.businesses;
create policy businesses_insert_owner
on public.businesses for insert
to authenticated
with check (
  owner_user_id = auth.uid()
);

alter table if exists public.business_memberships enable row level security;

drop policy if exists business_memberships_insert_owner_or_admin on public.business_memberships;
create policy business_memberships_insert_owner_or_admin
on public.business_memberships for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.has_business_permission(business_id, 'users:manage')
);
