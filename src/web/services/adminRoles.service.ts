import {
  adminTableNames,
  createAdminDataError,
  getAdminSupabaseClient,
  logAdminEmptyResult,
  resolvePagination,
  toPaginatedResult,
} from './adminBase'
import { mapRoleRow, type AdminRoleRow } from './adminPeopleMappers'
import { logPeopleDebug, logPeopleWarning } from './adminPeopleSupport'
import { validateRolePayload } from './adminPeopleValidators'
import type { AdminPaginatedResult } from '../types/adminShared'
import type { AdminRole, AdminRoleListFilters, AdminRoleWriteInput } from '../types/adminRole'

const roleSelect =
  'id, business_id, code, name, description, is_system, archived_at, created_at, updated_at'

const loadRolePermissionCounts = async (businessId: string) => {
  const client = getAdminSupabaseClient()
  const result = await client
    .from(adminTableNames.rolePermissions)
    .select('role_id')
    .eq('business_id', businessId)

  if (result.error) {
    throw createAdminDataError(adminTableNames.rolePermissions, 'los permisos por rol', result.error, {
      businessId,
      operation: 'count-role-permissions',
    })
  }

  return (result.data ?? []).reduce<Record<string, number>>((accumulator, row) => {
    const roleId = String(row.role_id)
    accumulator[roleId] = (accumulator[roleId] ?? 0) + 1
    return accumulator
  }, {})
}

export const adminRolesService = {
  async list(filters: AdminRoleListFilters): Promise<AdminPaginatedResult<AdminRole>> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.roles
    const { from, to, page, pageSize } = resolvePagination(filters)

    logPeopleDebug(sourceName, 'list:start', {
      businessId: filters.businessId,
      status: filters.status ?? 'all',
      page,
      pageSize,
    })

    let query = client
      .from(sourceName)
      .select(roleSelect, { count: 'exact' })
      .eq('business_id', filters.businessId)

    if (filters.status === 'active') {
      query = query.is('archived_at', null)
    } else if (filters.status === 'inactive') {
      query = query.not('archived_at', 'is', null)
    }

    const search = filters.search?.trim()
    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const [roleResult, permissionCounts] = await Promise.all([
      query.order('name').range(from, to),
      loadRolePermissionCounts(filters.businessId),
    ])

    if (roleResult.error) {
      throw createAdminDataError(sourceName, 'roles', roleResult.error, filters)
    }

    const items = (roleResult.data ?? []).map((row) =>
      mapRoleRow(row as AdminRoleRow, permissionCounts[(row as AdminRoleRow).id] ?? 0),
    )

    if (!items.length) {
      logAdminEmptyResult(sourceName, filters)
    }

    logPeopleDebug(sourceName, 'list:done', {
      businessId: filters.businessId,
      returned: items.length,
      total: roleResult.count ?? 0,
    })

    return toPaginatedResult(items, roleResult.count ?? 0, { page, pageSize })
  },

  async getById(roleId: string): Promise<AdminRole | null> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.roles
    const result = await client
      .from(sourceName)
      .select(roleSelect)
      .eq('id', roleId)
      .maybeSingle<AdminRoleRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el detalle del rol', result.error, { roleId })
    }

    if (!result.data) {
      return null
    }

    const counts = await loadRolePermissionCounts(result.data.business_id)
    return mapRoleRow(result.data, counts[result.data.id] ?? 0)
  },

  async create(input: AdminRoleWriteInput): Promise<AdminRole> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.roles
    const payload = validateRolePayload(input)

    logPeopleDebug(sourceName, 'create:start', {
      businessId: payload.businessId,
      code: payload.code,
    })

    const result = await client
      .from(sourceName)
      .insert({
        business_id: payload.businessId,
        code: payload.code,
        name: payload.name,
        description: payload.description ?? null,
      })
      .select(roleSelect)
      .single<AdminRoleRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el rol', result.error, {
        businessId: payload.businessId,
        operation: 'create',
      })
    }

    logPeopleDebug(sourceName, 'create:done', {
      businessId: payload.businessId,
      roleId: result.data.id,
    })

    return mapRoleRow(result.data, 0)
  },

  async update(roleId: string, input: AdminRoleWriteInput): Promise<AdminRole> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.roles
    const payload = validateRolePayload(input)

    logPeopleDebug(sourceName, 'update:start', {
      businessId: payload.businessId,
      roleId,
      code: payload.code,
    })

    const result = await client
      .from(sourceName)
      .update({
        code: payload.code,
        name: payload.name,
        description: payload.description ?? null,
      })
      .eq('id', roleId)
      .select(roleSelect)
      .single<AdminRoleRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el rol', result.error, {
        roleId,
        operation: 'update',
      })
    }

    const counts = await loadRolePermissionCounts(result.data.business_id)

    logPeopleDebug(sourceName, 'update:done', {
      businessId: result.data.business_id,
      roleId,
    })

    return mapRoleRow(result.data, counts[result.data.id] ?? 0)
  },

  async activate(roleId: string): Promise<AdminRole> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.roles

    logPeopleDebug(sourceName, 'activate:start', { roleId })

    const result = await client
      .from(sourceName)
      .update({ archived_at: null })
      .eq('id', roleId)
      .select(roleSelect)
      .single<AdminRoleRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'la activacion del rol', result.error, {
        roleId,
        operation: 'activate',
      })
    }

    const counts = await loadRolePermissionCounts(result.data.business_id)

    return mapRoleRow(result.data, counts[result.data.id] ?? 0)
  },

  async deactivate(roleId: string): Promise<AdminRole> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.roles

    logPeopleWarning(sourceName, 'deactivate:start', { roleId })

    const result = await client
      .from(sourceName)
      .update({ archived_at: new Date().toISOString() })
      .eq('id', roleId)
      .select(roleSelect)
      .single<AdminRoleRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'la desactivacion del rol', result.error, {
        roleId,
        operation: 'deactivate',
      })
    }

    const counts = await loadRolePermissionCounts(result.data.business_id)

    return mapRoleRow(result.data, counts[result.data.id] ?? 0)
  },
}
