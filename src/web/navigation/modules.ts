import type { Permission, UserRole } from '../../types/domain'

export interface WebModuleDefinition {
  id:
    | 'dashboard'
    | 'clients'
    | 'suppliers'
    | 'employees'
    | 'roles'
    | 'received-documents'
    | 'issued-documents'
    | 'credit-notes'
    | 'reports'
    | 'settings'
    | 'team'
    | 'sales'
    | 'products'
    | 'inventory'
    | 'cash'
  path: string
  label: string
  description: string
  shortLabel: string
  navBadge: string
  sectionLabel: string
  accent: string
  group: 'backoffice' | 'operations'
  requiredPermissions?: Permission[]
  allowedRoles?: UserRole[]
}

export type WebModuleId = WebModuleDefinition['id']

export interface WebModuleAccessContext {
  currentRole?: UserRole | null
  hasPermission: (permission: Permission) => boolean
}

export const webModules: WebModuleDefinition[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    shortLabel: 'Panel',
    navBadge: 'DB',
    sectionLabel: 'Resumen',
    description: 'Panel administrativo y documental del negocio.',
    accent: 'Backoffice',
    group: 'backoffice',
  },
  {
    id: 'clients',
    path: '/clients',
    label: 'Clientes',
    shortLabel: 'Clientes',
    navBadge: 'CL',
    sectionLabel: 'Maestros',
    description: 'Maestro comercial de clientes y relacion documental.',
    accent: 'CRM comercial',
    group: 'backoffice',
    allowedRoles: ['owner', 'admin'],
  },
  {
    id: 'suppliers',
    path: '/suppliers',
    label: 'Proveedores',
    shortLabel: 'Proveedores',
    navBadge: 'PR',
    sectionLabel: 'Maestros',
    description: 'Base administrativa de proveedores y documentos recibidos.',
    accent: 'Abastecimiento',
    group: 'backoffice',
    allowedRoles: ['owner', 'admin'],
  },
  {
    id: 'employees',
    path: '/employees',
    label: 'Personal',
    shortLabel: 'Personal',
    navBadge: 'PS',
    sectionLabel: 'Administracion',
    description: 'Ficha de trabajadores, acceso y estructura interna del negocio.',
    accent: 'Talento interno',
    group: 'backoffice',
    requiredPermissions: ['users:manage'],
  },
  {
    id: 'roles',
    path: '/roles',
    label: 'Roles y permisos',
    shortLabel: 'Roles',
    navBadge: 'RL',
    sectionLabel: 'Administracion',
    description: 'Catalogo de roles y matriz administrativa de permisos.',
    accent: 'Control de acceso',
    group: 'backoffice',
    requiredPermissions: ['users:manage'],
  },
  {
    id: 'received-documents',
    path: '/received-documents',
    label: 'Documentos Recibidos',
    shortLabel: 'Recibidos',
    navBadge: 'DR',
    sectionLabel: 'Documentos',
    description: 'Bandeja documental para compras, respaldos y recepcion.',
    accent: 'Recepcion',
    group: 'backoffice',
    allowedRoles: ['owner', 'admin'],
  },
  {
    id: 'issued-documents',
    path: '/issued-documents',
    label: 'Documentos Emitidos',
    shortLabel: 'Emitidos',
    navBadge: 'DE',
    sectionLabel: 'Documentos',
    description: 'Control de documentos comerciales emitidos por el negocio.',
    accent: 'Emision',
    group: 'backoffice',
    allowedRoles: ['owner', 'admin'],
  },
  {
    id: 'credit-notes',
    path: '/credit-notes',
    label: 'Notas de Credito',
    shortLabel: 'Notas',
    navBadge: 'NC',
    sectionLabel: 'Documentos',
    description: 'Modulo base para referencias y anulaciones documentales.',
    accent: 'Referencias',
    group: 'backoffice',
    allowedRoles: ['owner', 'admin'],
  },
  {
    id: 'reports',
    path: '/reports',
    label: 'Reportes',
    shortLabel: 'Reportes',
    navBadge: 'RP',
    sectionLabel: 'Analisis',
    description: 'Reportes operativos y administrativos del negocio.',
    accent: 'Analitica',
    group: 'backoffice',
    requiredPermissions: ['reports:read'],
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Configuracion',
    shortLabel: 'Config',
    navBadge: 'CF',
    sectionLabel: 'Administracion',
    description: 'Parametros del negocio, acceso y configuracion general.',
    accent: 'Preferencias',
    group: 'backoffice',
    requiredPermissions: ['settings:manage'],
  },
  {
    id: 'team',
    path: '/team',
    label: 'Equipo',
    shortLabel: 'Equipo',
    navBadge: 'EQ',
    sectionLabel: 'Administracion',
    description: 'Usuarios, roles e invitaciones del negocio.',
    accent: 'Seguridad',
    group: 'backoffice',
    requiredPermissions: ['users:manage'],
  },
  {
    id: 'sales',
    path: '/sales',
    label: 'Venta',
    shortLabel: 'Venta',
    navBadge: 'VT',
    sectionLabel: 'Operacion diaria',
    description: 'Punto de venta y cobro rapido para caja.',
    accent: 'POS',
    group: 'operations',
    requiredPermissions: ['sales:create'],
  },
  {
    id: 'products',
    path: '/products',
    label: 'Productos',
    shortLabel: 'Productos',
    navBadge: 'PD',
    sectionLabel: 'Operacion diaria',
    description: 'Alta de productos y control de codigos.',
    accent: 'Catalogo',
    group: 'operations',
    requiredPermissions: ['products:write'],
  },
  {
    id: 'inventory',
    path: '/inventory',
    label: 'Inventario',
    shortLabel: 'Inventario',
    navBadge: 'IN',
    sectionLabel: 'Operacion diaria',
    description: 'Stock, reposicion y movimientos operativos.',
    accent: 'Stock',
    group: 'operations',
    requiredPermissions: ['inventory:read'],
  },
  {
    id: 'cash',
    path: '/cash',
    label: 'Caja',
    shortLabel: 'Caja',
    navBadge: 'CJ',
    sectionLabel: 'Operacion diaria',
    description: 'Apertura, cierre y diferencias de caja.',
    accent: 'Caja diaria',
    group: 'operations',
    requiredPermissions: ['cash:open', 'cash:close'],
  },
]

export const getWebModuleById = (moduleId: WebModuleId) =>
  webModules.find((module) => module.id === moduleId)

export const getWebModuleByPath = (pathname: string) =>
  webModules.find((module) => pathname === module.path || pathname.startsWith(`${module.path}/`))

export const canAccessWebModule = (
  module: WebModuleDefinition,
  context: WebModuleAccessContext,
) => {
  if (
    module.allowedRoles?.length &&
    (!context.currentRole || !module.allowedRoles.includes(context.currentRole))
  ) {
    return false
  }

  if (!module.requiredPermissions?.length) {
    return true
  }

  return module.requiredPermissions.some((permission) => context.hasPermission(permission))
}
