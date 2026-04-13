export interface AdminDailyDocumentSummary {
  businessId: string
  issueDate: string
  periodMonth: string
  documentType: string
  status: string
  documentCount: number
  netAmount: number
  taxAmount: number
  exemptAmount: number
  totalAmount: number
}

export interface AdminSupplierRollup {
  businessId: string
  supplierId?: string
  supplierName: string
  supplierTaxId?: string
  documentCount: number
  firstIssueDate?: string
  lastIssueDate?: string
  netAmount: number
  taxAmount: number
  exemptAmount: number
  totalAmount: number
}

export interface AdminCustomerRollup {
  businessId: string
  customerId?: string
  customerName: string
  customerTaxId?: string
  documentCount: number
  firstIssueDate?: string
  lastIssueDate?: string
  netAmount: number
  taxAmount: number
  exemptAmount: number
  totalAmount: number
}

export interface AdminDocumentsByTypeRollup {
  businessId: string
  direction: string
  documentType: string
  status: string
  documentCount: number
  firstIssueDate?: string
  lastIssueDate?: string
  netAmount: number
  taxAmount: number
  exemptAmount: number
  totalAmount: number
}

export interface AdminCreditNoteSummary {
  businessId: string
  direction: string
  issueDate: string
  periodMonth: string
  status: string
  creditNoteCount: number
  netAmount: number
  taxAmount: number
  totalAmount: number
  referencedInternalDocuments: number
}

export interface AdminPurchasesVsSalesMonthly {
  businessId: string
  periodMonth: string
  purchaseTotalAmount: number
  salesTotalAmount: number
  receivedCreditNoteTotal: number
  emittedCreditNoteTotal: number
  grossDifferenceAmount: number
  netDifferenceAfterCreditNotes: number
}

export interface AdminReportQueryFilters {
  businessId: string
  dateFrom?: string
  dateTo?: string
}
