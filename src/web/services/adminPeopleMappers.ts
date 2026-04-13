import { formatRutForDisplay } from '../../lib/rut'
import type {
  AdminEmployee,
  AdminEmployeeAccessSummary,
  AdminEmployeeJobInfo,
  AdminEmployeeStatus,
} from '../types/adminEmployee'
import type { AdminEmployeeAccess } from '../types/adminEmployeeAccess'
import type { AdminPermission } from '../types/adminPermission'
import type { AdminRole } from '../types/adminRole'

type Nullable<T> = T | null

export interface AdminEmployeeJobInfoRow {
  id: string
  business_id: string
  employee_id: string
  employment_type: string
  job_title: string
  department: Nullable<string>
  cost_center: Nullable<string>
  manager_employee_id: Nullable<string>
  branch_name: Nullable<string>
  hire_date: Nullable<string>
  contract_start_date: Nullable<string>
  contract_end_date: Nullable<string>
  shift_name: Nullable<string>
  weekly_hours: Nullable<number>
  salary_currency: string
  base_salary: Nullable<number>
  variable_salary: Nullable<number>
  status: AdminEmployeeStatus
  archived_at: Nullable<string>
  created_at: string
  updated_at: string
}

export interface AdminRoleRow {
  id: string
  business_id: string
  code: string
  name: string
  description: Nullable<string>
  is_system: boolean
  archived_at: Nullable<string>
  created_at: string
  updated_at: string
}

export interface AdminPermissionRow {
  id: string
  business_id: string
  code: string
  name: string
  description: Nullable<string>
  module_name: string
  is_system: boolean
  archived_at: Nullable<string>
  created_at: string
  updated_at: string
}

export interface AdminEmployeeAccessRow {
  id: string
  business_id: string
  employee_id: string
  user_id: Nullable<string>
  role_id: Nullable<string>
  email: Nullable<string>
  access_status: 'pending' | 'active' | 'suspended' | 'revoked'
  invited_at: Nullable<string>
  activated_at: Nullable<string>
  last_login_at: Nullable<string>
  passwordless_only: boolean
  must_rotate_access: boolean
  notes: Nullable<string>
  archived_at: Nullable<string>
  created_at: string
  updated_at: string
  roles?: AdminRoleRow | AdminRoleRow[] | null
}

export interface AdminEmployeeRow {
  id: string
  business_id: string
  employee_code: Nullable<string>
  first_name: string
  last_name: string
  full_name: string
  preferred_name: Nullable<string>
  tax_id: string
  birth_date: Nullable<string>
  personal_email: Nullable<string>
  phone: Nullable<string>
  emergency_contact_name: Nullable<string>
  emergency_contact_phone: Nullable<string>
  address_line1: Nullable<string>
  address_line2: Nullable<string>
  commune: Nullable<string>
  city: Nullable<string>
  region: Nullable<string>
  country: string
  notes: Nullable<string>
  status: AdminEmployeeStatus
  archived_at: Nullable<string>
  created_at: string
  updated_at: string
  employee_job_info?: AdminEmployeeJobInfoRow[] | AdminEmployeeJobInfoRow | null
  employee_access?: AdminEmployeeAccessRow[] | AdminEmployeeAccessRow | null
}

const pickNested = <T>(value?: T[] | T | null): T | undefined => {
  if (!value) {
    return undefined
  }

  return Array.isArray(value) ? value[0] : value
}

export const mapEmployeeJobInfoRow = (row: AdminEmployeeJobInfoRow): AdminEmployeeJobInfo => ({
  id: row.id,
  businessId: row.business_id,
  employeeId: row.employee_id,
  employmentType: row.employment_type,
  jobTitle: row.job_title,
  department: row.department ?? undefined,
  costCenter: row.cost_center ?? undefined,
  managerEmployeeId: row.manager_employee_id ?? undefined,
  branchName: row.branch_name ?? undefined,
  hireDate: row.hire_date ?? undefined,
  contractStartDate: row.contract_start_date ?? undefined,
  contractEndDate: row.contract_end_date ?? undefined,
  shiftName: row.shift_name ?? undefined,
  weeklyHours: row.weekly_hours == null ? undefined : Number(row.weekly_hours),
  salaryCurrency: row.salary_currency,
  baseSalary: row.base_salary == null ? undefined : Number(row.base_salary),
  variableSalary: row.variable_salary == null ? undefined : Number(row.variable_salary),
  status: row.status,
  archivedAt: row.archived_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const mapRoleRow = (
  row: AdminRoleRow,
  permissionCount?: number,
): AdminRole => ({
  id: row.id,
  businessId: row.business_id,
  code: row.code,
  name: row.name,
  description: row.description ?? undefined,
  isSystem: row.is_system,
  status: row.archived_at ? 'inactive' : 'active',
  archivedAt: row.archived_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  permissionCount,
})

export const mapPermissionRow = (
  row: AdminPermissionRow,
  isAssigned?: boolean,
): AdminPermission => ({
  id: row.id,
  businessId: row.business_id,
  code: row.code,
  name: row.name,
  description: row.description ?? undefined,
  moduleName: row.module_name,
  isSystem: row.is_system,
  isAssigned,
  archivedAt: row.archived_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const mapEmployeeAccessRow = (row: AdminEmployeeAccessRow): AdminEmployeeAccess => {
  const role = pickNested(row.roles)

  return {
    id: row.id,
    businessId: row.business_id,
    employeeId: row.employee_id,
    userId: row.user_id ?? undefined,
    roleId: row.role_id ?? undefined,
    roleCode: role?.code,
    roleName: role?.name,
    email: row.email ?? undefined,
    accessStatus: row.archived_at ? 'revoked' : row.access_status,
    invitedAt: row.invited_at ?? undefined,
    activatedAt: row.activated_at ?? undefined,
    lastLoginAt: row.last_login_at ?? undefined,
    passwordlessOnly: row.passwordless_only,
    mustRotateAccess: row.must_rotate_access,
    notes: row.notes ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const mapEmployeeAccessSummaryRow = (
  row?: AdminEmployeeAccessRow | null,
): AdminEmployeeAccessSummary | undefined => {
  if (!row) {
    return undefined
  }

  const mapped = mapEmployeeAccessRow(row)

  return {
    ...mapped,
    accessStatus:
      mapped.accessStatus === 'revoked' ? 'revoked' : mapped.accessStatus,
  }
}

export const mapEmployeeRow = (row: AdminEmployeeRow): AdminEmployee => {
  const jobInfo = pickNested(row.employee_job_info)
  const access = pickNested(row.employee_access)

  return {
    id: row.id,
    businessId: row.business_id,
    employeeCode: row.employee_code ?? undefined,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    preferredName: row.preferred_name ?? undefined,
    taxId: formatRutForDisplay(row.tax_id) ?? row.tax_id,
    birthDate: row.birth_date ?? undefined,
    personalEmail: row.personal_email ?? undefined,
    phone: row.phone ?? undefined,
    emergencyContactName: row.emergency_contact_name ?? undefined,
    emergencyContactPhone: row.emergency_contact_phone ?? undefined,
    addressLine1: row.address_line1 ?? undefined,
    addressLine2: row.address_line2 ?? undefined,
    commune: row.commune ?? undefined,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    country: row.country,
    notes: row.notes ?? undefined,
    status: row.status,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentJob: jobInfo ? mapEmployeeJobInfoRow(jobInfo) : undefined,
    currentAccess: mapEmployeeAccessSummaryRow(access),
  }
}

export const toEmployeeInsert = (input: {
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
  country: string
  notes?: string
  status: AdminEmployeeStatus
}) => ({
  business_id: input.businessId,
  employee_code: input.employeeCode ?? null,
  first_name: input.firstName,
  last_name: input.lastName,
  preferred_name: input.preferredName ?? null,
  tax_id: input.taxId,
  birth_date: input.birthDate ?? null,
  personal_email: input.personalEmail ?? null,
  phone: input.phone ?? null,
  emergency_contact_name: input.emergencyContactName ?? null,
  emergency_contact_phone: input.emergencyContactPhone ?? null,
  address_line1: input.addressLine1 ?? null,
  address_line2: input.addressLine2 ?? null,
  commune: input.commune ?? null,
  city: input.city ?? null,
  region: input.region ?? null,
  country: input.country,
  notes: input.notes ?? null,
  status: input.status,
})

export const toEmployeeJobInfoInsert = (
  businessId: string,
  employeeId: string,
  input: {
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
  },
) => ({
  business_id: businessId,
  employee_id: employeeId,
  employment_type: input.employmentType,
  job_title: input.jobTitle,
  department: input.department ?? null,
  cost_center: input.costCenter ?? null,
  manager_employee_id: input.managerEmployeeId ?? null,
  branch_name: input.branchName ?? null,
  hire_date: input.hireDate ?? null,
  contract_start_date: input.contractStartDate ?? null,
  contract_end_date: input.contractEndDate ?? null,
  shift_name: input.shiftName ?? null,
  weekly_hours: input.weeklyHours ?? null,
  salary_currency: input.salaryCurrency,
  base_salary: input.baseSalary ?? null,
  variable_salary: input.variableSalary ?? null,
  status: input.status,
  archived_at: null,
})

export const toRoleInsert = (input: {
  businessId: string
  code: string
  name: string
  description?: string
}) => ({
  business_id: input.businessId,
  code: input.code,
  name: input.name,
  description: input.description ?? null,
})

export const toEmployeeAccessInsert = (input: {
  businessId: string
  employeeId: string
  userId?: string
  roleId?: string
  email?: string
  accessStatus: 'pending' | 'active' | 'suspended' | 'revoked'
  passwordlessOnly: boolean
  mustRotateAccess: boolean
  notes?: string
}) => ({
  business_id: input.businessId,
  employee_id: input.employeeId,
  user_id: input.userId ?? null,
  role_id: input.roleId ?? null,
  email: input.email ?? null,
  access_status: input.accessStatus,
  passwordless_only: input.passwordlessOnly,
  must_rotate_access: input.mustRotateAccess,
  notes: input.notes ?? null,
})
