import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { TextAreaField } from '../../components/ui/TextAreaField'
import { AdminFormSection } from './AdminFormSection'

export type RoleFormValues = {
  code: string
  name: string
  description: string
}

export type RoleFieldErrors = Partial<Record<keyof RoleFormValues, string>>

interface RoleFormProps {
  mode: 'create' | 'edit'
  values: RoleFormValues
  errors: RoleFieldErrors
  isSubmitting: boolean
  onChange: <K extends keyof RoleFormValues>(field: K, value: RoleFormValues[K]) => void
  onSubmit: () => void
  onCancel?: () => void
}

export function RoleForm({
  mode,
  values,
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: RoleFormProps) {
  return (
    <div className="admin-form-stack roles-form">
      <div className="admin-form-banner">
        <div>
          <strong>{mode === 'edit' ? 'Edicion del rol' : 'Nuevo rol administrativo'}</strong>
          <p>
            {mode === 'edit'
              ? 'Ajusta nombre, codigo y descripcion del rol sin salir del backoffice.'
              : 'Crea un rol reutilizable para despues asignarle permisos por modulo y accion.'}
          </p>
        </div>
      </div>

      <AdminFormSection
        title="Datos base del rol"
        description="Identificacion simple para usar este rol en accesos y personal."
      >
        <div className="roles-form__grid">
          <Field
            label="Codigo"
            value={values.code}
            onChange={(event) => onChange('code', event.target.value)}
            placeholder="ej: supervisor_documental"
            hint={errors.code || 'Usa un codigo estable, en minusculas y facil de reconocer.'}
            aria-invalid={errors.code ? 'true' : 'false'}
          />
          <Field
            label="Nombre"
            value={values.name}
            onChange={(event) => onChange('name', event.target.value)}
            placeholder="Supervisor documental"
            hint={errors.name || 'Nombre visible del rol en personal y accesos.'}
            aria-invalid={errors.name ? 'true' : 'false'}
          />
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Descripcion"
        description="Contexto de uso para que el equipo entienda este rol rapidamente."
      >
        <TextAreaField
          label="Descripcion"
          value={values.description}
          onChange={(event) => onChange('description', event.target.value)}
          placeholder="Responsable de revisar documentos, aprobar cambios y exportar reportes."
        />
      </AdminFormSection>

      <div className="admin-form-actions">
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? mode === 'edit'
              ? 'Guardando rol...'
              : 'Creando rol...'
            : mode === 'edit'
              ? 'Guardar cambios'
              : 'Crear rol'}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  )
}
