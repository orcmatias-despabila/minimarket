import type {
  AdminDocumentDirection,
  AdminDocumentWriteInput,
} from '../types/adminDocument'
import type { AdminCustomerWriteInput } from '../types/adminCustomer'
import type { AdminSupplierWriteInput } from '../types/adminSupplier'
import { getRutValidationMessage, normalizeRut } from '../../lib/rut'

export const normalizeText = (value?: string | null) => value?.trim() || undefined

export const normalizeRequiredText = (value: string, label: string) => {
  const normalized = value.trim()
  if (!normalized) {
    throw new Error(`${label} es obligatorio.`)
  }

  return normalized
}

export const normalizeTaxId = (value: string, label: string) => {
  const requiredValue = normalizeRequiredText(value, label)
  const normalized = normalizeRut(requiredValue)

  if (!normalized) {
    throw new Error(getRutValidationMessage(requiredValue, label) ?? `${label} no es valido.`)
  }

  return normalized
}

export const normalizeOptionalRut = (value: string | undefined, label: string) => {
  const normalizedValue = normalizeText(value)
  if (!normalizedValue) {
    return undefined
  }

  const normalizedRut = normalizeRut(normalizedValue)
  if (!normalizedRut) {
    throw new Error(getRutValidationMessage(normalizedValue, label) ?? `${label} no es valido.`)
  }

  return normalizedRut
}

export const normalizeOptionalEmail = (value?: string) => {
  const normalized = normalizeText(value)?.toLowerCase()
  if (!normalized) return undefined

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  if (!isValid) {
    throw new Error('Ingresa un correo valido.')
  }

  return normalized
}

export const validateCustomerPayload = (input: AdminCustomerWriteInput) => ({
  businessId: normalizeRequiredText(input.businessId, 'El negocio'),
  taxId: normalizeTaxId(input.taxId, 'El RUT del cliente'),
  legalName: normalizeRequiredText(input.legalName, 'La razon social del cliente'),
  businessLine: normalizeText(input.businessLine),
  addressLine1: normalizeText(input.addressLine1),
  district: normalizeText(input.district),
  city: normalizeText(input.city),
  phone: normalizeText(input.phone),
  email: normalizeOptionalEmail(input.email),
  notes: normalizeText(input.notes),
  status: input.status,
})

export const validateSupplierPayload = (input: AdminSupplierWriteInput) => ({
  businessId: normalizeRequiredText(input.businessId, 'El negocio'),
  taxId: normalizeTaxId(input.taxId, 'El RUT del proveedor'),
  legalName: normalizeRequiredText(input.legalName, 'La razon social del proveedor'),
  businessLine: normalizeText(input.businessLine),
  addressLine1: normalizeText(input.addressLine1),
  district: normalizeText(input.district),
  city: normalizeText(input.city),
  phone: normalizeText(input.phone),
  email: normalizeOptionalEmail(input.email),
  contactName: normalizeText(input.contactName),
  notes: normalizeText(input.notes),
  status: input.status,
})

const validateCounterpartyForDirection = (
  direction: AdminDocumentDirection,
  customerId?: string,
  supplierId?: string,
) => {
  if (direction === 'emitted' && supplierId) {
    throw new Error('Un documento emitido no puede incluir supplierId.')
  }

  if (direction === 'received' && customerId) {
    throw new Error('Un documento recibido no puede incluir customerId.')
  }
}

export const validateDocumentPayload = (input: AdminDocumentWriteInput) => {
  const businessId = normalizeRequiredText(input.businessId, 'El negocio')
  const issueDate = normalizeRequiredText(input.issueDate, 'La fecha del documento')
  const currencyCode = input.currencyCode?.trim().toUpperCase() || 'CLP'

  validateCounterpartyForDirection(input.direction, input.customerId, input.supplierId)

  if (input.netAmount < 0 || input.taxAmount < 0 || (input.exemptAmount ?? 0) < 0 || input.totalAmount < 0) {
    throw new Error('Los montos del documento no pueden ser negativos.')
  }

  if (input.dueDate && input.dueDate < issueDate) {
    throw new Error('La fecha de vencimiento no puede ser anterior a la fecha de emision.')
  }

  const lines = (input.lines ?? []).map((line, index) => {
    if (line.lineNumber <= 0) {
      throw new Error(`La linea ${index + 1} debe tener un numero valido.`)
    }

    if (!line.description.trim()) {
      throw new Error(`La linea ${index + 1} debe incluir una descripcion.`)
    }

    if (line.quantity <= 0) {
      throw new Error(`La linea ${index + 1} debe tener una cantidad mayor que cero.`)
    }

    if (
      line.unitPrice < 0 ||
      (line.discountAmount ?? 0) < 0 ||
      line.lineNetAmount < 0 ||
      line.lineTaxAmount < 0 ||
      line.lineTotalAmount < 0
    ) {
      throw new Error(`La linea ${index + 1} contiene montos invalidos.`)
    }

    return {
      ...line,
      description: line.description.trim(),
      sku: normalizeText(line.sku),
      barcode: normalizeText(line.barcode),
      unitLabel: normalizeText(line.unitLabel),
      discountAmount: line.discountAmount ?? 0,
    }
  })

  const references = (input.references ?? []).map((reference, index) => {
    const referencedFolio = normalizeRequiredText(
      reference.referencedFolio,
      `El folio de referencia ${index + 1}`,
    )

    const referenceReason = normalizeRequiredText(
      reference.referenceReason,
      `La glosa de referencia ${index + 1}`,
    )

    return {
      ...reference,
      referencedDocumentId: normalizeText(reference.referencedDocumentId),
      referencedFolio,
      referencedIssueDate: normalizeText(reference.referencedIssueDate),
      referenceReason,
      referenceCode: normalizeText(reference.referenceCode),
    }
  })

  return {
    businessId,
    direction: input.direction,
    documentType: input.documentType,
    siiDteCode: input.siiDteCode,
    folio: normalizeText(input.folio),
    issueDate,
    dueDate: normalizeText(input.dueDate),
    customerId: normalizeText(input.customerId),
    supplierId: normalizeText(input.supplierId),
    counterpartyRut: normalizeOptionalRut(input.counterpartyRut, 'El RUT de la contraparte'),
    counterpartyName: normalizeText(input.counterpartyName),
    currencyCode,
    netAmount: input.netAmount,
    taxAmount: input.taxAmount,
    exemptAmount: input.exemptAmount ?? 0,
    totalAmount: input.totalAmount,
    paymentMethod: input.paymentMethod,
    status: input.status,
    notes: normalizeText(input.notes),
    sourceOrigin: input.sourceOrigin,
    lines,
    references,
  }
}
