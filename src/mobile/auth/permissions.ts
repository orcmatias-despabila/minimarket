import type {
  BusinessPermissionKey,
  Permission,
  UserRole,
} from '../../types/domain'

export const businessPermissionLabels: Record<BusinessPermissionKey, string> = {
  can_sell: 'Vender y cobrar',
  can_add_stock: 'Agregar stock',
  can_create_products: 'Crear productos',
  can_edit_products: 'Editar productos',
  can_view_reports: 'Ver reportes',
  can_manage_users: 'Gestionar usuarios',
}

const allBusinessPermissions = Object.keys(
  businessPermissionLabels,
) as BusinessPermissionKey[]

const defaultRolePermissions: Record<UserRole, BusinessPermissionKey[]> = {
  owner: allBusinessPermissions,
  admin: [
    'can_sell',
    'can_add_stock',
    'can_create_products',
    'can_edit_products',
    'can_view_reports',
    'can_manage_users',
  ],
  cashier: ['can_sell'],
  inventory: ['can_add_stock', 'can_create_products', 'can_edit_products'],
}

const appPermissionMap: Record<Permission, BusinessPermissionKey[]> = {
  'sales:create': ['can_sell'],
  'sales:read': ['can_sell'],
  'inventory:read': ['can_add_stock', 'can_create_products', 'can_edit_products'],
  'inventory:write': ['can_add_stock', 'can_edit_products'],
  'products:read': [
    'can_sell',
    'can_add_stock',
    'can_create_products',
    'can_edit_products',
  ],
  'products:write': ['can_create_products', 'can_edit_products'],
  'reports:read': ['can_view_reports'],
  'cash:open': ['can_sell'],
  'cash:close': ['can_sell'],
  'settings:manage': [],
  'users:manage': ['can_manage_users'],
  'exports:run': ['can_view_reports'],
  'devices:manage': [],
  'sync:manage': [],
}

export const getDefaultBusinessPermissions = (
  role: UserRole | null | undefined,
): BusinessPermissionKey[] => (role ? defaultRolePermissions[role] : [])

export const getGrantedBusinessPermissions = (
  role: UserRole | null | undefined,
  customPermissions?: BusinessPermissionKey[] | null,
): BusinessPermissionKey[] => {
  if (!role) return []
  if (role === 'owner') return defaultRolePermissions.owner
  return customPermissions ?? defaultRolePermissions[role]
}

export const hasBusinessPermissionKey = (
  role: UserRole | null | undefined,
  permissionKey: BusinessPermissionKey,
  customPermissions?: BusinessPermissionKey[] | null,
): boolean => getGrantedBusinessPermissions(role, customPermissions).includes(permissionKey)

export const getRolePermissions = (
  role: UserRole | null | undefined,
  customPermissions?: BusinessPermissionKey[] | null,
): Permission[] => {
  const grantedKeys = getGrantedBusinessPermissions(role, customPermissions)
  return (Object.keys(appPermissionMap) as Permission[]).filter((permission) =>
    appPermissionMap[permission].some((key) => grantedKeys.includes(key)),
  )
}

export const hasPermission = (
  role: UserRole | null | undefined,
  permission: Permission,
  customPermissions?: BusinessPermissionKey[] | null,
): boolean => {
  if (role === 'owner') return true
  const grantedKeys = getGrantedBusinessPermissions(role, customPermissions)
  return appPermissionMap[permission].some((key) => grantedKeys.includes(key))
}

export const canManageUsers = (
  role: UserRole | null | undefined,
  customPermissions?: BusinessPermissionKey[] | null,
) => hasPermission(role, 'users:manage', customPermissions)

export const businessPermissionOptions = allBusinessPermissions
