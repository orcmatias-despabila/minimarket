import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { AdminBackHeader } from '../components/AdminBackHeader'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { CreditNoteDetailView } from '../components/CreditNoteDetailView'
import { downloadCsv, printElementById } from '../lib/adminExport'
import { formatDate, paymentLabelMap, statusLabelMap, typeLabelMap } from '../lib/creditNotes'
import { adminDocumentsService } from '../services/adminDocuments.service'
import type { AdminDocumentAttachment, AdminDocumentDetail } from '../types/adminDocument'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

type LocationFeedbackState = {
  feedback?: string
} | null

export function CreditNoteDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { business } = useWebWorkspace()
  const { noteId } = useParams<{ noteId: string }>()
  const [searchParams] = useSearchParams()
  const [detail, setDetail] = useState<AdminDocumentDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const feedback = (location.state as LocationFeedbackState)?.feedback ?? null
  const returnTo = searchParams.get('returnTo') || '/credit-notes'

  useEffect(() => {
    const loadDetail = async () => {
      if (!noteId) {
        setError('No encontramos la nota de credito solicitada.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const nextDetail = await adminDocumentsService.getById(noteId)

        if (!nextDetail) {
          setDetail(null)
          setError('No encontramos la nota de credito solicitada.')
          return
        }

        setDetail(nextDetail)
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No pudimos cargar la ficha de la nota de credito.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadDetail()
  }, [noteId])

  const handleExport = () => {
    if (!detail) {
      return
    }

    const reference = detail.references[0]
    const rows: Array<Array<string | number>> = [
      ['Tipo', 'Nota de credito'],
      ['Origen', detail.document.direction === 'emitted' ? 'Emitida' : 'Recibida'],
      ['Folio', detail.document.folio ?? 'Sin folio'],
      ['Fecha emision', formatDate(detail.document.issueDate)],
      ['Contraparte', detail.document.counterpartyName ?? 'Sin contraparte'],
      ['RUT contraparte', detail.document.counterpartyRut ?? 'Sin RUT'],
      ['Estado', statusLabelMap[detail.document.status]],
      [
        'Medio de pago',
        detail.document.paymentMethod ? paymentLabelMap[detail.document.paymentMethod] : 'Sin medio',
      ],
      ['Neto', detail.document.netAmount],
      ['IVA', detail.document.taxAmount],
      ['Exento', detail.document.exemptAmount],
      ['Total', detail.document.totalAmount],
      [
        'Documento referencia',
        reference ? `${typeLabelMap[reference.referencedDocumentType]} ${reference.referencedFolio || 'Sin folio'}` : 'Sin referencia',
      ],
      [
        'Fecha referencia',
        reference?.referencedIssueDate ? formatDate(reference.referencedIssueDate) : 'Sin referencia',
      ],
      ['Glosa referencia', reference?.referenceReason ?? 'Sin referencia'],
      ['Observaciones', detail.document.notes ?? 'Sin observaciones'],
      ['Adjuntos', detail.attachments.length],
    ]

    downloadCsv(
      `nota-credito-${detail.document.folio ?? detail.document.id}.csv`,
      ['Campo', 'Valor'],
      rows,
    )
  }

  const handlePrint = () => {
    if (!detail) {
      return
    }

    printElementById(
      'credit-note-print-sheet',
      `Nota de credito ${detail.document.folio ?? ''}`.trim(),
    )
  }

  const handleAttachmentsChanged = (attachments: AdminDocumentAttachment[]) => {
    setDetail((current) => (current ? { ...current, attachments } : current))
  }

  return (
    <section className="admin-record-page">
      <div className="surface-card admin-record-page__surface">
        <AdminBackHeader
          kicker="Notas de credito"
          title={detail?.document.folio ? `Folio ${detail.document.folio}` : 'Ficha documental'}
          description="Vista administrativa individual para revisar referencia, contraparte, montos y adjuntos."
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
                    navigate(`/credit-notes/${detail.document.id}/edit?returnTo=${encodeURIComponent(returnTo)}`)
                  }
                >
                  Editar nota
                </Button>
              </>
            ) : null
          }
        />

        {feedback ? <AdminNotice tone="success">{feedback}</AdminNotice> : null}
        {isLoading ? <AdminLoadingBlock label="Cargando ficha de la nota" /> : null}
        {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
        {!isLoading && !error ? (
          <CreditNoteDetailView
            businessId={business?.id}
            detail={detail}
            onAttachmentsChanged={handleAttachmentsChanged}
          />
        ) : null}
      </div>
    </section>
  )
}
