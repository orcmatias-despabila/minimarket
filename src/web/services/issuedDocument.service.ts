import { createId } from '../../lib/ids'
import type { IssuedDocument, SaveIssuedDocumentInput } from '../types/issuedDocument'
import { getRutValidationMessage, normalizeRut } from '../../lib/rut'

const storagePrefix = 'minimarket:web:issued-documents'

const buildStorageKey = (businessId: string) => `${storagePrefix}:${businessId}`

const canUseStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const normalizeText = (value?: string) => value?.trim() ?? ''

const readDocuments = (businessId: string): IssuedDocument[] => {
  if (!canUseStorage()) {
    return []
  }

  const raw = window.localStorage.getItem(buildStorageKey(businessId))
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as IssuedDocument[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeDocuments = (businessId: string, documents: IssuedDocument[]) => {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(buildStorageKey(businessId), JSON.stringify(documents))
}

const normalizeDocument = (
  input: SaveIssuedDocumentInput,
  existing?: IssuedDocument,
): IssuedDocument => {
  const timestamp = new Date().toISOString()

  return {
    id: existing?.id ?? input.existingDocumentId ?? createId('issued-doc'),
    businessId: input.businessId,
    type: input.type,
    folio: normalizeText(input.folio),
    issuedAt: input.issuedAt,
    customerId: input.customerId || undefined,
    customerName: normalizeText(input.customerName) || undefined,
    customerRut: normalizeText(input.customerRut)
      ? normalizeRut(input.customerRut) ?? normalizeText(input.customerRut).toUpperCase()
      : undefined,
    netAmount: input.netAmount,
    taxAmount: input.taxAmount,
    totalAmount: input.totalAmount,
    status: input.status,
    paymentMethod: input.paymentMethod,
    sellerName: normalizeText(input.sellerName) || undefined,
    notes: normalizeText(input.notes) || undefined,
    reference: input.reference
      ? {
          documentId: input.reference.documentId,
          type: input.reference.type,
          folio: normalizeText(input.reference.folio),
          issuedAt: input.reference.issuedAt,
          customerId: input.reference.customerId,
          customerRut: normalizeText(input.reference.customerRut)
            ? normalizeRut(input.reference.customerRut) ??
              normalizeText(input.reference.customerRut).toUpperCase()
            : undefined,
          reason: normalizeText(input.reference.reason),
        }
      : undefined,
    lines: input.lines
      .map((line) => ({
        id: line.id || createId('issued-doc-line'),
        description: normalizeText(line.description),
        quantity: typeof line.quantity === 'number' ? line.quantity : undefined,
        amount: typeof line.amount === 'number' ? line.amount : undefined,
      }))
      .filter((line) => line.description || typeof line.amount === 'number'),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
}

export const issuedDocumentService = {
  async listByBusiness(businessId?: string | null): Promise<IssuedDocument[]> {
    if (!businessId) {
      return []
    }

    return readDocuments(businessId).sort(
      (left, right) => new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime(),
    )
  },

  async saveDocument(input: SaveIssuedDocumentInput): Promise<IssuedDocument> {
    if (input.customerRut) {
      const customerRutError = getRutValidationMessage(input.customerRut, 'El RUT del cliente')
      if (customerRutError) {
        throw new Error(customerRutError)
      }
    }

    if (input.reference?.customerRut) {
      const referenceRutError = getRutValidationMessage(
        input.reference.customerRut,
        'El RUT del cliente de referencia',
      )
      if (referenceRutError) {
        throw new Error(referenceRutError)
      }
    }

    const documents = readDocuments(input.businessId)
    const existing = input.existingDocumentId
      ? documents.find((item) => item.id === input.existingDocumentId)
      : undefined

    const duplicatedFolio = documents.find(
      (item) =>
        item.type === input.type &&
        item.folio.toLowerCase() === input.folio.trim().toLowerCase() &&
        item.id !== input.existingDocumentId,
    )

    if (duplicatedFolio) {
      throw new Error('Ya existe un documento emitido de ese tipo con el mismo folio.')
    }

    const nextDocument = normalizeDocument(input, existing)
    const nextDocuments = existing
      ? documents.map((item) => (item.id === existing.id ? nextDocument : item))
      : [nextDocument, ...documents]

    writeDocuments(input.businessId, nextDocuments)
    return nextDocument
  },
}
