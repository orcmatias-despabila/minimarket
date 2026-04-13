import { adminAuditService } from './adminAudit.service'
import { adminCustomersService } from './adminCustomers.service'
import { adminDocumentsService } from './adminDocuments.service'
import { cafFilesService } from './cafFiles.service'
import { dteSubmissionService } from './dteSubmission.service'
import { signDteXml, validateSignedDteIntegrity } from '../lib/dteSignature'
import type { AdminCustomer } from '../types/adminCustomer'
import type {
  AdminDocumentDetail,
  AdminDocumentDteStatus,
  AdminDocumentType,
  AdminDocumentWriteInput,
} from '../types/adminDocument'
import type {
  DteCreateAndEmitInput,
  DteEmitExistingInput,
  DteEmissionResult,
  DteEmissionStepResult,
  DteEmitterProfile,
  DteReceiverOverride,
  DteWorkflowStage,
} from '../types/dteEmission'
import type { DteXmlPartySnapshot } from '../types/dteXml'
import { normalizeRut } from '../../lib/rut'

const siiDteCodeMap: Partial<Record<AdminDocumentType, number>> = {
  boleta: 39,
  factura: 33,
  nota_credito: 61,
  factura_compra: 46,
}

const buildStep = (
  stage: DteWorkflowStage,
  detail: string,
  status: 'completed' | 'skipped' = 'completed',
): DteEmissionStepResult => ({
  stage,
  status,
  detail,
  at: new Date().toISOString(),
})

const resolveSiiDteCode = (documentType: AdminDocumentType, explicitCode?: number) => {
  if (explicitCode) {
    return explicitCode
  }

  const mapped = siiDteCodeMap[documentType]
  if (!mapped) {
    throw new Error(`No existe codigo DTE configurado para ${documentType}.`)
  }

  return mapped
}

const toDocumentDteStatus = (
  status: 'pending' | 'sent' | 'accepted' | 'rejected',
): AdminDocumentDteStatus => {
  if (status === 'accepted') {
    return 'accepted'
  }

  if (status === 'rejected') {
    return 'rejected'
  }

  return 'sent'
}

const assertEmittedDteCandidate = (payload: Pick<AdminDocumentWriteInput, 'direction' | 'documentType'>) => {
  if (payload.direction !== 'emitted') {
    throw new Error('El flujo de emision DTE solo soporta documentos emitidos.')
  }

  if (!siiDteCodeMap[payload.documentType]) {
    throw new Error(`El tipo documental ${payload.documentType} no esta habilitado para emision DTE.`)
  }
}

const mergePartySnapshot = (
  base: Partial<DteXmlPartySnapshot> | undefined,
  override: DteReceiverOverride | undefined,
  fallbackName?: string,
  fallbackTaxId?: string,
): DteXmlPartySnapshot => ({
  taxId: override?.taxId ?? base?.taxId ?? fallbackTaxId ?? '',
  legalName: override?.legalName ?? base?.legalName ?? fallbackName ?? '',
  businessLine: override?.businessLine ?? base?.businessLine ?? '',
  addressLine1: override?.addressLine1 ?? base?.addressLine1 ?? '',
  district: override?.district ?? base?.district ?? '',
  city: override?.city ?? base?.city ?? '',
})

const toCustomerSnapshot = (customer: AdminCustomer): DteXmlPartySnapshot => ({
  taxId: customer.taxId,
  legalName: customer.legalName,
  businessLine: customer.businessLine ?? '',
  addressLine1: customer.addressLine1 ?? '',
  district: customer.district ?? '',
  city: customer.city ?? '',
})

const normalizeEmitter = (emitter: DteEmitterProfile): DteXmlPartySnapshot => ({
  taxId: normalizeRut(emitter.taxId) ?? emitter.taxId.trim(),
  legalName: emitter.legalName.trim(),
  businessLine: emitter.businessLine.trim(),
  addressLine1: emitter.addressLine1.trim(),
  district: emitter.district.trim(),
  city: emitter.city.trim(),
})

const buildDocumentPayloadForDte = (document: AdminDocumentWriteInput): AdminDocumentWriteInput => ({
  ...document,
  siiDteCode: resolveSiiDteCode(document.documentType, document.siiDteCode),
})

const resolveReceiverSnapshot = async (
  detail: AdminDocumentDetail,
  override?: DteReceiverOverride,
): Promise<DteXmlPartySnapshot> => {
  if (detail.document.direction !== 'emitted') {
    throw new Error('Solo se puede construir receptor DTE para documentos emitidos.')
  }

  let customerSnapshot: Partial<DteXmlPartySnapshot> | undefined

  if (detail.document.customerId) {
    const customer = await adminCustomersService.getById(detail.document.customerId)
    if (customer) {
      customerSnapshot = toCustomerSnapshot(customer)
    }
  }

  return mergePartySnapshot(
    customerSnapshot,
    override,
    detail.document.counterpartyName,
    detail.document.counterpartyRut,
  )
}

const persistFailure = async (documentId: string, message: string) => {
  await adminDocumentsService.updateDteWorkflow(documentId, {
    dteStatus: 'failed',
    dteLastError: message,
  })
}

async function runEmission(
  detail: AdminDocumentDetail,
  input: Pick<
    DteCreateAndEmitInput,
    'emitter' | 'certificate' | 'environment' | 'providerMode' | 'createdByUserId' | 'receiverOverride'
  >,
  workflow: DteEmissionStepResult[],
): Promise<DteEmissionResult> {
  const document = detail.document

  if (document.direction !== 'emitted') {
    throw new Error('Solo se pueden emitir DTE para documentos emitidos.')
  }

  if (!document.folio) {
    throw new Error('El documento no tiene folio asignado. Revisa el CAF antes de emitir.')
  }

  if (!document.cafFileId) {
    throw new Error('El documento no quedo asociado a un CAF. No es posible firmar el DTE.')
  }

  workflow.push(buildStep('folio_assigned', `Folio ${document.folio} asociado al documento.`))

  const cafFile = await cafFilesService.getById(document.cafFileId)
  if (!cafFile) {
    throw new Error('No pudimos cargar el CAF asociado al documento.')
  }

  const receiver = await resolveReceiverSnapshot(detail, input.receiverOverride)
  const xmlInput = {
    document: {
      id: document.id,
      documentType: document.documentType,
      siiDteCode: document.siiDteCode,
      folio: document.folio,
      issueDate: document.issueDate,
      dueDate: document.dueDate,
      currencyCode: document.currencyCode,
      netAmount: document.netAmount,
      taxAmount: document.taxAmount,
      exemptAmount: document.exemptAmount,
      totalAmount: document.totalAmount,
      paymentMethod: document.paymentMethod,
    },
    emitter: normalizeEmitter(input.emitter),
    receiver,
    lines: detail.lines.map((line) => ({
      lineNumber: line.lineNumber,
      sku: line.sku,
      barcode: line.barcode,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountAmount: line.discountAmount,
      lineTotalAmount: line.lineTotalAmount,
      unitLabel: line.unitLabel,
    })),
    references: detail.references.map((reference) => ({
      referencedDocumentType: reference.referencedDocumentType,
      referencedFolio: reference.referencedFolio,
      referencedIssueDate: reference.referencedIssueDate,
      referenceReason: reference.referenceReason,
      referenceCode: reference.referenceCode,
    })),
  }

  const signed = signDteXml({
    dte: xmlInput,
    certificate: input.certificate,
    ted: {
      cafXml: cafFile.cafXml,
      cafPrivateKeyPem: cafFile.privateKey,
    },
  })

  const integrity = validateSignedDteIntegrity(signed, {
    dte: xmlInput,
    certificate: input.certificate,
    ted: {
      cafXml: cafFile.cafXml,
      cafPrivateKeyPem: cafFile.privateKey,
    },
  })

  if (!integrity.isValid) {
    throw new Error('La validacion de integridad del DTE firmado no fue exitosa.')
  }

  const generatedAt = new Date().toISOString()
  await adminDocumentsService.updateDteWorkflow(document.id, {
    dteStatus: 'xml_generated',
    dteXml: signed.xml,
    dteXmlDocumentId: signed.documentXmlId,
    dteGeneratedAt: generatedAt,
    dteLastError: null,
  })

  workflow.push(buildStep('xml_generated', `XML DTE generado con ID ${signed.documentXmlId}.`))

  const signedAt = new Date().toISOString()
  await adminDocumentsService.updateDteWorkflow(document.id, {
    dteStatus: 'signed',
    dteXml: signed.xml,
    dteXmlDocumentId: signed.documentXmlId,
    dteGeneratedAt: generatedAt,
    dteSignedAt: signedAt,
    dteLastError: null,
  })

  workflow.push(buildStep('signed', 'XML firmado y validado con exito.'))

  const submissionResult = await dteSubmissionService.send({
    businessId: document.businessId,
    documentId: document.id,
    requestXml: signed.xml,
    environment: input.environment,
    providerMode: input.providerMode,
    createdByUserId: input.createdByUserId,
  })

  workflow.push(
    buildStep(
      'submitted',
      submissionResult.usedMock
        ? 'DTE enviado mediante transporte mock.'
        : 'DTE enviado al proveedor real del SII.',
    ),
  )

  const finalDocument = await adminDocumentsService.updateDteWorkflow(document.id, {
    dteStatus: toDocumentDteStatus(submissionResult.submission.submissionStatus),
    dteLastSubmissionId: submissionResult.submission.id,
    dteTrackId: submissionResult.submission.siiTrackId ?? null,
    dteSentAt: submissionResult.submission.sentAt ?? null,
    dteRespondedAt: submissionResult.submission.respondedAt ?? null,
    dteLastError:
      submissionResult.submission.submissionStatus === 'rejected'
        ? submissionResult.response.message
        : null,
  })

  workflow.push(
    buildStep(
      'response_saved',
      `Respuesta ${submissionResult.submission.submissionStatus} guardada para el DTE.`,
    ),
  )

  await adminAuditService.recordEventSafely({
    businessId: document.businessId,
    entityType: 'document',
    entityId: document.id,
    actionType: 'other',
    previousData: {
      dteStatus: detail.document.dteStatus ?? 'draft',
    },
    newData: {
      dteStatus: finalDocument.dteStatus ?? submissionResult.submission.submissionStatus,
      dteTrackId: finalDocument.dteTrackId ?? null,
      dteLastSubmissionId: finalDocument.dteLastSubmissionId ?? null,
    },
  })

  const reloadedDetail = await adminDocumentsService.getById(document.id)
  if (!reloadedDetail) {
    throw new Error('El DTE se proceso, pero no pudimos recargar el documento final.')
  }

  return {
    document: finalDocument,
    detail: reloadedDetail,
    xml: signed.xml,
    documentXmlId: signed.documentXmlId,
    submission: submissionResult.submission,
    workflow,
  }
}

export const dteEmissionService = {
  async createAndEmit(input: DteCreateAndEmitInput): Promise<DteEmissionResult> {
    assertEmittedDteCandidate(input.document)

    const workflow: DteEmissionStepResult[] = []
    const documentPayload = buildDocumentPayloadForDte(input.document)
    let createdDetail: AdminDocumentDetail | null = null

    try {
      createdDetail = await adminDocumentsService.create(documentPayload)
      workflow.push(
        buildStep('document_created', `Documento ${createdDetail.document.id} creado para flujo DTE.`),
      )
      return await runEmission(createdDetail, input, workflow)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos emitir el DTE.'
      if (createdDetail) {
        await persistFailure(createdDetail.document.id, message)
      }
      throw new Error(message)
    }
  },

  async emitExisting(input: DteEmitExistingInput): Promise<DteEmissionResult> {
    const workflow: DteEmissionStepResult[] = []
    const detail = await adminDocumentsService.getById(input.documentId)

    if (!detail) {
      throw new Error('No pudimos encontrar el documento que intentas emitir.')
    }

    assertEmittedDteCandidate(detail.document)

    try {
      return await runEmission(detail, input, workflow)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos emitir el DTE.'
      await persistFailure(detail.document.id, message)
      throw new Error(message)
    }
  },
}
