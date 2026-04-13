import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { formatCurrency } from '../../lib/format'
import { SearchCombobox, type SearchComboboxOption } from '../../components/ui/SearchCombobox'
import { SelectField } from '../../components/ui/SelectField'
import { TextAreaField } from '../../components/ui/TextAreaField'
import { AdminFormSection } from './AdminFormSection'
import { DocumentAttachmentsPanel } from './DocumentAttachmentsPanel'
import type { AdminCustomer } from '../types/adminCustomer'
import type { AdminDocument, AdminDocumentAttachment } from '../types/adminDocument'
import type { AdminSupplier } from '../types/adminSupplier'
import {
  parseAmount,
  paymentOptions,
  statusOptions,
  typeLabelMap,
  type CreditNoteFieldErrors,
  type CreditNoteFormValues,
} from '../lib/creditNotes'

interface CreditNoteFormProps {
  businessId?: string
  mode: 'create' | 'edit'
  values: CreditNoteFormValues
  errors: CreditNoteFieldErrors
  isSubmitting: boolean
  hasCustomersAvailable: boolean
  hasSuppliersAvailable: boolean
  customerSearchTerm: string
  customerOptions: SearchComboboxOption[]
  isSearchingCustomers: boolean
  supplierSearchTerm: string
  supplierOptions: SearchComboboxOption[]
  isSearchingSuppliers: boolean
  availableReferences: AdminDocument[]
  selectedCustomer: AdminCustomer | null
  selectedSupplier: AdminSupplier | null
  selectedReference: AdminDocument | null
  existingDocumentId?: string
  existingAttachments?: AdminDocumentAttachment[]
  pendingAttachment?: File | null
  onChange: <K extends keyof CreditNoteFormValues>(
    field: K,
    value: CreditNoteFormValues[K],
  ) => void
  onCustomerSearchTermChange: (value: string) => void
  onCustomerSelect: (option: SearchComboboxOption) => void
  onSupplierSearchTermChange: (value: string) => void
  onSupplierSelect: (option: SearchComboboxOption) => void
  onAttachmentChange: (file: File | null) => void
  onAttachmentsChanged?: (attachments: AdminDocumentAttachment[]) => void
  onSubmit: () => void
  onCancel?: () => void
}

export function CreditNoteForm({
  businessId,
  mode,
  values,
  errors,
  isSubmitting,
  hasCustomersAvailable,
  hasSuppliersAvailable,
  customerSearchTerm,
  customerOptions,
  isSearchingCustomers,
  supplierSearchTerm,
  supplierOptions,
  isSearchingSuppliers,
  availableReferences,
  selectedCustomer,
  selectedSupplier,
  selectedReference,
  existingDocumentId,
  existingAttachments = [],
  pendingAttachment,
  onChange,
  onCustomerSearchTermChange,
  onCustomerSelect,
  onSupplierSearchTermChange,
  onSupplierSelect,
  onAttachmentChange,
  onAttachmentsChanged,
  onSubmit,
  onCancel,
}: CreditNoteFormProps) {
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
          <strong>{mode === 'edit' ? 'Edicion de nota' : 'Registro de nota'}</strong>
          <p>
            {mode === 'edit'
              ? 'Ajusta la nota de credito manteniendo clara la relacion con su documento origen.'
              : 'Registra una nota emitida o recibida con trazabilidad completa desde una pantalla dedicada.'}
          </p>
        </div>
      </div>

      <AdminFormSection
        title="Origen e identificacion"
        description="Define el sentido de la nota, folio, fecha y estado."
      >
        <div className="credit-notes-web__scope-toggle">
          <Button
            variant={values.scope === 'emitted' ? 'primary' : 'secondary'}
            onClick={() => {
              onChange('scope', 'emitted')
              onChange('supplierId', '')
              onChange('referenceDocumentId', '')
            }}
          >
            Emitida
          </Button>
          <Button
            variant={values.scope === 'received' ? 'primary' : 'secondary'}
            onClick={() => {
              onChange('scope', 'received')
              onChange('customerId', '')
              onChange('referenceDocumentId', '')
              onChange('paymentMethod', '')
            }}
          >
            Recibida
          </Button>
        </div>
        <div className="credit-notes-web__form-grid">
          <Field
            label="Folio"
            value={values.folio}
            onChange={(event) => onChange('folio', event.target.value)}
            placeholder="Ej: NC-001"
            hint={errors.folio || 'Identificador principal de la nota.'}
          />
          <Field
            label="Fecha de emision"
            type="date"
            value={values.issueDate}
            onChange={(event) => onChange('issueDate', event.target.value)}
            hint={errors.issueDate || 'Fecha visible en la nota de credito.'}
          />
          <SelectField
            label="Estado"
            value={values.status}
            onChange={(event) =>
              onChange('status', event.target.value as CreditNoteFormValues['status'])
            }
            options={statusOptions}
          />
          {values.scope === 'emitted' ? (
            <SelectField
              label="Medio de pago"
              value={values.paymentMethod}
              onChange={(event) =>
                onChange(
                  'paymentMethod',
                  event.target.value as CreditNoteFormValues['paymentMethod'],
                )
              }
              options={paymentOptions}
            />
          ) : null}
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Contraparte y montos"
        description="Asocia cliente o proveedor y deja montos listos para control interno."
      >
        <div className="credit-notes-web__form-grid credit-notes-web__form-grid--amounts">
          {values.scope === 'emitted' ? (
            <>
              <div className="credit-notes-web__cell credit-notes-web__cell--counterparty">
                <SearchCombobox
                  label="Cliente asociado"
                  searchTerm={customerSearchTerm}
                  onSearchTermChange={(value) => {
                    onCustomerSearchTermChange(value)
                    onChange('referenceDocumentId', '')
                  }}
                  onSelect={(option) => {
                    onCustomerSelect(option)
                    onChange('referenceDocumentId', '')
                  }}
                  options={customerOptions}
                  loading={isSearchingCustomers}
                  disabled={!hasCustomersAvailable}
                  placeholder="Busca cliente por nombre o RUT"
                  promptMessage="Busca cliente por nombre, razon social, RUT o correo."
                  noResultsMessage="No se encontraron clientes."
                  emptyMessage="Escribe para buscar."
                  aria-invalid={Boolean(errors.counterparty)}
                  hint={
                    errors.counterparty ||
                    (selectedCustomer
                      ? `RUT asociado: ${selectedCustomer.taxId}`
                      : 'Selecciona el cliente asociado a la nota emitida.')
                  }
                />
              </div>
            </>
          ) : (
            <>
              <div className="credit-notes-web__cell credit-notes-web__cell--counterparty">
                <SearchCombobox
                  label="Proveedor asociado"
                  searchTerm={supplierSearchTerm}
                  onSearchTermChange={(value) => {
                    onSupplierSearchTermChange(value)
                    onChange('referenceDocumentId', '')
                  }}
                  onSelect={(option) => {
                    onSupplierSelect(option)
                    onChange('referenceDocumentId', '')
                  }}
                  options={supplierOptions}
                  loading={isSearchingSuppliers}
                  disabled={!hasSuppliersAvailable}
                  placeholder="Busca proveedor por nombre o RUT"
                  promptMessage="Busca proveedor por nombre, razon social, RUT o correo."
                  noResultsMessage="No se encontraron proveedores."
                  emptyMessage="Escribe para buscar."
                  aria-invalid={Boolean(errors.counterparty)}
                  hint={
                    errors.counterparty ||
                    (selectedSupplier
                      ? `RUT asociado: ${selectedSupplier.taxId}`
                      : 'Selecciona el proveedor asociado a la nota recibida.')
                  }
                />
              </div>
            </>
          )}
          <div className="credit-notes-web__cell credit-notes-web__cell--amount">
            <Field
              label="Neto"
              type="number"
              value={values.netAmount}
              onChange={(event) => onChange('netAmount', event.target.value)}
              placeholder="0"
              hint={errors.netAmount || 'Monto base sin IVA.'}
            />
          </div>
          <div className="credit-notes-web__cell credit-notes-web__cell--amount">
            <Field
              label="IVA"
              type="number"
              value={values.taxAmount}
              onChange={(event) => onChange('taxAmount', event.target.value)}
              placeholder="0"
              hint={errors.taxAmount || 'Impuesto asociado a la nota.'}
            />
          </div>
          <div className="credit-notes-web__cell credit-notes-web__cell--amount">
            <Field
              label="Exento"
              type="number"
              value={values.exemptAmount}
              onChange={(event) => onChange('exemptAmount', event.target.value)}
              placeholder="0"
              hint={errors.exemptAmount || 'Monto exento si corresponde.'}
            />
          </div>
          <div className="credit-notes-web__cell credit-notes-web__cell--total">
            <Field
              label="Total calculado"
              value={Number.isFinite(computedTotalAmount) ? formatCurrency(computedTotalAmount) : 'Sin calculo'}
              readOnly
              placeholder="0"
              hint={errors.amounts || 'Se calcula automaticamente con los montos ingresados.'}
            />
          </div>
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Referencia documental"
        description="Vincula el documento origen y deja la glosa administrativa."
        className="credit-notes-web__reference-block"
      >
        <SelectField
          label="Documento de referencia"
          value={values.referenceDocumentId}
          onChange={(event) => onChange('referenceDocumentId', event.target.value)}
          options={[
            { label: 'Selecciona un documento', value: '' },
            ...availableReferences.map((item) => ({
              label: `${typeLabelMap[item.documentType]} ${item.folio ?? 'Sin folio'} - ${item.counterpartyName ?? 'Sin contraparte'}`,
              value: item.id,
            })),
          ]}
        />
        {errors.referenceDocumentId ? <p className="form-error">{errors.referenceDocumentId}</p> : null}
        <div className="credit-notes-web__reference-summary">
          <div>
            <span>Tipo referencia</span>
            <strong>{selectedReference ? typeLabelMap[selectedReference.documentType] : 'Sin referencia'}</strong>
          </div>
          <div>
            <span>Folio referencia</span>
            <strong>{selectedReference?.folio ?? 'Sin referencia'}</strong>
          </div>
          <div>
            <span>Fecha referencia</span>
            <strong>
              {selectedReference?.issueDate
                ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(
                    new Date(selectedReference.issueDate),
                  )
                : 'Sin referencia'}
            </strong>
          </div>
          <div>
            <span>Contraparte</span>
            <strong>{selectedReference?.counterpartyName ?? 'Sin referencia'}</strong>
          </div>
        </div>
        <TextAreaField
          label="Motivo o glosa de referencia"
          value={values.referenceReason}
          onChange={(event) => onChange('referenceReason', event.target.value)}
          placeholder="Describe el motivo administrativo de la nota de credito"
          hint={errors.referenceReason}
        />
      </AdminFormSection>

      <AdminFormSection
        title="Adjuntos y observaciones"
        description="Completa el contexto interno y adjunta respaldos si corresponde."
      >
        <TextAreaField
          label="Observaciones"
          value={values.notes}
          onChange={(event) => onChange('notes', event.target.value)}
          placeholder="Comentarios complementarios para control interno"
        />
        <DocumentAttachmentsPanel
          businessId={businessId}
          documentId={existingDocumentId}
          attachments={existingAttachments}
          pendingFile={pendingAttachment ?? null}
          onPendingFileChange={onAttachmentChange}
          onAttachmentsChanged={onAttachmentsChanged}
          title="Adjuntos de la nota"
          description="Sube respaldos PDF, imagen o archivos documentales compatibles."
        />
      </AdminFormSection>

      <div className="credit-notes-web__actions-bar admin-form-actions">
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? 'Guardando nota...'
            : mode === 'edit'
              ? 'Guardar cambios'
              : 'Registrar nota de credito'}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            {mode === 'edit' ? 'Cancelar edicion' : 'Volver al listado'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
