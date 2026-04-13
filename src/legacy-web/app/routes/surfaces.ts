export type AppSurface = 'pos' | 'admin'

export interface AppRouteDefinition {
  id: string
  surface: AppSurface
  moduleId:
    | 'products'
    | 'inventory'
    | 'sales'
    | 'cash'
    | 'reports'
    | 'settings'
  path: string
  requiresAuth: boolean
}

export const appRoutes: AppRouteDefinition[] = [
  { id: 'pos-sales', surface: 'pos', moduleId: 'sales', path: '/sales', requiresAuth: true },
  {
    id: 'admin-products',
    surface: 'admin',
    moduleId: 'products',
    path: '/admin/products',
    requiresAuth: true,
  },
  {
    id: 'admin-inventory',
    surface: 'admin',
    moduleId: 'inventory',
    path: '/admin/inventory',
    requiresAuth: true,
  },
  {
    id: 'admin-cash',
    surface: 'admin',
    moduleId: 'cash',
    path: '/admin/cash',
    requiresAuth: true,
  },
  {
    id: 'admin-reports',
    surface: 'admin',
    moduleId: 'reports',
    path: '/admin/reports',
    requiresAuth: true,
  },
  {
    id: 'admin-settings',
    surface: 'admin',
    moduleId: 'settings',
    path: '/admin/settings',
    requiresAuth: true,
  },
]
