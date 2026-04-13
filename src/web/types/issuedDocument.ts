import type { Sale } from '../../types/domain'

export type IssuedDocumentType = 'issued_receipt' | 'issued_invoice' | 'issued_credit_note'

export type IssuedDocumentStatus = 'draft' | 'issued' | 'paid' | 'cancelled'

export interface IssuedDocumentLine {
  id: string
  description: string
  quantity?: number
  amount?: number
}

export interface IssuedDocumentReference {
  documentId?: string
  type?: IssuedDocumentType
  folio: string
  issuedAt: string
  customerId?: string
  customerRut?: string
  reason: string
}

export interface IssuedDocument {
  id: string
  businessId: string
  type: IssuedDocumentType
  folio: string
  issuedAt: string
  customerId?: string
  customerName?: string
  customerRut?: string
  netAmount: number
  taxAmount: number
  totalAmount: number
  status: IssuedDocumentStatus
  paymentMethod?: Sale['paymentMethod']
  sellerName?: string
  notes?: string
  reference?: IssuedDocumentReference
  lines: IssuedDocumentLine[]
  createdAt: string
  updatedAt: string
}

export interface SaveIssuedDocumentInput {
  existingDocumentId?: string
  businessId: string
  type: IssuedDocumentType
  folio: string
  issuedAt: string
  customerId?: string
  customerName?: string
  customerRut?: string
  netAmount: number
  taxAmount: number
  totalAmount: number
  status: IssuedDocumentStatus
  paymentMethod?: Sale['paymentMethod']
  sellerName?: string
  notes?: string
  reference?: IssuedDocumentReference
  lines: IssuedDocumentLine[]
}
