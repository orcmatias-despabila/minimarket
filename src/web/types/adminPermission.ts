export interface AdminPermission {
  id: string
  businessId: string
  code: string
  name: string
  description?: string
  moduleName: string
  isSystem: boolean
  isAssigned?: boolean
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

export interface AdminRolePermissionAssignmentInput {
  businessId: string
  roleId: string
  permissionIds: string[]
}
