import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { AdminBackHeader } from '../components/AdminBackHeader'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { RolePermissionsMatrix } from '../components/RolePermissionsMatrix'
import { adminAuditService } from '../services/adminAudit.service'
import { adminPermissionsService } from '../services/adminPermissions.service'
import { adminRolesService } from '../services/adminRoles.service'
import type { AdminPermission } from '../types/adminPermission'
import type { AdminRole } from '../types/adminRole'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

export function RolePermissionsPage() {
  const navigate = useNavigate()
  const { business } = useWebWorkspace()
  const { roleId } = useParams<{ roleId: string }>()
  const [searchParams] = useSearchParams()
  const [role, setRole] = useState<AdminRole | null>(null)
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const returnTo = searchParams.get('returnTo') || '/roles'

  const originalSelection = useMemo(
    () => permissions.filter((permission) => permission.isAssigned).map((permission) => permission.id),
    [permissions],
  )

  useEffect(() => {
    const loadRolePermissions = async () => {
      if (!business?.id || !roleId) {
        setError('No encontramos el rol solicitado.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const [roleDetail, rolePermissions] = await Promise.all([
          adminRolesService.getById(roleId),
          adminPermissionsService.listByRole(business.id, roleId),
        ])

        if (!roleDetail) {
          setRole(null)
          setError('No encontramos el rol solicitado.')
          return
        }

        setRole(roleDetail)
        setPermissions(rolePermissions)
        setSelectedPermissionIds(
          rolePermissions
            .filter((permission) => permission.isAssigned)
            .map((permission) => permission.id),
        )
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No pudimos cargar la matriz de permisos.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadRolePermissions()
  }, [business?.id, roleId])

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissionIds((current) =>
      current.includes(permissionId)
        ? current.filter((item) => item !== permissionId)
        : [...current, permissionId],
    )
  }

  const handleSelectAllModule = (modulePermissionIds: string[]) => {
    setSelectedPermissionIds((current) => Array.from(new Set([...current, ...modulePermissionIds])))
  }

  const handleClearAllModule = (modulePermissionIds: string[]) => {
    const moduleSet = new Set(modulePermissionIds)
    setSelectedPermissionIds((current) => current.filter((item) => !moduleSet.has(item)))
  }

  const handleSave = async () => {
    if (!business?.id || !roleId) {
      setError('No encontramos el rol solicitado.')
      return
    }

    setIsSaving(true)
    setError(null)
    setFeedback(null)

    try {
      const updatedPermissions = await adminPermissionsService.assignToRole({
        businessId: business.id,
        roleId,
        permissionIds: selectedPermissionIds,
      })

      setPermissions(updatedPermissions)
      setSelectedPermissionIds(
        updatedPermissions.filter((permission) => permission.isAssigned).map((permission) => permission.id),
      )
      setFeedback('Permisos actualizados correctamente.')

      await adminAuditService.recordEventSafely({
        businessId: business.id,
        entityType: 'other',
        entityId: roleId,
        actionType: 'updated',
        previousData: { permissionIds: originalSelection },
        newData: { permissionIds: selectedPermissionIds },
      })
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No pudimos guardar la matriz de permisos.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="admin-record-page">
      <div className="surface-card admin-record-page__surface">
        <AdminBackHeader
          kicker="Roles y permisos"
          title={role ? `Permisos de ${role.name}` : 'Asignacion de permisos'}
          description="Gestiona permisos por modulo y accion usando una matriz clara y escalable."
          onBack={() => navigate(returnTo)}
          actions={
            role ? (
              <Button
                variant="secondary"
                onClick={() =>
                  navigate(`/roles/${role.id}/edit?returnTo=${encodeURIComponent(returnTo)}`)
                }
              >
                Editar rol
              </Button>
            ) : null
          }
        />

        {isLoading ? <AdminLoadingBlock label="Cargando matriz de permisos" /> : null}
        {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
        {feedback ? <AdminNotice tone="success">{feedback}</AdminNotice> : null}

        {!isLoading && !error ? (
          <RolePermissionsMatrix
            permissions={permissions}
            selectedPermissionIds={selectedPermissionIds}
            isSaving={isSaving}
            onTogglePermission={handleTogglePermission}
            onSelectAllModule={handleSelectAllModule}
            onClearAllModule={handleClearAllModule}
            onSave={() => void handleSave()}
            onCancel={() => navigate(returnTo)}
          />
        ) : null}
      </div>
    </section>
  )
}
