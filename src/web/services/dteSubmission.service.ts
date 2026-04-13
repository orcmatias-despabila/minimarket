import { adminTableNames, getAdminSupabaseClient } from './adminBase'
import { adminAuditService } from './adminAudit.service'
import type {
  DteSiiResponsePayload,
  DteSubmissionRecord,
  DteSubmissionSendInput,
  DteSubmissionSendResult,
  DteSubmissionStatus,
} from '../types/dteSubmission'

type DteSubmissionRow = {
  id: string
  business_id: string
  document_id: string
  environment: DteSubmissionRecord['environment']
  provider_mode: DteSubmissionRecord['providerMode']
  submission_status: DteSubmissionStatus
  request_xml: string
  response_payload: DteSiiResponsePayload | null
  sii_track_id: string | null
  sent_at: string | null
  responded_at: string | null
  created_by_user_id: string | null
  created_at: string
  updated_at: string
}

const submissionSelect = `
  id,
  business_id,
  document_id,
  environment,
  provider_mode,
  submission_status,
  request_xml,
  response_payload,
  sii_track_id,
  sent_at,
  responded_at,
  created_by_user_id,
  created_at,
  updated_at
`

const mapSubmissionRow = (row: DteSubmissionRow): DteSubmissionRecord => ({
  id: row.id,
  businessId: row.business_id,
  documentId: row.document_id,
  environment: row.environment,
  providerMode: row.provider_mode,
  submissionStatus: row.submission_status,
  requestXml: row.request_xml,
  responsePayload: row.response_payload,
  siiTrackId: row.sii_track_id,
  sentAt: row.sent_at,
  respondedAt: row.responded_at,
  createdByUserId: row.created_by_user_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const normalizeRequestXml = (value: string) => {
  const normalized = value.trim()

  if (!normalized) {
    throw new Error('El XML a enviar es obligatorio.')
  }

  if (!normalized.includes('<DTE') || !normalized.includes('</DTE>')) {
    throw new Error('El XML no parece ser un DTE valido para envio.')
  }

  return normalized
}

const nowIso = () => new Date().toISOString()

const buildMockTrackId = (documentId: string) =>
  `MOCK-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${documentId.slice(0, 8).toUpperCase()}`

const buildMockResponse = (
  input: DteSubmissionSendInput,
  trackId: string,
): DteSiiResponsePayload => {
  const hasSignature = input.requestXml.includes('<Signature')
  const hasTed = input.requestXml.includes('<TED')
  const isAccepted = hasSignature && hasTed

  return {
    provider: 'mock',
    environment: input.environment ?? 'mock',
    status: isAccepted ? 'accepted' : 'rejected',
    message: isAccepted
      ? 'Mock SII: XML recibido y validado en forma basica.'
      : 'Mock SII: XML rechazado por ausencia de TED o Signature.',
    trackId,
    receivedAt: nowIso(),
    raw: {
      validation: {
        hasSignature,
        hasTed,
      },
    },
  }
}

const updateSubmissionStatus = async (
  submissionId: string,
  values: Partial<{
    submission_status: DteSubmissionStatus
    sii_track_id: string | null
    sent_at: string | null
    responded_at: string | null
    response_payload: DteSiiResponsePayload | null
  }>,
) => {
  const client = getAdminSupabaseClient()
  const result = await client
    .from(adminTableNames.documentSiiSubmissions)
    .update(values)
    .eq('id', submissionId)
    .select(submissionSelect)
    .single<DteSubmissionRow>()

  if (result.error) {
    throw new Error(`No pudimos actualizar el estado del envio DTE: ${result.error.message}`)
  }

  return mapSubmissionRow(result.data)
}

const submitWithMockTransport = async (
  baseSubmission: DteSubmissionRecord,
  input: DteSubmissionSendInput,
): Promise<DteSubmissionSendResult> => {
  const trackId = buildMockTrackId(input.documentId)
  const sentAt = nowIso()

  await updateSubmissionStatus(baseSubmission.id, {
    submission_status: 'sent',
    sii_track_id: trackId,
    sent_at: sentAt,
  })

  const response = buildMockResponse(input, trackId)
  const finalSubmission = await updateSubmissionStatus(baseSubmission.id, {
    submission_status: response.status,
    sii_track_id: trackId,
    sent_at: sentAt,
    responded_at: response.receivedAt,
    response_payload: response,
  })

  return {
    submission: finalSubmission,
    response,
    usedMock: true,
  }
}

const submitWithRealTransport = async (): Promise<never> => {
  throw new Error(
    'La conexion real con el SII todavia no esta configurada. Usa providerMode=mock o auto mientras no existan credenciales y endpoint reales.',
  )
}

export const dteSubmissionService = {
  async listByDocument(documentId: string): Promise<DteSubmissionRecord[]> {
    const client = getAdminSupabaseClient()
    const result = await client
      .from(adminTableNames.documentSiiSubmissions)
      .select(submissionSelect)
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (result.error) {
      throw new Error(`No pudimos cargar los envios DTE: ${result.error.message}`)
    }

    return (result.data ?? []).map((row) => mapSubmissionRow(row as DteSubmissionRow))
  },

  async getLatestByDocument(documentId: string): Promise<DteSubmissionRecord | null> {
    const client = getAdminSupabaseClient()
    const result = await client
      .from(adminTableNames.documentSiiSubmissions)
      .select(submissionSelect)
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<DteSubmissionRow>()

    if (result.error) {
      throw new Error(`No pudimos cargar el ultimo envio DTE: ${result.error.message}`)
    }

    return result.data ? mapSubmissionRow(result.data) : null
  },

  async send(input: DteSubmissionSendInput): Promise<DteSubmissionSendResult> {
    const client = getAdminSupabaseClient()
    const requestXml = normalizeRequestXml(input.requestXml)
    const environment = input.environment ?? 'mock'
    const providerMode = input.providerMode === 'real' ? 'real' : 'mock'

    const insertResult = await client
      .from(adminTableNames.documentSiiSubmissions)
      .insert({
        business_id: input.businessId,
        document_id: input.documentId,
        environment,
        provider_mode: providerMode,
        submission_status: 'pending',
        request_xml: requestXml,
        created_by_user_id: input.createdByUserId ?? null,
      })
      .select(submissionSelect)
      .single<DteSubmissionRow>()

    if (insertResult.error) {
      throw new Error(`No pudimos registrar el envio DTE: ${insertResult.error.message}`)
    }

    const baseSubmission = mapSubmissionRow(insertResult.data)

    let result: DteSubmissionSendResult
    if (providerMode === 'real') {
      result = await submitWithRealTransport()
    } else {
      result = await submitWithMockTransport(baseSubmission, {
        ...input,
        requestXml,
        environment,
      })
    }

    await adminAuditService.recordEventSafely({
      businessId: input.businessId,
      entityType: 'document',
      entityId: input.documentId,
      actionType: 'other',
      previousData: {
        submissionId: baseSubmission.id,
        previousStatus: 'pending',
      },
      newData: {
        submissionId: result.submission.id,
        status: result.submission.submissionStatus,
        providerMode: result.submission.providerMode,
        environment: result.submission.environment,
        trackId: result.submission.siiTrackId ?? null,
      },
    })

    return result
  },
}
