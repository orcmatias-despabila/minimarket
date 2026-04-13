import { createId } from '../../lib/ids'
import type {
  ReceivedDocument,
  ReceivedDocumentAttachment,
  SaveReceivedDocumentInput,
} from '../types/receivedDocument'
import { getRutValidationMessage, normalizeRut } from '../../lib/rut'

const storagePrefix = 'minimarket:web:received-documents'
const maxAttachmentSizeBytes = 1_500_000

const buildStorageKey = (businessId: string) => `${storagePrefix}:${businessId}`

const canUseStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const normalizeText = (value?: string) => value?.trim() ?? ''

const readDocuments = (businessId: string): ReceivedDocument[] => {
  if (!canUseStorage()) {
    return []
  }

  const raw = window.localStorage.getItem(buildStorageKey(businessId))
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as ReceivedDocument[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeDocuments = (businessId: string, documents: ReceivedDocument[]) => {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(buildStorageKey(businessId), JSON.stringify(documents))
}

const normalizeDocument = (
  input: SaveReceivedDocumentInput,
  existing?: ReceivedDocument,
): ReceivedDocument => {
  const timestamp = new Date().toISOString()

  return {
    id: existing?.id ?? input.existingDocumentId ?? createId('received-doc'),
    businessId: input.businessId,
    type: input.type,
    folio: normalizeText(input.folio),
    issuedAt: input.issuedAt,
    supplierId: input.supplierId,
    supplierName: normalizeText(input.supplierName),
    supplierRut: normalizeRut(input.supplierRut) ?? normalizeText(input.supplierRut).toUpperCase(),
    netAmount: input.netAmount,
    taxAmount: input.taxAmount,
    totalAmount: input.totalAmount,
    status: input.status,
    notes: normalizeText(input.notes) || undefined,
    attachment: input.attachment,
    reference: input.reference
      ? {
          documentId: input.reference.documentId,
          type: input.reference.type,
          folio: normalizeText(input.reference.folio),
          issuedAt: input.reference.issuedAt,
          supplierId: input.reference.supplierId,
          supplierRut: normalizeText(input.reference.supplierRut)
            ? normalizeRut(input.reference.supplierRut) ??
              normalizeText(input.reference.supplierRut).toUpperCase()
            : undefined,
          reason: normalizeText(input.reference.reason),
        }
      : undefined,
    lines: input.lines
      .map((line) => ({
        id: line.id || createId('received-doc-line'),
        description: normalizeText(line.description),
        quantity: typeof line.quantity === 'number' ? line.quantity : undefined,
        amount: typeof line.amount === 'number' ? line.amount : undefined,
      }))
      .filter((line) => line.description || typeof line.amount === 'number'),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('No pudimos leer el archivo adjunto.'))
    reader.readAsDataURL(file)
  })

export const receivedDocumentService = {
  async listByBusiness(businessId?: string | null): Promise<ReceivedDocument[]> {
    if (!businessId) {
      return []
    }

    return readDocuments(businessId).sort(
      (left, right) => new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime(),
    )
  },

  async saveDocument(input: SaveReceivedDocumentInput): Promise<ReceivedDocument> {
    const supplierRutError = getRutValidationMessage(input.supplierRut, 'El RUT del proveedor')
    if (supplierRutError) {
      throw new Error(supplierRutError)
    }

    if (input.reference?.supplierRut) {
      const referenceRutError = getRutValidationMessage(
        input.reference.supplierRut,
        'El RUT del proveedor de referencia',
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
        item.supplierId === input.supplierId &&
        item.id !== input.existingDocumentId,
    )

    if (duplicatedFolio) {
      throw new Error('Ya existe un documento de ese tipo con el mismo folio para este proveedor.')
    }

    const nextDocument = normalizeDocument(input, existing)
    const nextDocuments = existing
      ? documents.map((item) => (item.id === existing.id ? nextDocument : item))
      : [nextDocument, ...documents]

    writeDocuments(input.businessId, nextDocuments)
    return nextDocument
  },

  async prepareAttachment(file: File): Promise<ReceivedDocumentAttachment> {
    if (file.size > maxAttachmentSizeBytes) {
      throw new Error('El adjunto supera 1.5 MB. Reduce el archivo para guardarlo en web.')
    }

    const dataUrl = await readFileAsDataUrl(file)

    return {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl,
    }
  },
}
