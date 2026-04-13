alter table if exists public.business_members enable row level security;
alter table if exists public.business_invitations enable row level security;

drop policy if exists business_members_insert_owner_admin on public.business_members;
create policy business_members_insert_owner_admin
on public.business_members for insert
to authenticated
with check (
  profile_id = auth.uid()
  or public.can_manage_business(business_id)
);

drop policy if exists business_invitations_update_owner_or_self on public.business_invitations;
create policy business_invitations_update_owner_or_self
on public.business_invitations for update
to authenticated
using (
  lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.can_manage_business(business_id)
)
with check (
  lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.can_manage_business(business_id)
);

comment on policy business_members_insert_owner_admin on public.business_members is
'Permite que el propio usuario invitado cree su membresia al aceptar una invitacion, o que owner/admin gestionen altas manualmente.';

comment on policy business_invitations_update_owner_or_self on public.business_invitations is
'Permite que el destinatario de la invitacion la acepte o rechace usando su propio correo autenticado.';

notify pgrst, 'reload schema';
