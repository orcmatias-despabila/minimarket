import type { AdminListFilterBase } from './adminShared'

export type AdminEmployeeStatus = 'active' | 'inactive' | 'leave' | 'terminated'
export type AdminArchivedFilter = 'active' | 'archived' | 'all'
export type AdminEmployeeAccessState = 'pending' | 'active' | 'suspended' | 'revoked' | 'none'

export interface AdminEmployee {
  id: string
  businessId: string
  employeeCode?: string
  firstName: string
  lastName: string
  fullName: string
  preferredName?: string
  taxId: string
  birthDate?: string
  personalEmail?: string
  phone?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  addressLine1?: string
  addressLine2?: string
  commune?: string
  city?: string
  region?: string
  country: string
  notes?: string
  status: AdminEmployeeStatus
  archivedAt?: string
  createdAt: string
  updatedAt: string
  currentJob?: AdminEmployeeJobInfo
  currentAccess?: AdminEmployeeAccessSummary
}

export interface AdminEmployeeJobInfo {
  id: string
  businessId: string
  employeeId: string
  employmentType: string
  jobTitle: string
  department?: string
  costCenter?: string
  managerEmployeeId?: string
  branchName?: string
  hireDate?: string
  contractStartDate?: string
  contractEndDate?: string
  shiftName?: string
  weeklyHours?: number
  salaryCurrency: string
  baseSalary?: number
  variableSalary?: number
  status: AdminEmployeeStatus
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

export interface AdminEmployeeAccessSummary {
  id: string
  businessId: string
  employeeId: string
  userId?: string
  roleId?: string
  roleCode?: string
  roleName?: string
  email?: string
  accessStatus: Exclude<AdminEmployeeAccessState, 'none'>
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

export interface AdminEmployeeListFilters extends AdminListFilterBase {
  status?: AdminEmployeeStatus | 'all'
  archived?: AdminArchivedFilter
  accessStatus?: AdminEmployeeAccessState | 'all'
  roleId?: string
  department?: string
}

export interface AdminEmployeeJobInfoInput {
  employmentType?: string
  jobTitle: string
  department?: string
  costCenter?: string
  managerEmployeeId?: string
  branchName?: string
  hireDate?: string
  contractStartDate?: string
  contractEndDate?: string
  shiftName?: string
  weeklyHours?: number
  salaryCurrency?: string
  baseSalary?: number
  variableSalary?: number
  status?: AdminEmployeeStatus
}

export interface AdminEmployeeWriteInput {
  businessId: string
  employeeCode?: string
  firstName: string
  lastName: string
  preferredName?: string
  taxId: string
  birthDate?: string
  personalEmail?: string
  phone?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  addressLine1?: string
  addressLine2?: string
  commune?: string
  city?: string
  region?: string
  country?: string
  notes?: string
  status?: AdminEmployeeStatus
  jobInfo?: AdminEmployeeJobInfoInput
}
