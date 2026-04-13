import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AdminBackHeader } from '../components/AdminBackHeader'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { ReceivedDocumentForm } from '../components/ReceivedDocumentForm'
import type { SearchComboboxOption } from '../../components/ui/SearchCombobox'
import { getFriendlyDataError } from '../lib/adminFeedback'
import { adminAttachmentsService } from '../services/adminAttachments.service'
import { adminAuditService } from '../services/adminAudit.service'
import { adminDocumentsService } from '../services/adminDocuments.service'
import { adminSuppliersService } from '../services/adminSuppliers.service'
import type {
  AdminDocument,
  AdminDocumentDetail,
  AdminDocumentWriteInput,
} from '../types/adminDocument'
import type { AdminSupplier } from '../types/adminSupplier'
import {
  emptyForm,
  emptyLine,
  isReceivedReferenceCandidate,
  mapDetailToForm,
  parseAmount,
  toReferenceDocumentType,
  type ReceivedDocumentFieldErrors,
  type ReceivedDocumentFormLine,
  type ReceivedDocumentFormValues,
} from '../lib/receivedDocuments'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

export function ReceivedDocumentUpsertPage() {
  const navigate = useNavigate()
  const { business } = useWebWorkspace()
  const { documentId } = useParams<{ documentId: string }>()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState<ReceivedDocumentFormValues>(emptyForm)
  const [referenceDocuments, setReferenceDocuments] = useState<AdminDocument[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<AdminSupplier | null>(null)
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('')
  const [supplierSearchResults, setSupplierSearchResults] = useState<AdminSupplier[]>([])
  const [isSearchingSuppliers, setIsSearchingSuppliers] = useState(false)
  const [supplierAvailability, setSupplierAvailability] = useState({
    totalActive: 0,
    totalAll: 0,
  })
  const [fieldErrors, setFieldErrors] = useState<ReceivedDocumentFieldErrors>({})
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
  const returnTo = searchParams.get('returnTo') || '/received-documents'

  useEffect(() => {
    const loadDependencies = async () => {
      if (!business?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const [referenceResult, suppliersResult, detail] = await Promise.all([
          adminDocumentsService.list({
            businessId: business.id,
            direction: 'received',
            page: 1,
            pageSize: 200,
          }),
          adminSuppliersService.listAvailableForDocuments(business.id),
          documentId ? adminDocumentsService.getById(documentId) : Promise.resolve(null),
        ])

        setReferenceDocuments(referenceResult.items.filter(isReceivedReferenceCandidate))
        setSupplierAvailability({
          totalActive: suppliersResult.totalActive,
          totalAll: suppliersResult.totalAll,
        })

        if (documentId) {
          if (!detail) {
            setExistingDetail(null)
            setError({
              title: 'Documento no disponible',
              description: 'No encontramos el documento recibido solicitado para esta empresa.',
              source: 'load',
            })
            return
          }

          setExistingDetail(detail)
          setForm(mapDetailToForm(detail))
          if (detail.document.supplierId) {
            const supplier = await adminSuppliersService.getById(detail.document.supplierId)
            setSelectedSupplier(supplier)
            setSupplierSearchResults(supplier ? [supplier] : [])
            setSupplierSearchTerm(supplier ? supplier.legalName : detail.document.counterpartyName ?? '')
          } else {
            setSelectedSupplier(null)
            setSupplierSearchResults([])
            setSupplierSearchTerm('')
          }
        } else {
          setExistingDetail(null)
          setForm(emptyForm())
          setSelectedSupplier(null)
          setSupplierSearchResults([])
          setSupplierSearchTerm('')
        }
      } catch (loadError) {
        const friendly = getFriendlyDataError(loadError, {
          title: 'No pudimos preparar el formulario',
          description:
            'Ocurrio un problema al cargar proveedores o documentos de referencia del negocio actual.',
        })
        setError({
          ...friendly,
          source: 'load',
        })
        setSelectedSupplier(null)
        setSupplierSearchTerm('')
        setSupplierSearchResults([])
        setSupplierAvailability({ totalActive: 0, totalAll: 0 })
      } finally {
        setIsLoading(false)
      }
    }

    void loadDependencies()
  }, [business?.id, documentId])

  const selectedReferenceDocument = useMemo(
    () => referenceDocuments.find((item) => item.id === form.referenceDocumentId) ?? null,
    [referenceDocuments, form.referenceDocumentId],
  )

  useEffect(() => {
    if (!business?.id || !supplierAvailability.totalActive) {
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
          console.error('[receivedDocuments] Supplier search failed.', {
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
  }, [business?.id, selectedSupplier, supplierAvailability.totalActive, supplierSearchTerm])

  const supplierOptions = useMemo<SearchComboboxOption[]>(
    () =>
      supplierSearchResults.slice(0, 8).map((supplier) => ({
        value: supplier.id,
        label: supplier.legalName,
        description: [supplier.taxId, supplier.email].filter(Boolean).join(' - '),
      })),
    [supplierSearchResults],
  )

  const handleChange = <K extends keyof ReceivedDocumentFormValues>(
    field: K,
    value: ReceivedDocumentFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleSupplierSearchTermChange = (value: string) => {
    setSupplierSearchTerm(value)

    if (selectedSupplier && value !== selectedSupplier.legalName) {
      setSelectedSupplier(null)
      setForm((current) => ({ ...current, supplierId: '' }))
      setFieldErrors((current) => {
        if (!current.supplierId && !current.supplierTaxId) {
          return current
        }

        const next = { ...current }
        delete next.supplierId
        delete next.supplierTaxId
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
      if (!current.supplierId && !current.supplierTaxId) {
        return current
      }

      const next = { ...current }
      delete next.supplierId
      delete next.supplierTaxId
      return next
    })
  }

  const updateLine = (lineId: string, changes: Partial<ReceivedDocumentFormLine>) => {
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
    const nextErrors: ReceivedDocumentFieldErrors = {}
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

    if (!form.supplierId) {
      nextErrors.supplierId = 'Selecciona un proveedor.'
    }

    if (form.supplierId && !selectedSupplier) {
      nextErrors.supplierTaxId = 'El proveedor seleccionado no esta disponible.'
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
        description: 'Necesitas un negocio activo para administrar documentos recibidos.',
        source: 'validation',
      })
      return
    }

    setError(null)

    if (!validateForm()) {
      return
    }

    if (!selectedSupplier) {
      setError({
        title: 'Proveedor requerido',
        description: 'Selecciona un proveedor valido antes de guardar el documento recibido.',
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
      direction: 'received',
      documentType: form.documentType,
      issueDate: form.issueDate,
      supplierId: selectedSupplier.id,
      counterpartyRut: selectedSupplier.taxId,
      counterpartyName: selectedSupplier.legalName,
      folio: form.folio,
      currencyCode: 'CLP',
      netAmount,
      taxAmount,
      exemptAmount,
      totalAmount,
      status: form.status,
      notes: form.notes,
      sourceOrigin: 'manual',
      lines,
      references:
        form.documentType === 'nota_credito' && selectedReferenceDocument
          ? [
              {
                referencedDocumentId: selectedReferenceDocument.id,
                referencedDocumentType: toReferenceDocumentType(
                  selectedReferenceDocument.documentType as ReceivedDocumentFormValues['documentType'],
                ),
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
        `/received-documents/${savedDetail.document.id}?returnTo=${encodeURIComponent(returnTo)}`,
        {
          replace: true,
          state: {
            feedback: documentId
              ? 'Documento recibido actualizado correctamente.'
              : 'Documento recibido registrado correctamente.',
          },
        },
      )
    } catch (submitError) {
      setError(
        (() => {
          const friendly = getFriendlyDataError(submitError, {
            title: 'No pudimos guardar el documento',
            description:
              'Revisa los datos del formulario e intenta nuevamente en unos segundos.',
          })
          return { ...friendly, source: 'submit' as const }
        })(),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasLoadError = error?.source === 'load'
  const hasNoSuppliers = !hasLoadError && supplierAvailability.totalAll === 0
  const hasInactiveSuppliers =
    !hasLoadError && supplierAvailability.totalAll > 0 && supplierAvailability.totalActive === 0

  return (
    <section className="admin-record-page">
      <div className="surface-card admin-record-page__surface">
        <AdminBackHeader
          kicker="Documentos recibidos"
          title={isEditMode ? 'Editar documento recibido' : 'Nuevo documento recibido'}
          description={
            isEditMode
              ? 'Pantalla dedicada para editar un documento recibido sin mezclarla con la bandeja.'
              : 'Pantalla dedicada para registrar un nuevo documento recibido y volver luego al mismo listado.'
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
            {hasNoSuppliers ? (
              <AdminNotice tone="warning" title="Sin proveedores disponibles">
                Todavia no hay proveedores cargados para este negocio. Crea o activa uno antes de registrar documentos recibidos.
              </AdminNotice>
            ) : null}
            {hasInactiveSuppliers ? (
              <AdminNotice tone="warning" title="Proveedores sin activar">
                Hay proveedores registrados en este negocio, pero ninguno esta activo para relacionarlo con un documento recibido.
              </AdminNotice>
            ) : null}
            <ReceivedDocumentForm
              mode={isEditMode ? 'edit' : 'create'}
              values={form}
              errors={fieldErrors}
              isSubmitting={isSubmitting}
              hasSuppliersAvailable={supplierAvailability.totalActive > 0}
              supplierSearchTerm={supplierSearchTerm}
              supplierOptions={supplierOptions}
              isSearchingSuppliers={isSearchingSuppliers}
              referenceDocuments={referenceDocuments}
              selectedSupplier={selectedSupplier}
              selectedReferenceDocument={selectedReferenceDocument}
              pendingAttachmentName={attachmentFile?.name ?? null}
              onChange={handleChange}
              onSupplierSearchTermChange={handleSupplierSearchTermChange}
              onSupplierSelect={handleSupplierSelect}
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
