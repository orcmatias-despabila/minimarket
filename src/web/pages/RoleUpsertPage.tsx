import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AdminBackHeader } from '../components/AdminBackHeader'
import {
  RoleForm,
  type RoleFieldErrors,
  type RoleFormValues,
} from '../components/RoleForm'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { adminAuditService } from '../services/adminAudit.service'
import { adminRolesService } from '../services/adminRoles.service'
import type { AdminRole, AdminRoleWriteInput } from '../types/adminRole'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

const emptyForm = (): RoleFormValues => ({
  code: '',
  name: '',
  description: '',
})

const mapRoleToForm = (role: AdminRole): RoleFormValues => ({
  code: role.code,
  name: role.name,
  description: role.description ?? '',
})

export function RoleUpsertPage() {
  const navigate = useNavigate()
  const { business } = useWebWorkspace()
  const { roleId } = useParams<{ roleId: string }>()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState<RoleFormValues>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<RoleFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(roleId))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingRole, setExistingRole] = useState<AdminRole | null>(null)

  const isEditMode = Boolean(roleId)
  const returnTo = searchParams.get('returnTo') || '/roles'

  useEffect(() => {
    const loadRole = async () => {
      if (!roleId) {
        setExistingRole(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const detail = await adminRolesService.getById(roleId)

        if (!detail) {
          setError('No encontramos el rol solicitado.')
          setExistingRole(null)
          return
        }

        setExistingRole(detail)
        setForm(mapRoleToForm(detail))
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : 'No pudimos cargar el rol.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadRole()
  }, [roleId])

  const handleChange = <K extends keyof RoleFormValues>(field: K, value: RoleFormValues[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const validateForm = () => {
    const nextErrors: RoleFieldErrors = {}

    if (!form.code.trim()) {
      nextErrors.code = 'Ingresa el codigo del rol.'
    }

    if (!form.name.trim()) {
      nextErrors.name = 'Ingresa el nombre del rol.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!business?.id) {
      setError('Necesitas un negocio activo para administrar roles.')
      return
    }

    setError(null)

    if (!validateForm()) {
      return
    }

    const payload: AdminRoleWriteInput = {
      businessId: business.id,
      code: form.code,
      name: form.name,
      description: form.description,
    }

    setIsSubmitting(true)

    try {
      const role =
        isEditMode && roleId
          ? await adminRolesService.update(roleId, payload)
          : await adminRolesService.create(payload)

      await adminAuditService.recordEventSafely({
        businessId: business.id,
        entityType: 'other',
        entityId: role.id,
        actionType: isEditMode ? 'updated' : 'created',
        previousData: existingRole,
        newData: role,
      })

      navigate(`/roles?returnTo=${encodeURIComponent(returnTo)}`, {
        replace: true,
        state: {
          feedback: isEditMode ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.',
        },
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No pudimos guardar el rol.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="admin-record-page">
      <div className="surface-card admin-record-page__surface">
        <AdminBackHeader
          kicker="Roles y permisos"
          title={isEditMode ? 'Editar rol' : 'Nuevo rol'}
          description={
            isEditMode
              ? 'Actualiza los datos base del rol antes de revisar su matriz de permisos.'
              : 'Crea un rol administrativo nuevo listo para asignarle permisos.'
          }
          onBack={() => navigate(returnTo)}
        />

        {isLoading ? <AdminLoadingBlock label="Preparando formulario del rol" /> : null}
        {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
        {!isLoading ? (
          <RoleForm
            mode={isEditMode ? 'edit' : 'create'}
            values={form}
            errors={fieldErrors}
            isSubmitting={isSubmitting}
            onChange={handleChange}
            onSubmit={() => void handleSubmit()}
            onCancel={() => navigate(returnTo)}
          />
        ) : null}
      </div>
    </section>
  )
}
