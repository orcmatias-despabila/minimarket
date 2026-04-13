import { formatCurrency } from '../../lib/format'
import type {
  AdminDocumentAttachment,
  AdminDocumentDetail,
  AdminDocumentPaymentMethod,
  AdminDocumentStatus,
  AdminDocumentType,
} from '../types/adminDocument'

const documentTypeLabels: Record<AdminDocumentType, string> = {
  boleta: 'Boleta',
  factura: 'Factura',
  nota_credito: 'Nota de credito',
  boleta_compra: 'Boleta de compra',
  factura_compra: 'Factura de compra',
  other: 'Documento comercial',
}

const statusLabels: Record<AdminDocumentStatus, string> = {
  draft: 'Borrador',
  recorded: 'Registrado',
  partially_paid: 'Pago parcial',
  paid: 'Pagado',
  cancelled: 'Anulado',
  voided: 'Invalidado',
}

const paymentLabels: Record<AdminDocumentPaymentMethod, string> = {
  cash: 'Efectivo',
  debit: 'Debito',
  credit: 'Credito',
  transfer: 'Transferencia',
  other: 'Otro medio',
}

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(value))
    : 'Sin fecha'

const formatFileSize = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 'Tamano no disponible'
  }

  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

const getTypeAccentClass = (documentType: AdminDocumentType) => {
  if (documentType === 'factura' || documentType === 'factura_compra') {
    return 'dte-printable__accent dte-printable__accent--invoice'
  }

  if (documentType === 'nota_credito') {
    return 'dte-printable__accent dte-printable__accent--credit-note'
  }

  return 'dte-printable__accent dte-printable__accent--receipt'
}

const getStatusClass = (status: AdminDocumentStatus) => {
  if (status === 'paid') {
    return 'dte-printable__status dte-printable__status--success'
  }

  if (status === 'cancelled' || status === 'voided') {
    return 'dte-printable__status dte-printable__status--danger'
  }

  if (status === 'partially_paid') {
    return 'dte-printable__status dte-printable__status--warning'
  }

  return 'dte-printable__status'
}

function AttachmentList({ attachments }: { attachments: AdminDocumentAttachment[] }) {
  if (!attachments.length) {
    return (
      <div className="dte-printable__empty-block">
        <strong>Sin adjuntos cargados</strong>
        <p>No hay respaldos asociados a este documento.</p>
      </div>
    )
  }

  return (
    <div className="dte-printable__attachment-list">
      {attachments.map((attachment) => (
        <article key={attachment.id} className="dte-printable__attachment-item">
          <strong>{attachment.fileName}</strong>
          <p>{attachment.mimeType}</p>
          <span>
            {formatFileSize(attachment.fileSize)} · {formatDate(attachment.createdAt)}
          </span>
        </article>
      ))}
    </div>
  )
}

export function DtePrintableView({ detail }: { detail: AdminDocumentDetail }) {
  const { document, lines, references, attachments } = detail
  const counterpartyLabel = document.direction === 'emitted' ? 'Cliente' : 'Proveedor'
  const documentScopeLabel =
    document.direction === 'emitted' ? 'Documento emitido' : 'Documento recibido'

  return (
    <article className="dte-printable">
      <header className="dte-printable__header">
        <div className="dte-printable__identity">
          <span className={getTypeAccentClass(document.documentType)}>
            {documentTypeLabels[document.documentType]}
          </span>
          <div>
            <h2>{document.folio ? `${documentTypeLabels[document.documentType]} ${document.folio}` : documentTypeLabels[document.documentType]}</h2>
            <p>
              Representacion visual interna del documento. No reemplaza el XML DTE ni un formato
              oficial del SII.
            </p>
          </div>
        </div>

        <div className="dte-printable__header-side">
          <span className={getStatusClass(document.status)}>
            {statusLabels[document.status] ?? document.status}
          </span>
          <dl className="dte-printable__meta-list">
            <div>
              <dt>Fecha</dt>
              <dd>{formatDate(document.issueDate)}</dd>
            </div>
            <div>
              <dt>Folio</dt>
              <dd>{document.folio ?? 'Sin folio'}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{documentScopeLabel}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="dte-printable__band">
        <div>
          <span>{counterpartyLabel}</span>
          <strong>{document.counterpartyName ?? `${counterpartyLabel} no asociado`}</strong>
        </div>
        <div>
          <span>RUT</span>
          <strong>{document.counterpartyRut ?? 'Sin RUT'}</strong>
        </div>
        <div>
          <span>Moneda</span>
          <strong>{document.currencyCode}</strong>
        </div>
        <div>
          <span>Origen</span>
          <strong>{document.sourceOrigin}</strong>
        </div>
      </section>

      <section className="dte-printable__section">
        <div className="dte-printable__section-header">
          <span>Encabezado</span>
          <strong>Datos generales</strong>
        </div>
        <div className="dte-printable__grid">
          <div>
            <span>Tipo documental</span>
            <strong>{documentTypeLabels[document.documentType]}</strong>
          </div>
          <div>
            <span>Fecha de emision</span>
            <strong>{formatDate(document.issueDate)}</strong>
          </div>
          <div>
            <span>Fecha de vencimiento</span>
            <strong>{formatDate(document.dueDate)}</strong>
          </div>
          <div>
            <span>Medio de pago</span>
            <strong>
              {document.paymentMethod ? paymentLabels[document.paymentMethod] : 'No informado'}
            </strong>
          </div>
        </div>
      </section>

      <section className="dte-printable__section">
        <div className="dte-printable__section-header">
          <span>Totales</span>
          <strong>Resumen tributario</strong>
        </div>
        <div className="dte-printable__totals">
          <div>
            <span>Neto</span>
            <strong>{formatCurrency(document.netAmount)}</strong>
          </div>
          <div>
            <span>IVA</span>
            <strong>{formatCurrency(document.taxAmount)}</strong>
          </div>
          <div>
            <span>Exento</span>
            <strong>{formatCurrency(document.exemptAmount)}</strong>
          </div>
          <div className="dte-printable__total-card">
            <span>Total</span>
            <strong>{formatCurrency(document.totalAmount)}</strong>
          </div>
        </div>
      </section>

      <section className="dte-printable__section">
        <div className="dte-printable__section-header">
          <span>Detalle</span>
          <strong>{lines.length} lineas</strong>
        </div>
        {lines.length ? (
          <div className="dte-printable__table-wrap">
            <table className="dte-printable__table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Descripcion</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Total linea</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.lineNumber}</td>
                    <td>
                      <strong>{line.description}</strong>
                      <span>
                        {[line.sku, line.barcode, line.unitLabel].filter(Boolean).join(' · ') || 'Sin detalle adicional'}
                      </span>
                    </td>
                    <td>{line.quantity}</td>
                    <td>{formatCurrency(line.unitPrice)}</td>
                    <td>{formatCurrency(line.lineTotalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dte-printable__empty-block">
            <strong>Sin lineas registradas</strong>
            <p>Este documento no tiene lineas de detalle asociadas.</p>
          </div>
        )}
      </section>

      <section className="dte-printable__section">
        <div className="dte-printable__section-header">
          <span>Referencias</span>
          <strong>{references.length ? 'Trazabilidad documental' : 'Sin referencias'}</strong>
        </div>
        {references.length ? (
          <div className="dte-printable__reference-list">
            {references.map((reference, index) => (
              <article key={reference.id} className="dte-printable__reference-item">
                <span>Referencia {index + 1}</span>
                <strong>{documentTypeLabels[reference.referencedDocumentType]}</strong>
                <p>
                  Folio {reference.referencedFolio} · {formatDate(reference.referencedIssueDate)}
                </p>
                <small>{reference.referenceReason}</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="dte-printable__empty-block">
            <strong>Sin documentos relacionados</strong>
            <p>No se registraron referencias documentales para esta ficha.</p>
          </div>
        )}
      </section>

      <section className="dte-printable__section">
        <div className="dte-printable__section-header">
          <span>Adjuntos</span>
          <strong>{attachments.length} respaldo(s)</strong>
        </div>
        <AttachmentList attachments={attachments} />
      </section>

      <section className="dte-printable__section">
        <div className="dte-printable__section-header">
          <span>Observaciones</span>
          <strong>Contexto administrativo</strong>
        </div>
        <div className="dte-printable__notes">
          <p>{document.notes?.trim() || 'Sin observaciones registradas.'}</p>
        </div>
      </section>
    </article>
  )
}
