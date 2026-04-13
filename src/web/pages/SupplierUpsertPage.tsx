import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AdminBackHeader } from '../components/AdminBackHeader'
import {
  SupplierForm,
  type SupplierFieldErrors,
  type SupplierFormValues,
} from '../components/SupplierForm'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { adminAuditService } from '../services/adminAudit.service'
import { adminSuppliersService } from '../services/adminSuppliers.service'
import type { AdminSupplier, AdminSupplierWriteInput } from '../types/adminSupplier'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'
import {
  formatRut,
  getRutValidationMessage,
  normalizeRut,
  sanitizeRutInput,
} from '../../lib/rut'

const emptyForm = (): SupplierFormValues => ({
  taxId: '',
  legalName: '',
  businessLine: '',
  addressLine1: '',
  district: '',
  city: '',
  phone: '',
  email: '',
  contactName: '',
  notes: '',
  status: 'active',
})

const isValidEmail = (value: string) =>
  !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

const isValidPhone = (value: string) => !value.trim() || /^[+0-9()\s-]{7,20}$/.test(value.trim())

const mapSupplierToForm = (supplier: AdminSupplier): SupplierFormValues => ({
  taxId: formatRut(supplier.taxId),
  legalName: supplier.legalName,
  businessLine: supplier.businessLine ?? '',
  addressLine1: supplier.addressLine1 ?? '',
  district: supplier.district ?? '',
  city: supplier.city ?? '',
  phone: supplier.phone ?? '',
  email: supplier.email ?? '',
  contactName: supplier.contactName ?? '',
  notes: supplier.notes ?? '',
  status: supplier.status,
})

export function SupplierUpsertPage() {
  const navigate = useNavigate()
  const { business } = useWebWorkspace()
  const { supplierId } = useParams<{ supplierId: string }>()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState<SupplierFormValues>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<SupplierFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(supplierId))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingSupplier, setExistingSupplier] = useState<AdminSupplier | null>(null)

  const isEditMode = Boolean(supplierId)
  const returnTo = searchParams.get('returnTo') || '/suppliers'

  useEffect(() => {
    const loadSupplier = async () => {
      if (!supplierId) {
        setExistingSupplier(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const detail = await adminSuppliersService.getById(supplierId)

        if (!detail) {
          setError('No encontramos el proveedor solicitado.')
          setExistingSupplier(null)
          return
        }

        setExistingSupplier(detail)
        setForm(mapSupplierToForm(detail))
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No pudimos cargar el proveedor para editar.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadSupplier()
  }, [supplierId])

  const handleChange = <K extends keyof SupplierFormValues>(
    field: K,
    value: SupplierFormValues[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]:
        field === 'taxId'
          ? (sanitizeRutInput(String(value)) as SupplierFormValues[K])
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
    const message = getRutValidationMessage(form.taxId, 'El RUT del proveedor')
    if (message) {
      setFieldErrors((current) => ({ ...current, taxId: message }))
    }
  }

  const validateForm = () => {
    const nextErrors: SupplierFieldErrors = {}

    const taxIdError = getRutValidationMessage(form.taxId, 'El RUT del proveedor')
    if (taxIdError) {
      nextErrors.taxId = taxIdError
    }

    if (!form.legalName.trim()) {
      nextErrors.legalName = 'Ingresa la razon social del proveedor.'
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
      setError('Necesitas un negocio activo para administrar proveedores.')
      return
    }

    setError(null)

    if (!validateForm()) {
      return
    }

    const payload: AdminSupplierWriteInput = {
      businessId: business.id,
      taxId: normalizeRut(form.taxId) ?? form.taxId,
      legalName: form.legalName,
      businessLine: form.businessLine,
      addressLine1: form.addressLine1,
      district: form.district,
      city: form.city,
      phone: form.phone,
      email: form.email,
      contactName: form.contactName,
      notes: form.notes,
      status: form.status,
    }

    setIsSubmitting(true)

    try {
      const supplier = isEditMode && supplierId
        ? await adminSuppliersService.update(supplierId, payload)
        : await adminSuppliersService.create(payload)

      await adminAuditService.recordEntityMutation({
        businessId: business.id,
        entityType: 'supplier',
        entityId: supplier.id,
        actionType: isEditMode ? 'updated' : 'created',
        previousData: existingSupplier,
        newData: supplier,
      })

      navigate(`/suppliers/${supplier.id}?returnTo=${encodeURIComponent(returnTo)}`, {
        replace: true,
        state: {
          feedback: isEditMode
            ? 'Proveedor actualizado correctamente.'
            : 'Proveedor creado correctamente.',
        },
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No pudimos guardar el proveedor.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="admin-record-page">
      <div className="surface-card admin-record-page__surface">
        <AdminBackHeader
          kicker="Proveedores"
          title={isEditMode ? 'Editar proveedor' : 'Nuevo proveedor'}
          description={
            isEditMode
              ? 'Pantalla de edicion dedicada para mantener el listado de proveedores mas limpio.'
              : 'Pantalla dedicada para registrar un proveedor y volver al listado con sus filtros.'
          }
          onBack={() => navigate(returnTo)}
        />

        {isLoading ? <AdminLoadingBlock label="Preparando formulario del proveedor" /> : null}
        {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
        {!isLoading ? (
          <SupplierForm
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
