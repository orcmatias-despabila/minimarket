import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { TextAreaField } from '../../components/ui/TextAreaField'
import { AdminFormSection } from './AdminFormSection'
import type { AdminEmployeeStatus } from '../types/adminEmployee'

export type EmployeeFormValues = {
  employeeCode: string
  firstName: string
  lastName: string
  preferredName: string
  taxId: string
  birthDate: string
  personalEmail: string
  phone: string
  emergencyContactName: string
  emergencyContactPhone: string
  addressLine1: string
  addressLine2: string
  commune: string
  city: string
  region: string
  country: string
  notes: string
  status: AdminEmployeeStatus
  employmentType: string
  jobTitle: string
  department: string
  costCenter: string
  branchName: string
  hireDate: string
  contractStartDate: string
  contractEndDate: string
  shiftName: string
  weeklyHours: string
  salaryCurrency: string
  baseSalary: string
  variableSalary: string
}

export type EmployeeFieldErrors = Partial<Record<keyof EmployeeFormValues, string>>

interface EmployeeFormProps {
  mode: 'create' | 'edit'
  values: EmployeeFormValues
  errors: EmployeeFieldErrors
  isSubmitting: boolean
  onChange: <K extends keyof EmployeeFormValues>(field: K, value: EmployeeFormValues[K]) => void
  onTaxIdBlur?: () => void
  onSubmit: () => void
  onCancel?: () => void
}

export function EmployeeForm({
  mode,
  values,
  errors,
  isSubmitting,
  onChange,
  onTaxIdBlur,
  onSubmit,
  onCancel,
}: EmployeeFormProps) {
  return (
    <div className="admin-form-stack personal-form">
      <div className="admin-form-banner">
        <div>
          <strong>{mode === 'edit' ? 'Edicion del trabajador' : 'Alta de trabajador'}</strong>
          <p>
            {mode === 'edit'
              ? 'Actualiza la ficha personal y laboral sin mezclarla con el listado.'
              : 'Registra la ficha base del trabajador y deja listo su perfil para futuras etapas.'}
          </p>
        </div>
      </div>

      <AdminFormSection
        title="Datos personales"
        description="Identidad, contacto y antecedentes base del trabajador."
      >
        <div className="personal-form__grid">
          <Field
            label="Codigo interno"
            value={values.employeeCode}
            onChange={(event) => onChange('employeeCode', event.target.value)}
            placeholder="Ej: EMP-001"
            hint={errors.employeeCode}
            aria-invalid={errors.employeeCode ? 'true' : 'false'}
          />
          <SelectField
            label="Estado"
            value={values.status}
            onChange={(event) => onChange('status', event.target.value as AdminEmployeeStatus)}
            options={[
              { label: 'Activo', value: 'active' },
              { label: 'Inactivo', value: 'inactive' },
              { label: 'Permiso / licencia', value: 'leave' },
              { label: 'Terminado', value: 'terminated' },
            ]}
          />
          <Field
            label="Nombre"
            value={values.firstName}
            onChange={(event) => onChange('firstName', event.target.value)}
            placeholder="Matias"
            hint={errors.firstName}
            aria-invalid={errors.firstName ? 'true' : 'false'}
          />
          <Field
            label="Apellido"
            value={values.lastName}
            onChange={(event) => onChange('lastName', event.target.value)}
            placeholder="Perez"
            hint={errors.lastName}
            aria-invalid={errors.lastName ? 'true' : 'false'}
          />
          <Field
            label="Nombre preferido"
            value={values.preferredName}
            onChange={(event) => onChange('preferredName', event.target.value)}
            placeholder="Mati"
            hint={errors.preferredName}
            aria-invalid={errors.preferredName ? 'true' : 'false'}
          />
          <Field
            label="RUT"
            value={values.taxId}
            onChange={(event) => onChange('taxId', event.target.value)}
            onBlur={onTaxIdBlur}
            placeholder="12.345.678-9"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            hint={
              errors.taxId || 'Acepta ingreso con o sin puntos y se normaliza al salir del campo.'
            }
            aria-invalid={errors.taxId ? 'true' : 'false'}
          />
          <Field
            label="Fecha de nacimiento"
            type="date"
            value={values.birthDate}
            onChange={(event) => onChange('birthDate', event.target.value)}
            hint={errors.birthDate}
            aria-invalid={errors.birthDate ? 'true' : 'false'}
          />
          <Field
            label="Correo personal"
            type="email"
            value={values.personalEmail}
            onChange={(event) => onChange('personalEmail', event.target.value)}
            placeholder="trabajador@correo.cl"
            hint={errors.personalEmail}
            aria-invalid={errors.personalEmail ? 'true' : 'false'}
          />
          <Field
            label="Telefono"
            value={values.phone}
            onChange={(event) => onChange('phone', event.target.value)}
            placeholder="+56 9 1234 5678"
            hint={errors.phone}
            aria-invalid={errors.phone ? 'true' : 'false'}
          />
          <Field
            label="Contacto de emergencia"
            value={values.emergencyContactName}
            onChange={(event) => onChange('emergencyContactName', event.target.value)}
            placeholder="Nombre y parentesco"
            hint={errors.emergencyContactName}
            aria-invalid={errors.emergencyContactName ? 'true' : 'false'}
          />
          <Field
            label="Telefono emergencia"
            value={values.emergencyContactPhone}
            onChange={(event) => onChange('emergencyContactPhone', event.target.value)}
            placeholder="+56 9 8765 4321"
            hint={errors.emergencyContactPhone}
            aria-invalid={errors.emergencyContactPhone ? 'true' : 'false'}
          />
          <Field
            label="Direccion"
            value={values.addressLine1}
            onChange={(event) => onChange('addressLine1', event.target.value)}
            placeholder="Calle, numero, referencia"
            hint={errors.addressLine1}
            aria-invalid={errors.addressLine1 ? 'true' : 'false'}
          />
          <Field
            label="Direccion complementaria"
            value={values.addressLine2}
            onChange={(event) => onChange('addressLine2', event.target.value)}
            placeholder="Departamento, oficina, bloque"
            hint={errors.addressLine2}
            aria-invalid={errors.addressLine2 ? 'true' : 'false'}
          />
          <Field
            label="Comuna"
            value={values.commune}
            onChange={(event) => onChange('commune', event.target.value)}
            placeholder="Providencia"
            hint={errors.commune}
            aria-invalid={errors.commune ? 'true' : 'false'}
          />
          <Field
            label="Ciudad"
            value={values.city}
            onChange={(event) => onChange('city', event.target.value)}
            placeholder="Santiago"
            hint={errors.city}
            aria-invalid={errors.city ? 'true' : 'false'}
          />
          <Field
            label="Region"
            value={values.region}
            onChange={(event) => onChange('region', event.target.value)}
            placeholder="Region Metropolitana"
            hint={errors.region}
            aria-invalid={errors.region ? 'true' : 'false'}
          />
          <Field
            label="Pais"
            value={values.country}
            onChange={(event) => onChange('country', event.target.value)}
            placeholder="Chile"
            hint={errors.country}
            aria-invalid={errors.country ? 'true' : 'false'}
          />
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Datos laborales"
        description="Cargo, area y condiciones laborales vigentes."
      >
        <div className="personal-form__grid personal-form__grid--job">
          <SelectField
            label="Tipo de relacion"
            value={values.employmentType}
            onChange={(event) => onChange('employmentType', event.target.value)}
            options={[
              { label: 'Contrato', value: 'contract' },
              { label: 'Indefinido', value: 'indefinite' },
              { label: 'Part time', value: 'part_time' },
              { label: 'Honorarios', value: 'honorary' },
              { label: 'Temporal', value: 'temporary' },
              { label: 'Practica', value: 'intern' },
            ]}
          />
          <Field
            label="Cargo"
            value={values.jobTitle}
            onChange={(event) => onChange('jobTitle', event.target.value)}
            placeholder="Encargado de local"
            hint={errors.jobTitle}
            aria-invalid={errors.jobTitle ? 'true' : 'false'}
          />
          <Field
            label="Area"
            value={values.department}
            onChange={(event) => onChange('department', event.target.value)}
            placeholder="Administracion, ventas, bodega"
            hint={errors.department}
            aria-invalid={errors.department ? 'true' : 'false'}
          />
          <Field
            label="Centro de costo"
            value={values.costCenter}
            onChange={(event) => onChange('costCenter', event.target.value)}
            placeholder="Sucursal norte"
            hint={errors.costCenter}
            aria-invalid={errors.costCenter ? 'true' : 'false'}
          />
          <Field
            label="Sucursal / sede"
            value={values.branchName}
            onChange={(event) => onChange('branchName', event.target.value)}
            placeholder="Casa matriz"
            hint={errors.branchName}
            aria-invalid={errors.branchName ? 'true' : 'false'}
          />
          <Field
            label="Turno"
            value={values.shiftName}
            onChange={(event) => onChange('shiftName', event.target.value)}
            placeholder="Manana / tarde / rotativo"
            hint={errors.shiftName}
            aria-invalid={errors.shiftName ? 'true' : 'false'}
          />
          <Field
            label="Ingreso"
            type="date"
            value={values.hireDate}
            onChange={(event) => onChange('hireDate', event.target.value)}
            hint={errors.hireDate}
            aria-invalid={errors.hireDate ? 'true' : 'false'}
          />
          <Field
            label="Inicio contrato"
            type="date"
            value={values.contractStartDate}
            onChange={(event) => onChange('contractStartDate', event.target.value)}
            hint={errors.contractStartDate}
            aria-invalid={errors.contractStartDate ? 'true' : 'false'}
          />
          <Field
            label="Termino contrato"
            type="date"
            value={values.contractEndDate}
            onChange={(event) => onChange('contractEndDate', event.target.value)}
            hint={errors.contractEndDate}
            aria-invalid={errors.contractEndDate ? 'true' : 'false'}
          />
          <Field
            label="Horas semanales"
            type="number"
            min="0"
            step="0.5"
            value={values.weeklyHours}
            onChange={(event) => onChange('weeklyHours', event.target.value)}
            placeholder="45"
            hint={errors.weeklyHours}
            aria-invalid={errors.weeklyHours ? 'true' : 'false'}
          />
          <Field
            label="Moneda"
            value={values.salaryCurrency}
            onChange={(event) => onChange('salaryCurrency', event.target.value)}
            placeholder="CLP"
            hint={errors.salaryCurrency}
            aria-invalid={errors.salaryCurrency ? 'true' : 'false'}
          />
          <Field
            label="Sueldo base"
            type="number"
            min="0"
            step="1"
            value={values.baseSalary}
            onChange={(event) => onChange('baseSalary', event.target.value)}
            placeholder="750000"
            hint={errors.baseSalary}
            aria-invalid={errors.baseSalary ? 'true' : 'false'}
          />
          <Field
            label="Variable"
            type="number"
            min="0"
            step="1"
            value={values.variableSalary}
            onChange={(event) => onChange('variableSalary', event.target.value)}
            placeholder="0"
            hint={errors.variableSalary}
            aria-invalid={errors.variableSalary ? 'true' : 'false'}
          />
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Observaciones"
        description="Notas internas del perfil laboral."
      >
        <TextAreaField
          label="Notas"
          value={values.notes}
          onChange={(event) => onChange('notes', event.target.value)}
          placeholder="Observaciones internas sobre el trabajador, responsabilidades o seguimiento."
        />
      </AdminFormSection>

      <div className="admin-form-actions">
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? mode === 'edit'
              ? 'Guardando cambios...'
              : 'Creando trabajador...'
            : mode === 'edit'
              ? 'Guardar cambios'
              : 'Crear trabajador'}
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
