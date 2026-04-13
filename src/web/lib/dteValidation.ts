import type { DteXmlGeneratorInput } from '../types/dteXml'
import type { DteValidationIssue, DteValidationResult } from '../types/dteValidation'
import { getRutValidationMessage, normalizeRut, validateRut } from '../../lib/rut'

const taxableDocumentTypes = new Set(['factura', 'factura_compra', 'nota_credito', 'boleta'])

const addIssue = (
  issues: DteValidationIssue[],
  code: string,
  field: string,
  message: string,
) => {
  issues.push({ code, field, message })
}

export const isValidChileanRut = (value: string) => {
  return validateRut(value).isValid
}

const isNumericFolio = (value: string) => /^[1-9][0-9]*$/.test(value.trim())

const roundPeso = (value: number) => Math.round(value)

export const validateDtePayload = (input: DteXmlGeneratorInput): DteValidationResult => {
  const issues: DteValidationIssue[] = []
  const { document, emitter, receiver, lines, references = [] } = input

  if (!document.folio?.trim()) {
    addIssue(issues, 'required_folio', 'document.folio', 'El folio es obligatorio.')
  } else if (!isNumericFolio(document.folio)) {
    addIssue(
      issues,
      'invalid_folio',
      'document.folio',
      'El folio debe ser numerico y mayor que cero.',
    )
  }

  if (!document.issueDate?.trim()) {
    addIssue(
      issues,
      'required_issue_date',
      'document.issueDate',
      'La fecha de emision es obligatoria.',
    )
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(document.issueDate.trim())) {
    addIssue(
      issues,
      'invalid_issue_date',
      'document.issueDate',
      'La fecha de emision debe venir en formato YYYY-MM-DD.',
    )
  }

  if (document.dueDate?.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(document.dueDate.trim())) {
    addIssue(
      issues,
      'invalid_due_date',
      'document.dueDate',
      'La fecha de vencimiento debe venir en formato YYYY-MM-DD.',
    )
  }

  if (!emitter.taxId?.trim()) {
    addIssue(issues, 'required_emitter_rut', 'emitter.taxId', 'El RUT del emisor es obligatorio.')
  } else if (!isValidChileanRut(emitter.taxId)) {
    addIssue(
      issues,
      'invalid_emitter_rut',
      'emitter.taxId',
      getRutValidationMessage(emitter.taxId, 'El RUT del emisor') ?? 'El RUT del emisor no es valido.',
    )
  }

  if (!receiver.taxId?.trim()) {
    addIssue(
      issues,
      'required_receiver_rut',
      'receiver.taxId',
      'El RUT del receptor es obligatorio.',
    )
  } else if (!isValidChileanRut(receiver.taxId)) {
    addIssue(
      issues,
      'invalid_receiver_rut',
      'receiver.taxId',
      getRutValidationMessage(receiver.taxId, 'El RUT del receptor') ??
        'El RUT del receptor no es valido.',
    )
  }

  ;[
    ['emitter.legalName', emitter.legalName, 'La razon social del emisor es obligatoria.'],
    ['emitter.businessLine', emitter.businessLine, 'El giro del emisor es obligatorio.'],
    ['emitter.addressLine1', emitter.addressLine1, 'La direccion del emisor es obligatoria.'],
    ['emitter.district', emitter.district, 'La comuna del emisor es obligatoria.'],
    ['emitter.city', emitter.city, 'La ciudad del emisor es obligatoria.'],
    ['receiver.legalName', receiver.legalName, 'La razon social del receptor es obligatoria.'],
    ['receiver.businessLine', receiver.businessLine, 'El giro del receptor es obligatorio.'],
    ['receiver.addressLine1', receiver.addressLine1, 'La direccion del receptor es obligatoria.'],
    ['receiver.district', receiver.district, 'La comuna del receptor es obligatoria.'],
    ['receiver.city', receiver.city, 'La ciudad del receptor es obligatoria.'],
  ].forEach(([field, value, message]) => {
    if (!String(value ?? '').trim()) {
      addIssue(issues, 'required_field', field, message)
    }
  })

  if (!lines.length) {
    addIssue(
      issues,
      'required_lines',
      'lines',
      'El DTE debe incluir al menos una linea de detalle.',
    )
  }

  let lineTotalSum = 0
  lines.forEach((line, index) => {
    const label = `Linea ${index + 1}`

    if (!String(line.description ?? '').trim()) {
      addIssue(
        issues,
        'required_line_description',
        `lines.${index}.description`,
        `${label}: la descripcion es obligatoria.`,
      )
    }

    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      addIssue(
        issues,
        'invalid_line_quantity',
        `lines.${index}.quantity`,
        `${label}: la cantidad debe ser mayor que cero.`,
      )
    }

    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
      addIssue(
        issues,
        'invalid_line_unit_price',
        `lines.${index}.unitPrice`,
        `${label}: el precio unitario debe ser valido y no negativo.`,
      )
    }

    if (!Number.isFinite(line.lineTotalAmount) || line.lineTotalAmount < 0) {
      addIssue(
        issues,
        'invalid_line_total',
        `lines.${index}.lineTotalAmount`,
        `${label}: el monto total de linea debe ser valido y no negativo.`,
      )
    } else {
      lineTotalSum += line.lineTotalAmount
    }
  })

  const net = Number(document.netAmount ?? 0)
  const tax = Number(document.taxAmount ?? 0)
  const exempt = Number(document.exemptAmount ?? 0)
  const total = Number(document.totalAmount ?? 0)

  if ([net, tax, exempt, total].some((value) => !Number.isFinite(value) || value < 0)) {
    addIssue(
      issues,
      'invalid_amounts',
      'document.amounts',
      'Los montos del documento deben ser validos y no negativos.',
    )
  } else {
    const expectedTotal = roundPeso(net + tax + exempt)
    if (roundPeso(total) !== expectedTotal) {
      addIssue(
        issues,
        'incoherent_total',
        'document.totalAmount',
        `El total no cuadra con neto + IVA + exento. Esperado: ${expectedTotal}.`,
      )
    }

    if (roundPeso(lineTotalSum) !== roundPeso(total)) {
      addIssue(
        issues,
        'line_total_mismatch',
        'lines',
        `La suma de lineas no coincide con el total del documento. Suma lineas: ${roundPeso(lineTotalSum)}.`,
      )
    }

    if (taxableDocumentTypes.has(document.documentType) && net > 0 && exempt === 0) {
      const expectedTax = roundPeso(net * 0.19)
      if (roundPeso(tax) !== expectedTax) {
        addIssue(
          issues,
          'invalid_tax_amount',
          'document.taxAmount',
          `El IVA no cuadra con una tasa base de 19%. Esperado: ${expectedTax}.`,
        )
      }
    }
  }

  references.forEach((reference, index) => {
    if (!String(reference.referencedFolio ?? '').trim()) {
      addIssue(
        issues,
        'required_reference_folio',
        `references.${index}.referencedFolio`,
        `Referencia ${index + 1}: el folio de referencia es obligatorio.`,
      )
    }

    if (!String(reference.referenceReason ?? '').trim()) {
      addIssue(
        issues,
        'required_reference_reason',
        `references.${index}.referenceReason`,
        `Referencia ${index + 1}: la glosa de referencia es obligatoria.`,
      )
    }
  })

  return {
    isValid: issues.length === 0,
    issues,
  }
}

export const assertValidDtePayload = (input: DteXmlGeneratorInput) => {
  const result = validateDtePayload(input)
  if (!result.isValid) {
    throw new Error(result.issues.map((issue) => issue.message).join(' '))
  }

  return result
}
