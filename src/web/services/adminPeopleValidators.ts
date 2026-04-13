import type { AdminEmployeeWriteInput } from '../types/adminEmployee'
import type { AdminRoleWriteInput } from '../types/adminRole'
import type { AdminRolePermissionAssignmentInput } from '../types/adminPermission'
import type { AdminEmployeeAccessWriteInput } from '../types/adminEmployeeAccess'
import {
  normalizeAccessStatus,
  normalizeEmployeeStatus,
  normalizeOptionalEmail,
  normalizeRequiredRut,
  normalizeRequiredText,
  normalizeText,
} from './adminPeopleSupport'

export const validateEmployeePayload = (input: AdminEmployeeWriteInput) => {
  const jobInfo = input.jobInfo
    ? {
        employmentType: normalizeText(input.jobInfo.employmentType) ?? 'contract',
        jobTitle: normalizeRequiredText(input.jobInfo.jobTitle, 'El cargo'),
        department: normalizeText(input.jobInfo.department),
        costCenter: normalizeText(input.jobInfo.costCenter),
        managerEmployeeId: normalizeText(input.jobInfo.managerEmployeeId),
        branchName: normalizeText(input.jobInfo.branchName),
        hireDate: normalizeText(input.jobInfo.hireDate),
        contractStartDate: normalizeText(input.jobInfo.contractStartDate),
        contractEndDate: normalizeText(input.jobInfo.contractEndDate),
        shiftName: normalizeText(input.jobInfo.shiftName),
        weeklyHours:
          input.jobInfo.weeklyHours == null ? undefined : Number(input.jobInfo.weeklyHours),
        salaryCurrency: normalizeText(input.jobInfo.salaryCurrency)?.toUpperCase() ?? 'CLP',
        baseSalary:
          input.jobInfo.baseSalary == null ? undefined : Number(input.jobInfo.baseSalary),
        variableSalary:
          input.jobInfo.variableSalary == null ? undefined : Number(input.jobInfo.variableSalary),
        status: normalizeEmployeeStatus(input.jobInfo.status, 'active'),
      }
    : undefined

  if (jobInfo?.weeklyHours != null && (Number.isNaN(jobInfo.weeklyHours) || jobInfo.weeklyHours < 0)) {
    throw new Error('Las horas semanales no son validas.')
  }

  if (jobInfo?.baseSalary != null && (Number.isNaN(jobInfo.baseSalary) || jobInfo.baseSalary < 0)) {
    throw new Error('El sueldo base no es valido.')
  }

  if (
    jobInfo?.variableSalary != null &&
    (Number.isNaN(jobInfo.variableSalary) || jobInfo.variableSalary < 0)
  ) {
    throw new Error('El sueldo variable no es valido.')
  }

  return {
    businessId: normalizeRequiredText(input.businessId, 'El negocio'),
    employeeCode: normalizeText(input.employeeCode),
    firstName: normalizeRequiredText(input.firstName, 'El nombre'),
    lastName: normalizeRequiredText(input.lastName, 'El apellido'),
    preferredName: normalizeText(input.preferredName),
    taxId: normalizeRequiredRut(input.taxId, 'El RUT del trabajador'),
    birthDate: normalizeText(input.birthDate),
    personalEmail: normalizeOptionalEmail(input.personalEmail, 'El correo personal'),
    phone: normalizeText(input.phone),
    emergencyContactName: normalizeText(input.emergencyContactName),
    emergencyContactPhone: normalizeText(input.emergencyContactPhone),
    addressLine1: normalizeText(input.addressLine1),
    addressLine2: normalizeText(input.addressLine2),
    commune: normalizeText(input.commune),
    city: normalizeText(input.city),
    region: normalizeText(input.region),
    country: normalizeText(input.country) ?? 'Chile',
    notes: normalizeText(input.notes),
    status: normalizeEmployeeStatus(input.status, 'active'),
    jobInfo,
  }
}

export const validateRolePayload = (input: AdminRoleWriteInput) => ({
  businessId: normalizeRequiredText(input.businessId, 'El negocio'),
  code: normalizeRequiredText(input.code, 'El codigo del rol').toLowerCase(),
  name: normalizeRequiredText(input.name, 'El nombre del rol'),
  description: normalizeText(input.description),
})

export const validateRolePermissionAssignmentPayload = (
  input: AdminRolePermissionAssignmentInput,
) => {
  const permissionIds = input.permissionIds
    .map((permissionId) => permissionId.trim())
    .filter(Boolean)

  return {
    businessId: normalizeRequiredText(input.businessId, 'El negocio'),
    roleId: normalizeRequiredText(input.roleId, 'El rol'),
    permissionIds: Array.from(new Set(permissionIds)),
  }
}

export const validateEmployeeAccessPayload = (input: AdminEmployeeAccessWriteInput) => ({
  businessId: normalizeRequiredText(input.businessId, 'El negocio'),
  employeeId: normalizeRequiredText(input.employeeId, 'El trabajador'),
  userId: normalizeText(input.userId),
  roleId: normalizeText(input.roleId),
  email: normalizeOptionalEmail(input.email, 'El correo de acceso'),
  accessStatus: normalizeAccessStatus(input.accessStatus, 'pending'),
  passwordlessOnly: Boolean(input.passwordlessOnly),
  mustRotateAccess: Boolean(input.mustRotateAccess),
  notes: normalizeText(input.notes),
})
