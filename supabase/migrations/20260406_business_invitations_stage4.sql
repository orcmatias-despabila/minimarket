alter table if exists public.business_invitations
  add column if not exists full_name text,
  add column if not exists invitation_token uuid default gen_random_uuid();

create unique index if not exists idx_business_invitations_token
  on public.business_invitations (invitation_token);
