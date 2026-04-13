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
  areaId:
    | 'panel'
    | 'sales'
    | 'purchases'
    | 'inventory'
    | 'cash'
    | 'administration'
    | 'team'
    | 'reports'
  areaLabel: string
  areaDescription: string
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

export interface WebNavigationAreaDefinition {
  id: WebModuleDefinition['areaId']
  label: string
  description: string
}

export const webNavigationAreas: WebNavigationAreaDefinition[] = [
  {
    id: 'panel',
    label: 'Panel',
    description: 'Vista general del negocio y punto de entrada principal.',
  },
  {
    id: 'sales',
    label: 'Ventas',
    description: 'Ventas, documentos comerciales y gestión de clientes.',
  },
  {
    id: 'cash',
    label: 'Caja',
    description: 'Operación de caja diaria, aperturas y cierres.',
  },
  {
    id: 'inventory',
    label: 'Inventario',
    description: 'Catálogo de productos, stock y control operativo.',
  },
  {
    id: 'purchases',
    label: 'Compras',
    description: 'Recepción documental y relación con proveedores.',
  },
  {
    id: 'reports',
    label: 'Reportes',
    description: 'Análisis del negocio y espacio listo para crecer por categorías.',
  },
  {
    id: 'administration',
    label: 'Administración',
    description: 'Gestión interna del negocio, estructura y configuración.',
  },
  {
    id: 'team',
    label: 'Equipo',
    description: 'Usuarios, invitaciones y accesos del negocio.',
  },
]

export const webModules: WebModuleDefinition[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Panel',
    shortLabel: 'Panel',
    navBadge: 'DB',
    areaId: 'panel',
    areaLabel: 'Panel',
    areaDescription: 'Vista general del negocio y punto de entrada principal.',
    sectionLabel: 'Panel',
    description: 'Resumen ejecutivo del negocio con accesos y alertas clave.',
    accent: 'Vista general',
    group: 'backoffice',
  },
  {
    id: 'clients',
    path: '/clients',
    label: 'Clientes',
    shortLabel: 'Clientes',
    navBadge: 'CL',
    areaId: 'sales',
    areaLabel: 'Ventas',
    areaDescription: 'Ventas, documentos comerciales y gestión de clientes.',
    sectionLabel: 'Ventas',
    description: 'Clientes frecuentes, ficha comercial y datos para vender mejor.',
    accent: 'Relación comercial',
    group: 'backoffice',
    allowedRoles: ['owner', 'admin'],
  },
  {
    id: 'suppliers',
    path: '/suppliers',
    label: 'Proveedores',
    shortLabel: 'Proveedores',
    navBadge: 'PR',
    areaId: 'purchases',
    areaLabel: 'Compras',
    areaDescription: 'Recepción documental y relación con proveedores.',
    sectionLabel: 'Compras',
    description: 'Proveedores activos, contactos y base para compras del negocio.',
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
    areaId: 'administration',
    areaLabel: 'Administración',
    areaDescription: 'Gestión interna del negocio, estructura y configuración.',
    sectionLabel: 'Administración',
    description: 'Ficha laboral, datos base y seguimiento del personal del negocio.',
    accent: 'Gestión interna',
    group: 'backoffice',
    requiredPermissions: ['users:manage'],
  },
  {
    id: 'roles',
    path: '/roles',
    label: 'Roles y permisos',
    shortLabel: 'Roles',
    navBadge: 'RL',
    areaId: 'administration',
    areaLabel: 'Administración',
    areaDescription: 'Gestión interna del negocio, estructura y configuración.',
    sectionLabel: 'Administración',
    description: 'Perfiles de acceso y permisos para ordenar quién puede hacer qué.',
    accent: 'Control de acceso',
    group: 'backoffice',
    requiredPermissions: ['users:manage'],
  },
  {
    id: 'received-documents',
    path: '/received-documents',
    label: 'Documentos recibidos',
    shortLabel: 'Recibidos',
    navBadge: 'DR',
    areaId: 'purchases',
    areaLabel: 'Compras',
    areaDescription: 'Recepción documental y relación con proveedores.',
    sectionLabel: 'Compras',
    description: 'Recepcion documental para compras, respaldos y control tributario.',
    accent: 'Recepción documental',
    group: 'backoffice',
    allowedRoles: ['owner', 'admin'],
  },
  {
    id: 'issued-documents',
    path: '/issued-documents',
    label: 'Documentos emitidos',
    shortLabel: 'Emitidos',
    navBadge: 'DE',
    areaId: 'sales',
    areaLabel: 'Ventas',
    areaDescription: 'Ventas, documentos comerciales y gestión de clientes.',
    sectionLabel: 'Ventas',
    description: 'Documentos comerciales emitidos a clientes desde el negocio.',
    accent: 'Emisión comercial',
    group: 'backoffice',
    allowedRoles: ['owner', 'admin'],
  },
  {
    id: 'credit-notes',
    path: '/credit-notes',
    label: 'Notas de crédito',
    shortLabel: 'Notas',
    navBadge: 'NC',
    areaId: 'sales',
    areaLabel: 'Ventas',
    areaDescription: 'Ventas, documentos comerciales y gestión de clientes.',
    sectionLabel: 'Ventas',
    description: 'Correcciones, referencias y anulaciones sobre documentos emitidos.',
    accent: 'Ajustes comerciales',
    group: 'backoffice',
    allowedRoles: ['owner', 'admin'],
  },
  {
    id: 'reports',
    path: '/reports',
    label: 'Reportes',
    shortLabel: 'Reportes',
    navBadge: 'RP',
    areaId: 'reports',
    areaLabel: 'Reportes',
    areaDescription: 'Análisis del negocio y espacio listo para crecer por categorías.',
    sectionLabel: 'Reportes',
    description: 'Indicadores y reportes para tomar decisiones del negocio.',
    accent: 'Control del negocio',
    group: 'backoffice',
    requiredPermissions: ['reports:read'],
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Configuración',
    shortLabel: 'Config',
    navBadge: 'CF',
    areaId: 'administration',
    areaLabel: 'Administración',
    areaDescription: 'Gestión interna del negocio, estructura y configuración.',
    sectionLabel: 'Administración',
    description: 'Parámetros del negocio, preferencias y ajustes generales del sistema.',
    accent: 'Ajustes generales',
    group: 'backoffice',
    requiredPermissions: ['settings:manage'],
  },
  {
    id: 'team',
    path: '/team',
    label: 'Usuarios y accesos',
    shortLabel: 'Usuarios',
    navBadge: 'EQ',
    areaId: 'team',
    areaLabel: 'Equipo',
    areaDescription: 'Usuarios, invitaciones y accesos del negocio.',
    sectionLabel: 'Equipo',
    description: 'Invitaciones, membresías y accesos del equipo sin mezclarlo con personal.',
    accent: 'Equipo activo',
    group: 'backoffice',
    requiredPermissions: ['users:manage'],
  },
  {
    id: 'sales',
    path: '/sales',
    label: 'Ventas',
    shortLabel: 'Ventas',
    navBadge: 'VT',
    areaId: 'sales',
    areaLabel: 'Ventas',
    areaDescription: 'Ventas, documentos comerciales y gestión de clientes.',
    sectionLabel: 'Ventas',
    description: 'Cobro rápido, flujo de venta y atención diaria en caja.',
    accent: 'Punto de venta',
    group: 'operations',
    requiredPermissions: ['sales:create'],
  },
  {
    id: 'products',
    path: '/products',
    label: 'Productos',
    shortLabel: 'Productos',
    navBadge: 'PD',
    areaId: 'inventory',
    areaLabel: 'Inventario',
    areaDescription: 'Catálogo de productos, stock y control operativo.',
    sectionLabel: 'Inventario',
    description: 'Catálogo de productos, códigos, formatos y datos de venta.',
    accent: 'Catálogo comercial',
    group: 'operations',
    requiredPermissions: ['products:write'],
  },
  {
    id: 'inventory',
    path: '/inventory',
    label: 'Inventario',
    shortLabel: 'Inventario',
    navBadge: 'IN',
    areaId: 'inventory',
    areaLabel: 'Inventario',
    areaDescription: 'Catálogo de productos, stock y control operativo.',
    sectionLabel: 'Inventario',
    description: 'Stock disponible, ajustes, reposición y movimientos del inventario.',
    accent: 'Control de stock',
    group: 'operations',
    requiredPermissions: ['inventory:read'],
  },
  {
    id: 'cash',
    path: '/cash',
    label: 'Caja',
    shortLabel: 'Caja',
    navBadge: 'CJ',
    areaId: 'cash',
    areaLabel: 'Caja',
    areaDescription: 'Operación de caja diaria, aperturas y cierres.',
    sectionLabel: 'Caja',
    description: 'Apertura, cierre y control diario del efectivo en caja.',
    accent: 'Control de caja',
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
