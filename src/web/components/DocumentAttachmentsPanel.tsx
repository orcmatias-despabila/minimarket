import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { AdminEmptyState } from './AdminEmptyState'
import { AdminLoadingBlock } from './AdminLoadingBlock'
import { AdminNotice } from './AdminNotice'
import {
  adminAttachmentsService,
  formatAttachmentSize,
  validateAttachmentFile,
} from '../services/adminAttachments.service'
import type { AdminDocumentAttachment } from '../types/adminDocument'

interface DocumentAttachmentsPanelProps {
  businessId?: string
  documentId?: string
  attachments?: AdminDocumentAttachment[]
  pendingFile?: File | null
  onPendingFileChange?: (file: File | null) => void
  onAttachmentsChanged?: (attachments: AdminDocumentAttachment[]) => void
  title?: string
  description?: string
}

export function DocumentAttachmentsPanel({
  businessId,
  documentId,
  attachments = [],
  pendingFile = null,
  onPendingFileChange,
  onAttachmentsChanged,
  title = 'Adjuntos',
  description = 'Sube, revisa y abre respaldos documentales de forma segura.',
}: DocumentAttachmentsPanelProps) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelection = (file: File | null) => {
    setMessage(null)
    setError(null)

    if (!file) {
      onPendingFileChange?.(null)
      return
    }

    try {
      validateAttachmentFile(file)
      onPendingFileChange?.(file)
      setMessage(
        documentId
          ? `Archivo listo para subir: ${file.name}.`
          : `Archivo preparado para guardar con el documento: ${file.name}.`,
      )
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No pudimos validar el archivo.')
      onPendingFileChange?.(null)
    }
  }

  const handleUploadNow = async () => {
    if (!businessId || !documentId || !pendingFile) {
      return
    }

    setIsUploading(true)
    setMessage(null)
    setError(null)

    try {
      const uploaded = await adminAttachmentsService.upload({
        businessId,
        documentId,
        file: pendingFile,
      })
      onAttachmentsChanged?.([uploaded, ...attachments])
      onPendingFileChange?.(null)
      setMessage('Adjunto subido correctamente.')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No pudimos subir el adjunto.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="document-attachments-panel">
      <div className="inventory-section__header">
        <div>
          <p className="section-kicker">Adjuntos</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`document-attachment-${documentId ?? 'new'}`}>
          Seleccionar archivo
        </label>
        <input
          id={`document-attachment-${documentId ?? 'new'}`}
          className="field__input"
          type="file"
          accept=".pdf,image/*,.xml,.csv,.txt,.xls,.xlsx,.doc,.docx"
          onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
        />
        <span className="field__hint">
          PDF, imagenes y formatos documentales comunes. Tamano maximo: 10 MB.
        </span>
        {pendingFile ? (
          <span className="field__hint">
            Seleccionado: {pendingFile.name} ({formatAttachmentSize(pendingFile.size)})
          </span>
        ) : null}
      </div>

      {documentId && pendingFile ? (
        <div className="document-attachments-panel__actions">
          <Button onClick={() => void handleUploadNow()} disabled={isUploading}>
            {isUploading ? 'Subiendo adjunto...' : 'Subir ahora'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onPendingFileChange?.(null)}
            disabled={isUploading}
          >
            Limpiar
          </Button>
        </div>
      ) : null}

      {isUploading ? <AdminLoadingBlock label="Subiendo adjunto" compact lines={2} /> : null}
      {message ? <AdminNotice tone="success" compact>{message}</AdminNotice> : null}
      {error ? <AdminNotice tone="error" compact>{error}</AdminNotice> : null}

      {attachments.length ? (
        <div className="document-attachments-panel__list">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="document-attachments-panel__item">
              <div>
                <strong>{attachment.fileName}</strong>
                <p>{`${attachment.mimeType || 'Tipo no informado'} · ${formatAttachmentSize(attachment.fileSize)}`}</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => void adminAttachmentsService.openAttachment(attachment)}
              >
                Abrir
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <AdminEmptyState
          compact
          title="No hay adjuntos asociados."
          description="Sube un respaldo documental para dejar evidencia administrativa del documento."
        />
      )}
    </section>
  )
}
