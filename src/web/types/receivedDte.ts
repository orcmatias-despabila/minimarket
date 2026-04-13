export type ReceivedDteStatus = 'received' | 'accepted' | 'claimed'
export type ReceivedDteSourceChannel = 'manual' | 'email' | 'imported' | 'sii'

export interface ParsedReceivedDteReference {
  lineNumber: number
  referencedDocumentTypeCode?: number
  referencedFolio?: string
  referencedIssueDate?: string
  referenceCode?: string
  referenceReason?: string
}

export interface ParsedReceivedDteLine {
  lineNumber: number
  itemName?: string
  itemDescription?: string
  quantity?: number
  unitLabel?: string
  unitPrice?: number
  lineTotalAmount?: number
}

export interface ParsedReceivedDtePayload {
  issuerTaxId?: string
  issuerLegalName?: string
  issuerBusinessLine?: string
  issuerAddress?: string
  issuerDistrict?: string
  issuerCity?: string
  siiDteCode?: number
  documentType?: string
  folio?: string
  issueDate?: string
  netAmount?: number
  taxAmount?: number
  exemptAmount?: number
  totalAmount?: number
  references: ParsedReceivedDteReference[]
  lines: ParsedReceivedDteLine[]
}

export interface ReceivedDteInboxRecord {
  id: string
  businessId: string
  supplierId?: string
  documentId?: string
  receptionStatus: ReceivedDteStatus
  sourceChannel: ReceivedDteSourceChannel
  rawXml: string
  issuerTaxId?: string
  issuerLegalName?: string
  issuerBusinessLine?: string
  issuerAddress?: string
  issuerDistrict?: string
  issuerCity?: string
  siiDteCode?: number
  documentType?: string
  folio?: string
  issueDate?: string
  netAmount?: number
  taxAmount?: number
  exemptAmount?: number
  totalAmount?: number
  parsedPayload?: ParsedReceivedDtePayload
  receivedAt: string
  respondedAt?: string
  createdByUserId?: string
  createdAt: string
  updatedAt: string
}

export interface ReceivedDteInboxWriteInput {
  businessId: string
  rawXml: string
  sourceChannel?: ReceivedDteSourceChannel
  receptionStatus?: ReceivedDteStatus
  documentId?: string
  createdByUserId?: string
}
