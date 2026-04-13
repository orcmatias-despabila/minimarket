import { adminTableNames, getAdminSupabaseClient } from './adminBase'
import { adminAuditService } from './adminAudit.service'
import {
  mapDocumentAttachmentRow,
  type AdminDocumentAttachmentRow,
} from './adminMappers'
import type { AdminAttachmentUploadInput, AdminDocumentAttachment } from '../types/adminDocument'

const maxAttachmentSizeBytes = 10 * 1024 * 1024
const allowedAttachmentMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'text/plain',
  'text/csv',
  'application/xml',
  'text/xml',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const allowedAttachmentExtensions = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.heif',
  '.txt',
  '.csv',
  '.xml',
  '.xls',
  '.xlsx',
  '.doc',
  '.docx',
])

const sanitizeFileName = (fileName: string) =>
  fileName
    .trim()
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const buildStoragePath = (businessId: string, documentId: string, attachmentId: string, fileName: string) =>
  `businesses/${businessId}/documents/${documentId}/${attachmentId}/${sanitizeFileName(fileName) || 'file'}`

const getFileExtension = (fileName: string) => {
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : ''
}

export const formatAttachmentSize = (sizeBytes: number) => {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

export const validateAttachmentFile = (file: File) => {
  if (file.size > maxAttachmentSizeBytes) {
    throw new Error('El archivo supera 10 MB. Reduce el tamaño antes de subirlo.')
  }

  const extension = getFileExtension(file.name)
  const mimeType = file.type || ''
  const hasValidMimeType = !mimeType || allowedAttachmentMimeTypes.has(mimeType)
  const hasValidExtension = !extension || allowedAttachmentExtensions.has(extension)

  if (!hasValidMimeType && !hasValidExtension) {
    throw new Error('Ese tipo de archivo no esta permitido para adjuntos documentales.')
  }
}

export const adminAttachmentsService = {
  async list(documentId: string): Promise<AdminDocumentAttachment[]> {
    const client = getAdminSupabaseClient()
    const result = await client
      .from(adminTableNames.documentAttachments)
      .select(
        'id, document_id, storage_bucket, storage_path, file_name, mime_type, file_size, uploaded_by_user_id, created_at',
      )
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (result.error) {
      throw new Error(`No pudimos cargar los adjuntos: ${result.error.message}`)
    }

    return (result.data ?? []).map((row) => mapDocumentAttachmentRow(row as AdminDocumentAttachmentRow))
  },

  async upload(input: AdminAttachmentUploadInput): Promise<AdminDocumentAttachment> {
    const client = getAdminSupabaseClient()
    validateAttachmentFile(input.file)
    const attachmentId = crypto.randomUUID()
    const storagePath = buildStoragePath(
      input.businessId,
      input.documentId,
      attachmentId,
      input.file.name,
    )

    const uploadResult = await client.storage
      .from(adminTableNames.attachmentBucket)
      .upload(storagePath, input.file, {
        contentType: input.file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadResult.error) {
      throw new Error(`No pudimos subir el adjunto: ${uploadResult.error.message}`)
    }

    const metadataResult = await client
      .from(adminTableNames.documentAttachments)
      .insert({
        id: attachmentId,
        document_id: input.documentId,
        storage_bucket: adminTableNames.attachmentBucket,
        storage_path: storagePath,
        file_name: input.file.name,
        mime_type: input.file.type || 'application/octet-stream',
        file_size: input.file.size,
      })
      .select(
        'id, document_id, storage_bucket, storage_path, file_name, mime_type, file_size, uploaded_by_user_id, created_at',
      )
      .single<AdminDocumentAttachmentRow>()

    if (metadataResult.error) {
      await client.storage.from(adminTableNames.attachmentBucket).remove([storagePath])
      throw new Error(`No pudimos registrar el adjunto: ${metadataResult.error.message}`)
    }

    const attachment = mapDocumentAttachmentRow(metadataResult.data)

    await adminAuditService.recordEventSafely({
      businessId: input.businessId,
      entityType: 'document_attachment',
      entityId: attachment.id,
      actionType: 'attachment_uploaded',
      newData: {
        documentId: input.documentId,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        storageBucket: attachment.storageBucket,
      },
    })

    return attachment
  },

  async createSignedUrl(attachment: Pick<AdminDocumentAttachment, 'storagePath' | 'storageBucket'>) {
    const client = getAdminSupabaseClient()
    const result = await client.storage
      .from(attachment.storageBucket)
      .createSignedUrl(attachment.storagePath, 60 * 10)

    if (result.error) {
      throw new Error(`No pudimos abrir el adjunto: ${result.error.message}`)
    }

    return result.data.signedUrl
  },

  async openAttachment(attachment: Pick<AdminDocumentAttachment, 'storagePath' | 'storageBucket'>) {
    const signedUrl = await this.createSignedUrl(attachment)
    window.open(signedUrl, '_blank', 'noopener,noreferrer')
  },

  async remove(attachment: AdminDocumentAttachment): Promise<void> {
    const client = getAdminSupabaseClient()

    const metadataDelete = await client
      .from(adminTableNames.documentAttachments)
      .delete()
      .eq('id', attachment.id)

    if (metadataDelete.error) {
      throw new Error(`No pudimos eliminar el adjunto: ${metadataDelete.error.message}`)
    }

    const storageDelete = await client.storage
      .from(attachment.storageBucket)
      .remove([attachment.storagePath])

    if (storageDelete.error) {
      throw new Error(`El adjunto se desvinculo, pero no pudimos borrar el archivo: ${storageDelete.error.message}`)
    }
  },
}
