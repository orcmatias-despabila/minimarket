import type {
  AdminDocument,
  AdminDocumentDetail,
  AdminDocumentStatus,
  AdminDocumentType,
} from '../types/adminDocument'

export type ReceivedDocumentFormLine = {
  id: string
  description: string
  quantity: string
  unitPrice: string
  unitLabel: string
}

export type ReceivedDocumentFormValues = {
  documentType: Extract<AdminDocumentType, 'factura_compra' | 'boleta_compra' | 'nota_credito'>
  folio: string
  issueDate: string
  supplierId: string
  netAmount: string
  taxAmount: string
  exemptAmount: string
  status: Extract<
    AdminDocumentStatus,
    'draft' | 'recorded' | 'paid' | 'partially_paid' | 'cancelled' | 'voided'
  >
  notes: string
  referenceDocumentId: string
  referenceReason: string
  lines: ReceivedDocumentFormLine[]
}

export type ReceivedDocumentFieldErrors = Partial<
  Record<
    | keyof ReceivedDocumentFormValues
    | 'supplierTaxId'
    | 'attachment'
    | 'amounts'
    | `line-${string}`,
    string
  >
>

export const receivedDocumentsPageSize = 12

export const documentTypeOptions: Array<{
  value: ReceivedDocumentFormValues['documentType']
  label: string
}> = [
  { value: 'factura_compra', label: 'Factura de compra' },
  { value: 'boleta_compra', label: 'Boleta de compra' },
  { value: 'nota_credito', label: 'Nota de credito recibida' },
]

export const statusOptions: Array<{
  value: ReceivedDocumentFormValues['status']
  label: string
}> = [
  { value: 'draft', label: 'Borrador' },
  { value: 'recorded', label: 'Registrado' },
  { value: 'partially_paid', label: 'Pago parcial' },
  { value: 'paid', label: 'Pagado' },
  { value: 'cancelled', label: 'Anulado' },
  { value: 'voided', label: 'Invalidado' },
]

export const typeLabelMap: Record<ReceivedDocumentFormValues['documentType'], string> = {
  factura_compra: 'Factura de compra',
  boleta_compra: 'Boleta de compra',
  nota_credito: 'Nota de credito recibida',
}

export const statusLabelMap: Record<ReceivedDocumentFormValues['status'], string> = {
  draft: 'Borrador',
  recorded: 'Registrado',
  partially_paid: 'Pago parcial',
  paid: 'Pagado',
  cancelled: 'Anulado',
  voided: 'Invalidado',
}

export const typeChipClassMap: Record<ReceivedDocumentFormValues['documentType'], string> = {
  factura_compra: 'received-documents-web__type-chip received-documents-web__type-chip--invoice',
  boleta_compra: 'received-documents-web__type-chip received-documents-web__type-chip--receipt',
  nota_credito:
    'received-documents-web__type-chip received-documents-web__type-chip--credit-note',
}

export const emptyLine = (): ReceivedDocumentFormLine => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: '1',
  unitPrice: '',
  unitLabel: '',
})

export const emptyForm = (): ReceivedDocumentFormValues => ({
  documentType: 'factura_compra',
  folio: '',
  issueDate: new Date().toISOString().slice(0, 10),
  supplierId: '',
  netAmount: '',
  taxAmount: '',
  exemptAmount: '',
  status: 'recorded',
  notes: '',
  referenceDocumentId: '',
  referenceReason: '',
  lines: [emptyLine()],
})

export const parseAmount = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return 0
  const parsed = Number(trimmed.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(value))

export const getStatusChipClass = (status: ReceivedDocumentFormValues['status']) => {
  if (status === 'cancelled' || status === 'voided') {
    return 'status-chip admin-status-badge status-chip--muted'
  }

  if (status === 'paid') {
    return 'status-chip admin-status-badge admin-status-badge--success'
  }

  if (status === 'partially_paid') {
    return 'status-chip admin-status-badge admin-status-badge--warning'
  }

  return 'status-chip admin-status-badge'
}

export const formatLineTotal = (line: ReceivedDocumentFormLine, formatCurrency: (value: number) => string) => {
  const quantity = parseAmount(line.quantity)
  const unitPrice = parseAmount(line.unitPrice)
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    return 'Sin calculo'
  }

  return formatCurrency(quantity * unitPrice)
}

export const mapDetailToForm = (detail: AdminDocumentDetail): ReceivedDocumentFormValues => ({
  documentType: detail.document.documentType as ReceivedDocumentFormValues['documentType'],
  folio: detail.document.folio ?? '',
  issueDate: detail.document.issueDate,
  supplierId: detail.document.supplierId ?? '',
  netAmount: String(detail.document.netAmount),
  taxAmount: String(detail.document.taxAmount),
  exemptAmount: String(detail.document.exemptAmount),
  status: detail.document.status as ReceivedDocumentFormValues['status'],
  notes: detail.document.notes ?? '',
  referenceDocumentId: detail.references[0]?.referencedDocumentId ?? '',
  referenceReason: detail.references[0]?.referenceReason ?? '',
  lines: detail.lines.length
    ? detail.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: String(line.quantity),
        unitPrice: String(line.unitPrice),
        unitLabel: line.unitLabel ?? '',
      }))
    : [emptyLine()],
})

export const toReferenceDocumentType = (documentType: ReceivedDocumentFormValues['documentType']) => {
  if (documentType === 'factura_compra') return 'factura_compra'
  if (documentType === 'boleta_compra') return 'boleta_compra'
  return 'nota_credito'
}

export const isReceivedReferenceCandidate = (document: AdminDocument) =>
  document.direction === 'received' && document.documentType !== 'nota_credito'
