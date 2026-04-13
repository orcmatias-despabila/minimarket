import type { AdminDocument, AdminDocumentDetail, AdminDocumentWriteInput } from './adminDocument'
import type { DteSignatureCertificateConfig } from './dteSignature'
import type { DteSubmissionEnvironment, DteSubmissionProviderMode, DteSubmissionRecord } from './dteSubmission'
import type { DteXmlPartySnapshot } from './dteXml'

export type DteWorkflowStage =
  | 'document_created'
  | 'folio_assigned'
  | 'xml_generated'
  | 'signed'
  | 'submitted'
  | 'response_saved'

export interface DteEmissionStepResult {
  stage: DteWorkflowStage
  status: 'completed' | 'skipped'
  detail: string
  at: string
}

export interface DteEmitterProfile extends DteXmlPartySnapshot {}

export interface DteReceiverOverride extends Partial<DteXmlPartySnapshot> {}

export interface DteEmissionCommonInput {
  emitter: DteEmitterProfile
  certificate: DteSignatureCertificateConfig
  environment?: DteSubmissionEnvironment
  providerMode?: 'auto' | DteSubmissionProviderMode
  createdByUserId?: string
  receiverOverride?: DteReceiverOverride
}

export interface DteCreateAndEmitInput extends DteEmissionCommonInput {
  document: AdminDocumentWriteInput
}

export interface DteEmitExistingInput extends DteEmissionCommonInput {
  businessId: string
  documentId: string
}

export interface DteEmissionResult {
  document: AdminDocument
  detail: AdminDocumentDetail
  xml: string
  documentXmlId: string
  submission: DteSubmissionRecord
  workflow: DteEmissionStepResult[]
}
