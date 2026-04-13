import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { TextAreaField } from '../../components/ui/TextAreaField'
import { AdminFormSection } from './AdminFormSection'
import { AdminNotice } from './AdminNotice'
import type { AdminEmployeeAccess } from '../types/adminEmployeeAccess'
import type { AdminRole } from '../types/adminRole'

export interface EmployeeAccessFormValues {
  roleId: string
  email: string
  userId: string
  notes: string
  passwordlessOnly: boolean
  mustRotateAccess: boolean
  accessStatus: 'active' | 'suspended'
}

interface EmployeeAccessPanelProps {
  access?: AdminEmployeeAccess | null
  roles: AdminRole[]
  permissionsCount: number
  isSubmitting: boolean
  error?: string | null
  feedback?: string | null
  onSave: (values: EmployeeAccessFormValues) => void
  onActivate: (values: EmployeeAccessFormValues) => void
  onSuspend: () => void
}

const defaultAccessForm = (access?: AdminEmployeeAccess | null): EmployeeAccessFormValues => ({
  roleId: access?.roleId ?? '',
  email: access?.email ?? '',
  userId: access?.userId ?? '',
  notes: access?.notes ?? '',
  passwordlessOnly: access?.passwordlessOnly ?? false,
  mustRotateAccess: access?.mustRotateAccess ?? false,
  accessStatus: access?.accessStatus === 'active' ? 'active' : 'suspended',
})

const formatDateTime = (value?: string) => {
  if (!value) {
    return 'Sin registro'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const statusLabelMap: Record<'active' | 'suspended' | 'none', string> = {
  active: 'Activo',
  suspended: 'Suspendido',
  none: 'Sin acceso',
}

export function EmployeeAccessPanel({
  access,
  roles,
  permissionsCount,
  isSubmitting,
  error,
  feedback,
  onSave,
  onActivate,
  onSuspend,
}: EmployeeAccessPanelProps) {
  const [form, setForm] = useState<EmployeeAccessFormValues>(defaultAccessForm(access))
  const [fieldError, setFieldError] = useState<string | null>(null)

  useEffect(() => {
    setForm(defaultAccessForm(access))
    setFieldError(null)
  }, [access])

  const currentStatus = access?.accessStatus === 'active' ? 'active' : access ? 'suspended' : 'none'
  const activeRoles = useMemo(() => roles.filter((role) => role.status === 'active'), [roles])

  const roleOptions = [
    { label: 'Selecciona un rol', value: '' },
    ...activeRoles.map((role) => ({
      label: role.name,
      value: role.id,
    })),
  ]

  const updateForm = <K extends keyof EmployeeAccessFormValues>(
    field: K,
    value: EmployeeAccessFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (fieldError) {
      setFieldError(null)
    }
  }

  const validateRole = () => {
    if (form.roleId.trim()) {
      return true
    }

    setFieldError('Selecciona un rol antes de guardar o activar el acceso.')
    return false
  }

  return (
    <div className="employee-access-panel">
      <div className="settings-summary employee-detail__summary">
        <div>
          <span>Estado de acceso</span>
          <strong>{statusLabelMap[currentStatus]}</strong>
        </div>
        <div>
          <span>Correo de acceso</span>
          <strong>{access?.email || 'No informado'}</strong>
        </div>
        <div>
          <span>Usuario auth</span>
          <strong>{access?.userId || 'Sin vincular'}</strong>
        </div>
        <div>
          <span>Rol asignado</span>
          <strong>{access?.roleName || 'Sin rol asignado'}</strong>
        </div>
        <div>
          <span>Ultimo acceso</span>
          <strong>{formatDateTime(access?.lastLoginAt)}</strong>
        </div>
        <div>
          <span>Activado</span>
          <strong>{formatDateTime(access?.activatedAt)}</strong>
        </div>
        <div>
          <span>Invitado</span>
          <strong>{formatDateTime(access?.invitedAt)}</strong>
        </div>
        <div>
          <span>Permisos disponibles</span>
          <strong>{permissionsCount}</strong>
        </div>
      </div>

      {feedback ? <AdminNotice tone="success">{feedback}</AdminNotice> : null}
      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
      {fieldError ? <AdminNotice tone="warning">{fieldError}</AdminNotice> : null}

      <AdminFormSection
        title="Configuracion de acceso"
        description="Separa la ficha del trabajador del acceso al sistema. Aqui puedes asignar rol, vincular auth_user_id y controlar su estado."
      >
        <div className="employee-access-panel__grid">
          <SelectField
            label="Rol del sistema"
            value={form.roleId}
            onChange={(event) => updateForm('roleId', event.target.value)}
            options={roleOptions}
            hint="Solo se muestran roles activos para no asignar perfiles archivados."
          />
          <SelectField
            label="Estado deseado"
            value={form.accessStatus}
            onChange={(event) =>
              updateForm('accessStatus', event.target.value as EmployeeAccessFormValues['accessStatus'])
            }
            options={[
              { label: 'Activo', value: 'active' },
              { label: 'Suspendido', value: 'suspended' },
            ]}
            hint="Sin acceso se representa cuando aun no existe un registro de acceso para este trabajador."
          />
          <Field
            label="Correo de acceso"
            type="email"
            value={form.email}
            onChange={(event) => updateForm('email', event.target.value)}
            placeholder="trabajador@empresa.cl"
          />
          <Field
            label="auth_user_id"
            value={form.userId}
            onChange={(event) => updateForm('userId', event.target.value)}
            placeholder="UUID del usuario autenticado"
            spellCheck={false}
          />
        </div>

        <div className="employee-access-panel__toggles">
          <label className="employee-access-panel__toggle">
            <input
              type="checkbox"
              checked={form.passwordlessOnly}
              onChange={(event) => updateForm('passwordlessOnly', event.target.checked)}
            />
            <span>Solo acceso sin contrasena</span>
          </label>
          <label className="employee-access-panel__toggle">
            <input
              type="checkbox"
              checked={form.mustRotateAccess}
              onChange={(event) => updateForm('mustRotateAccess', event.target.checked)}
            />
            <span>Forzar rotacion de acceso</span>
          </label>
        </div>

        <TextAreaField
          label="Notas internas"
          value={form.notes}
          onChange={(event) => updateForm('notes', event.target.value)}
          placeholder="Observaciones internas sobre este acceso, soporte o seguimiento."
        />

        <div className="employee-access-panel__actions">
          <Button
            onClick={() => {
              if (!validateRole()) {
                return
              }
              onSave(form)
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando acceso...' : 'Guardar configuracion'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (!validateRole()) {
                return
              }
              onActivate({ ...form, accessStatus: 'active' })
            }}
            disabled={isSubmitting}
          >
            {currentStatus === 'active' ? 'Reactivar / actualizar acceso' : 'Activar acceso'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onSuspend()}
            disabled={isSubmitting || currentStatus === 'none'}
          >
            Suspender acceso
          </Button>
        </div>
      </AdminFormSection>
    </div>
  )
}
