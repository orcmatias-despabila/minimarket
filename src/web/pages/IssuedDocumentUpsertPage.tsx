import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { SearchComboboxOption } from '../../components/ui/SearchCombobox'
import { AdminBackHeader } from '../components/AdminBackHeader'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { IssuedDocumentForm } from '../components/IssuedDocumentForm'
import { getFriendlyDataError } from '../lib/adminFeedback'
import { adminAttachmentsService } from '../services/adminAttachments.service'
import { adminAuditService } from '../services/adminAudit.service'
import { adminCustomersService } from '../services/adminCustomers.service'
import { adminDocumentsService } from '../services/adminDocuments.service'
import type {
  AdminDocument,
  AdminDocumentDetail,
  AdminDocumentWriteInput,
} from '../types/adminDocument'
import type { AdminCustomer } from '../types/adminCustomer'
import {
  emptyForm,
  emptyLine,
  isIssuedReferenceCandidate,
  mapDetailToForm,
  parseAmount,
  type IssuedDocumentFieldErrors,
  type IssuedDocumentFormLine,
  type IssuedDocumentFormValues,
} from '../lib/issuedDocuments'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

export function IssuedDocumentUpsertPage() {
  const navigate = useNavigate()
  const { business } = useWebWorkspace()
  const { documentId } = useParams<{ documentId: string }>()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState<IssuedDocumentFormValues>(emptyForm)
  const [referenceDocuments, setReferenceDocuments] = useState<AdminDocument[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState<AdminCustomer[]>([])
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  const [customerAvailability, setCustomerAvailability] = useState({
    totalActive: 0,
    totalAll: 0,
  })
  const [fieldErrors, setFieldErrors] = useState<IssuedDocumentFieldErrors>({})
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [existingDetail, setExistingDetail] = useState<AdminDocumentDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<{
    title: string
    description: string
    source: 'load' | 'submit' | 'validation'
  } | null>(null)

  const isEditMode = Boolean(documentId)
  const returnTo = searchParams.get('returnTo') || '/issued-documents'

  useEffect(() => {
    const loadDependencies = async () => {
      if (!business?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const [referenceResult, customersResult, detail] = await Promise.all([
          adminDocumentsService.list({
            businessId: business.id,
            direction: 'emitted',
            page: 1,
            pageSize: 200,
          }),
          adminCustomersService.listAvailableForDocuments(business.id),
          documentId ? adminDocumentsService.getById(documentId) : Promise.resolve(null),
        ])

        setReferenceDocuments(referenceResult.items.filter(isIssuedReferenceCandidate))
        setCustomerAvailability({
          totalActive: customersResult.totalActive,
          totalAll: customersResult.totalAll,
        })

        if (documentId) {
          if (!detail) {
            setExistingDetail(null)
            setError({
              title: 'Documento no disponible',
              description: 'No encontramos el documento emitido solicitado para esta empresa.',
              source: 'load',
            })
            return
          }

          setExistingDetail(detail)
          setForm(mapDetailToForm(detail))

          if (detail.document.customerId) {
            const customer = await adminCustomersService.getById(detail.document.customerId)
            setSelectedCustomer(customer)
            setCustomerSearchResults(customer ? [customer] : [])
            setCustomerSearchTerm(customer ? customer.legalName : detail.document.counterpartyName ?? '')
          } else {
            setSelectedCustomer(null)
            setCustomerSearchResults([])
            setCustomerSearchTerm('')
          }
        } else {
          setExistingDetail(null)
          setForm(emptyForm())
          setSelectedCustomer(null)
          setCustomerSearchResults([])
          setCustomerSearchTerm('')
        }
      } catch (loadError) {
        const friendly = getFriendlyDataError(loadError, {
          title: 'No pudimos preparar el formulario',
          description:
            'Ocurrio un problema al cargar clientes o documentos de referencia del negocio actual.',
        })
        setError({
          ...friendly,
          source: 'load',
        })
        setSelectedCustomer(null)
        setCustomerSearchTerm('')
        setCustomerSearchResults([])
        setCustomerAvailability({ totalActive: 0, totalAll: 0 })
      } finally {
        setIsLoading(false)
      }
    }

    void loadDependencies()
  }, [business?.id, documentId])

  const availableReferenceDocuments = useMemo(
    () =>
      referenceDocuments.filter((item) => {
        if (documentId && item.id === documentId) {
          return false
        }

        if (form.customerId) {
          return item.customerId === form.customerId
        }

        return true
      }),
    [documentId, form.customerId, referenceDocuments],
  )

  const selectedReferenceDocument = useMemo(
    () => availableReferenceDocuments.find((item) => item.id === form.referenceDocumentId) ?? null,
    [availableReferenceDocuments, form.referenceDocumentId],
  )

  useEffect(() => {
    if (!business?.id || !customerAvailability.totalActive) {
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
          console.error('[issuedDocuments] Customer search failed.', {
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
  }, [business?.id, customerAvailability.totalActive, customerSearchTerm, selectedCustomer])

  const customerOptions = useMemo<SearchComboboxOption[]>(
    () =>
      customerSearchResults.slice(0, 8).map((customer) => ({
        value: customer.id,
        label: customer.legalName,
        description: [customer.taxId, customer.email].filter(Boolean).join(' - '),
      })),
    [customerSearchResults],
  )

  const handleChange = <K extends keyof IssuedDocumentFormValues>(
    field: K,
    value: IssuedDocumentFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }))

    if (field === 'customerId' && !value) {
      setSelectedCustomer(null)
      setCustomerSearchTerm('')
      setCustomerSearchResults([])
    }

    if (field === 'documentType' && value === 'boleta') {
      setSelectedCustomer(null)
      setCustomerSearchTerm('')
      setCustomerSearchResults([])
      setForm((current) => ({ ...current, customerId: '' }))
    }

    setFieldErrors((current) => {
      if (!current[field] && !(field === 'customerId' && current.customerTaxId)) {
        return current
      }

      const next = { ...current }
      delete next[field]
      if (field === 'customerId') {
        delete next.customerTaxId
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
        if (!current.customerId && !current.customerTaxId) {
          return current
        }

        const next = { ...current }
        delete next.customerId
        delete next.customerTaxId
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
    setForm((current) => ({
      ...current,
      customerId: customer.id,
      referenceDocumentId:
        current.referenceDocumentId &&
        availableReferenceDocuments.some((item) => item.id === current.referenceDocumentId)
          ? current.referenceDocumentId
          : '',
    }))
    setFieldErrors((current) => {
      if (!current.customerId && !current.customerTaxId) {
        return current
      }

      const next = { ...current }
      delete next.customerId
      delete next.customerTaxId
      return next
    })
  }

  const updateLine = (lineId: string, changes: Partial<IssuedDocumentFormLine>) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === lineId ? { ...line, ...changes } : line)),
    }))
    setFieldErrors((current) => {
      const key = `line-${lineId}` as const
      if (!current[key]) {
        return current
      }

      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const addLine = () => {
    setForm((current) => ({ ...current, lines: [...current.lines, emptyLine()] }))
  }

  const removeLine = (lineId: string) => {
    setForm((current) => ({
      ...current,
      lines:
        current.lines.length === 1
          ? [emptyLine()]
          : current.lines.filter((line) => line.id !== lineId),
    }))
  }

  const validateForm = () => {
    const nextErrors: IssuedDocumentFieldErrors = {}
    const netAmount = parseAmount(form.netAmount)
    const taxAmount = parseAmount(form.taxAmount)
    const exemptAmount = parseAmount(form.exemptAmount)
    const totalAmount = netAmount + taxAmount + exemptAmount

    if (!form.folio.trim()) {
      nextErrors.folio = 'Ingresa el folio del documento.'
    }

    if (!form.issueDate) {
      nextErrors.issueDate = 'Selecciona la fecha de emision.'
    }

    if (form.documentType !== 'boleta') {
      if (!form.customerId) {
        nextErrors.customerId = 'Selecciona un cliente asociado.'
      } else if (!selectedCustomer) {
        nextErrors.customerTaxId = 'El cliente seleccionado no esta disponible.'
      }
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
      nextErrors.amounts = 'No pudimos calcular el total del documento.'
    }

    if (form.documentType === 'nota_credito') {
      if (!form.referenceDocumentId || !selectedReferenceDocument) {
        nextErrors.referenceDocumentId =
          'Selecciona un documento de referencia para la nota de credito.'
      }

      if (!form.referenceReason.trim()) {
        nextErrors.referenceReason = 'Ingresa la glosa o motivo de referencia.'
      }
    }

    form.lines.forEach((line) => {
      const hasAnyValue =
        line.description.trim() ||
        line.quantity.trim() ||
        line.unitPrice.trim() ||
        line.unitLabel.trim()

      if (!hasAnyValue) {
        return
      }

      const quantity = parseAmount(line.quantity)
      const unitPrice = parseAmount(line.unitPrice)

      if (!line.description.trim()) {
        nextErrors[`line-${line.id}`] = 'Cada linea debe incluir descripcion.'
      } else if (!Number.isFinite(quantity) || quantity <= 0) {
        nextErrors[`line-${line.id}`] = 'Cada linea debe tener cantidad mayor que cero.'
      } else if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        nextErrors[`line-${line.id}`] = 'Cada linea debe tener precio unitario valido.'
      }
    })

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async () => {
    if (!business?.id) {
      setError({
        title: 'Negocio no disponible',
        description: 'Necesitas un negocio activo para administrar documentos emitidos.',
        source: 'validation',
      })
      return
    }

    setError(null)

    if (!validateForm()) {
      return
    }

    if (form.documentType !== 'boleta' && !selectedCustomer) {
      setError({
        title: 'Cliente requerido',
        description: 'Selecciona un cliente valido antes de guardar este documento emitido.',
        source: 'validation',
      })
      return
    }

    const netAmount = parseAmount(form.netAmount)
    const taxAmount = parseAmount(form.taxAmount)
    const exemptAmount = parseAmount(form.exemptAmount)
    const totalAmount = netAmount + taxAmount + exemptAmount

    const lines = form.lines
      .filter(
        (line) =>
          line.description.trim() ||
          line.quantity.trim() ||
          line.unitPrice.trim() ||
          line.unitLabel.trim(),
      )
      .map((line, index) => {
        const quantity = parseAmount(line.quantity)
        const unitPrice = parseAmount(line.unitPrice)
        const lineTotal = quantity * unitPrice

        return {
          lineNumber: index + 1,
          description: line.description.trim(),
          quantity,
          unitPrice,
          discountAmount: 0,
          taxRate: undefined,
          lineNetAmount: lineTotal,
          lineTaxAmount: 0,
          lineTotalAmount: lineTotal,
          unitLabel: line.unitLabel.trim() || undefined,
        }
      })

    const payload: AdminDocumentWriteInput = {
      businessId: business.id,
      direction: 'emitted',
      documentType: form.documentType,
      issueDate: form.issueDate,
      customerId: selectedCustomer?.id,
      counterpartyRut: selectedCustomer?.taxId,
      counterpartyName: selectedCustomer?.legalName,
      folio: form.folio,
      currencyCode: 'CLP',
      netAmount,
      taxAmount,
      exemptAmount,
      totalAmount,
      paymentMethod: form.paymentMethod || undefined,
      status: form.status,
      notes: form.notes,
      sourceOrigin: 'manual',
      lines,
      references:
        form.documentType === 'nota_credito' && selectedReferenceDocument
          ? [
              {
                referencedDocumentId: selectedReferenceDocument.id,
                referencedDocumentType:
                  selectedReferenceDocument.documentType as IssuedDocumentFormValues['documentType'],
                referencedFolio: selectedReferenceDocument.folio ?? '',
                referencedIssueDate: selectedReferenceDocument.issueDate,
                referenceReason: form.referenceReason,
              },
            ]
          : [],
    }

    setIsSubmitting(true)

    try {
      const savedDetail = documentId
        ? await adminDocumentsService.update(documentId, payload)
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
        actionType: documentId ? 'updated' : 'created',
        previousData: existingDetail,
        newData: savedDetail,
        previousStatus: existingDetail?.document.status,
        nextStatus: savedDetail.document.status,
      })

      navigate(
        `/issued-documents/${savedDetail.document.id}?returnTo=${encodeURIComponent(returnTo)}`,
        {
          replace: true,
          state: {
            feedback: documentId
              ? 'Documento emitido actualizado correctamente.'
              : 'Documento emitido registrado correctamente.',
          },
        },
      )
    } catch (submitError) {
      const friendly = getFriendlyDataError(submitError, {
        title: 'No pudimos guardar el documento',
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
  const hasNoCustomers = !hasLoadError && customerAvailability.totalAll === 0
  const hasInactiveCustomers =
    !hasLoadError && customerAvailability.totalAll > 0 && customerAvailability.totalActive === 0

  return (
    <section className="admin-record-page">
      <div className="surface-card admin-record-page__surface">
        <AdminBackHeader
          kicker="Documentos emitidos"
          title={isEditMode ? 'Editar documento emitido' : 'Nuevo documento emitido'}
          description={
            isEditMode
              ? 'Pantalla dedicada para editar un documento emitido sin mezclarla con la bandeja.'
              : 'Pantalla dedicada para registrar un nuevo documento emitido y volver luego al mismo listado.'
          }
          onBack={() => navigate(returnTo)}
        />

        {isLoading ? <AdminLoadingBlock label="Preparando formulario del documento" /> : null}
        {error ? (
          <AdminNotice tone="error" title={error.title}>
            {error.description}
          </AdminNotice>
        ) : null}
        {!isLoading && !hasLoadError ? (
          <>
            {hasNoCustomers ? (
              <AdminNotice tone="warning" title="Sin clientes disponibles">
                Todavia no hay clientes cargados para este negocio. Puedes registrar boletas sin cliente, pero para facturas o notas de credito necesitas al menos uno activo.
              </AdminNotice>
            ) : null}
            {hasInactiveCustomers ? (
              <AdminNotice tone="warning" title="Clientes sin activar">
                Hay clientes registrados en este negocio, pero ninguno esta activo para asociarlo con facturas o notas de credito.
              </AdminNotice>
            ) : null}
            <IssuedDocumentForm
              mode={isEditMode ? 'edit' : 'create'}
              values={form}
              errors={fieldErrors}
              isSubmitting={isSubmitting}
              hasCustomersAvailable={customerAvailability.totalActive > 0}
              customerSearchTerm={customerSearchTerm}
              customerOptions={customerOptions}
              isSearchingCustomers={isSearchingCustomers}
              referenceDocuments={availableReferenceDocuments}
              selectedCustomer={selectedCustomer}
              selectedReferenceDocument={selectedReferenceDocument}
              pendingAttachmentName={attachmentFile?.name ?? null}
              onChange={handleChange}
              onCustomerSearchTermChange={handleCustomerSearchTermChange}
              onCustomerSelect={handleCustomerSelect}
              onLineChange={updateLine}
              onAddLine={addLine}
              onRemoveLine={removeLine}
              onAttachmentChange={setAttachmentFile}
              onSubmit={() => void handleSave()}
              onCancel={() => navigate(returnTo)}
            />
          </>
        ) : null}
      </div>
    </section>
  )
}
