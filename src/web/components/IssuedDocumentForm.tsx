import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SearchCombobox, type SearchComboboxOption } from '../../components/ui/SearchCombobox'
import { SelectField } from '../../components/ui/SelectField'
import { TextAreaField } from '../../components/ui/TextAreaField'
import { formatCurrency } from '../../lib/format'
import { AdminFormSection } from './AdminFormSection'
import type { AdminDocument, AdminDocumentPaymentMethod } from '../types/adminDocument'
import type { AdminCustomer } from '../types/adminCustomer'
import {
  documentTypeOptions,
  formatLineTotal,
  parseAmount,
  paymentLabelMap,
  paymentOptions,
  statusOptions,
  type IssuedDocumentFieldErrors,
  type IssuedDocumentFormLine,
  type IssuedDocumentFormValues,
} from '../lib/issuedDocuments'

interface IssuedDocumentFormProps {
  mode: 'create' | 'edit'
  values: IssuedDocumentFormValues
  errors: IssuedDocumentFieldErrors
  isSubmitting: boolean
  hasCustomersAvailable: boolean
  customerSearchTerm: string
  customerOptions: SearchComboboxOption[]
  isSearchingCustomers: boolean
  referenceDocuments: AdminDocument[]
  selectedCustomer: AdminCustomer | null
  selectedReferenceDocument: AdminDocument | null
  pendingAttachmentName?: string | null
  onChange: <K extends keyof IssuedDocumentFormValues>(
    field: K,
    value: IssuedDocumentFormValues[K],
  ) => void
  onCustomerSearchTermChange: (value: string) => void
  onCustomerSelect: (option: SearchComboboxOption) => void
  onLineChange: (lineId: string, changes: Partial<IssuedDocumentFormLine>) => void
  onAddLine: () => void
  onRemoveLine: (lineId: string) => void
  onAttachmentChange: (file: File | null) => void
  onSubmit: () => void
  onCancel?: () => void
}

export function IssuedDocumentForm({
  mode,
  values,
  errors,
  isSubmitting,
  hasCustomersAvailable,
  customerSearchTerm,
  customerOptions,
  isSearchingCustomers,
  referenceDocuments,
  selectedCustomer,
  selectedReferenceDocument,
  pendingAttachmentName,
  onChange,
  onCustomerSearchTermChange,
  onCustomerSelect,
  onLineChange,
  onAddLine,
  onRemoveLine,
  onAttachmentChange,
  onSubmit,
  onCancel,
}: IssuedDocumentFormProps) {
  const computedTotalAmount = (() => {
    const net = parseAmount(values.netAmount)
    const tax = parseAmount(values.taxAmount)
    const exempt = parseAmount(values.exemptAmount)
    if (!Number.isFinite(net) || !Number.isFinite(tax) || !Number.isFinite(exempt)) {
      return Number.NaN
    }

    return net + tax + exempt
  })()

  return (
    <div className="admin-form-stack">
      <div className="admin-form-banner">
        <div>
          <strong>{mode === 'edit' ? 'Edicion documental' : 'Emision administrativa'}</strong>
          <p>
            {mode === 'edit'
              ? 'Ajusta el documento emitido manteniendo su trazabilidad comercial.'
              : 'Registra una boleta, factura o nota de credito desde una pantalla dedicada.'}
          </p>
        </div>
      </div>

      <AdminFormSection
        title="Identidad documental"
        description="Tipo, folio, fecha y estado comercial del documento emitido."
      >
        <div className="issued-documents-web__form-grid">
          <SelectField
            label="Tipo"
            value={values.documentType}
            onChange={(event) =>
              onChange('documentType', event.target.value as IssuedDocumentFormValues['documentType'])
            }
            options={documentTypeOptions}
          />
          <Field
            label="Folio"
            value={values.folio}
            onChange={(event) => onChange('folio', event.target.value)}
            placeholder="Ej: 4521"
            hint={errors.folio || 'Folio interno o administrativo del documento.'}
          />
          <Field
            label="Fecha de emision"
            type="date"
            value={values.issueDate}
            onChange={(event) => onChange('issueDate', event.target.value)}
            hint={errors.issueDate || 'Fecha comercial del emitido.'}
          />
          <SelectField
            label="Estado"
            value={values.status}
            onChange={(event) =>
              onChange('status', event.target.value as IssuedDocumentFormValues['status'])
            }
            options={statusOptions}
          />
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Cliente, pago y montos"
        description="Relaciona el documento con un cliente y registra sus montos base."
      >
        <div className="issued-documents-web__form-grid issued-documents-web__form-grid--amounts">
          <div className="issued-documents-web__cell issued-documents-web__cell--customer">
            <SearchCombobox
              label="Cliente"
              searchTerm={customerSearchTerm}
              onSearchTermChange={onCustomerSearchTermChange}
              onSelect={onCustomerSelect}
              options={customerOptions}
              loading={isSearchingCustomers}
              disabled={!hasCustomersAvailable}
              placeholder="Busca cliente por nombre o RUT"
              promptMessage="Busca cliente por nombre, razon social, RUT o correo."
              noResultsMessage="No se encontraron clientes."
              emptyMessage="Escribe para buscar."
              aria-invalid={Boolean(errors.customerId || errors.customerTaxId)}
              hint={
                errors.customerId ||
                errors.customerTaxId ||
                (selectedCustomer
                  ? `RUT asociado: ${selectedCustomer.taxId}`
                  : values.documentType === 'boleta'
                    ? 'Puedes dejarlo vacio para consumidor final.'
                    : 'Busca y selecciona un cliente activo.')
              }
            />
          </div>
          <SelectField
            label="Medio de pago"
            value={values.paymentMethod}
            onChange={(event) =>
              onChange(
                'paymentMethod',
                event.target.value as '' | AdminDocumentPaymentMethod,
              )
            }
            options={paymentOptions.filter((option) => option.value !== 'all')}
            hint={
              values.paymentMethod
                ? `Registrado como ${paymentLabelMap[values.paymentMethod]}`
                : 'Opcional. Puedes dejarlo sin medio de pago.'
            }
          />
          <div className="issued-documents-web__cell issued-documents-web__cell--amount">
            <Field
              label="Neto"
              value={values.netAmount}
              onChange={(event) => onChange('netAmount', event.target.value)}
              placeholder="0"
              hint={errors.netAmount || 'Monto neto antes de impuestos.'}
            />
          </div>
          <div className="issued-documents-web__cell issued-documents-web__cell--amount">
            <Field
              label="IVA"
              value={values.taxAmount}
              onChange={(event) => onChange('taxAmount', event.target.value)}
              placeholder="0"
              hint={errors.taxAmount || 'Impuesto asociado al documento.'}
            />
          </div>
          <div className="issued-documents-web__cell issued-documents-web__cell--amount">
            <Field
              label="Exento"
              value={values.exemptAmount}
              onChange={(event) => onChange('exemptAmount', event.target.value)}
              placeholder="0"
              hint={errors.exemptAmount || 'Monto exento si corresponde.'}
            />
          </div>
          <div className="issued-documents-web__cell issued-documents-web__cell--total">
            <Field
              label="Total calculado"
              value={
                Number.isFinite(computedTotalAmount)
                  ? formatCurrency(computedTotalAmount)
                  : 'Sin calculo'
              }
              readOnly
              hint={errors.amounts || 'Se calcula automaticamente con neto, IVA y exento.'}
            />
          </div>
        </div>
      </AdminFormSection>

      {values.documentType === 'nota_credito' ? (
        <AdminFormSection
          title="Referencia documental"
          description="Relaciona la nota de credito con el documento emitido que corrige."
        >
          <div className="issued-documents-web__form-grid">
            <SelectField
              label="Documento referenciado"
              value={values.referenceDocumentId}
              onChange={(event) => onChange('referenceDocumentId', event.target.value)}
              options={[
                { label: 'Selecciona un documento', value: '' },
                ...referenceDocuments.map((document) => ({
                  label: `${document.folio ?? 'Sin folio'} · ${document.counterpartyName ?? 'Cliente'}`,
                  value: document.id,
                })),
              ]}
              hint={
                errors.referenceDocumentId ||
                (selectedReferenceDocument
                  ? `Documento: ${selectedReferenceDocument.documentType} · ${selectedReferenceDocument.issueDate}`
                  : 'Selecciona el emitido de origen.')
              }
            />
            <TextAreaField
              label="Motivo de referencia"
              value={values.referenceReason}
              onChange={(event) => onChange('referenceReason', event.target.value)}
              placeholder="Ej: Devolucion, anulacion parcial o ajuste comercial"
              hint={errors.referenceReason || 'Glosa administrativa para la referencia.'}
            />
          </div>
        </AdminFormSection>
      ) : null}

      <AdminFormSection
        title="Lineas del documento"
        description="Detalle administrativo opcional de los productos o conceptos emitidos."
      >
        <div className="issued-documents-web__line-list">
          {values.lines.map((line) => (
            <div key={line.id} className="issued-documents-web__line-row">
              <div className="issued-documents-web__line-cell issued-documents-web__line-cell--description">
                <Field
                  label="Descripcion"
                  value={line.description}
                  onChange={(event) => onLineChange(line.id, { description: event.target.value })}
                  placeholder="Ej: Venta de abarrotes o servicio"
                  hint={errors[`line-${line.id}`] || 'Describe el item emitido.'}
                />
              </div>
              <div className="issued-documents-web__line-cell issued-documents-web__line-cell--quantity">
                <Field
                  label="Cantidad"
                  value={line.quantity}
                  onChange={(event) => onLineChange(line.id, { quantity: event.target.value })}
                  placeholder="1"
                />
              </div>
              <div className="issued-documents-web__line-cell issued-documents-web__line-cell--price">
                <Field
                  label="Precio unitario"
                  value={line.unitPrice}
                  onChange={(event) => onLineChange(line.id, { unitPrice: event.target.value })}
                  placeholder="0"
                  hint={formatLineTotal(line, formatCurrency)}
                />
              </div>
              <div className="issued-documents-web__line-cell issued-documents-web__line-cell--unit">
                <Field
                  label="Unidad"
                  value={line.unitLabel}
                  onChange={(event) => onLineChange(line.id, { unitLabel: event.target.value })}
                  placeholder="unidad, caja, kg"
                />
              </div>
              <div className="issued-documents-web__line-cell issued-documents-web__line-cell--action">
                <Button variant="secondary" onClick={() => onRemoveLine(line.id)}>
                  Quitar
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="secondary" onClick={onAddLine}>
          Agregar linea
        </Button>
      </AdminFormSection>

      <AdminFormSection
        title="Adjunto inicial y observaciones"
        description="Puedes dejar un respaldo y notas internas desde la misma pantalla."
      >
        <div className="issued-documents-web__form-grid">
          <Field
            label="Adjunto inicial"
            type="file"
            onChange={(event) => onAttachmentChange(event.target.files?.[0] ?? null)}
            hint={
              pendingAttachmentName
                ? `Archivo seleccionado: ${pendingAttachmentName}`
                : 'Opcional. Puedes adjuntar PDF, imagen o respaldo digital.'
            }
          />
          <TextAreaField
            label="Observaciones"
            value={values.notes}
            onChange={(event) => onChange('notes', event.target.value)}
            placeholder="Contexto interno, seguimiento de cobro o informacion complementaria."
          />
        </div>
      </AdminFormSection>

      <div className="issued-documents-web__actions-bar admin-form-actions">
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? 'Guardando documento...'
            : mode === 'edit'
              ? 'Guardar cambios'
              : 'Registrar documento'}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  )
}
