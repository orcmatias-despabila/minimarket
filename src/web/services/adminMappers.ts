import type { AdminEntityEvent } from '../types/adminAudit'
import type {
  AdminDocument,
  AdminDocumentAttachment,
  AdminDocumentLine,
  AdminDocumentReference,
  AdminDocumentWriteInput,
} from '../types/adminDocument'
import type { AdminCustomer } from '../types/adminCustomer'
import type { AdminSupplier } from '../types/adminSupplier'
import type {
  AdminCreditNoteSummary,
  AdminCustomerRollup,
  AdminDailyDocumentSummary,
  AdminDocumentsByTypeRollup,
  AdminPurchasesVsSalesMonthly,
  AdminSupplierRollup,
} from '../types/adminReport'
import { formatRutForDisplay } from '../../lib/rut'

type Nullable<T> = T | null

export interface AdminCustomerRow {
  id: string
  business_id: string
  tax_id: string
  legal_name: string
  business_line: Nullable<string>
  address_line_1: Nullable<string>
  district: Nullable<string>
  city: Nullable<string>
  phone: Nullable<string>
  email: Nullable<string>
  notes: Nullable<string>
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  created_by_user_id: Nullable<string>
  updated_by_user_id: Nullable<string>
}

export interface AdminSupplierRow extends AdminCustomerRow {
  contact_name: Nullable<string>
}

export interface AdminDocumentRow {
  id: string
  business_id: string
  direction: AdminDocument['direction']
  document_type: AdminDocument['documentType']
  sii_dte_code: Nullable<number>
  folio: Nullable<string>
  issue_date: string
  due_date: Nullable<string>
  customer_id: Nullable<string>
  supplier_id: Nullable<string>
  counterparty_rut: Nullable<string>
  counterparty_name: Nullable<string>
  currency_code: string
  net_amount: number
  tax_amount: number
  exempt_amount: number
  total_amount: number
  payment_method: Nullable<AdminDocument['paymentMethod']>
  status: AdminDocument['status']
  dte_status: Nullable<AdminDocument['dteStatus']>
  caf_file_id: Nullable<string>
  dte_xml: Nullable<string>
  dte_xml_document_id: Nullable<string>
  dte_last_submission_id: Nullable<string>
  dte_track_id: Nullable<string>
  dte_generated_at: Nullable<string>
  dte_signed_at: Nullable<string>
  dte_sent_at: Nullable<string>
  dte_responded_at: Nullable<string>
  dte_last_error: Nullable<string>
  notes: Nullable<string>
  source_origin: AdminDocument['sourceOrigin']
  created_by_user_id: Nullable<string>
  updated_by_user_id: Nullable<string>
  created_at: string
  updated_at: string
}

export interface AdminDocumentLineRow {
  id: string
  document_id: string
  line_number: number
  product_id: Nullable<string>
  sku: Nullable<string>
  barcode: Nullable<string>
  description: string
  quantity: number
  unit_price: number
  discount_amount: number
  tax_rate: Nullable<number>
  line_net_amount: number
  line_tax_amount: number
  line_total_amount: number
  unit_label: Nullable<string>
  created_at: string
}

export interface AdminDocumentReferenceRow {
  id: string
  document_id: string
  referenced_document_id: Nullable<string>
  referenced_document_type: AdminDocument['documentType']
  referenced_folio: string
  referenced_issue_date: Nullable<string>
  reference_reason: string
  reference_code: Nullable<string>
  created_at: string
}

export interface AdminDocumentAttachmentRow {
  id: string
  document_id: string
  storage_bucket: string
  storage_path: string
  file_name: string
  mime_type: string
  file_size: number
  uploaded_by_user_id: Nullable<string>
  created_at: string
}

export interface AdminEntityEventRow {
  id: string
  business_id: string
  entity_type: AdminEntityEvent['entityType']
  entity_id: string
  action_type: AdminEntityEvent['actionType']
  previous_data: Nullable<Record<string, unknown>>
  new_data: Nullable<Record<string, unknown>>
  actor_user_id: Nullable<string>
  created_at: string
}

export interface AdminDailySummaryRow {
  business_id: string
  issue_date: string
  period_month: string
  document_type: string
  status: string
  document_count: number
  net_amount: number
  tax_amount: number
  exempt_amount: number
  total_amount: number
}

export interface AdminSupplierRollupRow {
  business_id: string
  supplier_id: Nullable<string>
  supplier_name: string
  supplier_tax_id: Nullable<string>
  document_count: number
  first_issue_date: Nullable<string>
  last_issue_date: Nullable<string>
  net_amount: number
  tax_amount: number
  exempt_amount: number
  total_amount: number
}

export interface AdminCustomerRollupRow {
  business_id: string
  customer_id: Nullable<string>
  customer_name: string
  customer_tax_id: Nullable<string>
  document_count: number
  first_issue_date: Nullable<string>
  last_issue_date: Nullable<string>
  net_amount: number
  tax_amount: number
  exempt_amount: number
  total_amount: number
}

export interface AdminDocumentsByTypeRollupRow {
  business_id: string
  direction: string
  document_type: string
  status: string
  document_count: number
  first_issue_date: Nullable<string>
  last_issue_date: Nullable<string>
  net_amount: number
  tax_amount: number
  exempt_amount: number
  total_amount: number
}

export interface AdminCreditNoteSummaryRow {
  business_id: string
  direction: string
  issue_date: string
  period_month: string
  status: string
  credit_note_count: number
  net_amount: number
  tax_amount: number
  total_amount: number
  referenced_internal_documents: number
}

export interface AdminPurchasesVsSalesMonthlyRow {
  business_id: string
  period_month: string
  purchase_total_amount: number
  sales_total_amount: number
  received_credit_note_total: number
  emitted_credit_note_total: number
  gross_difference_amount: number
  net_difference_after_credit_notes: number
}

export const mapCustomerRow = (row: AdminCustomerRow): AdminCustomer => ({
  id: row.id,
  businessId: row.business_id,
  taxId: formatRutForDisplay(row.tax_id) ?? row.tax_id,
  legalName: row.legal_name,
  businessLine: row.business_line ?? undefined,
  addressLine1: row.address_line_1 ?? undefined,
  district: row.district ?? undefined,
  city: row.city ?? undefined,
  phone: row.phone ?? undefined,
  email: row.email ?? undefined,
  notes: row.notes ?? undefined,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdByUserId: row.created_by_user_id ?? undefined,
  updatedByUserId: row.updated_by_user_id ?? undefined,
})

export const mapSupplierRow = (row: AdminSupplierRow): AdminSupplier => ({
  ...mapCustomerRow(row),
  contactName: row.contact_name ?? undefined,
})

export const mapDocumentRow = (row: AdminDocumentRow): AdminDocument => ({
  id: row.id,
  businessId: row.business_id,
  direction: row.direction,
  documentType: row.document_type,
  siiDteCode: row.sii_dte_code ?? undefined,
  folio: row.folio ?? undefined,
  issueDate: row.issue_date,
  dueDate: row.due_date ?? undefined,
  customerId: row.customer_id ?? undefined,
  supplierId: row.supplier_id ?? undefined,
  counterpartyRut: formatRutForDisplay(row.counterparty_rut) ?? undefined,
  counterpartyName: row.counterparty_name ?? undefined,
  currencyCode: row.currency_code,
  netAmount: Number(row.net_amount ?? 0),
  taxAmount: Number(row.tax_amount ?? 0),
  exemptAmount: Number(row.exempt_amount ?? 0),
  totalAmount: Number(row.total_amount ?? 0),
  paymentMethod: row.payment_method ?? undefined,
  status: row.status,
  dteStatus: row.dte_status ?? undefined,
  cafFileId: row.caf_file_id ?? undefined,
  dteXml: row.dte_xml ?? undefined,
  dteXmlDocumentId: row.dte_xml_document_id ?? undefined,
  dteLastSubmissionId: row.dte_last_submission_id ?? undefined,
  dteTrackId: row.dte_track_id ?? undefined,
  dteGeneratedAt: row.dte_generated_at ?? undefined,
  dteSignedAt: row.dte_signed_at ?? undefined,
  dteSentAt: row.dte_sent_at ?? undefined,
  dteRespondedAt: row.dte_responded_at ?? undefined,
  dteLastError: row.dte_last_error ?? undefined,
  notes: row.notes ?? undefined,
  sourceOrigin: row.source_origin,
  createdByUserId: row.created_by_user_id ?? undefined,
  updatedByUserId: row.updated_by_user_id ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const mapDocumentLineRow = (row: AdminDocumentLineRow): AdminDocumentLine => ({
  id: row.id,
  documentId: row.document_id,
  lineNumber: row.line_number,
  productId: row.product_id ?? undefined,
  sku: row.sku ?? undefined,
  barcode: row.barcode ?? undefined,
  description: row.description,
  quantity: Number(row.quantity ?? 0),
  unitPrice: Number(row.unit_price ?? 0),
  discountAmount: Number(row.discount_amount ?? 0),
  taxRate: row.tax_rate ?? undefined,
  lineNetAmount: Number(row.line_net_amount ?? 0),
  lineTaxAmount: Number(row.line_tax_amount ?? 0),
  lineTotalAmount: Number(row.line_total_amount ?? 0),
  unitLabel: row.unit_label ?? undefined,
  createdAt: row.created_at,
})

export const mapDocumentReferenceRow = (
  row: AdminDocumentReferenceRow,
): AdminDocumentReference => ({
  id: row.id,
  documentId: row.document_id,
  referencedDocumentId: row.referenced_document_id ?? undefined,
  referencedDocumentType: row.referenced_document_type,
  referencedFolio: row.referenced_folio,
  referencedIssueDate: row.referenced_issue_date ?? undefined,
  referenceReason: row.reference_reason,
  referenceCode: row.reference_code ?? undefined,
  createdAt: row.created_at,
})

export const mapDocumentAttachmentRow = (
  row: AdminDocumentAttachmentRow,
): AdminDocumentAttachment => ({
  id: row.id,
  documentId: row.document_id,
  storageBucket: row.storage_bucket,
  storagePath: row.storage_path,
  fileName: row.file_name,
  mimeType: row.mime_type,
  fileSize: Number(row.file_size ?? 0),
  uploadedByUserId: row.uploaded_by_user_id ?? undefined,
  createdAt: row.created_at,
})

export const mapEntityEventRow = (row: AdminEntityEventRow): AdminEntityEvent => ({
  id: row.id,
  businessId: row.business_id,
  entityType: row.entity_type,
  entityId: row.entity_id,
  actionType: row.action_type,
  previousData: row.previous_data ?? undefined,
  newData: row.new_data ?? undefined,
  actorUserId: row.actor_user_id ?? undefined,
  createdAt: row.created_at,
})

export const toCustomerInsert = (input: {
  businessId: string
  taxId: string
  legalName: string
  businessLine?: string
  addressLine1?: string
  district?: string
  city?: string
  phone?: string
  email?: string
  notes?: string
  status: 'active' | 'inactive'
}) => ({
  business_id: input.businessId,
  tax_id: input.taxId,
  legal_name: input.legalName,
  business_line: input.businessLine ?? null,
  address_line_1: input.addressLine1 ?? null,
  district: input.district ?? null,
  city: input.city ?? null,
  phone: input.phone ?? null,
  email: input.email ?? null,
  notes: input.notes ?? null,
  status: input.status,
})

export const toSupplierInsert = (input: {
  businessId: string
  taxId: string
  legalName: string
  businessLine?: string
  addressLine1?: string
  district?: string
  city?: string
  phone?: string
  email?: string
  contactName?: string
  notes?: string
  status: 'active' | 'inactive'
}) => ({
  business_id: input.businessId,
  tax_id: input.taxId,
  legal_name: input.legalName,
  business_line: input.businessLine ?? null,
  address_line_1: input.addressLine1 ?? null,
  district: input.district ?? null,
  city: input.city ?? null,
  phone: input.phone ?? null,
  email: input.email ?? null,
  contact_name: input.contactName ?? null,
  notes: input.notes ?? null,
  status: input.status,
})

export const toDocumentInsert = (input: {
  businessId: string
  direction: AdminDocument['direction']
  documentType: AdminDocument['documentType']
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
  paymentMethod?: AdminDocument['paymentMethod']
  status: AdminDocument['status']
  notes?: string
  sourceOrigin: AdminDocument['sourceOrigin']
}) => ({
  business_id: input.businessId,
  direction: input.direction,
  document_type: input.documentType,
  sii_dte_code: input.siiDteCode ?? null,
  folio: input.folio ?? null,
  issue_date: input.issueDate,
  due_date: input.dueDate ?? null,
  customer_id: input.customerId ?? null,
  supplier_id: input.supplierId ?? null,
  counterparty_rut: input.counterpartyRut ?? null,
  counterparty_name: input.counterpartyName ?? null,
  currency_code: input.currencyCode,
  net_amount: input.netAmount,
  tax_amount: input.taxAmount,
  exempt_amount: input.exemptAmount,
  total_amount: input.totalAmount,
  payment_method: input.paymentMethod ?? null,
  status: input.status,
  notes: input.notes ?? null,
  source_origin: input.sourceOrigin,
})

export const toDocumentLineInsert = (
  documentId: string,
  line: NonNullable<AdminDocumentWriteInput['lines']>[number],
) => ({
  document_id: documentId,
  line_number: line.lineNumber,
  product_id: line.productId ?? null,
  sku: line.sku ?? null,
  barcode: line.barcode ?? null,
  description: line.description,
  quantity: line.quantity,
  unit_price: line.unitPrice,
  discount_amount: line.discountAmount ?? 0,
  tax_rate: line.taxRate ?? null,
  line_net_amount: line.lineNetAmount,
  line_tax_amount: line.lineTaxAmount,
  line_total_amount: line.lineTotalAmount,
  unit_label: line.unitLabel ?? null,
})

export const toDocumentReferenceInsert = (
  documentId: string,
  reference: NonNullable<AdminDocumentWriteInput['references']>[number],
) => ({
  document_id: documentId,
  referenced_document_id: reference.referencedDocumentId ?? null,
  referenced_document_type: reference.referencedDocumentType,
  referenced_folio: reference.referencedFolio,
  referenced_issue_date: reference.referencedIssueDate ?? null,
  reference_reason: reference.referenceReason,
  reference_code: reference.referenceCode ?? null,
})

export const mapDailySummaryRow = (row: AdminDailySummaryRow): AdminDailyDocumentSummary => ({
  businessId: row.business_id,
  issueDate: row.issue_date,
  periodMonth: row.period_month,
  documentType: row.document_type,
  status: row.status,
  documentCount: Number(row.document_count ?? 0),
  netAmount: Number(row.net_amount ?? 0),
  taxAmount: Number(row.tax_amount ?? 0),
  exemptAmount: Number(row.exempt_amount ?? 0),
  totalAmount: Number(row.total_amount ?? 0),
})

export const mapSupplierRollupRow = (row: AdminSupplierRollupRow): AdminSupplierRollup => ({
  businessId: row.business_id,
  supplierId: row.supplier_id ?? undefined,
  supplierName: row.supplier_name,
  supplierTaxId: formatRutForDisplay(row.supplier_tax_id) ?? undefined,
  documentCount: Number(row.document_count ?? 0),
  firstIssueDate: row.first_issue_date ?? undefined,
  lastIssueDate: row.last_issue_date ?? undefined,
  netAmount: Number(row.net_amount ?? 0),
  taxAmount: Number(row.tax_amount ?? 0),
  exemptAmount: Number(row.exempt_amount ?? 0),
  totalAmount: Number(row.total_amount ?? 0),
})

export const mapCustomerRollupRow = (row: AdminCustomerRollupRow): AdminCustomerRollup => ({
  businessId: row.business_id,
  customerId: row.customer_id ?? undefined,
  customerName: row.customer_name,
  customerTaxId: formatRutForDisplay(row.customer_tax_id) ?? undefined,
  documentCount: Number(row.document_count ?? 0),
  firstIssueDate: row.first_issue_date ?? undefined,
  lastIssueDate: row.last_issue_date ?? undefined,
  netAmount: Number(row.net_amount ?? 0),
  taxAmount: Number(row.tax_amount ?? 0),
  exemptAmount: Number(row.exempt_amount ?? 0),
  totalAmount: Number(row.total_amount ?? 0),
})

export const mapTypeRollupRow = (
  row: AdminDocumentsByTypeRollupRow,
): AdminDocumentsByTypeRollup => ({
  businessId: row.business_id,
  direction: row.direction,
  documentType: row.document_type,
  status: row.status,
  documentCount: Number(row.document_count ?? 0),
  firstIssueDate: row.first_issue_date ?? undefined,
  lastIssueDate: row.last_issue_date ?? undefined,
  netAmount: Number(row.net_amount ?? 0),
  taxAmount: Number(row.tax_amount ?? 0),
  exemptAmount: Number(row.exempt_amount ?? 0),
  totalAmount: Number(row.total_amount ?? 0),
})

export const mapCreditNoteSummaryRow = (
  row: AdminCreditNoteSummaryRow,
): AdminCreditNoteSummary => ({
  businessId: row.business_id,
  direction: row.direction,
  issueDate: row.issue_date,
  periodMonth: row.period_month,
  status: row.status,
  creditNoteCount: Number(row.credit_note_count ?? 0),
  netAmount: Number(row.net_amount ?? 0),
  taxAmount: Number(row.tax_amount ?? 0),
  totalAmount: Number(row.total_amount ?? 0),
  referencedInternalDocuments: Number(row.referenced_internal_documents ?? 0),
})

export const mapPurchasesVsSalesRow = (
  row: AdminPurchasesVsSalesMonthlyRow,
): AdminPurchasesVsSalesMonthly => ({
  businessId: row.business_id,
  periodMonth: row.period_month,
  purchaseTotalAmount: Number(row.purchase_total_amount ?? 0),
  salesTotalAmount: Number(row.sales_total_amount ?? 0),
  receivedCreditNoteTotal: Number(row.received_credit_note_total ?? 0),
  emittedCreditNoteTotal: Number(row.emitted_credit_note_total ?? 0),
  grossDifferenceAmount: Number(row.gross_difference_amount ?? 0),
  netDifferenceAfterCreditNotes: Number(row.net_difference_after_credit_notes ?? 0),
})
