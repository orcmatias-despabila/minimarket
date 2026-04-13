create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (business_id, user_id),
  constraint business_memberships_role_check check (role in ('owner', 'admin', 'cashier'))
);

create table if not exists public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  email text not null,
  role text not null default 'cashier',
  status text not null default 'pending',
  invited_by_user_id uuid not null references auth.users (id) on delete cascade,
  accepted_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (business_id, email, status),
  constraint business_invitations_role_check check (role in ('owner', 'admin', 'cashier')),
  constraint business_invitations_status_check check (status in ('pending', 'accepted', 'revoked', 'expired'))
);

alter table public.products
  add column if not exists business_id uuid references public.businesses (id) on delete cascade;

create index if not exists idx_products_business_id on public.products (business_id);
create index if not exists idx_products_business_barcode on public.products (business_id, barcode);
create index if not exists idx_business_memberships_user_id on public.business_memberships (user_id);
create index if not exists idx_business_invitations_business_id on public.business_invitations (business_id);
create index if not exists idx_business_invitations_email on public.business_invitations (email);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_businesses_set_updated_at on public.businesses;
create trigger trg_businesses_set_updated_at
before update on public.businesses
for each row
execute function public.set_updated_at();
