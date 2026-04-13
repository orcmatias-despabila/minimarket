import { adminAuditService } from './adminAudit.service'
import { adminTableNames, getAdminSupabaseClient } from './adminBase'
import { adminSuppliersService } from './adminSuppliers.service'
import type {
  ParsedReceivedDteLine,
  ParsedReceivedDtePayload,
  ParsedReceivedDteReference,
  ReceivedDteInboxRecord,
  ReceivedDteInboxWriteInput,
  ReceivedDteStatus,
} from '../types/receivedDte'
import { formatRutForDisplay, getRutValidationMessage, normalizeRut } from '../../lib/rut'

type Nullable<T> = T | null

type ReceivedDteInboxRow = {
  id: string
  business_id: string
  supplier_id: Nullable<string>
  document_id: Nullable<string>
  reception_status: ReceivedDteStatus
  source_channel: ReceivedDteInboxRecord['sourceChannel']
  raw_xml: string
  issuer_tax_id: Nullable<string>
  issuer_legal_name: Nullable<string>
  issuer_business_line: Nullable<string>
  issuer_address: Nullable<string>
  issuer_district: Nullable<string>
  issuer_city: Nullable<string>
  sii_dte_code: Nullable<number>
  document_type: Nullable<string>
  folio: Nullable<string>
  issue_date: Nullable<string>
  net_amount: Nullable<number>
  tax_amount: Nullable<number>
  exempt_amount: Nullable<number>
  total_amount: Nullable<number>
  parsed_payload: Nullable<ParsedReceivedDtePayload>
  received_at: string
  responded_at: Nullable<string>
  created_by_user_id: Nullable<string>
  created_at: string
  updated_at: string
}

const inboxSelect = `
  id,
  business_id,
  supplier_id,
  document_id,
  reception_status,
  source_channel,
  raw_xml,
  issuer_tax_id,
  issuer_legal_name,
  issuer_business_line,
  issuer_address,
  issuer_district,
  issuer_city,
  sii_dte_code,
  document_type,
  folio,
  issue_date,
  net_amount,
  tax_amount,
  exempt_amount,
  total_amount,
  parsed_payload,
  received_at,
  responded_at,
  created_by_user_id,
  created_at,
  updated_at
`

const normalizeText = (value?: string | null) => value?.trim() || undefined

const xmlDecode = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

const getTagValue = (xml: string, tagName: string) => {
  const match = xml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i'))
  return match ? xmlDecode(match[1]).trim() : undefined
}

const getBlockMatches = (xml: string, tagName: string) =>
  [...xml.matchAll(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'gi'))].map((match) => match[0])

const toNumber = (value?: string) => {
  if (!value) return undefined
  const normalized = value.replace(',', '.').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

const resolveDocumentTypeFromDteCode = (siiDteCode?: number) => {
  switch (siiDteCode) {
    case 33:
      return 'factura'
    case 39:
      return 'boleta'
    case 46:
      return 'factura_compra'
    case 61:
      return 'nota_credito'
    default:
      return 'other'
  }
}

export const parseReceivedDteXml = (rawXml: string): ParsedReceivedDtePayload => {
  const xml = rawXml.trim()

  if (!xml) {
    throw new Error('El XML recibido no puede venir vacio.')
  }

  if (!xml.includes('<DTE') && !xml.includes('<Documento')) {
    throw new Error('El contenido recibido no parece ser un XML DTE valido.')
  }

  const siiDteCode = toNumber(getTagValue(xml, 'TipoDTE'))
  const references: ParsedReceivedDteReference[] = getBlockMatches(xml, 'Referencia').map((block, index) => ({
    lineNumber: toNumber(getTagValue(block, 'NroLinRef')) ?? index + 1,
    referencedDocumentTypeCode: toNumber(getTagValue(block, 'TpoDocRef')),
    referencedFolio: normalizeText(getTagValue(block, 'FolioRef')),
    referencedIssueDate: normalizeText(getTagValue(block, 'FchRef')),
    referenceCode: normalizeText(getTagValue(block, 'CodRef')),
    referenceReason: normalizeText(getTagValue(block, 'RazonRef')),
  }))

  const lines: ParsedReceivedDteLine[] = getBlockMatches(xml, 'Detalle').map((block, index) => ({
    lineNumber: toNumber(getTagValue(block, 'NroLinDet')) ?? index + 1,
    itemName: normalizeText(getTagValue(block, 'NmbItem')),
    itemDescription: normalizeText(getTagValue(block, 'DscItem')),
    quantity: toNumber(getTagValue(block, 'QtyItem')),
    unitLabel: normalizeText(getTagValue(block, 'UnmdItem')),
    unitPrice: toNumber(getTagValue(block, 'PrcItem')),
    lineTotalAmount: toNumber(getTagValue(block, 'MontoItem')),
  }))

  return {
    issuerTaxId: (() => {
      const rawRut = normalizeText(getTagValue(xml, 'RUTEmisor'))
      if (!rawRut) {
        return undefined
      }

      const normalized = normalizeRut(rawRut)
      if (!normalized) {
        throw new Error(
          getRutValidationMessage(rawRut, 'El RUT del emisor del XML') ??
            'El XML recibido incluye un RUT de emisor invalido.',
        )
      }

      return normalized
    })(),
    issuerLegalName: normalizeText(getTagValue(xml, 'RznSoc') ?? getTagValue(xml, 'RznSocEmisor')),
    issuerBusinessLine: normalizeText(getTagValue(xml, 'GiroEmis')),
    issuerAddress: normalizeText(getTagValue(xml, 'DirOrigen')),
    issuerDistrict: normalizeText(getTagValue(xml, 'CmnaOrigen')),
    issuerCity: normalizeText(getTagValue(xml, 'CiudadOrigen')),
    siiDteCode,
    documentType: resolveDocumentTypeFromDteCode(siiDteCode),
    folio: normalizeText(getTagValue(xml, 'Folio')),
    issueDate: normalizeText(getTagValue(xml, 'FchEmis')),
    netAmount: toNumber(getTagValue(xml, 'MntNeto')),
    taxAmount: toNumber(getTagValue(xml, 'IVA')),
    exemptAmount: toNumber(getTagValue(xml, 'MntExe')),
    totalAmount: toNumber(getTagValue(xml, 'MntTotal')),
    references,
    lines,
  }
}

const mapInboxRow = (row: ReceivedDteInboxRow): ReceivedDteInboxRecord => ({
  id: row.id,
  businessId: row.business_id,
  supplierId: row.supplier_id ?? undefined,
  documentId: row.document_id ?? undefined,
  receptionStatus: row.reception_status,
  sourceChannel: row.source_channel,
  rawXml: row.raw_xml,
  issuerTaxId: formatRutForDisplay(row.issuer_tax_id) ?? undefined,
  issuerLegalName: row.issuer_legal_name ?? undefined,
  issuerBusinessLine: row.issuer_business_line ?? undefined,
  issuerAddress: row.issuer_address ?? undefined,
  issuerDistrict: row.issuer_district ?? undefined,
  issuerCity: row.issuer_city ?? undefined,
  siiDteCode: row.sii_dte_code ?? undefined,
  documentType: row.document_type ?? undefined,
  folio: row.folio ?? undefined,
  issueDate: row.issue_date ?? undefined,
  netAmount: row.net_amount ?? undefined,
  taxAmount: row.tax_amount ?? undefined,
  exemptAmount: row.exempt_amount ?? undefined,
  totalAmount: row.total_amount ?? undefined,
  parsedPayload: row.parsed_payload ?? undefined,
  receivedAt: row.received_at,
  respondedAt: row.responded_at ?? undefined,
  createdByUserId: row.created_by_user_id ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const receivedDteInboxService = {
  parseXml: parseReceivedDteXml,

  async importXml(input: ReceivedDteInboxWriteInput): Promise<ReceivedDteInboxRecord> {
    const client = getAdminSupabaseClient()
    const rawXml = input.rawXml.trim()
    const parsedPayload = parseReceivedDteXml(rawXml)

    const linkedSupplier = parsedPayload.issuerTaxId
      ? await adminSuppliersService.findByTaxId(input.businessId, parsedPayload.issuerTaxId)
      : null

    const insertResult = await client
      .from(adminTableNames.receivedDteInbox)
      .insert({
        business_id: input.businessId,
        supplier_id: linkedSupplier?.id ?? null,
        document_id: input.documentId ?? null,
        reception_status: input.receptionStatus ?? 'received',
        source_channel: input.sourceChannel ?? 'manual',
        raw_xml: rawXml,
        issuer_tax_id: parsedPayload.issuerTaxId ?? null,
        issuer_legal_name: parsedPayload.issuerLegalName ?? null,
        issuer_business_line: parsedPayload.issuerBusinessLine ?? null,
        issuer_address: parsedPayload.issuerAddress ?? null,
        issuer_district: parsedPayload.issuerDistrict ?? null,
        issuer_city: parsedPayload.issuerCity ?? null,
        sii_dte_code: parsedPayload.siiDteCode ?? null,
        document_type: parsedPayload.documentType ?? null,
        folio: parsedPayload.folio ?? null,
        issue_date: parsedPayload.issueDate ?? null,
        net_amount: parsedPayload.netAmount ?? null,
        tax_amount: parsedPayload.taxAmount ?? null,
        exempt_amount: parsedPayload.exemptAmount ?? null,
        total_amount: parsedPayload.totalAmount ?? null,
        parsed_payload: parsedPayload,
        created_by_user_id: input.createdByUserId ?? null,
      })
      .select(inboxSelect)
      .single<ReceivedDteInboxRow>()

    if (insertResult.error) {
      throw new Error(`No pudimos guardar el DTE recibido: ${insertResult.error.message}`)
    }

    const record = mapInboxRow(insertResult.data)

    await adminAuditService.recordEventSafely({
      businessId: input.businessId,
      entityType: 'document',
      entityId: record.id,
      actionType: 'created',
      newData: {
        source: 'received_dte_inbox',
        receptionStatus: record.receptionStatus,
        supplierId: record.supplierId ?? null,
        issuerTaxId: record.issuerTaxId ?? null,
        folio: record.folio ?? null,
      },
    })

    return record
  },

  async listByBusiness(businessId: string): Promise<ReceivedDteInboxRecord[]> {
    const client = getAdminSupabaseClient()
    const result = await client
      .from(adminTableNames.receivedDteInbox)
      .select(inboxSelect)
      .eq('business_id', businessId)
      .order('received_at', { ascending: false })

    if (result.error) {
      throw new Error(`No pudimos cargar los DTE recibidos: ${result.error.message}`)
    }

    return (result.data ?? []).map((row) => mapInboxRow(row as ReceivedDteInboxRow))
  },

  async updateStatus(recordId: string, status: ReceivedDteStatus): Promise<ReceivedDteInboxRecord> {
    const client = getAdminSupabaseClient()
    const result = await client
      .from(adminTableNames.receivedDteInbox)
      .update({
        reception_status: status,
        responded_at: new Date().toISOString(),
      })
      .eq('id', recordId)
      .select(inboxSelect)
      .single<ReceivedDteInboxRow>()

    if (result.error) {
      throw new Error(`No pudimos actualizar el estado del DTE recibido: ${result.error.message}`)
    }

    return mapInboxRow(result.data)
  },
}
