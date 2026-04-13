import type { AdminDateRangeFilter, AdminListFilterBase } from './adminShared'

export type AdminDocumentDirection = 'emitted' | 'received'

export type AdminDocumentType =
  | 'boleta'
  | 'factura'
  | 'nota_credito'
  | 'boleta_compra'
  | 'factura_compra'
  | 'other'

export type AdminDocumentStatus =
  | 'draft'
  | 'recorded'
  | 'partially_paid'
  | 'paid'
  | 'cancelled'
  | 'voided'

export type AdminDocumentSourceOrigin = 'manual' | 'imported' | 'generated'
export type AdminDocumentDteStatus =
  | 'draft'
  | 'xml_generated'
  | 'signed'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'failed'

export type AdminDocumentPaymentMethod =
  | 'cash'
  | 'debit'
  | 'credit'
  | 'transfer'
  | 'other'

export interface AdminDocument {
  id: string
  businessId: string
  direction: AdminDocumentDirection
  documentType: AdminDocumentType
  siiDteCode?: number
  folio?: string
  issueDate: string
  dueDate?: string
  customerId?: string
  supplierId?: string
  counterpartyRut?: string
  counterpartyName?: string
  currencyCode: string
  netAmount: number
  taxAmount: number
  exemptAmount: number
  totalAmount: number
  paymentMethod?: AdminDocumentPaymentMethod
  status: AdminDocumentStatus
  dteStatus?: AdminDocumentDteStatus
  cafFileId?: string
  dteXml?: string
  dteXmlDocumentId?: string
  dteLastSubmissionId?: string
  dteTrackId?: string
  dteGeneratedAt?: string
  dteSignedAt?: string
  dteSentAt?: string
  dteRespondedAt?: string
  dteLastError?: string
  notes?: string
  sourceOrigin: AdminDocumentSourceOrigin
  createdByUserId?: string
  updatedByUserId?: string
  createdAt: string
  updatedAt: string
}

export interface AdminDocumentLine {
  id: string
  documentId: string
  lineNumber: number
  productId?: string
  sku?: string
  barcode?: string
  description: string
  quantity: number
  unitPrice: number
  discountAmount: number
  taxRate?: number
  lineNetAmount: number
  lineTaxAmount: number
  lineTotalAmount: number
  unitLabel?: string
  createdAt: string
}

export interface AdminDocumentReference {
  id: string
  documentId: string
  referencedDocumentId?: string
  referencedDocumentType: AdminDocumentType
  referencedFolio: string
  referencedIssueDate?: string
  referenceReason: string
  referenceCode?: string
  createdAt: string
}

export interface AdminDocumentAttachment {
  id: string
  documentId: string
  storageBucket: string
  storagePath: string
  fileName: string
  mimeType: string
  fileSize: number
  uploadedByUserId?: string
  createdAt: string
}

export interface AdminDocumentDetail {
  document: AdminDocument
  lines: AdminDocumentLine[]
  references: AdminDocumentReference[]
  attachments: AdminDocumentAttachment[]
}

export interface AdminDocumentListFilters extends AdminListFilterBase, AdminDateRangeFilter {
  direction?: AdminDocumentDirection
  documentType?: AdminDocumentType | 'all'
  status?: AdminDocumentStatus | 'all'
  customerId?: string | 'all'
  supplierId?: string | 'all'
  paymentMethod?: AdminDocumentPaymentMethod | 'all'
  folio?: string
}

export interface AdminDocumentLineWriteInput {
  id?: string
  lineNumber: number
  productId?: string
  sku?: string
  barcode?: string
  description: string
  quantity: number
  unitPrice: number
  discountAmount?: number
  taxRate?: number
  lineNetAmount: number
  lineTaxAmount: number
  lineTotalAmount: number
  unitLabel?: string
}

export interface AdminDocumentReferenceWriteInput {
  id?: string
  referencedDocumentId?: string
  referencedDocumentType: AdminDocumentType
  referencedFolio: string
  referencedIssueDate?: string
  referenceReason: string
  referenceCode?: string
}

export interface AdminDocumentWriteInput {
  businessId: string
  direction: AdminDocumentDirection
  documentType: AdminDocumentType
  siiDteCode?: number
  folio?: string
  issueDate: string
  dueDate?: string
  customerId?: string
  supplierId?: string
  counterpartyRut?: string
  counterpartyName?: string
  currencyCode?: string
  netAmount: number
  taxAmount: number
  exemptAmount?: number
  totalAmount: number
  paymentMethod?: AdminDocumentPaymentMethod
  status: AdminDocumentStatus
  notes?: string
  sourceOrigin: AdminDocumentSourceOrigin
  lines?: AdminDocumentLineWriteInput[]
  references?: AdminDocumentReferenceWriteInput[]
}

export interface AdminAttachmentUploadInput {
  businessId: string
  documentId: string
  file: File
}
