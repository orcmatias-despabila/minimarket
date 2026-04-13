import { applyDateRange, adminTableNames, getAdminSupabaseClient, resolvePagination, toPaginatedResult } from './adminBase'
import {
  mapDocumentAttachmentRow,
  mapDocumentLineRow,
  mapDocumentReferenceRow,
  mapDocumentRow,
  toDocumentInsert,
  toDocumentLineInsert,
  toDocumentReferenceInsert,
  type AdminDocumentAttachmentRow,
  type AdminDocumentLineRow,
  type AdminDocumentReferenceRow,
  type AdminDocumentRow,
} from './adminMappers'
import { validateDocumentPayload } from './adminValidators'
import type {
  AdminDocument,
  AdminDocumentDetail,
  AdminDocumentDteStatus,
  AdminDocumentListFilters,
  AdminDocumentWriteInput,
} from '../types/adminDocument'
import type { AdminPaginatedResult } from '../types/adminShared'
import { cleanRut } from '../../lib/rut'

const documentSelect = `
  id,
  business_id,
  direction,
  document_type,
  sii_dte_code,
  folio,
  issue_date,
  due_date,
  customer_id,
  supplier_id,
  counterparty_rut,
  counterparty_name,
  currency_code,
  net_amount,
  tax_amount,
  exempt_amount,
  total_amount,
  payment_method,
  status,
  dte_status,
  caf_file_id,
  dte_xml,
  dte_xml_document_id,
  dte_last_submission_id,
  dte_track_id,
  dte_generated_at,
  dte_signed_at,
  dte_sent_at,
  dte_responded_at,
  dte_last_error,
  notes,
  source_origin,
  created_by_user_id,
  updated_by_user_id,
  created_at,
  updated_at
`

const documentLegacySelect = `
  id,
  business_id,
  direction,
  document_type,
  sii_dte_code,
  folio,
  issue_date,
  due_date,
  customer_id,
  supplier_id,
  counterparty_rut,
  counterparty_name,
  currency_code,
  net_amount,
  tax_amount,
  exempt_amount,
  total_amount,
  payment_method,
  status,
  notes,
  source_origin,
  created_by_user_id,
  updated_by_user_id,
  created_at,
  updated_at
`

const documentLineSelect = `
  id,
  document_id,
  line_number,
  product_id,
  sku,
  barcode,
  description,
  quantity,
  unit_price,
  discount_amount,
  tax_rate,
  line_net_amount,
  line_tax_amount,
  line_total_amount,
  unit_label,
  created_at
`

const documentReferenceSelect = `
  id,
  document_id,
  referenced_document_id,
  referenced_document_type,
  referenced_folio,
  referenced_issue_date,
  reference_reason,
  reference_code,
  created_at
`

const documentAttachmentSelect = `
  id,
  document_id,
  storage_bucket,
  storage_path,
  file_name,
  mime_type,
  file_size,
  uploaded_by_user_id,
  created_at
`

let supportsDocumentWorkflowFields: boolean | null = null
let supportsDocumentAttachments: boolean | null = null

const isMissingColumnError = (message: string, column: string) =>
  new RegExp(`column\\s+[^\\s]+\\.${column}\\s+does not exist`, 'i').test(message)

const isMissingDocumentWorkflowError = (message: string) =>
  [
    'dte_status',
    'caf_file_id',
    'dte_xml',
    'dte_xml_document_id',
    'dte_last_submission_id',
    'dte_track_id',
    'dte_generated_at',
    'dte_signed_at',
    'dte_sent_at',
    'dte_responded_at',
    'dte_last_error',
  ].some((column) => isMissingColumnError(message, column))

const isMissingRelationError = (message: string, relation: string) =>
  new RegExp(`relation\\s+["']?public\\.${relation}["']?\\s+does not exist`, 'i').test(message) ||
  new RegExp(`Could not find the table\\s+['"]public\\.${relation}['"]`, 'i').test(message)

const withDocumentSelectFallback = async <T>(
  runQuery: (selectClause: string) => Promise<{ data: T | null; error: { message: string } | null }>,
) => {
  const prefersWorkflowFields = supportsDocumentWorkflowFields !== false
  const firstSelect = prefersWorkflowFields ? documentSelect : documentLegacySelect
  const firstResult = await runQuery(firstSelect)

  if (!firstResult.error) {
    if (prefersWorkflowFields) {
      supportsDocumentWorkflowFields = true
    }
    return firstResult
  }

  if (prefersWorkflowFields && isMissingDocumentWorkflowError(firstResult.error.message)) {
    supportsDocumentWorkflowFields = false
    return runQuery(documentLegacySelect)
  }

  return firstResult
}

const listAttachmentsWithFallback = async (documentId: string) => {
  if (supportsDocumentAttachments === false) {
    return [] as AdminDocumentAttachmentRow[]
  }

  const client = getAdminSupabaseClient()
  const result = await client
    .from(adminTableNames.documentAttachments)
    .select(documentAttachmentSelect)
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })

  if (!result.error) {
    supportsDocumentAttachments = true
    return (result.data ?? []) as AdminDocumentAttachmentRow[]
  }

  if (
    isMissingRelationError(result.error.message, adminTableNames.documentAttachments) ||
    /schema cache/i.test(result.error.message)
  ) {
    supportsDocumentAttachments = false
    return [] as AdminDocumentAttachmentRow[]
  }

  throw new Error(`No pudimos cargar los adjuntos del documento: ${result.error.message}`)
}

const mapDetail = (
  document: AdminDocumentRow,
  lines: AdminDocumentLineRow[],
  references: AdminDocumentReferenceRow[],
  attachments: AdminDocumentAttachmentRow[],
): AdminDocumentDetail => ({
  document: mapDocumentRow(document),
  lines: lines.map((line) => mapDocumentLineRow(line)),
  references: references.map((reference) => mapDocumentReferenceRow(reference)),
  attachments: attachments.map((attachment) => mapDocumentAttachmentRow(attachment)),
})

const replaceChildCollections = async (
  documentId: string,
  input: AdminDocumentWriteInput,
) => {
  const client = getAdminSupabaseClient()
  const payload = validateDocumentPayload(input)

  const deleteLines = await client
    .from(adminTableNames.documentLines)
    .delete()
    .eq('document_id', documentId)

  if (deleteLines.error) {
    throw new Error(`No pudimos actualizar las lineas del documento: ${deleteLines.error.message}`)
  }

  if (payload.lines.length) {
    const insertLines = await client
      .from(adminTableNames.documentLines)
      .insert(payload.lines.map((line) => toDocumentLineInsert(documentId, line)))

    if (insertLines.error) {
      throw new Error(`No pudimos guardar las lineas del documento: ${insertLines.error.message}`)
    }
  }

  const deleteReferences = await client
    .from(adminTableNames.documentReferences)
    .delete()
    .eq('document_id', documentId)

  if (deleteReferences.error) {
    throw new Error(
      `No pudimos actualizar las referencias del documento: ${deleteReferences.error.message}`,
    )
  }

  if (payload.references.length) {
    const insertReferences = await client
      .from(adminTableNames.documentReferences)
      .insert(payload.references.map((reference) => toDocumentReferenceInsert(documentId, reference)))

    if (insertReferences.error) {
      throw new Error(
        `No pudimos guardar las referencias del documento: ${insertReferences.error.message}`,
      )
    }
  }
}

export const adminDocumentsService = {
  async list(filters: AdminDocumentListFilters): Promise<AdminPaginatedResult<AdminDocument>> {
    const client = getAdminSupabaseClient()
    const { from, to, page, pageSize } = resolvePagination(filters)

    const buildListQuery = (selectClause: string) => {
      let query = client
        .from(adminTableNames.documents)
        .select(selectClause, { count: 'exact' })
        .eq('business_id', filters.businessId)

      if (filters.direction) {
        query = query.eq('direction', filters.direction)
      }

      if (filters.documentType && filters.documentType !== 'all') {
        query = query.eq('document_type', filters.documentType)
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      if (filters.customerId && filters.customerId !== 'all') {
        query = query.eq('customer_id', filters.customerId)
      }

      if (filters.supplierId && filters.supplierId !== 'all') {
        query = query.eq('supplier_id', filters.supplierId)
      }

      if (filters.paymentMethod && filters.paymentMethod !== 'all') {
        query = query.eq('payment_method', filters.paymentMethod)
      }

      const folio = filters.folio?.trim()
      if (folio) {
        query = query.ilike('folio', `%${folio}%`)
      }

      const search = filters.search?.trim()
      if (search) {
        const cleanSearch = cleanRut(search)
        const searchClauses = [
          `folio.ilike.%${search}%`,
          `counterparty_name.ilike.%${search}%`,
          `counterparty_rut.ilike.%${search}%`,
          `notes.ilike.%${search}%`,
        ]

        if (cleanSearch.length >= 2) {
          searchClauses.push(`counterparty_rut_normalized.ilike.%${cleanSearch}%`)
        }

        query = query.or(searchClauses.join(','))
      }

      query = applyDateRange(query, 'issue_date', filters.dateFrom, filters.dateTo)

      return query.order('issue_date', { ascending: false }).range(from, to)
    }

    const result = await withDocumentSelectFallback((selectClause) => buildListQuery(selectClause))

    if (result.error) {
      throw new Error(`No pudimos cargar documentos: ${result.error.message}`)
    }

    return toPaginatedResult(
      (result.data ?? []).map((row) => mapDocumentRow(row as AdminDocumentRow)),
      result.count ?? 0,
      { page, pageSize },
    )
  },

  async getById(documentId: string): Promise<AdminDocumentDetail | null> {
    const client = getAdminSupabaseClient()

    const resolvedDocumentResult = await withDocumentSelectFallback((selectClause) =>
      client
        .from(adminTableNames.documents)
        .select(selectClause)
        .eq('id', documentId)
        .maybeSingle<AdminDocumentRow>(),
    )

    if (resolvedDocumentResult.error) {
      throw new Error(`No pudimos abrir el documento: ${resolvedDocumentResult.error.message}`)
    }

    if (!resolvedDocumentResult.data) {
      return null
    }

    const [linesResult, referencesResult, attachmentsRows] = await Promise.all([
      client
        .from(adminTableNames.documentLines)
        .select(documentLineSelect)
        .eq('document_id', documentId)
        .order('line_number', { ascending: true }),
      client
        .from(adminTableNames.documentReferences)
        .select(documentReferenceSelect)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true }),
      listAttachmentsWithFallback(documentId),
    ])

    if (linesResult.error) {
      throw new Error(`No pudimos cargar las lineas del documento: ${linesResult.error.message}`)
    }

    if (referencesResult.error) {
      throw new Error(
        `No pudimos cargar las referencias del documento: ${referencesResult.error.message}`,
      )
    }

    return mapDetail(
      resolvedDocumentResult.data,
      (linesResult.data ?? []) as AdminDocumentLineRow[],
      (referencesResult.data ?? []) as AdminDocumentReferenceRow[],
      attachmentsRows,
    )
  },

  async create(input: AdminDocumentWriteInput): Promise<AdminDocumentDetail> {
    const client = getAdminSupabaseClient()
    const payload = validateDocumentPayload(input)

    const resolvedDocumentResult = await withDocumentSelectFallback((selectClause) =>
      client
        .from(adminTableNames.documents)
        .insert(toDocumentInsert(payload))
        .select(selectClause)
        .single<AdminDocumentRow>(),
    )

    if (resolvedDocumentResult.error) {
      throw new Error(`No pudimos crear el documento: ${resolvedDocumentResult.error.message}`)
    }

    await replaceChildCollections(resolvedDocumentResult.data.id, input)

    const detail = await this.getById(resolvedDocumentResult.data.id)

    if (!detail) {
      throw new Error('El documento se creo, pero no pudimos recargar su detalle.')
    }

    return detail
  },

  async update(documentId: string, input: AdminDocumentWriteInput): Promise<AdminDocumentDetail> {
    const client = getAdminSupabaseClient()
    const payload = validateDocumentPayload(input)

    const resolvedDocumentResult = await withDocumentSelectFallback((selectClause) =>
      client
        .from(adminTableNames.documents)
        .update(toDocumentInsert(payload))
        .eq('id', documentId)
        .select(selectClause)
        .single<AdminDocumentRow>(),
    )

    if (resolvedDocumentResult.error) {
      throw new Error(`No pudimos actualizar el documento: ${resolvedDocumentResult.error.message}`)
    }

    await replaceChildCollections(documentId, input)

    const detail = await this.getById(documentId)

    if (!detail) {
      throw new Error('El documento se actualizo, pero no pudimos recargar su detalle.')
    }

    return detail
  },

  async listAttachments(documentId: string) {
    const rows = await listAttachmentsWithFallback(documentId)
    return rows.map((row) => mapDocumentAttachmentRow(row as AdminDocumentAttachmentRow))
  },

  async listRecentByBusiness(businessId: string, limit = 6): Promise<AdminDocument[]> {
    const client = getAdminSupabaseClient()
    const result = await withDocumentSelectFallback((selectClause) =>
      client
        .from(adminTableNames.documents)
        .select(selectClause)
        .eq('business_id', businessId)
        .order('issue_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit),
    )

    if (result.error) {
      throw new Error(`No pudimos cargar documentos recientes: ${result.error.message}`)
    }

    return (result.data ?? []).map((row) => mapDocumentRow(row as AdminDocumentRow))
  },

  async updateDteWorkflow(
    documentId: string,
    values: Partial<{
      dteStatus: AdminDocumentDteStatus
      dteXml: string | null
      dteXmlDocumentId: string | null
      dteLastSubmissionId: string | null
      dteTrackId: string | null
      dteGeneratedAt: string | null
      dteSignedAt: string | null
      dteSentAt: string | null
      dteRespondedAt: string | null
      dteLastError: string | null
    }>,
  ): Promise<AdminDocument> {
    const client = getAdminSupabaseClient()
    if (supportsDocumentWorkflowFields === false) {
      throw new Error(
        'Tu proyecto Supabase todavia no expone columnas DTE en business_documents.',
      )
    }
    const result = await client
      .from(adminTableNames.documents)
      .update({
        dte_status: values.dteStatus,
        dte_xml: values.dteXml,
        dte_xml_document_id: values.dteXmlDocumentId,
        dte_last_submission_id: values.dteLastSubmissionId,
        dte_track_id: values.dteTrackId,
        dte_generated_at: values.dteGeneratedAt,
        dte_signed_at: values.dteSignedAt,
        dte_sent_at: values.dteSentAt,
        dte_responded_at: values.dteRespondedAt,
        dte_last_error: values.dteLastError,
      })
      .eq('id', documentId)
      .select(documentSelect)
      .single<AdminDocumentRow>()

    if (result.error) {
      if (isMissingDocumentWorkflowError(result.error.message)) {
        supportsDocumentWorkflowFields = false
        throw new Error(
          'Tu proyecto Supabase todavia no expone columnas DTE en business_documents.',
        )
      }
      throw new Error(`No pudimos actualizar el estado DTE: ${result.error.message}`)
    }

    return mapDocumentRow(result.data)
  },
}
