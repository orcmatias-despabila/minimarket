create or replace function public.seed_employee_security_for_business(target_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hr_admin_role_id uuid;
  hr_manager_role_id uuid;
  hr_viewer_role_id uuid;
begin
  insert into public.permissions (business_id, code, name, description, module_name, is_system)
  values
    (target_business_id, 'employee.read', 'Ver trabajadores', 'Permite ver fichas, historial y datos generales del trabajador.', 'employees', true),
    (target_business_id, 'employee.write', 'Editar trabajadores', 'Permite crear y editar fichas laborales y datos generales.', 'employees', true),
    (target_business_id, 'employee.archive', 'Archivar trabajadores', 'Permite archivar o dar de baja logica a trabajadores.', 'employees', true),
    (target_business_id, 'employee_health.read', 'Ver salud ocupacional', 'Permite ver antecedentes de salud y restricciones.', 'employees', true),
    (target_business_id, 'employee_health.write', 'Editar salud ocupacional', 'Permite registrar y editar antecedentes de salud.', 'employees', true),
    (target_business_id, 'employee_document.read', 'Ver documentos', 'Permite revisar documentos del trabajador.', 'employees', true),
    (target_business_id, 'employee_document.write', 'Editar documentos', 'Permite cargar y actualizar documentos del trabajador.', 'employees', true),
    (target_business_id, 'employee_access.read', 'Ver accesos', 'Permite ver accesos, estados y asignaciones de seguridad.', 'employees', true),
    (target_business_id, 'employee_access.write', 'Editar accesos', 'Permite crear y actualizar accesos de sistema para trabajadores.', 'employees', true),
    (target_business_id, 'employee_role.manage', 'Gestionar roles', 'Permite administrar roles internos del modulo de personal.', 'employees', true),
    (target_business_id, 'employee_permission.manage', 'Gestionar permisos', 'Permite administrar permisos y overrides.', 'employees', true)
  on conflict (business_id, code) do update
    set name = excluded.name,
        description = excluded.description,
        module_name = excluded.module_name,
        is_system = excluded.is_system,
        archived_at = null,
        updated_at = now();

  insert into public.roles (business_id, code, name, description, is_system)
  values
    (target_business_id, 'hr_admin', 'HR Admin', 'Administra personal, accesos, roles y permisos.', true),
    (target_business_id, 'hr_manager', 'HR Manager', 'Gestiona fichas del personal y documentacion operativa.', true),
    (target_business_id, 'hr_viewer', 'HR Viewer', 'Consulta personal y documentos en modo lectura.', true)
  on conflict (business_id, code) do update
    set name = excluded.name,
        description = excluded.description,
        is_system = excluded.is_system,
        archived_at = null,
        updated_at = now();

  select id into hr_admin_role_id
  from public.roles
  where business_id = target_business_id and code = 'hr_admin';

  select id into hr_manager_role_id
  from public.roles
  where business_id = target_business_id and code = 'hr_manager';

  select id into hr_viewer_role_id
  from public.roles
  where business_id = target_business_id and code = 'hr_viewer';

  insert into public.role_permissions (business_id, role_id, permission_id)
  select p.business_id, hr_admin_role_id, p.id
  from public.permissions p
  where p.business_id = target_business_id
  on conflict (business_id, role_id, permission_id) do nothing;

  insert into public.role_permissions (business_id, role_id, permission_id)
  select p.business_id, hr_manager_role_id, p.id
  from public.permissions p
  where p.business_id = target_business_id
    and p.code in (
      'employee.read',
      'employee.write',
      'employee_document.read',
      'employee_document.write',
      'employee_health.read',
      'employee_access.read'
    )
  on conflict (business_id, role_id, permission_id) do nothing;

  insert into public.role_permissions (business_id, role_id, permission_id)
  select p.business_id, hr_viewer_role_id, p.id
  from public.permissions p
  where p.business_id = target_business_id
    and p.code in (
      'employee.read',
      'employee_document.read',
      'employee_health.read',
      'employee_access.read'
    )
  on conflict (business_id, role_id, permission_id) do nothing;
end;
$$;

create or replace function public.has_employee_permission(target_business_id uuid, permission_code text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if public.has_business_permission(target_business_id, 'users:manage') then
    return true;
  end if;

  if exists (
    select 1
    from public.employee_access ea
    join public.employee_permission_overrides epo
      on epo.business_id = ea.business_id
     and epo.employee_access_id = ea.id
     and epo.archived_at is null
     and (epo.expires_at is null or epo.expires_at > now())
     and epo.effect = 'deny'
    join public.permissions p
      on p.business_id = epo.business_id
     and p.id = epo.permission_id
    where ea.business_id = target_business_id
      and ea.user_id = auth.uid()
      and ea.access_status = 'active'
      and ea.archived_at is null
      and p.code = permission_code
      and p.archived_at is null
  ) then
    return false;
  end if;

  if exists (
    select 1
    from public.employee_access ea
    join public.employee_permission_overrides epo
      on epo.business_id = ea.business_id
     and epo.employee_access_id = ea.id
     and epo.archived_at is null
     and (epo.expires_at is null or epo.expires_at > now())
     and epo.effect = 'allow'
    join public.permissions p
      on p.business_id = epo.business_id
     and p.id = epo.permission_id
    where ea.business_id = target_business_id
      and ea.user_id = auth.uid()
      and ea.access_status = 'active'
      and ea.archived_at is null
      and p.code = permission_code
      and p.archived_at is null
  ) then
    return true;
  end if;

  return exists (
    select 1
    from public.employee_access ea
    join public.roles r
      on r.business_id = ea.business_id
     and r.id = ea.role_id
     and r.archived_at is null
    join public.role_permissions rp
      on rp.business_id = r.business_id
     and rp.role_id = r.id
    join public.permissions p
      on p.business_id = rp.business_id
     and p.id = rp.permission_id
     and p.archived_at is null
    where ea.business_id = target_business_id
      and ea.user_id = auth.uid()
      and ea.access_status = 'active'
      and ea.archived_at is null
      and p.code = permission_code
  );
end;
$$;

create or replace function public.seed_employee_security_for_new_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_employee_security_for_business(new.id);
  return new;
end;
$$;

drop trigger if exists trg_seed_employee_security_for_business on public.businesses;
create trigger trg_seed_employee_security_for_business
after insert on public.businesses
for each row
execute function public.seed_employee_security_for_new_business();

do $$
declare
  business_record record;
begin
  for business_record in select id from public.businesses loop
    perform public.seed_employee_security_for_business(business_record.id);
  end loop;
end;
$$;

alter table public.employees enable row level security;
alter table public.employee_job_info enable row level security;
alter table public.employee_job_history enable row level security;
alter table public.employee_education enable row level security;
alter table public.employee_training enable row level security;
alter table public.employee_skills enable row level security;
alter table public.employee_health_records enable row level security;
alter table public.employee_documents enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.employee_access enable row level security;
alter table public.employee_permission_overrides enable row level security;

drop policy if exists employees_select_allowed on public.employees;
create policy employees_select_allowed
on public.employees for select
to authenticated
using (public.has_employee_permission(business_id, 'employee.read'));

drop policy if exists employees_insert_allowed on public.employees;
create policy employees_insert_allowed
on public.employees for insert
to authenticated
with check (public.has_employee_permission(business_id, 'employee.write'));

drop policy if exists employees_update_allowed on public.employees;
create policy employees_update_allowed
on public.employees for update
to authenticated
using (public.has_employee_permission(business_id, 'employee.write'))
with check (public.has_employee_permission(business_id, 'employee.write'));

drop policy if exists employee_job_info_select_allowed on public.employee_job_info;
create policy employee_job_info_select_allowed
on public.employee_job_info for select
to authenticated
using (public.has_employee_permission(business_id, 'employee.read'));

drop policy if exists employee_job_info_insert_allowed on public.employee_job_info;
create policy employee_job_info_insert_allowed
on public.employee_job_info for insert
to authenticated
with check (public.has_employee_permission(business_id, 'employee.write'));

drop policy if exists employee_job_info_update_allowed on public.employee_job_info;
create policy employee_job_info_update_allowed
on public.employee_job_info for update
to authenticated
using (public.has_employee_permission(business_id, 'employee.write'))
with check (public.has_employee_permission(business_id, 'employee.write'));

drop policy if exists employee_job_history_select_allowed on public.employee_job_history;
create policy employee_job_history_select_allowed
on public.employee_job_history for select
to authenticated
using (public.has_employee_permission(business_id, 'employee.read'));

drop policy if exists employee_job_history_insert_allowed on public.employee_job_history;
create policy employee_job_history_insert_allowed
on public.employee_job_history for insert
to authenticated
with check (public.has_employee_permission(business_id, 'employee.write'));

drop policy if exists employee_job_history_update_allowed on public.employee_job_history;
create policy employee_job_history_update_allowed
on public.employee_job_history for update
to authenticated
using (public.has_employee_permission(business_id, 'employee.write'))
with check (public.has_employee_permission(business_id, 'employee.write'));

drop policy if exists employee_education_select_allowed on public.employee_education;
create policy employee_education_select_allowed
on public.employee_education for select
to authenticated
using (public.has_employee_permission(business_id, 'employee.read'));

drop policy if exists employee_education_insert_allowed on public.employee_education;
create policy employee_education_insert_allowed
on public.employee_education for insert
to authenticated
with check (public.has_employee_permission(business_id, 'employee.write'));

drop policy if exists employee_education_update_allowed on public.employee_education;
create policy employee_education_update_allowed
on public.employee_education for update
to authenticated
using (public.has_employee_permission(business_id, 'employee.write'))
with check (public.has_employee_permission(business_id, 'employee.write'));

drop policy if exists employee_training_select_allowed on public.employee_training;
create policy employee_training_select_allowed
on public.employee_training for select
to authenticated
using (public.has_employee_permission(business_id, 'employee.read'));

drop policy if exists employee_training_insert_allowed on public.employee_training;
create policy employee_training_insert_allowed
on public.employee_training for insert
to authenticated
with check (public.has_employee_permission(business_id, 'employee.write'));

drop policy if exists employee_training_update_allowed on public.employee_training;
create policy employee_training_update_allowed
on public.employee_training for update
to authenticated
using (public.has_employee_permission(business_id, 'employee.write'))
with check (public.has_employee_permission(business_id, 'employee.write'));

drop policy if exists employee_skills_select_allowed on public.employee_skills;
create policy employee_skills_select_allowed
on public.employee_skills for select
to authenticated
using (public.has_employee_permission(business_id, 'employee.read'));

drop policy if exists employee_skills_insert_allowed on public.employee_skills;
create policy employee_skills_insert_allowed
on public.employee_skills for insert
to authenticated
with check (public.has_employee_permission(business_id, 'employee.write'));

drop policy if exists employee_skills_update_allowed on public.employee_skills;
create policy employee_skills_update_allowed
on public.employee_skills for update
to authenticated
using (public.has_employee_permission(business_id, 'employee.write'))
with check (public.has_employee_permission(business_id, 'employee.write'));

drop policy if exists employee_health_records_select_allowed on public.employee_health_records;
create policy employee_health_records_select_allowed
on public.employee_health_records for select
to authenticated
using (public.has_employee_permission(business_id, 'employee_health.read'));

drop policy if exists employee_health_records_insert_allowed on public.employee_health_records;
create policy employee_health_records_insert_allowed
on public.employee_health_records for insert
to authenticated
with check (public.has_employee_permission(business_id, 'employee_health.write'));

drop policy if exists employee_health_records_update_allowed on public.employee_health_records;
create policy employee_health_records_update_allowed
on public.employee_health_records for update
to authenticated
using (public.has_employee_permission(business_id, 'employee_health.write'))
with check (public.has_employee_permission(business_id, 'employee_health.write'));

drop policy if exists employee_documents_select_allowed on public.employee_documents;
create policy employee_documents_select_allowed
on public.employee_documents for select
to authenticated
using (public.has_employee_permission(business_id, 'employee_document.read'));

drop policy if exists employee_documents_insert_allowed on public.employee_documents;
create policy employee_documents_insert_allowed
on public.employee_documents for insert
to authenticated
with check (public.has_employee_permission(business_id, 'employee_document.write'));

drop policy if exists employee_documents_update_allowed on public.employee_documents;
create policy employee_documents_update_allowed
on public.employee_documents for update
to authenticated
using (public.has_employee_permission(business_id, 'employee_document.write'))
with check (public.has_employee_permission(business_id, 'employee_document.write'));

drop policy if exists roles_select_allowed on public.roles;
create policy roles_select_allowed
on public.roles for select
to authenticated
using (
  public.has_employee_permission(business_id, 'employee_role.manage')
  or public.has_employee_permission(business_id, 'employee_access.read')
);

drop policy if exists roles_insert_allowed on public.roles;
create policy roles_insert_allowed
on public.roles for insert
to authenticated
with check (public.has_employee_permission(business_id, 'employee_role.manage'));

drop policy if exists roles_update_allowed on public.roles;
create policy roles_update_allowed
on public.roles for update
to authenticated
using (public.has_employee_permission(business_id, 'employee_role.manage'))
with check (public.has_employee_permission(business_id, 'employee_role.manage'));

drop policy if exists permissions_select_allowed on public.permissions;
create policy permissions_select_allowed
on public.permissions for select
to authenticated
using (
  public.has_employee_permission(business_id, 'employee_permission.manage')
  or public.has_employee_permission(business_id, 'employee_access.read')
);

drop policy if exists permissions_insert_allowed on public.permissions;
create policy permissions_insert_allowed
on public.permissions for insert
to authenticated
with check (public.has_employee_permission(business_id, 'employee_permission.manage'));

drop policy if exists permissions_update_allowed on public.permissions;
create policy permissions_update_allowed
on public.permissions for update
to authenticated
using (public.has_employee_permission(business_id, 'employee_permission.manage'))
with check (public.has_employee_permission(business_id, 'employee_permission.manage'));

drop policy if exists role_permissions_select_allowed on public.role_permissions;
create policy role_permissions_select_allowed
on public.role_permissions for select
to authenticated
using (
  public.has_employee_permission(business_id, 'employee_permission.manage')
  or public.has_employee_permission(business_id, 'employee_access.read')
);

drop policy if exists role_permissions_insert_allowed on public.role_permissions;
create policy role_permissions_insert_allowed
on public.role_permissions for insert
to authenticated
with check (public.has_employee_permission(business_id, 'employee_permission.manage'));

drop policy if exists role_permissions_update_allowed on public.role_permissions;
create policy role_permissions_update_allowed
on public.role_permissions for update
to authenticated
using (public.has_employee_permission(business_id, 'employee_permission.manage'))
with check (public.has_employee_permission(business_id, 'employee_permission.manage'));

drop policy if exists employee_access_select_allowed on public.employee_access;
create policy employee_access_select_allowed
on public.employee_access for select
to authenticated
using (public.has_employee_permission(business_id, 'employee_access.read'));

drop policy if exists employee_access_insert_allowed on public.employee_access;
create policy employee_access_insert_allowed
on public.employee_access for insert
to authenticated
with check (public.has_employee_permission(business_id, 'employee_access.write'));

drop policy if exists employee_access_update_allowed on public.employee_access;
create policy employee_access_update_allowed
on public.employee_access for update
to authenticated
using (public.has_employee_permission(business_id, 'employee_access.write'))
with check (public.has_employee_permission(business_id, 'employee_access.write'));

drop policy if exists employee_permission_overrides_select_allowed on public.employee_permission_overrides;
create policy employee_permission_overrides_select_allowed
on public.employee_permission_overrides for select
to authenticated
using (public.has_employee_permission(business_id, 'employee_permission.manage'));

drop policy if exists employee_permission_overrides_insert_allowed on public.employee_permission_overrides;
create policy employee_permission_overrides_insert_allowed
on public.employee_permission_overrides for insert
to authenticated
with check (public.has_employee_permission(business_id, 'employee_permission.manage'));

drop policy if exists employee_permission_overrides_update_allowed on public.employee_permission_overrides;
create policy employee_permission_overrides_update_allowed
on public.employee_permission_overrides for update
to authenticated
using (public.has_employee_permission(business_id, 'employee_permission.manage'))
with check (public.has_employee_permission(business_id, 'employee_permission.manage'));

comment on function public.seed_employee_security_for_business(uuid) is
'Crea catalogo inicial de roles y permisos del modulo de personal para una empresa.';

comment on function public.has_employee_permission(uuid, text) is
'Evalua permisos del modulo de personal. En esta fase acepta admins actuales via users:manage y luego el RBAC nuevo.';

notify pgrst, 'reload schema';
