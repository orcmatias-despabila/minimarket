import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { AdminBackHeader } from '../components/AdminBackHeader'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { ReceivedDocumentDetailView } from '../components/ReceivedDocumentDetailView'
import { downloadCsv, printElementById } from '../lib/adminExport'
import {
  formatDate,
  statusLabelMap,
  typeLabelMap,
  type ReceivedDocumentFormValues,
} from '../lib/receivedDocuments'
import { adminDocumentsService } from '../services/adminDocuments.service'
import type { AdminDocumentAttachment, AdminDocumentDetail } from '../types/adminDocument'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

type LocationFeedbackState = {
  feedback?: string
} | null

export function ReceivedDocumentDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { business } = useWebWorkspace()
  const { documentId } = useParams<{ documentId: string }>()
  const [searchParams] = useSearchParams()
  const [detail, setDetail] = useState<AdminDocumentDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const feedback = (location.state as LocationFeedbackState)?.feedback ?? null
  const returnTo = searchParams.get('returnTo') || '/received-documents'

  useEffect(() => {
    const loadDetail = async () => {
      if (!documentId) {
        setError('No encontramos el documento solicitado.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const nextDetail = await adminDocumentsService.getById(documentId)

        if (!nextDetail) {
          setDetail(null)
          setError('No encontramos el documento solicitado.')
          return
        }

        setDetail(nextDetail)
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No pudimos cargar la ficha del documento.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadDetail()
  }, [documentId])

  const handleExport = () => {
    if (!detail) {
      return
    }

    const reference = detail.references[0]
    const rows: Array<Array<string | number>> = [
      ['Tipo', typeLabelMap[detail.document.documentType as ReceivedDocumentFormValues['documentType']]],
      ['Folio', detail.document.folio ?? 'Sin folio'],
      ['Fecha emision', formatDate(detail.document.issueDate)],
      ['Proveedor', detail.document.counterpartyName ?? 'Sin proveedor'],
      ['RUT proveedor', detail.document.counterpartyRut ?? 'Sin RUT'],
      ['Estado', statusLabelMap[detail.document.status as ReceivedDocumentFormValues['status']]],
      ['Neto', detail.document.netAmount],
      ['IVA', detail.document.taxAmount],
      ['Exento', detail.document.exemptAmount],
      ['Total', detail.document.totalAmount],
      ['Referencia folio', reference?.referencedFolio ?? 'Sin referencia'],
      [
        'Referencia fecha',
        reference?.referencedIssueDate ? formatDate(reference.referencedIssueDate) : 'Sin referencia',
      ],
      ['Motivo referencia', reference?.referenceReason ?? 'Sin referencia'],
      ['Observaciones', detail.document.notes ?? 'Sin observaciones'],
      ['Adjuntos', detail.attachments.length],
    ]

    detail.lines.forEach((line, index) => {
      rows.push([
        `Linea ${index + 1}`,
        `${line.description} · ${line.quantity} ${line.unitLabel ?? 'unidad'} · ${line.lineTotalAmount}`,
      ])
    })

    downloadCsv(
      `documento-recibido-${detail.document.folio ?? detail.document.id}.csv`,
      ['Campo', 'Valor'],
      rows,
    )
  }

  const handlePrint = () => {
    if (!detail) {
      return
    }

    printElementById(
      'received-document-print-sheet',
      `Documento recibido ${detail.document.folio ?? ''}`.trim(),
    )
  }

  const handleAttachmentsChanged = (attachments: AdminDocumentAttachment[]) => {
    setDetail((current) => (current ? { ...current, attachments } : current))
  }

  return (
    <section className="admin-record-page">
      <div className="surface-card admin-record-page__surface">
        <AdminBackHeader
          kicker="Documentos recibidos"
          title={detail?.document.folio ? `Folio ${detail.document.folio}` : 'Ficha documental'}
          description="Vista administrativa individual para revisar referencia, lineas, adjuntos y estado del documento."
          onBack={() => navigate(returnTo)}
          actions={
            detail ? (
              <>
                <Button variant="secondary" onClick={handleExport}>
                  Exportar CSV
                </Button>
                <Button variant="secondary" onClick={handlePrint}>
                  Imprimir
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      `/received-documents/${detail.document.id}/edit?returnTo=${encodeURIComponent(returnTo)}`,
                    )
                  }
                >
                  Editar documento
                </Button>
              </>
            ) : null
          }
        />

        {feedback ? <AdminNotice tone="success">{feedback}</AdminNotice> : null}
        {isLoading ? <AdminLoadingBlock label="Cargando ficha del documento" /> : null}
        {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
        {!isLoading && !error ? (
          <ReceivedDocumentDetailView
            businessId={business?.id}
            detail={detail}
            onAttachmentsChanged={handleAttachmentsChanged}
          />
        ) : null}
      </div>
    </section>
  )
}
