import type { AdminListFilterBase } from './adminShared'
import type { AdminEmployeeAccessState } from './adminEmployee'

export interface AdminEmployeeAccess {
  id: string
  businessId: string
  employeeId: string
  userId?: string
  roleId?: string
  roleCode?: string
  roleName?: string
  email?: string
  accessStatus: AdminEmployeeAccessState
  invitedAt?: string
  activatedAt?: string
  lastLoginAt?: string
  passwordlessOnly: boolean
  mustRotateAccess: boolean
  notes?: string
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

export interface AdminEmployeeAccessListFilters extends AdminListFilterBase {
  accessStatus?: Exclude<AdminEmployeeAccessState, 'none'> | 'all'
  roleId?: string
}

export interface AdminEmployeeAccessWriteInput {
  businessId: string
  employeeId: string
  userId?: string
  roleId?: string
  email?: string
  accessStatus?: Exclude<AdminEmployeeAccessState, 'none'>
  passwordlessOnly?: boolean
  mustRotateAccess?: boolean
  notes?: string
}
