import type {
  AdminDocument,
  AdminDocumentLine,
  AdminDocumentReference,
  AdminDocumentType,
} from './adminDocument'

export interface DteXmlPartySnapshot {
  taxId: string
  legalName: string
  businessLine: string
  addressLine1: string
  district: string
  city: string
}

export interface DteXmlGeneratorInput {
  document: Pick<
    AdminDocument,
    | 'id'
    | 'documentType'
    | 'siiDteCode'
    | 'folio'
    | 'issueDate'
    | 'dueDate'
    | 'currencyCode'
    | 'netAmount'
    | 'taxAmount'
    | 'exemptAmount'
    | 'totalAmount'
    | 'paymentMethod'
  >
  emitter: DteXmlPartySnapshot
  receiver: DteXmlPartySnapshot
  lines: Pick<
    AdminDocumentLine,
    | 'lineNumber'
    | 'sku'
    | 'barcode'
    | 'description'
    | 'quantity'
    | 'unitPrice'
    | 'discountAmount'
    | 'lineTotalAmount'
    | 'unitLabel'
  >[]
  references?: Pick<
    AdminDocumentReference,
    | 'referencedDocumentType'
    | 'referencedFolio'
    | 'referencedIssueDate'
    | 'referenceReason'
    | 'referenceCode'
  >[]
  documentXmlId?: string
  xmlEncoding?: 'ISO-8859-1' | 'UTF-8'
}

export interface DteXmlGenerationResult {
  xml: string
  documentXmlId: string
  siiDteCode: number
}

export interface DteReferenceCodeMap {
  [key: string]: number | undefined
}

export type SupportedDteDocumentType = Exclude<AdminDocumentType, 'other' | 'boleta_compra'>
