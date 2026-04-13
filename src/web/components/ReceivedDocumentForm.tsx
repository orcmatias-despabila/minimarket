import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SearchCombobox, type SearchComboboxOption } from '../../components/ui/SearchCombobox'
import { SelectField } from '../../components/ui/SelectField'
import { TextAreaField } from '../../components/ui/TextAreaField'
import { formatCurrency } from '../../lib/format'
import { AdminFormSection } from './AdminFormSection'
import type { AdminDocument } from '../types/adminDocument'
import type { AdminSupplier } from '../types/adminSupplier'
import {
  documentTypeOptions,
  formatLineTotal,
  parseAmount,
  statusOptions,
  type ReceivedDocumentFieldErrors,
  type ReceivedDocumentFormLine,
  type ReceivedDocumentFormValues,
} from '../lib/receivedDocuments'

interface ReceivedDocumentFormProps {
  mode: 'create' | 'edit'
  values: ReceivedDocumentFormValues
  errors: ReceivedDocumentFieldErrors
  isSubmitting: boolean
  hasSuppliersAvailable: boolean
  supplierSearchTerm: string
  supplierOptions: SearchComboboxOption[]
  isSearchingSuppliers: boolean
  referenceDocuments: AdminDocument[]
  selectedSupplier: AdminSupplier | null
  selectedReferenceDocument: AdminDocument | null
  pendingAttachmentName?: string | null
  onChange: <K extends keyof ReceivedDocumentFormValues>(
    field: K,
    value: ReceivedDocumentFormValues[K],
  ) => void
  onSupplierSearchTermChange: (value: string) => void
  onSupplierSelect: (option: SearchComboboxOption) => void
  onLineChange: (lineId: string, changes: Partial<ReceivedDocumentFormLine>) => void
  onAddLine: () => void
  onRemoveLine: (lineId: string) => void
  onAttachmentChange: (file: File | null) => void
  onSubmit: () => void
  onCancel?: () => void
}

export function ReceivedDocumentForm({
  mode,
  values,
  errors,
  isSubmitting,
  hasSuppliersAvailable,
  supplierSearchTerm,
  supplierOptions,
  isSearchingSuppliers,
  referenceDocuments,
  selectedSupplier,
  selectedReferenceDocument,
  pendingAttachmentName,
  onChange,
  onSupplierSearchTermChange,
  onSupplierSelect,
  onLineChange,
  onAddLine,
  onRemoveLine,
  onAttachmentChange,
  onSubmit,
  onCancel,
}: ReceivedDocumentFormProps) {
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
          <strong>{mode === 'edit' ? 'Edicion documental' : 'Registro documental'}</strong>
          <p>
            {mode === 'edit'
              ? 'Ajusta el documento recibido manteniendo su trazabilidad administrativa.'
              : 'Registra el respaldo recibido con proveedor, montos y referencia.'}
          </p>
        </div>
      </div>

      <AdminFormSection
        title="Identidad documental"
        description="Tipo, folio y fecha del respaldo administrativo recibido."
      >
        <div className="received-documents-web__form-grid">
          <SelectField
            label="Tipo"
            value={values.documentType}
            onChange={(event) =>
              onChange(
                'documentType',
                event.target.value as ReceivedDocumentFormValues['documentType'],
              )
            }
            options={documentTypeOptions}
          />
          <Field
            label="Folio"
            value={values.folio}
            onChange={(event) => onChange('folio', event.target.value)}
            placeholder="Ej: 20391"
            hint={errors.folio || 'Folio visible en la factura, boleta o nota.'}
          />
          <Field
            label="Fecha de emision"
            type="date"
            value={values.issueDate}
            onChange={(event) => onChange('issueDate', event.target.value)}
            hint={errors.issueDate || 'Fecha oficial del documento recibido.'}
          />
          <SelectField
            label="Estado"
            value={values.status}
            onChange={(event) =>
              onChange('status', event.target.value as ReceivedDocumentFormValues['status'])
            }
            options={statusOptions}
          />
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Proveedor y montos"
        description="Relaciona el respaldo con el proveedor correcto y registra sus montos base."
      >
        <div className="received-documents-web__form-grid received-documents-web__form-grid--amounts">
          <div className="received-documents-web__cell received-documents-web__cell--supplier">
            <SearchCombobox
              label="Proveedor"
              searchTerm={supplierSearchTerm}
              onSearchTermChange={onSupplierSearchTermChange}
              onSelect={onSupplierSelect}
              options={supplierOptions}
              loading={isSearchingSuppliers}
              disabled={!hasSuppliersAvailable}
              placeholder="Busca proveedor por nombre o RUT"
              promptMessage="Busca proveedor por nombre, razon social, RUT o correo."
              noResultsMessage="No se encontraron proveedores."
              emptyMessage="Escribe para buscar."
              aria-invalid={Boolean(errors.supplierId || errors.supplierTaxId)}
              hint={
                errors.supplierId ||
                errors.supplierTaxId ||
                (selectedSupplier
                  ? `RUT asociado: ${selectedSupplier.taxId}`
                  : 'Busca y selecciona un proveedor registrado.')
              }
            />
          </div>
          <div className="received-documents-web__cell received-documents-web__cell--amount">
            <Field
              label="Neto"
              value={values.netAmount}
              onChange={(event) => onChange('netAmount', event.target.value)}
              placeholder="0"
              hint={errors.netAmount || 'Monto neto sin IVA.'}
            />
          </div>
          <div className="received-documents-web__cell received-documents-web__cell--amount">
            <Field
              label="IVA"
              value={values.taxAmount}
              onChange={(event) => onChange('taxAmount', event.target.value)}
              placeholder="0"
              hint={errors.taxAmount || 'Monto de impuesto asociado.'}
            />
          </div>
          <div className="received-documents-web__cell received-documents-web__cell--amount">
            <Field
              label="Exento"
              value={values.exemptAmount}
              onChange={(event) => onChange('exemptAmount', event.target.value)}
              placeholder="0"
              hint={errors.exemptAmount || 'Monto exento si aplica.'}
            />
          </div>
          <div className="received-documents-web__cell received-documents-web__cell--total">
            <Field
              label="Total calculado"
              value={Number.isFinite(computedTotalAmount) ? formatCurrency(computedTotalAmount) : 'Sin calculo'}
              readOnly
              hint={errors.amounts || 'Se calcula automaticamente con neto, IVA y exento.'}
            />
          </div>
        </div>
      </AdminFormSection>

      {values.documentType === 'nota_credito' ? (
        <AdminFormSection
          title="Referencia documental"
          description="Relaciona la nota de credito con el documento recibido al que corrige."
        >
          <div className="received-documents-web__form-grid">
            <SelectField
              label="Documento referenciado"
              value={values.referenceDocumentId}
              onChange={(event) => onChange('referenceDocumentId', event.target.value)}
              options={[
                { label: 'Selecciona un documento', value: '' },
                ...referenceDocuments.map((document) => ({
                  label: `${document.folio ?? 'Sin folio'} · ${document.counterpartyName ?? 'Proveedor'}`,
                  value: document.id,
                })),
              ]}
              hint={
                errors.referenceDocumentId ||
                (selectedReferenceDocument
                  ? `Documento: ${selectedReferenceDocument.documentType} · ${selectedReferenceDocument.issueDate}`
                  : 'Selecciona el documento recibido de origen.')
              }
            />
            <TextAreaField
              label="Motivo de referencia"
              value={values.referenceReason}
              onChange={(event) => onChange('referenceReason', event.target.value)}
              placeholder="Ej: Devolucion de productos o ajuste comercial"
              hint={errors.referenceReason || 'Glosa administrativa para la referencia.'}
            />
          </div>
        </AdminFormSection>
      ) : null}

      <AdminFormSection
        title="Lineas del documento"
        description="Detalle administrativo opcional para trazabilidad y revisiones futuras."
      >
        <div className="received-documents-web__line-list">
          {values.lines.map((line) => (
            <div key={line.id} className="received-documents-web__line-row">
              <div className="received-documents-web__line-cell received-documents-web__line-cell--description">
                <Field
                  label="Descripcion"
                  value={line.description}
                  onChange={(event) => onLineChange(line.id, { description: event.target.value })}
                  placeholder="Ej: Reposicion de bebidas 1.5L"
                  hint={errors[`line-${line.id}`] || 'Describe el item o servicio incluido.'}
                />
              </div>
              <div className="received-documents-web__line-cell received-documents-web__line-cell--quantity">
                <Field
                  label="Cantidad"
                  value={line.quantity}
                  onChange={(event) => onLineChange(line.id, { quantity: event.target.value })}
                  placeholder="1"
                />
              </div>
              <div className="received-documents-web__line-cell received-documents-web__line-cell--price">
                <Field
                  label="Precio unitario"
                  value={line.unitPrice}
                  onChange={(event) => onLineChange(line.id, { unitPrice: event.target.value })}
                  placeholder="0"
                  hint={formatLineTotal(line, formatCurrency)}
                />
              </div>
              <div className="received-documents-web__line-cell received-documents-web__line-cell--unit">
                <Field
                  label="Unidad"
                  value={line.unitLabel}
                  onChange={(event) => onLineChange(line.id, { unitLabel: event.target.value })}
                  placeholder="unidad, caja, kg"
                />
              </div>
              <div className="received-documents-web__line-cell received-documents-web__line-cell--action">
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
        description="Puedes dejar un archivo respaldo y notas internas desde la misma pantalla."
      >
        <div className="received-documents-web__form-grid">
          <Field
            label="Adjunto inicial"
            type="file"
            onChange={(event) => onAttachmentChange(event.target.files?.[0] ?? null)}
            hint={
              errors.attachment ||
              (pendingAttachmentName
                ? `Archivo seleccionado: ${pendingAttachmentName}`
                : 'Opcional. Puedes subir PDF, imagen o respaldo digital.')
            }
          />
          <TextAreaField
            label="Observaciones"
            value={values.notes}
            onChange={(event) => onChange('notes', event.target.value)}
            placeholder="Contexto interno, conciliacion o seguimiento del documento."
          />
        </div>
      </AdminFormSection>

      <div className="received-documents-web__actions-bar admin-form-actions">
        <Button onClick={onSubmit} disabled={isSubmitting || !hasSuppliersAvailable}>
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
