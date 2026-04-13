import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { SearchComboboxOption } from '../../components/ui/SearchCombobox'
import { AdminBackHeader } from '../components/AdminBackHeader'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { CreditNoteForm } from '../components/CreditNoteForm'
import { getFriendlyDataError } from '../lib/adminFeedback'
import { adminAttachmentsService } from '../services/adminAttachments.service'
import { adminAuditService } from '../services/adminAudit.service'
import { adminCustomersService } from '../services/adminCustomers.service'
import { adminDocumentsService } from '../services/adminDocuments.service'
import { adminSuppliersService } from '../services/adminSuppliers.service'
import type {
  AdminDocument,
  AdminDocumentDetail,
  AdminDocumentWriteInput,
} from '../types/adminDocument'
import type { AdminCustomer } from '../types/adminCustomer'
import type { AdminSupplier } from '../types/adminSupplier'
import {
  emptyForm,
  isReferenceCandidate,
  mapDetailToForm,
  parseAmount,
  type CreditNoteFieldErrors,
  type CreditNoteFormValues,
} from '../lib/creditNotes'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

export function CreditNoteUpsertPage() {
  const navigate = useNavigate()
  const { business } = useWebWorkspace()
  const { noteId } = useParams<{ noteId: string }>()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState<CreditNoteFormValues>(emptyForm)
  const [emittedReferences, setEmittedReferences] = useState<AdminDocument[]>([])
  const [receivedReferences, setReceivedReferences] = useState<AdminDocument[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<AdminSupplier | null>(null)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState<AdminCustomer[]>([])
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('')
  const [supplierSearchResults, setSupplierSearchResults] = useState<AdminSupplier[]>([])
  const [isSearchingSuppliers, setIsSearchingSuppliers] = useState(false)
  const [customerAvailability, setCustomerAvailability] = useState({
    totalActive: 0,
    totalAll: 0,
  })
  const [supplierAvailability, setSupplierAvailability] = useState({
    totalActive: 0,
    totalAll: 0,
  })
  const [fieldErrors, setFieldErrors] = useState<CreditNoteFieldErrors>({})
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [existingDetail, setExistingDetail] = useState<AdminDocumentDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<{
    title: string
    description: string
    source: 'load' | 'submit' | 'validation'
  } | null>(null)

  const isEditMode = Boolean(noteId)
  const returnTo = searchParams.get('returnTo') || '/credit-notes'

  useEffect(() => {
    const loadDependencies = async () => {
      if (!business?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const [
          emittedResult,
          receivedResult,
          customersResult,
          suppliersResult,
          detail,
        ] = await Promise.all([
          adminDocumentsService.list({
            businessId: business.id,
            direction: 'emitted',
            page: 1,
            pageSize: 200,
          }),
          adminDocumentsService.list({
            businessId: business.id,
            direction: 'received',
            page: 1,
            pageSize: 200,
          }),
          adminCustomersService.listAvailableForDocuments(business.id),
          adminSuppliersService.listAvailableForDocuments(business.id),
          noteId ? adminDocumentsService.getById(noteId) : Promise.resolve(null),
        ])

        setEmittedReferences(emittedResult.items.filter(isReferenceCandidate))
        setReceivedReferences(receivedResult.items.filter(isReferenceCandidate))
        setCustomerAvailability({
          totalActive: customersResult.totalActive,
          totalAll: customersResult.totalAll,
        })
        setSupplierAvailability({
          totalActive: suppliersResult.totalActive,
          totalAll: suppliersResult.totalAll,
        })

        if (noteId) {
          if (!detail) {
            setExistingDetail(null)
            setError({
              title: 'Nota no disponible',
              description: 'No encontramos la nota de credito solicitada para esta empresa.',
              source: 'load',
            })
            return
          }

          setExistingDetail(detail)
          setForm(mapDetailToForm(detail))

          if (detail.document.direction === 'emitted' && detail.document.customerId) {
            const customer = await adminCustomersService.getById(detail.document.customerId)
            setSelectedCustomer(customer)
            setCustomerSearchResults(customer ? [customer] : [])
            setCustomerSearchTerm(customer ? customer.legalName : detail.document.counterpartyName ?? '')
            setSelectedSupplier(null)
            setSupplierSearchTerm('')
            setSupplierSearchResults([])
          } else if (detail.document.direction === 'received' && detail.document.supplierId) {
            const supplier = await adminSuppliersService.getById(detail.document.supplierId)
            setSelectedSupplier(supplier)
            setSupplierSearchResults(supplier ? [supplier] : [])
            setSupplierSearchTerm(supplier ? supplier.legalName : detail.document.counterpartyName ?? '')
            setSelectedCustomer(null)
            setCustomerSearchTerm('')
            setCustomerSearchResults([])
          } else {
            setSelectedCustomer(null)
            setSelectedSupplier(null)
            setCustomerSearchTerm('')
            setSupplierSearchTerm('')
            setCustomerSearchResults([])
            setSupplierSearchResults([])
          }
        } else {
          setExistingDetail(null)
          setForm(emptyForm())
          setSelectedCustomer(null)
          setSelectedSupplier(null)
          setCustomerSearchTerm('')
          setSupplierSearchTerm('')
          setCustomerSearchResults([])
          setSupplierSearchResults([])
        }
      } catch (loadError) {
        const friendly = getFriendlyDataError(loadError, {
          title: 'No pudimos preparar el formulario',
          description:
            'Ocurrio un problema al cargar clientes, proveedores o documentos de referencia del negocio actual.',
        })
        setError({
          ...friendly,
          source: 'load',
        })
        setSelectedCustomer(null)
        setSelectedSupplier(null)
        setCustomerSearchTerm('')
        setSupplierSearchTerm('')
        setCustomerSearchResults([])
        setSupplierSearchResults([])
        setCustomerAvailability({ totalActive: 0, totalAll: 0 })
        setSupplierAvailability({ totalActive: 0, totalAll: 0 })
      } finally {
        setIsLoading(false)
      }
    }

    void loadDependencies()
  }, [business?.id, noteId])

  useEffect(() => {
    if (!business?.id || form.scope !== 'emitted' || !customerAvailability.totalActive) {
      setCustomerSearchResults(selectedCustomer ? [selectedCustomer] : [])
      return
    }

    const trimmedSearch = customerSearchTerm.trim()
    const controller = new AbortController()

    const runSearch = async () => {
      if (!trimmedSearch) {
        setCustomerSearchResults(selectedCustomer ? [selectedCustomer] : [])
        setIsSearchingCustomers(false)
        return
      }

      setIsSearchingCustomers(true)

      try {
        const matches = await adminCustomersService.search({
          businessId: business.id,
          search: trimmedSearch,
          status: 'active',
          limit: 8,
        })

        if (controller.signal.aborted) {
          return
        }

        const nextResults =
          selectedCustomer && matches.every((item) => item.id !== selectedCustomer.id)
            ? [selectedCustomer, ...matches]
            : matches

        setCustomerSearchResults(nextResults.slice(0, 8))
      } catch (searchError) {
        if (!controller.signal.aborted) {
          console.error('[creditNotes] Customer search failed.', {
            businessId: business.id,
            search: trimmedSearch,
            error: searchError instanceof Error ? searchError.message : searchError,
          })
          setCustomerSearchResults(selectedCustomer ? [selectedCustomer] : [])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingCustomers(false)
        }
      }
    }

    const timeoutId = window.setTimeout(() => {
      void runSearch()
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [business?.id, customerAvailability.totalActive, customerSearchTerm, form.scope, selectedCustomer])

  useEffect(() => {
    if (!business?.id || form.scope !== 'received' || !supplierAvailability.totalActive) {
      setSupplierSearchResults(selectedSupplier ? [selectedSupplier] : [])
      return
    }

    const trimmedSearch = supplierSearchTerm.trim()
    const controller = new AbortController()

    const runSearch = async () => {
      if (!trimmedSearch) {
        setSupplierSearchResults(selectedSupplier ? [selectedSupplier] : [])
        setIsSearchingSuppliers(false)
        return
      }

      setIsSearchingSuppliers(true)

      try {
        const matches = await adminSuppliersService.search({
          businessId: business.id,
          search: trimmedSearch,
          status: 'active',
          limit: 8,
        })

        if (controller.signal.aborted) {
          return
        }

        const nextResults =
          selectedSupplier && matches.every((item) => item.id !== selectedSupplier.id)
            ? [selectedSupplier, ...matches]
            : matches

        setSupplierSearchResults(nextResults.slice(0, 8))
      } catch (searchError) {
        if (!controller.signal.aborted) {
          console.error('[creditNotes] Supplier search failed.', {
            businessId: business.id,
            search: trimmedSearch,
            error: searchError instanceof Error ? searchError.message : searchError,
          })
          setSupplierSearchResults(selectedSupplier ? [selectedSupplier] : [])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingSuppliers(false)
        }
      }
    }

    const timeoutId = window.setTimeout(() => {
      void runSearch()
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [business?.id, form.scope, selectedSupplier, supplierAvailability.totalActive, supplierSearchTerm])

  const availableReferences = useMemo(() => {
    const base = form.scope === 'emitted' ? emittedReferences : receivedReferences

    return base.filter((item) => {
      if (noteId && item.id === noteId) {
        return false
      }

      if (form.scope === 'emitted' && form.customerId) {
        return item.customerId === form.customerId
      }

      if (form.scope === 'received' && form.supplierId) {
        return item.supplierId === form.supplierId
      }

      return true
    })
  }, [
    emittedReferences,
    form.customerId,
    form.scope,
    form.supplierId,
    noteId,
    receivedReferences,
  ])

  const selectedReference = useMemo(
    () => availableReferences.find((item) => item.id === form.referenceDocumentId) ?? null,
    [availableReferences, form.referenceDocumentId],
  )

  const customerOptions = useMemo<SearchComboboxOption[]>(
    () =>
      customerSearchResults.slice(0, 8).map((customer) => ({
        value: customer.id,
        label: customer.legalName,
        description: [customer.taxId, customer.email].filter(Boolean).join(' - '),
      })),
    [customerSearchResults],
  )

  const supplierOptions = useMemo<SearchComboboxOption[]>(
    () =>
      supplierSearchResults.slice(0, 8).map((supplier) => ({
        value: supplier.id,
        label: supplier.legalName,
        description: [supplier.taxId, supplier.email].filter(Boolean).join(' - '),
      })),
    [supplierSearchResults],
  )

  const handleChange = <K extends keyof CreditNoteFormValues>(
    field: K,
    value: CreditNoteFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }))

    if (field === 'scope') {
      if (value === 'emitted') {
        setSelectedSupplier(null)
        setSupplierSearchTerm('')
        setSupplierSearchResults([])
      } else {
        setSelectedCustomer(null)
        setCustomerSearchTerm('')
        setCustomerSearchResults([])
      }
    }

    if (field === 'customerId' && !value) {
      setSelectedCustomer(null)
      setCustomerSearchTerm('')
      setCustomerSearchResults([])
    }

    if (field === 'supplierId' && !value) {
      setSelectedSupplier(null)
      setSupplierSearchTerm('')
      setSupplierSearchResults([])
    }

    setFieldErrors((current) => {
      if (!current[field] && !(field === 'customerId' || field === 'supplierId' || field === 'counterparty')) {
        return current
      }

      const next = { ...current }
      delete next[field]
      if (field === 'customerId' || field === 'supplierId') {
        delete next.counterparty
      }
      return next
    })
  }

  const handleCustomerSearchTermChange = (value: string) => {
    setCustomerSearchTerm(value)

    if (selectedCustomer && value !== selectedCustomer.legalName) {
      setSelectedCustomer(null)
      setForm((current) => ({ ...current, customerId: '', referenceDocumentId: '' }))
      setFieldErrors((current) => {
        if (!current.counterparty) {
          return current
        }

        const next = { ...current }
        delete next.counterparty
        return next
      })
    }
  }

  const handleCustomerSelect = (option: SearchComboboxOption) => {
    const customer = customerSearchResults.find((item) => item.id === option.value)
    if (!customer) {
      return
    }

    setSelectedCustomer(customer)
    setCustomerSearchTerm(customer.legalName)
    setForm((current) => ({ ...current, customerId: customer.id }))
    setFieldErrors((current) => {
      if (!current.counterparty) {
        return current
      }

      const next = { ...current }
      delete next.counterparty
      return next
    })
  }

  const handleSupplierSearchTermChange = (value: string) => {
    setSupplierSearchTerm(value)

    if (selectedSupplier && value !== selectedSupplier.legalName) {
      setSelectedSupplier(null)
      setForm((current) => ({ ...current, supplierId: '', referenceDocumentId: '' }))
      setFieldErrors((current) => {
        if (!current.counterparty) {
          return current
        }

        const next = { ...current }
        delete next.counterparty
        return next
      })
    }
  }

  const handleSupplierSelect = (option: SearchComboboxOption) => {
    const supplier = supplierSearchResults.find((item) => item.id === option.value)
    if (!supplier) {
      return
    }

    setSelectedSupplier(supplier)
    setSupplierSearchTerm(supplier.legalName)
    setForm((current) => ({ ...current, supplierId: supplier.id }))
    setFieldErrors((current) => {
      if (!current.counterparty) {
        return current
      }

      const next = { ...current }
      delete next.counterparty
      return next
    })
  }

  const validateForm = () => {
    const nextErrors: CreditNoteFieldErrors = {}
    const netAmount = parseAmount(form.netAmount)
    const taxAmount = parseAmount(form.taxAmount)
    const exemptAmount = parseAmount(form.exemptAmount)
    const totalAmount = netAmount + taxAmount + exemptAmount

    if (!form.folio.trim()) {
      nextErrors.folio = 'Ingresa el folio de la nota de credito.'
    }

    if (!form.issueDate) {
      nextErrors.issueDate = 'Selecciona la fecha de emision.'
    }

    if (form.scope === 'emitted') {
      if (!selectedCustomer) {
        nextErrors.counterparty = 'Selecciona un cliente asociado.'
      }
    } else if (!selectedSupplier) {
      nextErrors.counterparty = 'Selecciona un proveedor asociado.'
    }

    if (!selectedReference) {
      nextErrors.referenceDocumentId = 'Selecciona un documento de referencia valido.'
    }

    if (!form.referenceReason.trim()) {
      nextErrors.referenceReason = 'Ingresa la glosa o motivo de referencia.'
    }

    if (!Number.isFinite(netAmount) || netAmount < 0) {
      nextErrors.netAmount = 'Ingresa un neto valido.'
    }

    if (!Number.isFinite(taxAmount) || taxAmount < 0) {
      nextErrors.taxAmount = 'Ingresa un IVA valido.'
    }

    if (!Number.isFinite(exemptAmount) || exemptAmount < 0) {
      nextErrors.exemptAmount = 'Ingresa un monto exento valido.'
    }

    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      nextErrors.amounts = 'No pudimos calcular el total de la nota.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async () => {
    if (!business?.id) {
      setError({
        title: 'Negocio no disponible',
        description: 'Necesitas un negocio activo para administrar notas de credito.',
        source: 'validation',
      })
      return
    }

    setError(null)

    if (!validateForm() || !selectedReference) {
      return
    }

    if (form.scope === 'emitted' && !selectedCustomer) {
      setError({
        title: 'Cliente requerido',
        description: 'Selecciona un cliente valido antes de guardar la nota de credito emitida.',
        source: 'validation',
      })
      return
    }

    if (form.scope === 'received' && !selectedSupplier) {
      setError({
        title: 'Proveedor requerido',
        description: 'Selecciona un proveedor valido antes de guardar la nota de credito recibida.',
        source: 'validation',
      })
      return
    }

    const netAmount = parseAmount(form.netAmount)
    const taxAmount = parseAmount(form.taxAmount)
    const exemptAmount = parseAmount(form.exemptAmount)

    const payload: AdminDocumentWriteInput = {
      businessId: business.id,
      direction: form.scope,
      documentType: 'nota_credito',
      issueDate: form.issueDate,
      customerId: form.scope === 'emitted' ? selectedCustomer?.id : undefined,
      supplierId: form.scope === 'received' ? selectedSupplier?.id : undefined,
      counterpartyRut:
        form.scope === 'emitted' ? selectedCustomer?.taxId : selectedSupplier?.taxId,
      counterpartyName:
        form.scope === 'emitted' ? selectedCustomer?.legalName : selectedSupplier?.legalName,
      folio: form.folio,
      currencyCode: 'CLP',
      netAmount,
      taxAmount,
      exemptAmount,
      totalAmount: netAmount + taxAmount + exemptAmount,
      paymentMethod: form.scope === 'emitted' ? form.paymentMethod || undefined : undefined,
      status: form.status,
      notes: form.notes,
      sourceOrigin: 'manual',
      lines: [],
      references: [
        {
          referencedDocumentId: selectedReference.id,
          referencedDocumentType: selectedReference.documentType,
          referencedFolio: selectedReference.folio ?? '',
          referencedIssueDate: selectedReference.issueDate,
          referenceReason: form.referenceReason,
        },
      ],
    }

    setIsSubmitting(true)

    try {
      const savedDetail = noteId
        ? await adminDocumentsService.update(noteId, payload)
        : await adminDocumentsService.create(payload)

      if (attachmentFile) {
        await adminAttachmentsService.upload({
          businessId: business.id,
          documentId: savedDetail.document.id,
          file: attachmentFile,
        })
      }

      await adminAuditService.recordDocumentMutation({
        businessId: business.id,
        documentId: savedDetail.document.id,
        actionType: noteId ? 'updated' : 'created',
        previousData: existingDetail,
        newData: savedDetail,
        previousStatus: existingDetail?.document.status,
        nextStatus: savedDetail.document.status,
      })

      navigate(`/credit-notes/${savedDetail.document.id}?returnTo=${encodeURIComponent(returnTo)}`, {
        replace: true,
        state: {
          feedback: noteId
            ? 'Nota de credito actualizada correctamente.'
            : savedDetail.document.direction === 'emitted'
              ? 'Nota de credito emitida registrada correctamente.'
              : 'Nota de credito recibida registrada correctamente.',
        },
      })
    } catch (submitError) {
      const friendly = getFriendlyDataError(submitError, {
        title: 'No pudimos guardar la nota',
        description: 'Revisa los datos del formulario e intenta nuevamente en unos segundos.',
      })
      setError({
        ...friendly,
        source: 'submit',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasLoadError = error?.source === 'load'
  const hasNoCounterparties =
    !hasLoadError &&
    customerAvailability.totalAll === 0 &&
    supplierAvailability.totalAll === 0
  const hasNoActiveCustomers =
    !hasLoadError && customerAvailability.totalAll > 0 && customerAvailability.totalActive === 0
  const hasNoActiveSuppliers =
    !hasLoadError && supplierAvailability.totalAll > 0 && supplierAvailability.totalActive === 0

  return (
    <section className="admin-record-page">
      <div className="surface-card admin-record-page__surface">
        <AdminBackHeader
          kicker="Notas de credito"
          title={isEditMode ? 'Editar nota de credito' : 'Nueva nota de credito'}
          description={
            isEditMode
              ? 'Pantalla dedicada para editar una nota de credito sin mezclarla con la bandeja.'
              : 'Pantalla dedicada para registrar una nueva nota de credito y volver luego al mismo listado.'
          }
          onBack={() => navigate(returnTo)}
        />

        {isLoading ? <AdminLoadingBlock label="Preparando formulario de la nota" /> : null}
        {error ? (
          <AdminNotice tone="error" title={error.title}>
            {error.description}
          </AdminNotice>
        ) : null}
        {!isLoading && !hasLoadError ? (
          <>
            {hasNoCounterparties ? (
              <AdminNotice tone="warning" title="Sin contrapartes disponibles">
                Todavia no hay clientes ni proveedores cargados para este negocio. Necesitas al menos uno activo para relacionar una nota de credito.
              </AdminNotice>
            ) : null}
            {form.scope === 'emitted' && hasNoActiveCustomers ? (
              <AdminNotice tone="warning" title="Clientes sin activar">
                Hay clientes registrados en este negocio, pero ninguno esta activo para relacionarlo con una nota de credito emitida.
              </AdminNotice>
            ) : null}
            {form.scope === 'received' && hasNoActiveSuppliers ? (
              <AdminNotice tone="warning" title="Proveedores sin activar">
                Hay proveedores registrados en este negocio, pero ninguno esta activo para relacionarlo con una nota de credito recibida.
              </AdminNotice>
            ) : null}
            <CreditNoteForm
              businessId={business?.id}
              mode={isEditMode ? 'edit' : 'create'}
              values={form}
              errors={fieldErrors}
              isSubmitting={isSubmitting}
              hasCustomersAvailable={customerAvailability.totalActive > 0}
              hasSuppliersAvailable={supplierAvailability.totalActive > 0}
              customerSearchTerm={customerSearchTerm}
              customerOptions={customerOptions}
              isSearchingCustomers={isSearchingCustomers}
              supplierSearchTerm={supplierSearchTerm}
              supplierOptions={supplierOptions}
              isSearchingSuppliers={isSearchingSuppliers}
              availableReferences={availableReferences}
              selectedCustomer={selectedCustomer}
              selectedSupplier={selectedSupplier}
              selectedReference={selectedReference}
              existingDocumentId={existingDetail?.document.id}
              existingAttachments={existingDetail?.attachments ?? []}
              pendingAttachment={attachmentFile}
              onChange={handleChange}
              onCustomerSearchTermChange={handleCustomerSearchTermChange}
              onCustomerSelect={handleCustomerSelect}
              onSupplierSearchTermChange={handleSupplierSearchTermChange}
              onSupplierSelect={handleSupplierSelect}
              onAttachmentChange={setAttachmentFile}
              onAttachmentsChanged={(attachments) =>
                setExistingDetail((current) => (current ? { ...current, attachments } : current))
              }
              onSubmit={() => void handleSave()}
              onCancel={() => navigate(returnTo)}
            />
          </>
        ) : null}
      </div>
    </section>
  )
}
