import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { TextAreaField } from '../../components/ui/TextAreaField'
import { AdminFormSection } from './AdminFormSection'
import type { AdminActiveStatus } from '../types/adminShared'

export type SupplierFormValues = {
  taxId: string
  legalName: string
  businessLine: string
  addressLine1: string
  district: string
  city: string
  phone: string
  email: string
  contactName: string
  notes: string
  status: AdminActiveStatus
}

export type SupplierFieldErrors = Partial<Record<keyof SupplierFormValues, string>>

interface SupplierFormProps {
  mode: 'create' | 'edit'
  values: SupplierFormValues
  errors: SupplierFieldErrors
  isSubmitting: boolean
  onChange: <K extends keyof SupplierFormValues>(field: K, value: SupplierFormValues[K]) => void
  onTaxIdBlur?: () => void
  onSubmit: () => void
  onCancel?: () => void
}

export function SupplierForm({
  mode,
  values,
  errors,
  isSubmitting,
  onChange,
  onTaxIdBlur,
  onSubmit,
  onCancel,
}: SupplierFormProps) {
  return (
    <div className="admin-form-stack">
      <div className="admin-form-banner">
        <div>
          <strong>{mode === 'edit' ? 'Edicion en curso' : 'Alta de proveedor'}</strong>
          <p>
            {mode === 'edit'
              ? 'Actualiza la ficha del proveedor sin perder su historial administrativo.'
              : 'Registra una ficha lista para compras, documentos y control interno.'}
          </p>
        </div>
      </div>

      <AdminFormSection
        title="Identidad del proveedor"
        description="Base comercial para compras, boletas, facturas y notas recibidas."
      >
        <div className="suppliers-web__form-grid">
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
            label="Razon social"
            value={values.legalName}
            onChange={(event) => onChange('legalName', event.target.value)}
            placeholder="Ej: Distribuidora Central SpA"
            hint={errors.legalName || 'Nombre principal que aparecera en documentos y reportes.'}
          />
          <Field
            label="Giro"
            value={values.businessLine}
            onChange={(event) => onChange('businessLine', event.target.value)}
            placeholder="Distribucion mayorista"
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
        description="Informacion de contacto operativo y de despacho."
      >
        <div className="suppliers-web__form-grid">
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
            placeholder="Ej: Quilicura"
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
            placeholder="+56 2 2345 6789"
            hint={errors.phone || 'Usado para contacto comercial y coordinacion.'}
          />
          <Field
            label="Correo"
            value={values.email}
            onChange={(event) => onChange('email', event.target.value)}
            placeholder="ventas@proveedor.cl"
            hint={errors.email || 'Canal principal de comunicacion administrativa.'}
          />
          <Field
            label="Nombre de contacto"
            value={values.contactName}
            onChange={(event) => onChange('contactName', event.target.value)}
            placeholder="Ej: Marcela Diaz"
          />
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Contexto interno"
        description="Notas utiles para compra, despacho o seguimiento del proveedor."
      >
        <TextAreaField
          label="Observaciones"
          value={values.notes}
          onChange={(event) => onChange('notes', event.target.value)}
          placeholder="Condiciones comerciales, horarios de despacho o referencias utiles"
        />
      </AdminFormSection>

      <div className="admin-form-actions">
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? mode === 'edit'
              ? 'Guardando cambios...'
              : 'Creando proveedor...'
            : mode === 'edit'
              ? 'Guardar cambios'
              : 'Crear proveedor'}
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
