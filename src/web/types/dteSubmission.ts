export type DteSubmissionEnvironment = 'mock' | 'certification' | 'production'
export type DteSubmissionProviderMode = 'mock' | 'real'
export type DteSubmissionStatus = 'pending' | 'sent' | 'accepted' | 'rejected'

export interface DteSiiResponsePayload {
  provider: DteSubmissionProviderMode
  environment: DteSubmissionEnvironment
  status: DteSubmissionStatus
  message: string
  trackId?: string
  receivedAt: string
  raw?: unknown
}

export interface DteSubmissionRecord {
  id: string
  businessId: string
  documentId: string
  environment: DteSubmissionEnvironment
  providerMode: DteSubmissionProviderMode
  submissionStatus: DteSubmissionStatus
  requestXml: string
  responsePayload?: DteSiiResponsePayload | null
  siiTrackId?: string | null
  sentAt?: string | null
  respondedAt?: string | null
  createdByUserId?: string | null
  createdAt: string
  updatedAt: string
}

export interface DteSubmissionSendInput {
  businessId: string
  documentId: string
  requestXml: string
  environment?: DteSubmissionEnvironment
  providerMode?: 'auto' | DteSubmissionProviderMode
  createdByUserId?: string
}

export interface DteSubmissionSendResult {
  submission: DteSubmissionRecord
  response: DteSiiResponsePayload
  usedMock: boolean
}
