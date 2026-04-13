import {
  adminTableNames,
  createAdminDataError,
  getAdminSupabaseClient,
  logAdminEmptyResult,
  resolvePagination,
  toPaginatedResult,
} from './adminBase'
import { mapEmployeeAccessRow, type AdminEmployeeAccessRow } from './adminPeopleMappers'
import { logPeopleDebug, logPeopleWarning } from './adminPeopleSupport'
import { validateEmployeeAccessPayload } from './adminPeopleValidators'
import type { AdminEmployeeAccess } from '../types/adminEmployeeAccess'
import type { AdminPaginatedResult } from '../types/adminShared'
import type { AdminEmployeeAccessListFilters, AdminEmployeeAccessWriteInput } from '../types/adminEmployeeAccess'

const employeeAccessSelect = `
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

const findByEmployee = async (employeeId: string) => {
  const client = getAdminSupabaseClient()
  const result = await client
    .from(adminTableNames.employeeAccess)
    .select(employeeAccessSelect)
    .eq('employee_id', employeeId)
    .maybeSingle<AdminEmployeeAccessRow>()

  if (result.error) {
    throw createAdminDataError(adminTableNames.employeeAccess, 'el acceso del trabajador', result.error, {
      employeeId,
    })
  }

  return result.data ? mapEmployeeAccessRow(result.data) : null
}

export const adminEmployeeAccessService = {
  async list(filters: AdminEmployeeAccessListFilters): Promise<AdminPaginatedResult<AdminEmployeeAccess>> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.employeeAccess
    const { from, to, page, pageSize } = resolvePagination(filters)

    logPeopleDebug(sourceName, 'list:start', {
      businessId: filters.businessId,
      page,
      pageSize,
      accessStatus: filters.accessStatus ?? 'all',
      roleId: filters.roleId ?? null,
    })

    let query = client
      .from(sourceName)
      .select(employeeAccessSelect, { count: 'exact' })
      .eq('business_id', filters.businessId)

    if (filters.accessStatus && filters.accessStatus !== 'all') {
      if (filters.accessStatus === 'revoked') {
        query = query.not('archived_at', 'is', null)
      } else {
        query = query.eq('access_status', filters.accessStatus).is('archived_at', null)
      }
    }

    if (filters.roleId) {
      query = query.eq('role_id', filters.roleId)
    }

    if (filters.search?.trim()) {
      const search = filters.search.trim()
      query = query.or(`email.ilike.%${search}%`)
    }

    const result = await query.order('created_at', { ascending: false }).range(from, to)

    if (result.error) {
      throw createAdminDataError(sourceName, 'accesos de trabajadores', result.error, filters)
    }

    const items = (result.data ?? []).map((row) => mapEmployeeAccessRow(row as AdminEmployeeAccessRow))

    if (!items.length) {
      logAdminEmptyResult(sourceName, filters)
    }

    return toPaginatedResult(items, result.count ?? 0, { page, pageSize })
  },

  async getByEmployeeId(employeeId: string): Promise<AdminEmployeeAccess | null> {
    return findByEmployee(employeeId)
  },

  async linkToAuthUser(input: AdminEmployeeAccessWriteInput): Promise<AdminEmployeeAccess> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.employeeAccess
    const payload = validateEmployeeAccessPayload(input)
    const existing = await findByEmployee(payload.employeeId)

    logPeopleDebug(sourceName, 'link:start', {
      businessId: payload.businessId,
      employeeId: payload.employeeId,
      userId: payload.userId ?? null,
      roleId: payload.roleId ?? null,
    })

    const accessPayload = {
      business_id: payload.businessId,
      employee_id: payload.employeeId,
      user_id: payload.userId ?? null,
      role_id: payload.roleId ?? null,
      email: payload.email ?? null,
      access_status: payload.accessStatus,
      passwordless_only: payload.passwordlessOnly,
      must_rotate_access: payload.mustRotateAccess,
      notes: payload.notes ?? null,
      archived_at: payload.accessStatus === 'revoked' ? new Date().toISOString() : null,
      invited_at:
        payload.accessStatus === 'pending'
          ? existing?.invitedAt ?? new Date().toISOString()
          : existing?.invitedAt ?? null,
      activated_at:
        payload.accessStatus === 'active'
          ? existing?.activatedAt ?? new Date().toISOString()
          : existing?.activatedAt ?? null,
    }

    const result = existing
      ? await client
          .from(sourceName)
          .update(accessPayload)
          .eq('id', existing.id)
          .select(employeeAccessSelect)
          .single<AdminEmployeeAccessRow>()
      : await client
          .from(sourceName)
          .insert(accessPayload)
          .select(employeeAccessSelect)
          .single<AdminEmployeeAccessRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el acceso del trabajador', result.error, {
        businessId: payload.businessId,
        employeeId: payload.employeeId,
        operation: 'link-to-auth-user',
      })
    }

    logPeopleDebug(sourceName, 'link:done', {
      businessId: payload.businessId,
      employeeId: payload.employeeId,
      accessId: result.data.id,
    })

    return mapEmployeeAccessRow(result.data)
  },

  async activateAccess(employeeId: string, input?: Partial<AdminEmployeeAccessWriteInput>): Promise<AdminEmployeeAccess> {
    const existing = await findByEmployee(employeeId)
    if (!existing && !input?.businessId) {
      throw new Error('Necesitas businessId para activar un acceso nuevo.')
    }

    if (!existing) {
      return this.linkToAuthUser({
        businessId: input!.businessId!,
        employeeId,
        userId: input?.userId,
        roleId: input?.roleId,
        email: input?.email,
        accessStatus: 'active',
        passwordlessOnly: input?.passwordlessOnly,
        mustRotateAccess: input?.mustRotateAccess,
        notes: input?.notes,
      })
    }

    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.employeeAccess

    logPeopleDebug(sourceName, 'activate:start', {
      employeeId,
      accessId: existing.id,
    })

    const result = await client
      .from(sourceName)
      .update({
        archived_at: null,
        access_status: 'active',
        activated_at: existing.activatedAt ?? new Date().toISOString(),
        role_id: input?.roleId ?? existing.roleId ?? null,
        user_id: input?.userId ?? existing.userId ?? null,
        email: input?.email ?? existing.email ?? null,
        passwordless_only: input?.passwordlessOnly ?? existing.passwordlessOnly,
        must_rotate_access: input?.mustRotateAccess ?? existing.mustRotateAccess,
        notes: input?.notes ?? existing.notes ?? null,
      })
      .eq('id', existing.id)
      .select(employeeAccessSelect)
      .single<AdminEmployeeAccessRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'la activacion del acceso', result.error, {
        employeeId,
        accessId: existing.id,
        operation: 'activate',
      })
    }

    return mapEmployeeAccessRow(result.data)
  },

  async deactivateAccess(employeeId: string): Promise<AdminEmployeeAccess> {
    const existing = await findByEmployee(employeeId)
    if (!existing) {
      throw new Error('El trabajador no tiene acceso configurado.')
    }

    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.employeeAccess

    logPeopleWarning(sourceName, 'deactivate:start', {
      employeeId,
      accessId: existing.id,
    })

    const result = await client
      .from(sourceName)
      .update({
        access_status: 'suspended',
      })
      .eq('id', existing.id)
      .select(employeeAccessSelect)
      .single<AdminEmployeeAccessRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'la suspension del acceso', result.error, {
        employeeId,
        accessId: existing.id,
        operation: 'deactivate',
      })
    }

    return mapEmployeeAccessRow(result.data)
  },

  async changeRole(employeeId: string, roleId: string): Promise<AdminEmployeeAccess> {
    const existing = await findByEmployee(employeeId)
    if (!existing) {
      throw new Error('El trabajador no tiene acceso configurado.')
    }

    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.employeeAccess

    logPeopleDebug(sourceName, 'change-role:start', {
      employeeId,
      accessId: existing.id,
      roleId,
    })

    const result = await client
      .from(sourceName)
      .update({ role_id: roleId })
      .eq('id', existing.id)
      .select(employeeAccessSelect)
      .single<AdminEmployeeAccessRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el cambio de rol del acceso', result.error, {
        employeeId,
        accessId: existing.id,
        roleId,
        operation: 'change-role',
      })
    }

    return mapEmployeeAccessRow(result.data)
  },
}
