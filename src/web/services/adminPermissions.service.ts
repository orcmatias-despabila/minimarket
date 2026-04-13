import {
  adminTableNames,
  createAdminDataError,
  getAdminSupabaseClient,
  logAdminEmptyResult,
} from './adminBase'
import { mapPermissionRow, type AdminPermissionRow } from './adminPeopleMappers'
import { logPeopleDebug } from './adminPeopleSupport'
import { validateRolePermissionAssignmentPayload } from './adminPeopleValidators'
import type { AdminPermission, AdminRolePermissionAssignmentInput } from '../types/adminPermission'

const permissionSelect =
  'id, business_id, code, name, description, module_name, is_system, archived_at, created_at, updated_at'

export const adminPermissionsService = {
  async listByBusiness(businessId: string): Promise<AdminPermission[]> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.permissions

    logPeopleDebug(sourceName, 'list:start', { businessId })

    const result = await client
      .from(sourceName)
      .select(permissionSelect)
      .eq('business_id', businessId)
      .is('archived_at', null)
      .order('module_name')
      .order('name')

    if (result.error) {
      throw createAdminDataError(sourceName, 'permisos', result.error, { businessId })
    }

    if (!(result.data ?? []).length) {
      logAdminEmptyResult(sourceName, { businessId })
    }

    return (result.data ?? []).map((row) => mapPermissionRow(row as AdminPermissionRow))
  },

  async listByRole(businessId: string, roleId: string): Promise<AdminPermission[]> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.permissions

    logPeopleDebug(sourceName, 'list-by-role:start', { businessId, roleId })

    const [permissionsResult, assignmentsResult] = await Promise.all([
      client
        .from(sourceName)
        .select(permissionSelect)
        .eq('business_id', businessId)
        .is('archived_at', null)
        .order('module_name')
        .order('name'),
      client
        .from(adminTableNames.rolePermissions)
        .select('permission_id')
        .eq('business_id', businessId)
        .eq('role_id', roleId),
    ])

    if (permissionsResult.error) {
      throw createAdminDataError(sourceName, 'permisos del negocio', permissionsResult.error, {
        businessId,
        roleId,
      })
    }

    if (assignmentsResult.error) {
      throw createAdminDataError(adminTableNames.rolePermissions, 'los permisos del rol', assignmentsResult.error, {
        businessId,
        roleId,
      })
    }

    const assignedIds = new Set((assignmentsResult.data ?? []).map((row) => String(row.permission_id)))

    return (permissionsResult.data ?? []).map((row) =>
      mapPermissionRow(row as AdminPermissionRow, assignedIds.has((row as AdminPermissionRow).id)),
    )
  },

  async assignToRole(input: AdminRolePermissionAssignmentInput): Promise<AdminPermission[]> {
    const client = getAdminSupabaseClient()
    const payload = validateRolePermissionAssignmentPayload(input)
    const sourceName = adminTableNames.rolePermissions

    logPeopleDebug(sourceName, 'assign:start', {
      businessId: payload.businessId,
      roleId: payload.roleId,
      permissionCount: payload.permissionIds.length,
    })

    const currentAssignmentsResult = await client
      .from(sourceName)
      .select('id, permission_id')
      .eq('business_id', payload.businessId)
      .eq('role_id', payload.roleId)

    if (currentAssignmentsResult.error) {
      throw createAdminDataError(sourceName, 'la asignacion actual de permisos', currentAssignmentsResult.error, {
        businessId: payload.businessId,
        roleId: payload.roleId,
      })
    }

    const currentPermissionIds = new Set(
      (currentAssignmentsResult.data ?? []).map((row) => String(row.permission_id)),
    )
    const nextPermissionIds = new Set(payload.permissionIds)

    const assignmentIdsToDelete = (currentAssignmentsResult.data ?? [])
      .filter((row) => !nextPermissionIds.has(String(row.permission_id)))
      .map((row) => String(row.id))

    const permissionsToInsert = payload.permissionIds.filter((permissionId) => !currentPermissionIds.has(permissionId))

    if (assignmentIdsToDelete.length) {
      const deleteResult = await client.from(sourceName).delete().in('id', assignmentIdsToDelete)

      if (deleteResult.error) {
        throw createAdminDataError(sourceName, 'la revocacion de permisos del rol', deleteResult.error, {
          businessId: payload.businessId,
          roleId: payload.roleId,
          assignmentIdsToDelete,
        })
      }
    }

    if (permissionsToInsert.length) {
      const insertResult = await client.from(sourceName).insert(
        permissionsToInsert.map((permissionId) => ({
          business_id: payload.businessId,
          role_id: payload.roleId,
          permission_id: permissionId,
        })),
      )

      if (insertResult.error) {
        throw createAdminDataError(sourceName, 'la asignacion de permisos al rol', insertResult.error, {
          businessId: payload.businessId,
          roleId: payload.roleId,
          permissionsToInsert,
        })
      }
    }

    logPeopleDebug(sourceName, 'assign:done', {
      businessId: payload.businessId,
      roleId: payload.roleId,
      inserted: permissionsToInsert.length,
      removed: assignmentIdsToDelete.length,
    })

    return this.listByRole(payload.businessId, payload.roleId)
  },
}
