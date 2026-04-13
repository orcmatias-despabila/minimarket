import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AdminBackHeader } from '../components/AdminBackHeader'
import {
  EmployeeForm,
  type EmployeeFieldErrors,
  type EmployeeFormValues,
} from '../components/EmployeeForm'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { adminAuditService } from '../services/adminAudit.service'
import { adminEmployeesService } from '../services/adminEmployees.service'
import type { AdminEmployee, AdminEmployeeWriteInput } from '../types/adminEmployee'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'
import {
  formatRut,
  getRutValidationMessage,
  normalizeRut,
  sanitizeRutInput,
} from '../../lib/rut'

const emptyForm = (): EmployeeFormValues => ({
  employeeCode: '',
  firstName: '',
  lastName: '',
  preferredName: '',
  taxId: '',
  birthDate: '',
  personalEmail: '',
  phone: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  addressLine1: '',
  addressLine2: '',
  commune: '',
  city: '',
  region: '',
  country: 'Chile',
  notes: '',
  status: 'active',
  employmentType: 'contract',
  jobTitle: '',
  department: '',
  costCenter: '',
  branchName: '',
  hireDate: '',
  contractStartDate: '',
  contractEndDate: '',
  shiftName: '',
  weeklyHours: '',
  salaryCurrency: 'CLP',
  baseSalary: '',
  variableSalary: '',
})

const isValidEmail = (value: string) =>
  !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

const mapEmployeeToForm = (employee: AdminEmployee): EmployeeFormValues => ({
  employeeCode: employee.employeeCode ?? '',
  firstName: employee.firstName,
  lastName: employee.lastName,
  preferredName: employee.preferredName ?? '',
  taxId: formatRut(employee.taxId),
  birthDate: employee.birthDate ?? '',
  personalEmail: employee.personalEmail ?? '',
  phone: employee.phone ?? '',
  emergencyContactName: employee.emergencyContactName ?? '',
  emergencyContactPhone: employee.emergencyContactPhone ?? '',
  addressLine1: employee.addressLine1 ?? '',
  addressLine2: employee.addressLine2 ?? '',
  commune: employee.commune ?? '',
  city: employee.city ?? '',
  region: employee.region ?? '',
  country: employee.country,
  notes: employee.notes ?? '',
  status: employee.status,
  employmentType: employee.currentJob?.employmentType ?? 'contract',
  jobTitle: employee.currentJob?.jobTitle ?? '',
  department: employee.currentJob?.department ?? '',
  costCenter: employee.currentJob?.costCenter ?? '',
  branchName: employee.currentJob?.branchName ?? '',
  hireDate: employee.currentJob?.hireDate ?? '',
  contractStartDate: employee.currentJob?.contractStartDate ?? '',
  contractEndDate: employee.currentJob?.contractEndDate ?? '',
  shiftName: employee.currentJob?.shiftName ?? '',
  weeklyHours:
    employee.currentJob?.weeklyHours == null ? '' : String(employee.currentJob.weeklyHours),
  salaryCurrency: employee.currentJob?.salaryCurrency ?? 'CLP',
  baseSalary:
    employee.currentJob?.baseSalary == null ? '' : String(employee.currentJob.baseSalary),
  variableSalary:
    employee.currentJob?.variableSalary == null ? '' : String(employee.currentJob.variableSalary),
})

export function EmployeeUpsertPage() {
  const navigate = useNavigate()
  const { business } = useWebWorkspace()
  const { employeeId } = useParams<{ employeeId: string }>()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState<EmployeeFormValues>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<EmployeeFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(employeeId))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingEmployee, setExistingEmployee] = useState<AdminEmployee | null>(null)

  const isEditMode = Boolean(employeeId)
  const returnTo = searchParams.get('returnTo') || '/employees'

  useEffect(() => {
    const loadEmployee = async () => {
      if (!employeeId) {
        setExistingEmployee(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const detail = await adminEmployeesService.getById(employeeId)

        if (!detail) {
          setError('No encontramos el trabajador solicitado.')
          setExistingEmployee(null)
          return
        }

        setExistingEmployee(detail)
        setForm(mapEmployeeToForm(detail))
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No pudimos cargar la ficha del trabajador.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadEmployee()
  }, [employeeId])

  const handleChange = <K extends keyof EmployeeFormValues>(
    field: K,
    value: EmployeeFormValues[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]:
        field === 'taxId'
          ? (sanitizeRutInput(String(value)) as EmployeeFormValues[K])
          : value,
    }))
    setFieldErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleTaxIdBlur = () => {
    const normalized = normalizeRut(form.taxId)

    if (normalized) {
      setForm((current) => ({ ...current, taxId: formatRut(normalized) }))
      setFieldErrors((current) => {
        if (!current.taxId) {
          return current
        }

        const next = { ...current }
        delete next.taxId
        return next
      })
      return
    }

    setForm((current) => ({ ...current, taxId: sanitizeRutInput(current.taxId) }))
    const message = getRutValidationMessage(form.taxId, 'El RUT del trabajador')
    if (message) {
      setFieldErrors((current) => ({ ...current, taxId: message }))
    }
  }

  const validateForm = () => {
    const nextErrors: EmployeeFieldErrors = {}

    const taxIdError = getRutValidationMessage(form.taxId, 'El RUT del trabajador')
    if (taxIdError) {
      nextErrors.taxId = taxIdError
    }

    if (!form.firstName.trim()) {
      nextErrors.firstName = 'Ingresa el nombre.'
    }

    if (!form.lastName.trim()) {
      nextErrors.lastName = 'Ingresa el apellido.'
    }

    if (!form.jobTitle.trim()) {
      nextErrors.jobTitle = 'Ingresa el cargo.'
    }

    if (!isValidEmail(form.personalEmail)) {
      nextErrors.personalEmail = 'Ingresa un correo valido.'
    }

    if (form.weeklyHours && Number(form.weeklyHours) < 0) {
      nextErrors.weeklyHours = 'Las horas semanales no pueden ser negativas.'
    }

    if (form.baseSalary && Number(form.baseSalary) < 0) {
      nextErrors.baseSalary = 'El sueldo base no puede ser negativo.'
    }

    if (form.variableSalary && Number(form.variableSalary) < 0) {
      nextErrors.variableSalary = 'El sueldo variable no puede ser negativo.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const buildPayload = (): AdminEmployeeWriteInput => ({
    businessId: business?.id ?? '',
    employeeCode: form.employeeCode,
    firstName: form.firstName,
    lastName: form.lastName,
    preferredName: form.preferredName,
    taxId: normalizeRut(form.taxId) ?? form.taxId,
    birthDate: form.birthDate,
    personalEmail: form.personalEmail,
    phone: form.phone,
    emergencyContactName: form.emergencyContactName,
    emergencyContactPhone: form.emergencyContactPhone,
    addressLine1: form.addressLine1,
    addressLine2: form.addressLine2,
    commune: form.commune,
    city: form.city,
    region: form.region,
    country: form.country,
    notes: form.notes,
    status: form.status,
    jobInfo: {
      employmentType: form.employmentType,
      jobTitle: form.jobTitle,
      department: form.department,
      costCenter: form.costCenter,
      branchName: form.branchName,
      hireDate: form.hireDate,
      contractStartDate: form.contractStartDate,
      contractEndDate: form.contractEndDate,
      shiftName: form.shiftName,
      weeklyHours: form.weeklyHours ? Number(form.weeklyHours) : undefined,
      salaryCurrency: form.salaryCurrency,
      baseSalary: form.baseSalary ? Number(form.baseSalary) : undefined,
      variableSalary: form.variableSalary ? Number(form.variableSalary) : undefined,
      status: form.status,
    },
  })

  const handleSubmit = async () => {
    if (!business?.id) {
      setError('Necesitas un negocio activo para administrar personal.')
      return
    }

    setError(null)

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload = buildPayload()
      const employee =
        isEditMode && employeeId
          ? await adminEmployeesService.update(employeeId, payload)
          : await adminEmployeesService.create(payload)

      await adminAuditService.recordEventSafely({
        businessId: business.id,
        entityType: 'other',
        entityId: employee.id,
        actionType: isEditMode ? 'updated' : 'created',
        previousData: existingEmployee,
        newData: employee,
      })

      navigate(`/employees/${employee.id}?returnTo=${encodeURIComponent(returnTo)}`, {
        replace: true,
        state: {
          feedback: isEditMode
            ? 'Trabajador actualizado correctamente.'
            : 'Trabajador creado correctamente.',
        },
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No pudimos guardar el trabajador.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="admin-record-page">
      <div className="surface-card admin-record-page__surface">
        <AdminBackHeader
          kicker="Personal"
          title={isEditMode ? 'Editar trabajador' : 'Nuevo trabajador'}
          description={
            isEditMode
              ? 'Actualiza datos personales y laborales desde una ficha dedicada.'
              : 'Crea una nueva ficha laboral reutilizando la estructura del backoffice.'
          }
          onBack={() => navigate(returnTo)}
        />

        {isLoading ? <AdminLoadingBlock label="Preparando formulario del trabajador" /> : null}
        {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
        {!isLoading ? (
          <EmployeeForm
            mode={isEditMode ? 'edit' : 'create'}
            values={form}
            errors={fieldErrors}
            isSubmitting={isSubmitting}
            onChange={handleChange}
            onTaxIdBlur={handleTaxIdBlur}
            onSubmit={() => void handleSubmit()}
            onCancel={() => navigate(returnTo)}
          />
        ) : null}
      </div>
    </section>
  )
}
