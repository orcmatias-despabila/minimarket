import type { AdminPermission } from '../types/adminPermission'

export type AdminPermissionMatrixModule =
  | 'clients'
  | 'suppliers'
  | 'documents'
  | 'inventory'
  | 'sales'
  | 'personal'
  | 'settings'

export type AdminPermissionMatrixAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'export'

export interface AdminPermissionMatrixCell {
  moduleKey: AdminPermissionMatrixModule
  moduleLabel: string
  actionKey: AdminPermissionMatrixAction
  actionLabel: string
  permission?: AdminPermission
}

export interface AdminPermissionMatrixRow {
  moduleKey: AdminPermissionMatrixModule
  moduleLabel: string
  cells: AdminPermissionMatrixCell[]
}

const moduleLabels: Record<AdminPermissionMatrixModule, string> = {
  clients: 'Clientes',
  suppliers: 'Proveedores',
  documents: 'Documentos',
  inventory: 'Inventario',
  sales: 'Ventas',
  personal: 'Personal',
  settings: 'Configuracion',
}

const actionLabels: Record<AdminPermissionMatrixAction, string> = {
  read: 'Ver',
  create: 'Crear',
  update: 'Editar',
  delete: 'Eliminar',
  approve: 'Aprobar',
  export: 'Exportar',
}

export const adminPermissionMatrixModules = Object.keys(moduleLabels) as AdminPermissionMatrixModule[]
export const adminPermissionMatrixActions = Object.keys(actionLabels) as AdminPermissionMatrixAction[]

export const getAdminPermissionModuleLabel = (moduleKey: AdminPermissionMatrixModule) =>
  moduleLabels[moduleKey]

export const getAdminPermissionActionLabel = (actionKey: AdminPermissionMatrixAction) =>
  actionLabels[actionKey]

export const buildAdminPermissionMatrix = (permissions: AdminPermission[]): AdminPermissionMatrixRow[] => {
  const permissionMap = new Map<string, AdminPermission>()

  permissions.forEach((permission) => {
    permissionMap.set(permission.code, permission)
  })

  return adminPermissionMatrixModules.map((moduleKey) => ({
    moduleKey,
    moduleLabel: getAdminPermissionModuleLabel(moduleKey),
    cells: adminPermissionMatrixActions.map((actionKey) => ({
      moduleKey,
      moduleLabel: getAdminPermissionModuleLabel(moduleKey),
      actionKey,
      actionLabel: getAdminPermissionActionLabel(actionKey),
      permission: permissionMap.get(`${moduleKey}.${actionKey}`),
    })),
  }))
}

export const getAdvancedPermissions = (permissions: AdminPermission[]) => {
  const matrixCodes = new Set(
    adminPermissionMatrixModules.flatMap((moduleKey) =>
      adminPermissionMatrixActions.map((actionKey) => `${moduleKey}.${actionKey}`),
    ),
  )

  return permissions.filter((permission) => !matrixCodes.has(permission.code))
}
