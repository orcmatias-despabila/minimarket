import type {
  AdminDocument,
  AdminDocumentDetail,
  AdminDocumentPaymentMethod,
  AdminDocumentStatus,
  AdminDocumentType,
} from '../types/adminDocument'

export type IssuedDocumentFormLine = {
  id: string
  description: string
  quantity: string
  unitPrice: string
  unitLabel: string
}

export type IssuedDocumentFormValues = {
  documentType: Extract<AdminDocumentType, 'boleta' | 'factura' | 'nota_credito'>
  folio: string
  issueDate: string
  customerId: string
  netAmount: string
  taxAmount: string
  exemptAmount: string
  status: Extract<
    AdminDocumentStatus,
    'draft' | 'recorded' | 'paid' | 'partially_paid' | 'cancelled' | 'voided'
  >
  paymentMethod: '' | AdminDocumentPaymentMethod
  notes: string
  referenceDocumentId: string
  referenceReason: string
  lines: IssuedDocumentFormLine[]
}

export type IssuedDocumentFieldErrors = Partial<
  Record<
    | keyof IssuedDocumentFormValues
    | 'customerTaxId'
    | 'amounts'
    | `line-${string}`,
    string
  >
>

export const issuedDocumentsPageSize = 12

export const documentTypeOptions: Array<{
  value: IssuedDocumentFormValues['documentType']
  label: string
}> = [
  { value: 'boleta', label: 'Boleta emitida' },
  { value: 'factura', label: 'Factura emitida' },
  { value: 'nota_credito', label: 'Nota de credito emitida' },
]

export const statusOptions: Array<{
  value: IssuedDocumentFormValues['status']
  label: string
}> = [
  { value: 'draft', label: 'Borrador' },
  { value: 'recorded', label: 'Emitido' },
  { value: 'partially_paid', label: 'Pago parcial' },
  { value: 'paid', label: 'Pagado' },
  { value: 'cancelled', label: 'Anulado' },
  { value: 'voided', label: 'Invalidado' },
]

export const paymentOptions: Array<{
  value: IssuedDocumentFormValues['paymentMethod'] | 'all'
  label: string
}> = [
  { value: '', label: 'Sin medio de pago' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Debito' },
  { value: 'credit', label: 'Credito' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
]

export const typeLabelMap: Record<IssuedDocumentFormValues['documentType'], string> = {
  boleta: 'Boleta emitida',
  factura: 'Factura emitida',
  nota_credito: 'Nota de credito emitida',
}

export const statusLabelMap: Record<IssuedDocumentFormValues['status'], string> = {
  draft: 'Borrador',
  recorded: 'Emitido',
  partially_paid: 'Pago parcial',
  paid: 'Pagado',
  cancelled: 'Anulado',
  voided: 'Invalidado',
}

export const paymentLabelMap: Record<AdminDocumentPaymentMethod, string> = {
  cash: 'Efectivo',
  debit: 'Debito',
  credit: 'Credito',
  transfer: 'Transferencia',
  other: 'Otro',
}

export const typeChipClassMap: Record<IssuedDocumentFormValues['documentType'], string> = {
  factura: 'issued-documents-web__type-chip issued-documents-web__type-chip--invoice',
  boleta: 'issued-documents-web__type-chip issued-documents-web__type-chip--receipt',
  nota_credito: 'issued-documents-web__type-chip issued-documents-web__type-chip--credit-note',
}

export const emptyLine = (): IssuedDocumentFormLine => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: '1',
  unitPrice: '',
  unitLabel: '',
})

export const emptyForm = (): IssuedDocumentFormValues => ({
  documentType: 'boleta',
  folio: '',
  issueDate: new Date().toISOString().slice(0, 10),
  customerId: '',
  netAmount: '',
  taxAmount: '',
  exemptAmount: '',
  status: 'recorded',
  paymentMethod: '',
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

export const getStatusChipClass = (status: IssuedDocumentFormValues['status']) => {
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

export const formatLineTotal = (line: IssuedDocumentFormLine, formatCurrency: (value: number) => string) => {
  const quantity = parseAmount(line.quantity)
  const unitPrice = parseAmount(line.unitPrice)
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    return 'Sin calculo'
  }

  return formatCurrency(quantity * unitPrice)
}

export const mapDetailToForm = (detail: AdminDocumentDetail): IssuedDocumentFormValues => ({
  documentType: detail.document.documentType as IssuedDocumentFormValues['documentType'],
  folio: detail.document.folio ?? '',
  issueDate: detail.document.issueDate,
  customerId: detail.document.customerId ?? '',
  netAmount: String(detail.document.netAmount),
  taxAmount: String(detail.document.taxAmount),
  exemptAmount: String(detail.document.exemptAmount),
  status: detail.document.status as IssuedDocumentFormValues['status'],
  paymentMethod: detail.document.paymentMethod ?? '',
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

export const isIssuedReferenceCandidate = (document: AdminDocument) =>
  document.direction === 'emitted' && document.documentType !== 'nota_credito'
