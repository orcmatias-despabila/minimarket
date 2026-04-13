import {
  adminTableNames,
  createAdminDataError,
  getAdminSupabaseClient,
  logAdminEmptyResult,
  resolvePagination,
  toPaginatedResult,
} from './adminBase'
import {
  mapEmployeeRow,
  mapEmployeeJobInfoRow,
  toEmployeeInsert,
  toEmployeeJobInfoInsert,
  type AdminEmployeeJobInfoRow,
  type AdminEmployeeRow,
} from './adminPeopleMappers'
import {
  logPeopleDebug,
  logPeopleWarning,
  normalizeArchivedFilter,
  normalizeRut,
} from './adminPeopleSupport'
import { validateEmployeePayload } from './adminPeopleValidators'
import type {
  AdminEmployee,
  AdminEmployeeJobInfo,
  AdminEmployeeListFilters,
  AdminEmployeeStatus,
  AdminEmployeeWriteInput,
} from '../types/adminEmployee'
import type { AdminPaginatedResult } from '../types/adminShared'

const baseEmployeeFields = `
  id,
  business_id,
  employee_code,
  first_name,
  last_name,
  full_name,
  preferred_name,
  tax_id,
  birth_date,
  personal_email,
  phone,
  emergency_contact_name,
  emergency_contact_phone,
  address_line1,
  address_line2,
  commune,
  city,
  region,
  country,
  notes,
  status,
  archived_at,
  created_at,
  updated_at
`

const employeeJobInfoFields = `
  id,
  business_id,
  employee_id,
  employment_type,
  job_title,
  department,
  cost_center,
  manager_employee_id,
  branch_name,
  hire_date,
  contract_start_date,
  contract_end_date,
  shift_name,
  weekly_hours,
  salary_currency,
  base_salary,
  variable_salary,
  status,
  archived_at,
  created_at,
  updated_at
`

const employeeAccessFields = `
  id,
  business_id,
  employee_id,
  user_id,
  role_id,
  email,
  access_status,
  invited_at,
  activated_at,
  last_login_at,
  passwordless_only,
  must_rotate_access,
  notes,
  archived_at,
  created_at,
  updated_at,
  roles (
    id,
    business_id,
    code,
    name,
    description,
    is_system,
    archived_at,
    created_at,
    updated_at
  )
`

const getEmployeeSelect = (
  filters?: Pick<AdminEmployeeListFilters, 'accessStatus' | 'roleId' | 'department'>,
) => `
  ${baseEmployeeFields},
  employee_job_info${filters?.department ? '!inner' : ''} (
    ${employeeJobInfoFields}
  ),
  employee_access${
    filters?.accessStatus && filters.accessStatus !== 'all' && filters.accessStatus !== 'none'
      ? '!inner'
      : filters?.roleId
        ? '!inner'
        : ''
  } (
    ${employeeAccessFields}
  )
`

const jobInfoSelect = `
  id,
  business_id,
  employee_id,
  employment_type,
  job_title,
  department,
  cost_center,
  manager_employee_id,
  branch_name,
  hire_date,
  contract_start_date,
  contract_end_date,
  shift_name,
  weekly_hours,
  salary_currency,
  base_salary,
  variable_salary,
  status,
  archived_at,
  created_at,
  updated_at
`

const assertUniqueEmployeeRut = async (
  businessId: string,
  taxId: string,
  employeeId?: string,
) => {
  const client = getAdminSupabaseClient()
  const normalizedTaxId = normalizeRut(taxId)

  if (!normalizedTaxId) {
    throw new Error('El RUT del trabajador no es valido.')
  }

  let query = client
    .from(adminTableNames.employees)
    .select('id')
    .eq('business_id', businessId)
    .eq('tax_id_normalized', normalizedTaxId)
    .is('archived_at', null)

  if (employeeId) {
    query = query.neq('id', employeeId)
  }

  const result = await query.limit(1)

  if (result.error) {
    throw createAdminDataError(adminTableNames.employees, 'la validacion de RUT de trabajadores', result.error, {
      businessId,
      taxId: normalizedTaxId,
      employeeId,
      operation: 'validate-rut-unique',
    })
  }

  if ((result.data ?? []).length) {
    throw new Error('Ya existe un trabajador con ese RUT en este negocio.')
  }
}

const upsertJobInfo = async (
  businessId: string,
  employeeId: string,
  jobInfo?: ReturnType<typeof validateEmployeePayload>['jobInfo'],
): Promise<AdminEmployeeJobInfo | undefined> => {
  if (!jobInfo) {
    return undefined
  }

  const client = getAdminSupabaseClient()
  const payload = toEmployeeJobInfoInsert(businessId, employeeId, jobInfo)
  const existingResult = await client
    .from(adminTableNames.employeeJobInfo)
    .select('id')
    .eq('business_id', businessId)
    .eq('employee_id', employeeId)
    .maybeSingle<{ id: string }>()

  if (existingResult.error) {
    throw createAdminDataError(adminTableNames.employeeJobInfo, 'la busqueda de datos laborales', existingResult.error, {
      businessId,
      employeeId,
      operation: 'find-job-info',
    })
  }

  const result = existingResult.data
    ? await client
        .from(adminTableNames.employeeJobInfo)
        .update(payload)
        .eq('id', existingResult.data.id)
        .select(jobInfoSelect)
        .single<AdminEmployeeJobInfoRow>()
    : await client
        .from(adminTableNames.employeeJobInfo)
        .insert(payload)
        .select(jobInfoSelect)
        .single<AdminEmployeeJobInfoRow>()

  if (result.error) {
    throw createAdminDataError(adminTableNames.employeeJobInfo, 'los datos laborales del trabajador', result.error, {
      businessId,
      employeeId,
      operation: 'upsert-job-info',
    })
  }

  return mapEmployeeJobInfoRow(result.data)
}

export const adminEmployeesService = {
  async list(filters: AdminEmployeeListFilters): Promise<AdminPaginatedResult<AdminEmployee>> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.employees
    const { from, to, page, pageSize } = resolvePagination(filters)
    const archived = normalizeArchivedFilter(filters.archived)

    logPeopleDebug(sourceName, 'list:start', {
      businessId: filters.businessId,
      page,
      pageSize,
      status: filters.status ?? 'all',
      archived,
      accessStatus: filters.accessStatus ?? 'all',
      roleId: filters.roleId ?? null,
    })

    let query = client
      .from(sourceName)
      .select(getEmployeeSelect(filters), { count: 'exact' })
      .eq('business_id', filters.businessId)

    if (archived === 'active') {
      query = query.is('archived_at', null)
    } else if (archived === 'archived') {
      query = query.not('archived_at', 'is', null)
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters.accessStatus && filters.accessStatus !== 'all') {
      if (filters.accessStatus === 'none') {
        query = query.is('employee_access.id', null)
      } else if (filters.accessStatus === 'revoked') {
        query = query.not('employee_access.archived_at', 'is', null)
      } else {
        query = query.eq('employee_access.access_status', filters.accessStatus).is('employee_access.archived_at', null)
      }
    }

    if (filters.roleId) {
      query = query.eq('employee_access.role_id', filters.roleId)
    }

    if (filters.department?.trim()) {
      query = query.eq('employee_job_info.department', filters.department.trim())
    }

    const search = filters.search?.trim()
    if (search) {
      const normalizedTaxId = normalizeRut(search)
      const clauses = [
        `first_name.ilike.%${search}%`,
        `last_name.ilike.%${search}%`,
        `full_name.ilike.%${search}%`,
        `preferred_name.ilike.%${search}%`,
        `personal_email.ilike.%${search}%`,
        `phone.ilike.%${search}%`,
        `employee_code.ilike.%${search}%`,
        `tax_id.ilike.%${search}%`,
      ]

      if (normalizedTaxId) {
        clauses.push(`tax_id_normalized.eq.${normalizedTaxId}`)
      }

      query = query.or(clauses.join(','))
    }

    const result = await query.order('last_name').order('first_name').range(from, to)

    if (result.error) {
      throw createAdminDataError(sourceName, 'trabajadores', result.error, filters)
    }

    let items = (result.data ?? []).map((row) => mapEmployeeRow(row as AdminEmployeeRow))

    if (filters.accessStatus === 'none') {
      items = items.filter((item) => !item.currentAccess)
    }

    if (!items.length) {
      logAdminEmptyResult(sourceName, filters)
    }

    logPeopleDebug(sourceName, 'list:done', {
      businessId: filters.businessId,
      returned: items.length,
      total: result.count ?? 0,
    })

    return toPaginatedResult(items, result.count ?? 0, { page, pageSize })
  },

  async getById(employeeId: string): Promise<AdminEmployee | null> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.employees

    const result = await client
      .from(sourceName)
      .select(getEmployeeSelect())
      .eq('id', employeeId)
      .maybeSingle<AdminEmployeeRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el detalle del trabajador', result.error, { employeeId })
    }

    return result.data ? mapEmployeeRow(result.data) : null
  },

  async create(input: AdminEmployeeWriteInput): Promise<AdminEmployee> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.employees
    const payload = validateEmployeePayload(input)

    logPeopleDebug(sourceName, 'create:start', {
      businessId: payload.businessId,
      taxId: payload.taxId,
      hasJobInfo: Boolean(payload.jobInfo),
    })

    await assertUniqueEmployeeRut(payload.businessId, payload.taxId)

    const employeeResult = await client
      .from(sourceName)
      .insert(toEmployeeInsert(payload))
      .select(getEmployeeSelect())
      .single<AdminEmployeeRow>()

    if (employeeResult.error) {
      throw createAdminDataError(sourceName, 'el trabajador', employeeResult.error, {
        businessId: payload.businessId,
        operation: 'create',
      })
    }

    await upsertJobInfo(payload.businessId, employeeResult.data.id, payload.jobInfo)

    const employee = await this.getById(employeeResult.data.id)
    if (!employee) {
      throw new Error('No pudimos recargar el trabajador creado.')
    }

    logPeopleDebug(sourceName, 'create:done', {
      businessId: payload.businessId,
      employeeId: employee.id,
    })

    return employee
  },

  async update(employeeId: string, input: AdminEmployeeWriteInput): Promise<AdminEmployee> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.employees
    const payload = validateEmployeePayload(input)

    logPeopleDebug(sourceName, 'update:start', {
      businessId: payload.businessId,
      employeeId,
      taxId: payload.taxId,
      hasJobInfo: Boolean(payload.jobInfo),
    })

    await assertUniqueEmployeeRut(payload.businessId, payload.taxId, employeeId)

    const employeeResult = await client
      .from(sourceName)
      .update(toEmployeeInsert(payload))
      .eq('id', employeeId)
      .select(getEmployeeSelect())
      .single<AdminEmployeeRow>()

    if (employeeResult.error) {
      throw createAdminDataError(sourceName, 'el trabajador', employeeResult.error, {
        employeeId,
        operation: 'update',
      })
    }

    await upsertJobInfo(payload.businessId, employeeId, payload.jobInfo)

    const employee = await this.getById(employeeId)
    if (!employee) {
      throw new Error('No pudimos recargar el trabajador actualizado.')
    }

    logPeopleDebug(sourceName, 'update:done', {
      businessId: payload.businessId,
      employeeId,
    })

    return employee
  },

  async setStatus(employeeId: string, status: AdminEmployeeStatus): Promise<AdminEmployee> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.employees

    logPeopleDebug(sourceName, 'set-status:start', { employeeId, status })

    const result = await client
      .from(sourceName)
      .update({ status })
      .eq('id', employeeId)
      .select(getEmployeeSelect())
      .single<AdminEmployeeRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el estado del trabajador', result.error, {
        employeeId,
        status,
        operation: 'set-status',
      })
    }

    const employee = mapEmployeeRow(result.data)

    logPeopleDebug(sourceName, 'set-status:done', { employeeId, status })

    return employee
  },

  async activate(employeeId: string) {
    return this.setStatus(employeeId, 'active')
  },

  async deactivate(employeeId: string) {
    return this.setStatus(employeeId, 'inactive')
  },

  async archive(employeeId: string): Promise<AdminEmployee> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.employees

    logPeopleWarning(sourceName, 'archive:start', { employeeId })

    const result = await client
      .from(sourceName)
      .update({ archived_at: new Date().toISOString() })
      .eq('id', employeeId)
      .select(getEmployeeSelect())
      .single<AdminEmployeeRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el archivado del trabajador', result.error, {
        employeeId,
        operation: 'archive',
      })
    }

    logPeopleWarning(sourceName, 'archive:done', { employeeId })

    return mapEmployeeRow(result.data)
  },

  async remove(employeeId: string): Promise<void> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.employees

    logPeopleWarning(sourceName, 'delete:start', { employeeId })

    const result = await client.from(sourceName).delete().eq('id', employeeId)

    if (result.error) {
      throw createAdminDataError(sourceName, 'la eliminacion del trabajador', result.error, {
        employeeId,
        operation: 'delete',
      })
    }

    logPeopleWarning(sourceName, 'delete:done', { employeeId })
  },
}
