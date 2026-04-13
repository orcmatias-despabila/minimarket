import type {
  AdminDocument,
  AdminDocumentDetail,
  AdminDocumentPaymentMethod,
  AdminDocumentStatus,
  AdminDocumentType,
} from '../types/adminDocument'

export type CreditNoteScope = 'emitted' | 'received'

export type CreditNoteFormValues = {
  scope: CreditNoteScope
  folio: string
  issueDate: string
  customerId: string
  supplierId: string
  netAmount: string
  taxAmount: string
  exemptAmount: string
  status: Extract<
    AdminDocumentStatus,
    'draft' | 'recorded' | 'cancelled' | 'voided'
  >
  paymentMethod: '' | AdminDocumentPaymentMethod
  referenceDocumentId: string
  referenceReason: string
  notes: string
}

export type CreditNoteFieldErrors = Partial<
  Record<keyof CreditNoteFormValues | 'counterparty' | 'amounts', string>
>

export const creditNotesPageSize = 12

export const statusOptions: Array<{
  value: CreditNoteFormValues['status']
  label: string
}> = [
  { value: 'draft', label: 'Borrador' },
  { value: 'recorded', label: 'Registrada' },
  { value: 'cancelled', label: 'Anulada' },
  { value: 'voided', label: 'Invalidada' },
]

export const paymentOptions: Array<{
  value: CreditNoteFormValues['paymentMethod']
  label: string
}> = [
  { value: '', label: 'Sin medio de pago' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Debito' },
  { value: 'credit', label: 'Credito' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
]

export const typeLabelMap: Record<AdminDocumentType, string> = {
  boleta: 'Boleta emitida',
  factura: 'Factura emitida',
  nota_credito: 'Nota de credito',
  boleta_compra: 'Boleta de compra',
  factura_compra: 'Factura de compra',
  other: 'Otro documento',
}

export const statusLabelMap: Record<AdminDocumentStatus, string> = {
  draft: 'Borrador',
  recorded: 'Registrada',
  partially_paid: 'Pago parcial',
  paid: 'Pagada',
  cancelled: 'Anulada',
  voided: 'Invalidada',
}

export const paymentLabelMap: Record<AdminDocumentPaymentMethod, string> = {
  cash: 'Efectivo',
  debit: 'Debito',
  credit: 'Credito',
  transfer: 'Transferencia',
  other: 'Otro',
}

export const emptyForm = (): CreditNoteFormValues => ({
  scope: 'emitted',
  folio: '',
  issueDate: new Date().toISOString().slice(0, 10),
  customerId: '',
  supplierId: '',
  netAmount: '',
  taxAmount: '',
  exemptAmount: '',
  status: 'recorded',
  paymentMethod: '',
  referenceDocumentId: '',
  referenceReason: '',
  notes: '',
})

export const parseAmount = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return 0
  const parsed = Number(trimmed.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(value))
    : 'Sin fecha'

export const getStatusChipClass = (status: AdminDocumentStatus) => {
  if (status === 'cancelled' || status === 'voided') {
    return 'status-chip admin-status-badge status-chip--muted'
  }

  if (status === 'paid' || status === 'recorded') {
    return 'status-chip admin-status-badge admin-status-badge--success'
  }

  if (status === 'partially_paid') {
    return 'status-chip admin-status-badge admin-status-badge--warning'
  }

  return 'status-chip admin-status-badge'
}

export const mapDetailToForm = (detail: AdminDocumentDetail): CreditNoteFormValues => ({
  scope: detail.document.direction,
  folio: detail.document.folio ?? '',
  issueDate: detail.document.issueDate,
  customerId: detail.document.customerId ?? '',
  supplierId: detail.document.supplierId ?? '',
  netAmount: String(detail.document.netAmount),
  taxAmount: String(detail.document.taxAmount),
  exemptAmount: String(detail.document.exemptAmount),
  status: detail.document.status as CreditNoteFormValues['status'],
  paymentMethod: detail.document.paymentMethod ?? '',
  referenceDocumentId: detail.references[0]?.referencedDocumentId ?? '',
  referenceReason: detail.references[0]?.referenceReason ?? '',
  notes: detail.document.notes ?? '',
})

export const isReferenceCandidate = (document: AdminDocument) =>
  document.documentType !== 'nota_credito'
