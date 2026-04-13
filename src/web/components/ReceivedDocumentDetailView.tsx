import { formatCurrency } from '../../lib/format'
import { AdminEmptyState } from './AdminEmptyState'
import { DtePrintableView } from './DtePrintableView'
import { DocumentAttachmentsPanel } from './DocumentAttachmentsPanel'
import type { AdminDocumentAttachment, AdminDocumentDetail } from '../types/adminDocument'
import {
  formatDate,
  getStatusChipClass,
  statusLabelMap,
  typeChipClassMap,
  typeLabelMap,
  type ReceivedDocumentFormValues,
} from '../lib/receivedDocuments'

interface ReceivedDocumentDetailViewProps {
  businessId?: string
  detail: AdminDocumentDetail | null
  onAttachmentsChanged?: (attachments: AdminDocumentAttachment[]) => void
}

export function ReceivedDocumentDetailView({
  businessId,
  detail,
  onAttachmentsChanged,
}: ReceivedDocumentDetailViewProps) {
  if (!detail) {
    return (
      <AdminEmptyState
        compact
        title="No encontramos este documento."
        description="La ficha puede haber sido eliminada o no estar disponible para tu negocio."
      />
    )
  }

  return (
    <div
      id="received-document-print-sheet"
      className="received-document-detail print-sheet dte-printable-shell"
    >
      <DtePrintableView detail={detail} />
      <div className="received-document-detail__hero">
        <div className="document-detail-hero__content">
          <div className="document-detail-hero__chips">
            <span
              className={
                typeChipClassMap[
                  detail.document.documentType as ReceivedDocumentFormValues['documentType']
                ]
              }
            >
              {
                typeLabelMap[
                  detail.document.documentType as ReceivedDocumentFormValues['documentType']
                ]
              }
            </span>
            <span className="document-detail-hero__date">
              {formatDate(detail.document.issueDate)}
            </span>
          </div>
          <strong>{detail.document.folio ?? 'Sin folio'}</strong>
          <p>{detail.document.counterpartyName ?? 'Proveedor sin nombre'}</p>
          <small>
            {detail.document.counterpartyRut ?? 'Sin RUT'} · Documento recibido
          </small>
        </div>
        <span
          className={getStatusChipClass(
            detail.document.status as ReceivedDocumentFormValues['status'],
          )}
        >
          {statusLabelMap[detail.document.status as ReceivedDocumentFormValues['status']]}
        </span>
      </div>

      <section className="document-detail-section">
        <div className="document-detail-section__header">
          <span>Datos generales</span>
          <strong>Lectura administrativa</strong>
        </div>
        <div className="document-detail-grid">
          <div>
            <span>Fecha de emision</span>
            <strong>{formatDate(detail.document.issueDate)}</strong>
          </div>
          <div>
            <span>Proveedor</span>
            <strong>{detail.document.counterpartyName ?? 'Sin nombre'}</strong>
          </div>
          <div>
            <span>RUT proveedor</span>
            <strong>{detail.document.counterpartyRut ?? 'Sin RUT'}</strong>
          </div>
          <div>
            <span>Folio</span>
            <strong>{detail.document.folio ?? 'Sin folio'}</strong>
          </div>
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

      {detail.references[0] ? (
        <section className="received-document-detail__reference document-detail-section">
          <div className="document-detail-section__header">
            <span>Referencia documental</span>
            <strong>Documento relacionado</strong>
          </div>
          <div className="document-detail-grid">
            <div>
              <span>Tipo referenciado</span>
              <strong>
                {
                  typeLabelMap[
                    detail.references[0]
                      .referencedDocumentType as ReceivedDocumentFormValues['documentType']
                  ] ?? 'Documento referenciado'
                }
              </strong>
            </div>
            <div>
              <span>Folio referenciado</span>
              <strong>{detail.references[0].referencedFolio}</strong>
            </div>
            <div>
              <span>Fecha referenciada</span>
              <strong>
                {detail.references[0].referencedIssueDate
                  ? formatDate(detail.references[0].referencedIssueDate)
                  : 'Sin fecha'}
              </strong>
            </div>
          </div>
          <p>{detail.references[0].referenceReason}</p>
        </section>
      ) : null}

      <section className="received-document-detail__notes document-detail-section">
        <div className="document-detail-section__header">
          <span>Observaciones</span>
          <strong>Contexto interno</strong>
        </div>
        <p>{detail.document.notes || 'Sin observaciones registradas.'}</p>
      </section>

      <section className="received-document-detail__lines document-detail-section">
        <div className="document-detail-section__header">
          <span>Lineas de detalle</span>
          <strong>{detail.lines.length} registros</strong>
        </div>
        {detail.lines.length ? (
          <div className="received-document-detail__line-list">
            {detail.lines.map((line, index) => (
              <div key={line.id} className="received-document-detail__line-item">
                <div>
                  <span className="document-detail-line__index">Linea {index + 1}</span>
                  <strong>{line.description}</strong>
                  <p>
                    {line.quantity} {line.unitLabel ?? 'unidad'} · {formatCurrency(line.unitPrice)}
                  </p>
                </div>
                <strong>{formatCurrency(line.lineTotalAmount)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p>Sin detalle de lineas registrado.</p>
        )}
      </section>

      <div className="print-hide">
        <DocumentAttachmentsPanel
          businessId={businessId}
          documentId={detail.document.id}
          attachments={detail.attachments}
          title="Adjuntos del documento"
          description="Consulta y sube respaldos seguros asociados al documento seleccionado."
          onAttachmentsChanged={onAttachmentsChanged}
        />
      </div>
    </div>
  )
}
