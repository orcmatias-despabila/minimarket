import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AdminBackHeader } from '../components/AdminBackHeader'
import {
  ClientForm,
  type ClientFieldErrors,
  type ClientFormValues,
} from '../components/ClientForm'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { adminAuditService } from '../services/adminAudit.service'
import { adminCustomersService } from '../services/adminCustomers.service'
import type { AdminCustomer, AdminCustomerWriteInput } from '../types/adminCustomer'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'
import {
  formatRut,
  getRutValidationMessage,
  normalizeRut,
  sanitizeRutInput,
} from '../../lib/rut'

const emptyForm = (): ClientFormValues => ({
  taxId: '',
  legalName: '',
  businessLine: '',
  addressLine1: '',
  district: '',
  city: '',
  phone: '',
  email: '',
  notes: '',
  status: 'active',
})

const isValidEmail = (value: string) =>
  !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

const isValidPhone = (value: string) => !value.trim() || /^[+0-9()\s-]{7,20}$/.test(value.trim())

const mapCustomerToForm = (customer: AdminCustomer): ClientFormValues => ({
  taxId: formatRut(customer.taxId),
  legalName: customer.legalName,
  businessLine: customer.businessLine ?? '',
  addressLine1: customer.addressLine1 ?? '',
  district: customer.district ?? '',
  city: customer.city ?? '',
  phone: customer.phone ?? '',
  email: customer.email ?? '',
  notes: customer.notes ?? '',
  status: customer.status,
})

export function ClientUpsertPage() {
  const navigate = useNavigate()
  const { business } = useWebWorkspace()
  const { clientId } = useParams<{ clientId: string }>()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState<ClientFormValues>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<ClientFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(clientId))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingCustomer, setExistingCustomer] = useState<AdminCustomer | null>(null)

  const isEditMode = Boolean(clientId)
  const returnTo = searchParams.get('returnTo') || '/clients'

  useEffect(() => {
    const loadCustomer = async () => {
      if (!clientId) {
        setExistingCustomer(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const detail = await adminCustomersService.getById(clientId)

        if (!detail) {
          setError('No encontramos el cliente solicitado.')
          setExistingCustomer(null)
          return
        }

        setExistingCustomer(detail)
        setForm(mapCustomerToForm(detail))
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No pudimos cargar el cliente para editar.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadCustomer()
  }, [clientId])

  const handleChange = <K extends keyof ClientFormValues>(field: K, value: ClientFormValues[K]) => {
    setForm((current) => ({
      ...current,
      [field]:
        field === 'taxId'
          ? (sanitizeRutInput(String(value)) as ClientFormValues[K])
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
    const message = getRutValidationMessage(form.taxId, 'El RUT del cliente')
    if (message) {
      setFieldErrors((current) => ({ ...current, taxId: message }))
    }
  }

  const validateForm = () => {
    const nextErrors: ClientFieldErrors = {}

    const taxIdError = getRutValidationMessage(form.taxId, 'El RUT del cliente')
    if (taxIdError) {
      nextErrors.taxId = taxIdError
    }

    if (!form.legalName.trim()) {
      nextErrors.legalName = 'Ingresa el nombre o razon social.'
    }

    if (!isValidEmail(form.email)) {
      nextErrors.email = 'Ingresa un correo valido.'
    }

    if (!isValidPhone(form.phone)) {
      nextErrors.phone = 'Ingresa un telefono valido.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!business?.id) {
      setError('Necesitas un negocio activo para administrar clientes.')
      return
    }

    setError(null)

    if (!validateForm()) {
      return
    }

    const payload: AdminCustomerWriteInput = {
      businessId: business.id,
      taxId: normalizeRut(form.taxId) ?? form.taxId,
      legalName: form.legalName,
      businessLine: form.businessLine,
      addressLine1: form.addressLine1,
      district: form.district,
      city: form.city,
      phone: form.phone,
      email: form.email,
      notes: form.notes,
      status: form.status,
    }

    setIsSubmitting(true)

    try {
      const customer = isEditMode && clientId
        ? await adminCustomersService.update(clientId, payload)
        : await adminCustomersService.create(payload)

      await adminAuditService.recordEntityMutation({
        businessId: business.id,
        entityType: 'customer',
        entityId: customer.id,
        actionType: isEditMode ? 'updated' : 'created',
        previousData: existingCustomer,
        newData: customer,
      })

      navigate(`/clients/${customer.id}?returnTo=${encodeURIComponent(returnTo)}`, {
        replace: true,
        state: {
          feedback: isEditMode
            ? 'Cliente actualizado correctamente.'
            : 'Cliente creado correctamente.',
        },
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No pudimos guardar el cliente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="admin-record-page">
      <div className="surface-card admin-record-page__surface">
        <AdminBackHeader
          kicker="Clientes"
          title={isEditMode ? 'Editar cliente' : 'Nuevo cliente'}
          description={
            isEditMode
              ? 'Pantalla de edicion dedicada para mantener el listado de clientes limpio y enfocado.'
              : 'Pantalla dedicada para crear un cliente nuevo y volver luego al mismo listado.'
          }
          onBack={() => navigate(returnTo)}
        />

        {isLoading ? <AdminLoadingBlock label="Preparando formulario del cliente" /> : null}
        {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
        {!isLoading ? (
          <ClientForm
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
