create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  employee_code text,
  first_name text not null,
  last_name text not null,
  full_name text generated always as (btrim(concat_ws(' ', first_name, last_name))) stored,
  preferred_name text,
  tax_id text not null,
  tax_id_normalized text generated always as (public.normalize_chilean_rut(tax_id)) stored,
  birth_date date,
  personal_email text,
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  address_line1 text,
  address_line2 text,
  commune text,
  city text,
  region text,
  country text not null default 'Chile',
  notes text,
  status text not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employees_status_check check (status in ('active', 'inactive', 'leave', 'terminated')),
  constraint employees_tax_id_valid_check check (public.is_valid_chilean_rut(tax_id)),
  constraint employees_business_id_id_unique unique (id, business_id)
);

create unique index if not exists idx_employees_business_tax_id_unique
  on public.employees (business_id, tax_id_normalized)
  where archived_at is null;

create unique index if not exists idx_employees_business_code_unique
  on public.employees (business_id, employee_code)
  where employee_code is not null and archived_at is null;

create index if not exists idx_employees_business_status
  on public.employees (business_id, status)
  where archived_at is null;

create index if not exists idx_employees_business_name
  on public.employees (business_id, last_name, first_name)
  where archived_at is null;

create table if not exists public.employee_job_info (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  employee_id uuid not null,
  employment_type text not null default 'contract',
  job_title text not null,
  department text,
  cost_center text,
  manager_employee_id uuid,
  branch_name text,
  hire_date date,
  contract_start_date date,
  contract_end_date date,
  shift_name text,
  weekly_hours numeric(5,2),
  salary_currency text not null default 'CLP',
  base_salary numeric(14,2),
  variable_salary numeric(14,2),
  status text not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_job_info_employment_type_check check (
    employment_type in ('contract', 'indefinite', 'part_time', 'honorary', 'temporary', 'intern')
  ),
  constraint employee_job_info_status_check check (
    status in ('active', 'inactive', 'leave', 'terminated')
  ),
  constraint employee_job_info_business_id_id_unique unique (id, business_id),
  constraint employee_job_info_employee_fk
    foreign key (employee_id, business_id)
    references public.employees (id, business_id)
    on delete cascade,
  constraint employee_job_info_manager_fk
    foreign key (manager_employee_id, business_id)
    references public.employees (id, business_id)
    on delete set null
);

create index if not exists idx_employee_job_info_business_status
  on public.employee_job_info (business_id, status)
  where archived_at is null;

create unique index if not exists idx_employee_job_info_business_employee_current
  on public.employee_job_info (business_id, employee_id)
  where archived_at is null;

create index if not exists idx_employee_job_info_business_manager
  on public.employee_job_info (business_id, manager_employee_id)
  where archived_at is null and manager_employee_id is not null;

create table if not exists public.employee_job_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  employee_id uuid not null,
  manager_employee_id uuid,
  change_type text not null default 'position_change',
  employment_type text,
  job_title text not null,
  department text,
  cost_center text,
  branch_name text,
  effective_from date not null,
  effective_to date,
  salary_currency text default 'CLP',
  base_salary numeric(14,2),
  variable_salary numeric(14,2),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_job_history_change_type_check check (
    change_type in ('hire', 'promotion', 'transfer', 'salary_change', 'leave', 'return', 'termination', 'position_change')
  ),
  constraint employee_job_history_employee_fk
    foreign key (employee_id, business_id)
    references public.employees (id, business_id)
    on delete cascade,
  constraint employee_job_history_manager_fk
    foreign key (manager_employee_id, business_id)
    references public.employees (id, business_id)
    on delete set null
);

create index if not exists idx_employee_job_history_business_employee
  on public.employee_job_history (business_id, employee_id, effective_from desc)
  where archived_at is null;

create table if not exists public.employee_education (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  employee_id uuid not null,
  institution_name text not null,
  degree_name text,
  field_of_study text,
  education_level text,
  start_date date,
  end_date date,
  is_completed boolean not null default false,
  credential_code text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_education_employee_fk
    foreign key (employee_id, business_id)
    references public.employees (id, business_id)
    on delete cascade
);

create index if not exists idx_employee_education_business_employee
  on public.employee_education (business_id, employee_id, end_date desc nulls last)
  where archived_at is null;

create table if not exists public.employee_training (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  employee_id uuid not null,
  title text not null,
  provider_name text,
  training_type text,
  completed_on date,
  expires_on date,
  duration_hours numeric(8,2),
  certificate_number text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_training_employee_fk
    foreign key (employee_id, business_id)
    references public.employees (id, business_id)
    on delete cascade
);

create index if not exists idx_employee_training_business_employee
  on public.employee_training (business_id, employee_id, completed_on desc nulls last)
  where archived_at is null;

create table if not exists public.employee_skills (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  employee_id uuid not null,
  skill_name text not null,
  category text,
  proficiency_level text not null default 'intermediate',
  years_experience numeric(5,2),
  last_used_on date,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_skills_proficiency_level_check check (
    proficiency_level in ('basic', 'intermediate', 'advanced', 'expert')
  ),
  constraint employee_skills_employee_fk
    foreign key (employee_id, business_id)
    references public.employees (id, business_id)
    on delete cascade
);

create unique index if not exists idx_employee_skills_unique
  on public.employee_skills (business_id, employee_id, skill_name)
  where archived_at is null;

create table if not exists public.employee_health_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  employee_id uuid not null,
  record_type text not null,
  provider_name text,
  recorded_on date,
  expires_on date,
  restrictions text,
  notes text,
  attachment_url text,
  is_confidential boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_health_records_employee_fk
    foreign key (employee_id, business_id)
    references public.employees (id, business_id)
    on delete cascade
);

create index if not exists idx_employee_health_records_business_employee
  on public.employee_health_records (business_id, employee_id, recorded_on desc nulls last)
  where archived_at is null;

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  employee_id uuid not null,
  document_type text not null,
  title text not null,
  file_name text,
  file_path text,
  mime_type text,
  issued_on date,
  expires_on date,
  is_required boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_documents_employee_fk
    foreign key (employee_id, business_id)
    references public.employees (id, business_id)
    on delete cascade
);

create index if not exists idx_employee_documents_business_employee
  on public.employee_documents (business_id, employee_id, document_type)
  where archived_at is null;

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  module_name text not null default 'employees',
  is_system boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint permissions_business_code_unique unique (business_id, code),
  constraint permissions_business_id_id_unique unique (id, business_id)
);

create index if not exists idx_permissions_business_module
  on public.permissions (business_id, module_name)
  where archived_at is null;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_business_code_unique unique (business_id, code),
  constraint roles_business_id_id_unique unique (id, business_id)
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  role_id uuid not null,
  permission_id uuid not null,
  created_at timestamptz not null default now(),
  constraint role_permissions_unique unique (business_id, role_id, permission_id),
  constraint role_permissions_role_fk
    foreign key (role_id, business_id)
    references public.roles (id, business_id)
    on delete cascade,
  constraint role_permissions_permission_fk
    foreign key (permission_id, business_id)
    references public.permissions (id, business_id)
    on delete cascade
);

create index if not exists idx_role_permissions_business_role
  on public.role_permissions (business_id, role_id);

create table if not exists public.employee_access (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  employee_id uuid not null,
  user_id uuid references auth.users (id) on delete set null,
  role_id uuid,
  email text,
  access_status text not null default 'pending',
  invited_at timestamptz,
  activated_at timestamptz,
  last_login_at timestamptz,
  passwordless_only boolean not null default false,
  must_rotate_access boolean not null default false,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_access_status_check check (
    access_status in ('pending', 'active', 'suspended', 'revoked')
  ),
  constraint employee_access_business_id_id_unique unique (id, business_id),
  constraint employee_access_employee_fk
    foreign key (employee_id, business_id)
    references public.employees (id, business_id)
    on delete cascade,
  constraint employee_access_role_fk
    foreign key (role_id, business_id)
    references public.roles (id, business_id)
    on delete set null
);

create unique index if not exists idx_employee_access_business_user_unique
  on public.employee_access (business_id, user_id)
  where user_id is not null and archived_at is null;

create unique index if not exists idx_employee_access_business_employee_current
  on public.employee_access (business_id, employee_id)
  where archived_at is null;

create index if not exists idx_employee_access_business_status
  on public.employee_access (business_id, access_status)
  where archived_at is null;

create table if not exists public.employee_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  employee_access_id uuid not null,
  permission_id uuid not null,
  effect text not null,
  reason text,
  expires_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_permission_overrides_effect_check check (effect in ('allow', 'deny')),
  constraint employee_permission_overrides_access_fk
    foreign key (employee_access_id, business_id)
    references public.employee_access (id, business_id)
    on delete cascade,
  constraint employee_permission_overrides_permission_fk
    foreign key (permission_id, business_id)
    references public.permissions (id, business_id)
    on delete cascade
);

create index if not exists idx_employee_permission_overrides_business_access
  on public.employee_permission_overrides (business_id, employee_access_id)
  where archived_at is null;

create unique index if not exists idx_employee_permission_overrides_current
  on public.employee_permission_overrides (business_id, employee_access_id, permission_id)
  where archived_at is null;

drop trigger if exists trg_employees_set_updated_at on public.employees;
create trigger trg_employees_set_updated_at
before update on public.employees
for each row
execute function public.set_updated_at();

drop trigger if exists trg_employee_job_info_set_updated_at on public.employee_job_info;
create trigger trg_employee_job_info_set_updated_at
before update on public.employee_job_info
for each row
execute function public.set_updated_at();

drop trigger if exists trg_employee_job_history_set_updated_at on public.employee_job_history;
create trigger trg_employee_job_history_set_updated_at
before update on public.employee_job_history
for each row
execute function public.set_updated_at();

drop trigger if exists trg_employee_education_set_updated_at on public.employee_education;
create trigger trg_employee_education_set_updated_at
before update on public.employee_education
for each row
execute function public.set_updated_at();

drop trigger if exists trg_employee_training_set_updated_at on public.employee_training;
create trigger trg_employee_training_set_updated_at
before update on public.employee_training
for each row
execute function public.set_updated_at();

drop trigger if exists trg_employee_skills_set_updated_at on public.employee_skills;
create trigger trg_employee_skills_set_updated_at
before update on public.employee_skills
for each row
execute function public.set_updated_at();

drop trigger if exists trg_employee_health_records_set_updated_at on public.employee_health_records;
create trigger trg_employee_health_records_set_updated_at
before update on public.employee_health_records
for each row
execute function public.set_updated_at();

drop trigger if exists trg_employee_documents_set_updated_at on public.employee_documents;
create trigger trg_employee_documents_set_updated_at
before update on public.employee_documents
for each row
execute function public.set_updated_at();

drop trigger if exists trg_permissions_set_updated_at on public.permissions;
create trigger trg_permissions_set_updated_at
before update on public.permissions
for each row
execute function public.set_updated_at();

drop trigger if exists trg_roles_set_updated_at on public.roles;
create trigger trg_roles_set_updated_at
before update on public.roles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_employee_access_set_updated_at on public.employee_access;
create trigger trg_employee_access_set_updated_at
before update on public.employee_access
for each row
execute function public.set_updated_at();

drop trigger if exists trg_employee_permission_overrides_set_updated_at on public.employee_permission_overrides;
create trigger trg_employee_permission_overrides_set_updated_at
before update on public.employee_permission_overrides
for each row
execute function public.set_updated_at();

comment on table public.employees is
'Ficha maestra del trabajador. No depende del acceso al sistema.';

comment on table public.employee_access is
'Puente entre una ficha laboral y una cuenta auth.users, con rol y estado de acceso.';

comment on table public.roles is
'Roles internos por empresa para el subsistema de personal.';

comment on table public.permissions is
'Catalogo de permisos internos por empresa para el subsistema de personal.';

notify pgrst, 'reload schema';
