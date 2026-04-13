export type ReceivedDocumentType =
  | 'purchase_invoice'
  | 'purchase_receipt'
  | 'received_credit_note'

export type ReceivedDocumentStatus = 'draft' | 'received' | 'reviewed' | 'cancelled'

export interface ReceivedDocumentAttachment {
  name: string
  mimeType: string
  size: number
  dataUrl?: string
}

export interface ReceivedDocumentLine {
  id: string
  description: string
  quantity?: number
  amount?: number
}

export interface ReceivedDocumentReference {
  documentId?: string
  type?: ReceivedDocumentType
  folio: string
  issuedAt: string
  supplierId?: string
  supplierRut?: string
  reason: string
}

export interface ReceivedDocument {
  id: string
  businessId: string
  type: ReceivedDocumentType
  folio: string
  issuedAt: string
  supplierId: string
  supplierName: string
  supplierRut: string
  netAmount: number
  taxAmount: number
  totalAmount: number
  status: ReceivedDocumentStatus
  notes?: string
  attachment?: ReceivedDocumentAttachment
  reference?: ReceivedDocumentReference
  lines: ReceivedDocumentLine[]
  createdAt: string
  updatedAt: string
}

export interface SaveReceivedDocumentInput {
  existingDocumentId?: string
  businessId: string
  type: ReceivedDocumentType
  folio: string
  issuedAt: string
  supplierId: string
  supplierName: string
  supplierRut: string
  netAmount: number
  taxAmount: number
  totalAmount: number
  status: ReceivedDocumentStatus
  notes?: string
  attachment?: ReceivedDocumentAttachment
  reference?: ReceivedDocumentReference
  lines: ReceivedDocumentLine[]
}
