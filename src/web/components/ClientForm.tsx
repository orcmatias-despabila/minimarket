import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { TextAreaField } from '../../components/ui/TextAreaField'
import { AdminFormSection } from './AdminFormSection'
import type { AdminActiveStatus } from '../types/adminShared'

export type ClientFormValues = {
  taxId: string
  legalName: string
  businessLine: string
  addressLine1: string
  district: string
  city: string
  phone: string
  email: string
  notes: string
  status: AdminActiveStatus
}

export type ClientFieldErrors = Partial<Record<keyof ClientFormValues, string>>

interface ClientFormProps {
  mode: 'create' | 'edit'
  values: ClientFormValues
  errors: ClientFieldErrors
  isSubmitting: boolean
  onChange: <K extends keyof ClientFormValues>(field: K, value: ClientFormValues[K]) => void
  onTaxIdBlur?: () => void
  onSubmit: () => void
  onCancel?: () => void
}

export function ClientForm({
  mode,
  values,
  errors,
  isSubmitting,
  onChange,
  onTaxIdBlur,
  onSubmit,
  onCancel,
}: ClientFormProps) {
  return (
    <div className="admin-form-stack">
      <div className="admin-form-banner">
        <div>
          <strong>{mode === 'edit' ? 'Edicion en curso' : 'Alta rapida'}</strong>
          <p>
            {mode === 'edit'
              ? 'Actualiza la ficha del cliente manteniendo su relacion comercial.'
              : 'Registra una ficha base para asociar documentos y reportes.'}
          </p>
        </div>
      </div>

      <AdminFormSection
        title="Identidad comercial"
        description="Datos base para identificar la ficha del cliente dentro del negocio."
      >
        <div className="customers-web__form-grid">
          <Field
            label="RUT"
            value={values.taxId}
            onChange={(event) => onChange('taxId', event.target.value)}
            onBlur={onTaxIdBlur}
            placeholder="12345678-9"
            hint={errors.taxId || 'Ingresa un RUT chileno real y lo normalizaremos al salir del campo.'}
            aria-invalid={errors.taxId ? 'true' : 'false'}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <Field
            label="Nombre o razon social"
            value={values.legalName}
            onChange={(event) => onChange('legalName', event.target.value)}
            placeholder="Ej: Almacen Don Pedro SpA"
            hint={errors.legalName || 'Nombre principal usado en documentos y reportes.'}
          />
          <Field
            label="Giro"
            value={values.businessLine}
            onChange={(event) => onChange('businessLine', event.target.value)}
            placeholder="Venta al por menor"
          />
          <SelectField
            label="Estado"
            value={values.status}
            onChange={(event) => onChange('status', event.target.value as AdminActiveStatus)}
            options={[
              { label: 'Activo', value: 'active' },
              { label: 'Inactivo', value: 'inactive' },
            ]}
          />
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Contacto y ubicacion"
        description="Informacion para gestion administrativa, contacto y despacho."
      >
        <div className="customers-web__form-grid">
          <Field
            label="Direccion"
            value={values.addressLine1}
            onChange={(event) => onChange('addressLine1', event.target.value)}
            placeholder="Calle, numero, referencia"
          />
          <Field
            label="Comuna"
            value={values.district}
            onChange={(event) => onChange('district', event.target.value)}
            placeholder="Ej: Providencia"
          />
          <Field
            label="Ciudad"
            value={values.city}
            onChange={(event) => onChange('city', event.target.value)}
            placeholder="Ej: Santiago"
          />
          <Field
            label="Telefono"
            value={values.phone}
            onChange={(event) => onChange('phone', event.target.value)}
            placeholder="+56 9 1234 5678"
            hint={errors.phone || 'Formato flexible de oficina o contacto comercial.'}
          />
          <Field
            label="Correo"
            value={values.email}
            onChange={(event) => onChange('email', event.target.value)}
            placeholder="contacto@cliente.cl"
            hint={errors.email || 'Usado para contacto administrativo y futuras emisiones.'}
          />
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Contexto interno"
        description="Notas internas para el equipo administrativo."
      >
        <TextAreaField
          label="Observaciones"
          value={values.notes}
          onChange={(event) => onChange('notes', event.target.value)}
          placeholder="Datos utiles para gestion comercial o futura asociacion documental"
        />
      </AdminFormSection>

      <div className="admin-form-actions">
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? mode === 'edit'
              ? 'Guardando cambios...'
              : 'Creando cliente...'
            : mode === 'edit'
              ? 'Guardar cambios'
              : 'Crear cliente'}
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
