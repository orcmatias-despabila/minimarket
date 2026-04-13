# Fase 1: Arquitectura de Gestion Interna de Personal

## Estado actual del proyecto

### Equipo
- El modulo actual de [TeamPage.tsx](/C:/Users/orcma/Desktop/Minimarket/src/web/pages/TeamPage.tsx) no administra fichas laborales.
- Hoy `Equipo` funciona como gestion de accesos al negocio:
  - invitaciones por correo
  - membresias del negocio
  - rol operativo
  - permisos derivados del workspace

### Auth
- El acceso actual depende de Supabase Auth y del contexto de [AuthProvider.tsx](/C:/Users/orcma/Desktop/Minimarket/src/web/auth/AuthProvider.tsx).
- La identidad base vive en `auth.users`.
- Los perfiles web complementarios viven en `public.profiles`.
- No existe hoy una separacion formal entre "persona contratada" y "usuario con acceso al sistema".

### Multiempresa
- El contexto activo de negocio se resuelve en [WorkspaceProvider.tsx](/C:/Users/orcma/Desktop/Minimarket/src/web/workspace/WorkspaceProvider.tsx).
- La logica de negocio y membresia esta en [business.service.ts](/C:/Users/orcma/Desktop/Minimarket/src/web/services/business.service.ts).
- Todo el sistema administrativo actual pivota sobre `business_id`.
- Existe una transicion historica entre `public.business_memberships` y `public.business_members`.

### Tablas actuales relacionadas
- `public.businesses`
- `public.business_memberships`
- `public.business_members`
- `public.business_invitations`
- `public.profiles`
- `public.customers`
- `public.suppliers`
- `public.business_documents`
- `public.business_received_dte_inbox`

### Helpers reutilizables ya disponibles
- [20260425_chilean_rut_guardrails.sql](/C:/Users/orcma/Desktop/Minimarket/supabase/migrations/20260425_chilean_rut_guardrails.sql) ya aporta:
  - `public.clean_chilean_rut(text)`
  - `public.normalize_chilean_rut(text)`
  - `public.is_valid_chilean_rut(text)`

## Propuesta de arquitectura

La nueva arquitectura separa tres capas:

1. `employees`
   - representa la ficha del trabajador
   - no depende de que tenga usuario en el sistema
   - concentra identidad personal, RUT y estado laboral general

2. `employee_access`
   - vincula opcionalmente un trabajador con `auth.users`
   - controla si tiene acceso, si esta pendiente, activo, suspendido o revocado
   - asigna un rol interno del modulo de personal

3. `roles` + `permissions` + `role_permissions` + `employee_permission_overrides`
   - implementan RBAC interno y overrides puntuales
   - permiten evolucionar hacia permisos mas finos sin romper el auth actual

## Modelo relacional propuesto

### Ficha laboral
- `employees`: ficha principal del trabajador
- `employee_job_info`: situacion laboral vigente, una fila activa por trabajador
- `employee_job_history`: historial de cambios laborales
- `employee_education`: estudios
- `employee_training`: capacitaciones
- `employee_skills`: habilidades
- `employee_health_records`: antecedentes de salud ocupacional
- `employee_documents`: documentos asociados

### Seguridad
- `roles`: roles por empresa
- `permissions`: permisos por empresa
- `role_permissions`: permisos asignados a roles
- `employee_access`: acceso de sistema por trabajador
- `employee_permission_overrides`: overrides `allow`/`deny` por acceso

## Reglas de diseno

- Todas las tablas nuevas incluyen `business_id`.
- La ficha laboral queda separada del login.
- El RUT se valida con helper real chileno en base de datos.
- Se fuerza unicidad de RUT normalizado por empresa.
- Se usa `archived_at` como baja logica.
- Se agregan `created_at` y `updated_at`.
- Las relaciones hijas amarran `(employee_id, business_id)` para evitar cruces entre empresas.

## Migraciones entregadas

- [20260426_employee_management_schema.sql](/C:/Users/orcma/Desktop/Minimarket/supabase/migrations/20260426_employee_management_schema.sql)
- [20260426_employee_management_rls.sql](/C:/Users/orcma/Desktop/Minimarket/supabase/migrations/20260426_employee_management_rls.sql)

## Relaciones clave

- `employees.business_id -> businesses.id`
- `employee_job_info.(employee_id, business_id) -> employees.(id, business_id)`
- `employee_job_history.(employee_id, business_id) -> employees.(id, business_id)`
- `employee_education.(employee_id, business_id) -> employees.(id, business_id)`
- `employee_training.(employee_id, business_id) -> employees.(id, business_id)`
- `employee_skills.(employee_id, business_id) -> employees.(id, business_id)`
- `employee_health_records.(employee_id, business_id) -> employees.(id, business_id)`
- `employee_documents.(employee_id, business_id) -> employees.(id, business_id)`
- `employee_access.(employee_id, business_id) -> employees.(id, business_id)`
- `employee_access.(role_id, business_id) -> roles.(id, business_id)`
- `role_permissions.(role_id, business_id) -> roles.(id, business_id)`
- `role_permissions.(permission_id, business_id) -> permissions.(id, business_id)`
- `employee_permission_overrides.(employee_access_id, business_id) -> employee_access.(id, business_id)`
- `employee_permission_overrides.(permission_id, business_id) -> permissions.(id, business_id)`

## RLS inicial propuesta

La fase 1 deja RLS administrativa, no autoservicio.

- Cada empresa ve solo sus propios registros.
- El helper `public.has_employee_permission(business_id, permission_code)` gobierna la nueva capa.
- Mientras el sistema nuevo madura, el helper permite acceso a usuarios administrativos actuales mediante `public.has_business_permission(business_id, 'users:manage')`.
- Luego evalua el RBAC nuevo basado en `employee_access`, `roles`, `role_permissions` y `employee_permission_overrides`.

## Semillas iniciales

Permisos iniciales:
- `employee.read`
- `employee.write`
- `employee.archive`
- `employee_health.read`
- `employee_health.write`
- `employee_document.read`
- `employee_document.write`
- `employee_access.read`
- `employee_access.write`
- `employee_role.manage`
- `employee_permission.manage`

Roles iniciales:
- `hr_admin`
- `hr_manager`
- `hr_viewer`

## Riesgos detectados

### 1. Convivencia con el modelo actual de workspace
El sistema actual todavia mezcla `business_memberships` y `business_members`. La fase 1 no intenta reemplazar eso, solo montar una capa nueva en paralelo.

### 2. Migracion futura de accesos
Hoy un trabajador puede existir sin cuenta, y una cuenta puede existir sin ficha laboral. Eso es correcto para el nuevo modelo, pero exigira una estrategia de vinculacion al pasar a FASE 2.

### 3. Salud ocupacional
`employee_health_records` contiene informacion sensible. La politica inicial la deja solo para perfiles con permiso especifico, pero despues conviene revisar cifrado o separacion adicional si el alcance crece.

### 4. Archivos de documentos
`employee_documents` guarda metadata y ruta, pero no crea todavia el bucket ni las politicas de storage. Eso deberia entrar en una fase posterior.

### 5. Jerarquia de permisos
El helper `has_employee_permission` ya soporta overrides y compatibilidad con admins actuales, pero mas adelante conviene decidir si el acceso de personal reemplazara completamente a `users:manage` o conviviran ambos modelos.
