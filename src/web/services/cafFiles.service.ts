import { adminTableNames, getAdminSupabaseClient } from './adminBase'
import type { AdminDocumentType } from '../types/adminDocument'

type CafFileRow = {
  id: string
  business_id: string
  document_type: AdminDocumentType
  folio_start: number
  folio_end: number
  current_folio: number
  caf_xml: string
  private_key: string
  created_at: string
}

export interface AdminCafFile {
  id: string
  businessId: string
  documentType: AdminDocumentType
  folioStart: number
  folioEnd: number
  currentFolio: number
  cafXml: string
  privateKey: string
  createdAt: string
}

const cafSelect = `
  id,
  business_id,
  document_type,
  folio_start,
  folio_end,
  current_folio,
  caf_xml,
  private_key,
  created_at
`

const mapCafFileRow = (row: CafFileRow): AdminCafFile => ({
  id: row.id,
  businessId: row.business_id,
  documentType: row.document_type,
  folioStart: Number(row.folio_start ?? 0),
  folioEnd: Number(row.folio_end ?? 0),
  currentFolio: Number(row.current_folio ?? 0),
  cafXml: row.caf_xml,
  privateKey: row.private_key,
  createdAt: row.created_at,
})

export const cafFilesService = {
  async getById(cafFileId: string): Promise<AdminCafFile | null> {
    const client = getAdminSupabaseClient()
    const result = await client
      .from(adminTableNames.cafFiles)
      .select(cafSelect)
      .eq('id', cafFileId)
      .maybeSingle<CafFileRow>()

    if (result.error) {
      throw new Error(`No pudimos cargar el CAF: ${result.error.message}`)
    }

    return result.data ? mapCafFileRow(result.data) : null
  },

  async getCurrentByBusinessAndType(
    businessId: string,
    documentType: AdminDocumentType,
  ): Promise<AdminCafFile | null> {
    const client = getAdminSupabaseClient()
    const result = await client
      .from(adminTableNames.cafFiles)
      .select(cafSelect)
      .eq('business_id', businessId)
      .eq('document_type', documentType)
      .lte('current_folio', Number.MAX_SAFE_INTEGER)
      .order('folio_start', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle<CafFileRow>()

    if (result.error) {
      throw new Error(`No pudimos cargar el CAF activo: ${result.error.message}`)
    }

    return result.data ? mapCafFileRow(result.data) : null
  },
}
