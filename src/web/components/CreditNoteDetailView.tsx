import { formatCurrency } from '../../lib/format'
import { AdminEmptyState } from './AdminEmptyState'
import { DtePrintableView } from './DtePrintableView'
import { DocumentAttachmentsPanel } from './DocumentAttachmentsPanel'
import type { AdminDocumentAttachment, AdminDocumentDetail } from '../types/adminDocument'
import {
  formatDate,
  getStatusChipClass,
  paymentLabelMap,
  statusLabelMap,
  typeLabelMap,
} from '../lib/creditNotes'

interface CreditNoteDetailViewProps {
  businessId?: string
  detail: AdminDocumentDetail | null
  onAttachmentsChanged?: (attachments: AdminDocumentAttachment[]) => void
}

export function CreditNoteDetailView({
  businessId,
  detail,
  onAttachmentsChanged,
}: CreditNoteDetailViewProps) {
  if (!detail) {
    return (
      <AdminEmptyState
        compact
        title="No encontramos esta nota de credito."
        description="La ficha puede haber sido eliminada o no estar disponible para tu negocio."
      />
    )
  }

  const referenceDetail = detail.references[0]

  return (
    <div id="credit-note-print-sheet" className="credit-note-detail print-sheet dte-printable-shell">
      <DtePrintableView detail={detail} />
      <div className="credit-note-detail__hero">
        <div className="document-detail-hero__content">
          <div className="document-detail-hero__chips">
            <span className="issued-documents-web__type-chip issued-documents-web__type-chip--credit-note">
              Nota de credito
            </span>
            <span className="document-detail-hero__date">{formatDate(detail.document.issueDate)}</span>
          </div>
          <strong>{detail.document.folio ?? 'Sin folio'}</strong>
          <p>{detail.document.counterpartyName ?? 'Sin contraparte'}</p>
          <small>
            {detail.document.counterpartyRut ?? 'Sin RUT'} -{' '}
            {detail.document.direction === 'emitted' ? 'Nota emitida' : 'Nota recibida'}
          </small>
        </div>
        <span className={getStatusChipClass(detail.document.status)}>
          {statusLabelMap[detail.document.status]}
        </span>
      </div>

      <section className="document-detail-section">
        <div className="document-detail-section__header">
          <span>Datos generales</span>
          <strong>Lectura administrativa</strong>
        </div>
        <div className="document-detail-grid">
          <div>
            <span>Contraparte</span>
            <strong>{detail.document.counterpartyName ?? 'Sin contraparte'}</strong>
          </div>
          <div>
            <span>RUT</span>
            <strong>{detail.document.counterpartyRut ?? 'Sin RUT'}</strong>
          </div>
          <div>
            <span>Fecha nota</span>
            <strong>{formatDate(detail.document.issueDate)}</strong>
          </div>
          {detail.document.direction === 'emitted' ? (
            <div>
              <span>Medio de pago</span>
              <strong>
                {detail.document.paymentMethod
                  ? paymentLabelMap[detail.document.paymentMethod]
                  : 'Sin medio'}
              </strong>
            </div>
          ) : (
            <div>
              <span>Origen</span>
              <strong>Documento recibido</strong>
            </div>
          )}
        </div>
      </section>

      <section className="document-detail-section">
        <div className="document-detail-section__header">
          <span>Montos</span>
          <strong>Resumen financiero</strong>
        </div>
        <div className="document-detail-metrics">
          <div>
            <span>Neto</span>
            <strong>{formatCurrency(detail.document.netAmount)}</strong>
          </div>
          <div>
            <span>IVA</span>
            <strong>{formatCurrency(detail.document.taxAmount)}</strong>
          </div>
          <div>
            <span>Exento</span>
            <strong>{formatCurrency(detail.document.exemptAmount)}</strong>
          </div>
          <div className="document-detail-metrics__total">
            <span>Total</span>
            <strong>{formatCurrency(detail.document.totalAmount)}</strong>
          </div>
        </div>
      </section>

      {referenceDetail ? (
        <>
          <section className="credit-note-detail__timeline document-detail-section">
            <div className="document-detail-section__header">
              <span>Trazabilidad documental</span>
              <strong>Referencia principal</strong>
            </div>
            <div className="credit-note-detail__timeline-grid">
              <div>
                <span>1. Documento origen</span>
                <strong>{typeLabelMap[referenceDetail.referencedDocumentType]}</strong>
                <p>
                  {referenceDetail.referencedFolio || 'Sin folio'} -{' '}
                  {formatDate(referenceDetail.referencedIssueDate)}
                </p>
              </div>
              <div>
                <span>2. Nota de credito</span>
                <strong>{detail.document.folio ?? 'Sin folio'}</strong>
                <p>{formatDate(detail.document.issueDate)}</p>
              </div>
            </div>
          </section>
          <section className="credit-note-detail__notes document-detail-section">
            <div className="document-detail-section__header">
              <span>Motivo de referencia</span>
              <strong>Glosa administrativa</strong>
            </div>
            <p>{referenceDetail.referenceReason}</p>
          </section>
        </>
      ) : (
        <AdminEmptyState
          compact
          title="Esta nota no tiene referencia cargada."
          description="Asociala a un documento previo para completar su trazabilidad."
        />
      )}

      <section className="credit-note-detail__notes document-detail-section">
        <div className="document-detail-section__header">
          <span>Observaciones</span>
          <strong>Contexto interno</strong>
        </div>
        <p>{detail.document.notes || 'Sin observaciones registradas.'}</p>
      </section>

      <div className="print-hide">
        <DocumentAttachmentsPanel
          businessId={businessId}
          documentId={detail.document.id}
          attachments={detail.attachments}
          title="Adjuntos de la nota"
          description="Consulta y sube respaldos seguros asociados a la nota seleccionada."
          onAttachmentsChanged={onAttachmentsChanged}
        />
      </div>
    </div>
  )
}
