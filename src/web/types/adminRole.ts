import type { AdminListFilterBase } from './adminShared'

export type AdminRoleState = 'active' | 'inactive'

export interface AdminRole {
  id: string
  businessId: string
  code: string
  name: string
  description?: string
  isSystem: boolean
  status: AdminRoleState
  archivedAt?: string
  createdAt: string
  updatedAt: string
  permissionCount?: number
}

export interface AdminRoleListFilters extends AdminListFilterBase {
  status?: AdminRoleState | 'all'
}

export interface AdminRoleWriteInput {
  businessId: string
  code: string
  name: string
  description?: string
}
