import type { Permission, UserRole } from '../../types/domain'

export type WebModuleId =
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

export type WebNavigationAreaId =
  | 'panel'
  | 'sales'
  | 'purchases'
  | 'inventory'
  | 'cash'
  | 'administration'
  | 'team'
  | 'reports'

export type WebNavigationIconKey =
  | 'home'
  | 'users'
  | 'truck'
  | 'briefcase'
  | 'shield'
  | 'inbox'
  | 'receipt'
  | 'rotate-ccw'
  | 'bar-chart'
  | 'settings'
  | 'user-check'
  | 'shopping-cart'
  | 'package'
  | 'layers'
  | 'wallet'

export interface WebModuleDefinition {
  id: WebModuleId
  path: string
  label: string
  shortLabel: string
  description: string
  iconKey: WebNavigationIconKey
  navBadge: string
  areaId: WebNavigationAreaId
  sectionLabel: string
  accent: string
  group: 'backoffice' | 'operations'
  requiredPermissions?: Permission[]
  allowedRoles?: UserRole[]
}

export interface WebModuleAccessContext {
  currentRole?: UserRole | null
  hasPermission: (permission: Permission) => boolean
}

export interface WebNavigationAreaDefinition {
  id: WebNavigationAreaId
  label: string
  description: string
  iconKey: WebNavigationIconKey
}

export interface WebNavigationAreaWithModules extends WebNavigationAreaDefinition {
  modules: WebModuleDefinition[]
}

export const webNavigationAreas: WebNavigationAreaDefinition[] = [
  {
    id: 'panel',
    label: 'Panel',
    description: 'Vista general del negocio y punto de entrada principal.',
    iconKey: 'home',
  },
  {
    id: 'sales',
    label: 'Ventas',
    description: 'Ventas, documentos comerciales y gesti\u00f3n de clientes.',
    iconKey: 'shopping-cart',
  },
  {
    id: 'cash',
    label: 'Caja',
    description: 'Operaci\u00f3n de caja diaria, aperturas y cierres.',
    iconKey: 'wallet',
  },
  {
    id: 'inventory',
    label: 'Inventario',
    description: 'Cat\u00e1logo de productos, stock y control operativo.',
    iconKey: 'package',
  },
  {
    id: 'purchases',
    label: 'Compras',
    description: 'Recepci\u00f3n documental y relaci\u00f3n con proveedores.',
    iconKey: 'truck',
  },
  {
    id: 'reports',
    label: 'Reportes',
    description: 'An\u00e1lisis del negocio y espacio listo para crecer por categor\u00edas.',
    iconKey: 'bar-chart',
  },
  {
    id: 'administration',
    label: 'Administraci\u00f3n',
    description: 'Gesti\u00f3n interna del negocio, estructura y configuraci\u00f3n.',
    iconKey: 'settings',
  },
  {
    id: 'team',
    label: 'Equipo',
    description: 'Usuarios, invitaciones y accesos del negocio.',
    iconKey: 'user-check',
  },
]

export const webModules: WebModuleDefinition[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Panel',
    shortLabel: 'Panel',
    description: 'Resumen ejecutivo del negocio con accesos y alertas clave.',
    iconKey: 'home',
    navBadge: 'DB',
    areaId: 'panel',
    sectionLabel: 'Panel',
    accent: 'Vista general',
    group: 'backoffice',
  },
  {
    id: 'clients',
    path: '/clients',
    label: 'Clientes',
    shortLabel: 'Clientes',
    description: 'Clientes frecuentes, ficha comercial y datos para vender mejor.',
    iconKey: 'users',
    navBadge: 'CL',
    areaId: 'sales',
    sectionLabel: 'Ventas',
    accent: 'Relacion comercial',
    group: 'backoffice',
    allowedRoles: ['owner', 'admin'],
  },
  {
    id: 'suppliers',
    path: '/suppliers',
    label: 'Proveedores',
    shortLabel: 'Proveedores',
    description: 'Proveedores activos, contactos y base para compras del negocio.',
    iconKey: 'truck',
    navBadge: 'PR',
    areaId: 'purchases',
    sectionLabel: 'Compras',
    accent: 'Abastecimiento',
    group: 'backoffice',
    allowedRoles: ['owner', 'admin'],
  },
  {
    id: 'employees',
    path: '/employees',
    label: 'Personal',
    shortLabel: 'Personal',
    description: 'Ficha laboral, datos base y seguimiento del personal del negocio.',
    iconKey: 'briefcase',
    navBadge: 'PS',
    areaId: 'administration',
    sectionLabel: 'Administraci\u00f3n',
    accent: 'Gesti\u00f3n interna',
    group: 'backoffice',
    requiredPermissions: ['users:manage'],
  },
  {
    id: 'roles',
    path: '/roles',
    label: 'Roles y permisos',
    shortLabel: 'Roles',
    description: 'Perfiles de acceso y permisos para ordenar qui\u00e9n puede hacer qu\u00e9.',
    iconKey: 'shield',
    navBadge: 'RL',
    areaId: 'administration',
    sectionLabel: 'Administraci\u00f3n',
    accent: 'Control de acceso',
    group: 'backoffice',
    requiredPermissions: ['users:manage'],
  },
  {
    id: 'received-documents',
    path: '/received-documents',
    label: 'Documentos recibidos',
    shortLabel: 'Recibidos',
    description: 'Recepci\u00f3n documental para compras, respaldos y control tributario.',
    iconKey: 'inbox',
    navBadge: 'DR',
    areaId: 'purchases',
    sectionLabel: 'Compras',
    accent: 'Recepci\u00f3n documental',
    group: 'backoffice',
    allowedRoles: ['owner', 'admin'],
  },
  {
    id: 'issued-documents',
    path: '/issued-documents',
    label: 'Documentos emitidos',
    shortLabel: 'Emitidos',
    description: 'Documentos comerciales emitidos a clientes desde el negocio.',
    iconKey: 'receipt',
    navBadge: 'DE',
    areaId: 'sales',
    sectionLabel: 'Ventas',
    accent: 'Emisi\u00f3n comercial',
    group: 'backoffice',
    allowedRoles: ['owner', 'admin'],
  },
  {
    id: 'credit-notes',
    path: '/credit-notes',
    label: 'Notas de cr\u00e9dito',
    shortLabel: 'Notas',
    description: 'Correcciones, referencias y anulaciones sobre documentos emitidos.',
    iconKey: 'rotate-ccw',
    navBadge: 'NC',
    areaId: 'sales',
    sectionLabel: 'Ventas',
    accent: 'Ajustes comerciales',
    group: 'backoffice',
    allowedRoles: ['owner', 'admin'],
  },
  {
    id: 'reports',
    path: '/reports',
    label: 'Reportes',
    shortLabel: 'Reportes',
    description: 'Indicadores y reportes para tomar decisiones del negocio.',
    iconKey: 'bar-chart',
    navBadge: 'RP',
    areaId: 'reports',
    sectionLabel: 'Reportes',
    accent: 'Control del negocio',
    group: 'backoffice',
    requiredPermissions: ['reports:read'],
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Configuraci\u00f3n',
    shortLabel: 'Config',
    description: 'Par\u00e1metros del negocio, preferencias y ajustes generales del sistema.',
    iconKey: 'settings',
    navBadge: 'CF',
    areaId: 'administration',
    sectionLabel: 'Administraci\u00f3n',
    accent: 'Ajustes generales',
    group: 'backoffice',
    requiredPermissions: ['settings:manage'],
  },
  {
    id: 'team',
    path: '/team',
    label: 'Usuarios y accesos',
    shortLabel: 'Usuarios',
    description: 'Invitaciones, membres\u00edas y accesos del equipo sin mezclarlo con personal.',
    iconKey: 'user-check',
    navBadge: 'EQ',
    areaId: 'team',
    sectionLabel: 'Equipo',
    accent: 'Equipo activo',
    group: 'backoffice',
    requiredPermissions: ['users:manage'],
  },
  {
    id: 'sales',
    path: '/sales',
    label: 'Ventas',
    shortLabel: 'Ventas',
    description: 'Cobro r\u00e1pido, flujo de venta y atenci\u00f3n diaria en caja.',
    iconKey: 'shopping-cart',
    navBadge: 'VT',
    areaId: 'sales',
    sectionLabel: 'Ventas',
    accent: 'Punto de venta',
    group: 'operations',
    requiredPermissions: ['sales:create'],
  },
  {
    id: 'products',
    path: '/products',
    label: 'Productos',
    shortLabel: 'Productos',
    description: 'Cat\u00e1logo de productos, c\u00f3digos, formatos y datos de venta.',
    iconKey: 'package',
    navBadge: 'PD',
    areaId: 'inventory',
    sectionLabel: 'Inventario',
    accent: 'Cat\u00e1logo comercial',
    group: 'operations',
    requiredPermissions: ['products:write'],
  },
  {
    id: 'inventory',
    path: '/inventory',
    label: 'Inventario',
    shortLabel: 'Inventario',
    description: 'Stock disponible, ajustes, reposici\u00f3n y movimientos del inventario.',
    iconKey: 'layers',
    navBadge: 'IN',
    areaId: 'inventory',
    sectionLabel: 'Inventario',
    accent: 'Control de stock',
    group: 'operations',
    requiredPermissions: ['inventory:read'],
  },
  {
    id: 'cash',
    path: '/cash',
    label: 'Caja',
    shortLabel: 'Caja',
    description: 'Apertura, cierre y control diario del efectivo en caja.',
    iconKey: 'wallet',
    navBadge: 'CJ',
    areaId: 'cash',
    sectionLabel: 'Caja',
    accent: 'Control de caja',
    group: 'operations',
    requiredPermissions: ['cash:open', 'cash:close'],
  },
]

export const getWebModuleById = (moduleId: WebModuleId) =>
  webModules.find((module) => module.id === moduleId)

export const getWebNavigationAreaById = (areaId: WebNavigationAreaId) =>
  webNavigationAreas.find((area) => area.id === areaId)

export const getWebModulePathById = (moduleId: WebModuleId) =>
  getWebModuleById(moduleId)?.path

export const getWebModuleByPath = (pathname: string) =>
  [...webModules]
    .sort((left, right) => right.path.length - left.path.length)
    .find((module) => pathname === module.path || pathname.startsWith(`${module.path}/`))

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

export const getAccessibleWebModules = (context: WebModuleAccessContext) =>
  webModules.filter((module) => canAccessWebModule(module, context))

export const getAccessibleWebNavigationAreas = (
  context: WebModuleAccessContext,
): WebNavigationAreaWithModules[] => {
  const visibleModules = getAccessibleWebModules(context)

  return webNavigationAreas
    .map((area) => ({
      ...area,
      modules: visibleModules.filter((module) => module.areaId === area.id),
    }))
    .filter((area) => area.modules.length)
}

export const getDefaultWebModule = (context: WebModuleAccessContext) => {
  const visibleModules = getAccessibleWebModules(context)
  return visibleModules.find((module) => module.id === 'dashboard') ?? visibleModules[0]
}
