# Fase 7 - Migracion de Equipo hacia Personal

## Estado actual analizado

### Modulo `Equipo`

El modulo actual `Equipo` sigue siendo el centro operativo para:

- invitaciones por correo a un negocio
- membresias del negocio
- asignacion de roles legacy (`owner`, `admin`, `cashier`, `inventory`)
- permisos legacy basados en `BusinessPermissionKey`
- sincronizacion con `business_members` y compatibilidad con `business_memberships`

Archivos principales revisados:

- `src/web/pages/TeamPage.tsx`
- `src/mobile/screens/TeamScreen.tsx`
- `src/web/services/business.service.ts`
- `src/web/workspace/WorkspaceProvider.tsx`
- `src/types/domain.ts`
- `supabase/migrations/20260406_business_workspace.sql`
- `supabase/migrations/20260406_roles_and_policies_stage5.sql`
- `supabase/migrations/20260406_granular_permissions_stage6.sql`
- `supabase/migrations/20260424_a.sql`

### Nuevo modulo `Personal`

El nuevo stack administrativo ya creado cubre:

- ficha del trabajador (`employees`)
- datos laborales (`employee_job_info`)
- acceso administrativo (`employee_access`)
- roles administrativos (`roles`)
- catalogo de permisos (`permissions`)
- asignacion de permisos (`role_permissions`)

Archivos principales ya existentes:

- `src/web/pages/EmployeesPage.tsx`
- `src/web/pages/EmployeeUpsertPage.tsx`
- `src/web/pages/EmployeeDetailPage.tsx`
- `src/web/pages/RolesPage.tsx`
- `src/web/pages/RoleUpsertPage.tsx`
- `src/web/pages/RolePermissionsPage.tsx`
- `src/web/services/adminEmployees.service.ts`
- `src/web/services/adminEmployeeAccess.service.ts`
- `src/web/services/adminRoles.service.ts`
- `src/web/services/adminPermissions.service.ts`

## Conclusiones de arquitectura

`Equipo` y `Personal` no resuelven exactamente el mismo problema.

`Equipo` administra acceso al negocio desde la perspectiva de:

- miembro autenticado
- invitacion
- membresia
- permisos operativos legacy

`Personal` administra recursos humanos y acceso administrativo desde la perspectiva de:

- trabajador
- ficha laboral
- acceso del trabajador al sistema
- rol administrativo reutilizable

Por eso no conviene eliminar `Equipo` de forma abrupta.

## Decision de reutilizacion

### Se reutiliza

- `business.service.ts` como capa temporal para invitaciones y membresias
- `WorkspaceProvider.tsx` como contexto de negocio activo y permisos efectivos del usuario autenticado
- tablas `business_members` / `business_memberships` / `business_invitations` mientras siga vivo el flujo actual de invitaciones
- `users:manage` como compuerta temporal de navegacion para `Personal` y `Roles`

### Se migra

- gestion de trabajadores desde `Equipo` hacia `Personal`
- asignacion de rol administrativo granular desde `Equipo` hacia `Roles y permisos`
- configuracion de acceso del trabajador autenticable desde `Equipo` hacia la pestaña `Acceso` en ficha de trabajador

### Se mantiene temporalmente

- invitaciones por correo
- aceptacion y rechazo de invitaciones
- membresias del negocio
- owner bootstrap y visibilidad del negocio actual
- soporte legacy a `business_memberships`

### Se elimina despues

Cuando la integracion entre membresia e `employee_access` este completa, se recomienda retirar de `Equipo`:

- edicion manual de permisos por miembro
- edicion manual de rol legacy por miembro
- cualquier gestion redundante que ya viva en `Personal` o `Roles`

## Riesgos detectados

### 1. Doble modelo de roles

Hoy conviven:

- `UserRole` legacy: `owner`, `admin`, `cashier`, `inventory`
- roles administrativos nuevos en tabla `roles`

Riesgo:

- un usuario puede tener una membresia legacy y ademas un `employee_access.role_id`
- ambos modelos pueden divergir

Mitigacion temporal:

- mantener `UserRole` solo para auth, invitaciones y gating heredado
- usar tabla `roles` para administracion interna y permisos nuevos

### 2. Doble tabla de membresia

El servicio de negocio resuelve compatibilidad entre:

- `business_members`
- `business_memberships`

Riesgo:

- inconsistencias entre tablas o lecturas en tabla distinta segun entorno

Mitigacion temporal:

- no romper el fallback actual
- no escribir una migracion destructiva todavia
- reconciliar datos antes de consolidar una sola tabla canonica

### 3. Gating aun basado en permisos legacy

La navegacion web sigue validando permisos heredados como:

- `users:manage`
- `reports:read`
- `settings:manage`

Riesgo:

- el nuevo modelo de permisos administrativos todavia no controla toda la app

Mitigacion temporal:

- mantener las compuertas actuales para no romper acceso
- introducir adaptadores de permisos en una fase posterior

## Plan de migracion progresiva

### Etapa 1 - Compatibilidad visible

- mantener `Equipo` accesible
- marcarlo como modulo legacy / transitorio
- dirigir la gestion de trabajadores a `Personal`
- dirigir roles granulares a `Roles y permisos`

Resultado esperado:

- no se rompen invitaciones ni membresias
- el usuario empieza a usar los nuevos modulos sin perder flujos actuales

### Etapa 2 - Vinculacion de identidad

- agregar una relacion controlada entre `business_members` y `employee_access`
- permitir vincular un miembro autenticado a un trabajador (`employee_id`)
- usar `auth_user_id` como puente entre identidad autenticada y ficha laboral

Resultado esperado:

- el acceso del sistema deja de estar separado de la ficha del trabajador

### Etapa 3 - Adaptador de permisos

- mapear permisos legacy a roles/permisos administrativos nuevos
- definir reglas de precedencia entre:
  - membresia legacy
  - rol administrativo
  - overrides de empleado

Resultado esperado:

- el sistema puede leer permisos nuevos sin romper auth actual

### Etapa 4 - Retiro de gestion duplicada

- quitar de `Equipo` la edicion de permisos/roles por miembro
- dejar `Equipo` solo para invitaciones y membresias, o fusionarlo en un submodulo de acceso

Resultado esperado:

- desaparece duplicidad funcional

### Etapa 5 - Consolidacion de tablas

- reconciliar `business_members` y `business_memberships`
- elegir una sola tabla canonica
- mover el servicio de negocio a una sola fuente

Resultado esperado:

- menor complejidad y menos errores de compatibilidad

## Recomendacion operativa

No eliminar `Equipo` en esta etapa.

La decision correcta hoy es:

- conservar `Equipo` para invitaciones y membresias
- mover la gestion de personas a `Personal`
- mover permisos administrativos a `Roles y permisos`
- mantener compatibilidad temporal con `business.service.ts`

## Cambios realizados en esta fase

- se documento la migracion progresiva
- se identificaron los componentes legacy y los componentes nuevos
- se definio que `Equipo` queda temporalmente como capa de compatibilidad funcional
- se evita una migracion destructiva antes de reconciliar auth, membresias y trabajadores
