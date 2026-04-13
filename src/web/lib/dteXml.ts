import type {
  DteReferenceCodeMap,
  DteXmlGenerationResult,
  DteXmlGeneratorInput,
  SupportedDteDocumentType,
} from '../types/dteXml'
import { assertValidDtePayload } from './dteValidation'
import { getRutValidationMessage, normalizeRut } from '../../lib/rut'

const defaultDteCodeMap: Record<SupportedDteDocumentType, number> = {
  boleta: 39,
  factura: 33,
  nota_credito: 61,
  factura_compra: 46,
}

const referenceDocumentTypeMap: DteReferenceCodeMap = {
  boleta: 39,
  factura: 33,
  nota_credito: 61,
  factura_compra: 46,
}

const xmlEscapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

export interface DteXmlSections {
  documentXmlId: string
  siiDteCode: number
  folio: string
  issueDate: string
  dueDate?: string
  emitter: {
    taxId: string
    legalName: string
    businessLine: string
    addressLine1: string
    district: string
    city: string
  }
  receiver: {
    taxId: string
    legalName: string
    businessLine: string
    addressLine1: string
    district: string
    city: string
  }
  encabezadoXml: string
  detailXmlBlocks: string[]
  referenceXmlBlocks: string[]
  firstItemName: string
  xmlEncoding: 'ISO-8859-1' | 'UTF-8'
}

export const escapeXml = (value: string) => value.replace(/[&<>"']/g, (char) => xmlEscapeMap[char])

const normalizeRequiredText = (value: string, label: string) => {
  const normalized = value.trim()
  if (!normalized) {
    throw new Error(`${label} es obligatorio para generar XML DTE.`)
  }

  return normalized
}

const normalizeTaxId = (value: string, label: string) => {
  const required = normalizeRequiredText(value, label)
  const normalized = normalizeRut(required)

  if (!normalized) {
    throw new Error(getRutValidationMessage(required, label) ?? `${label} no es valido.`)
  }

  return normalized
}

const normalizeDate = (value: string, label: string) => {
  const normalized = normalizeRequiredText(value, label)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${label} debe venir en formato YYYY-MM-DD.`)
  }

  return normalized
}

const formatDecimal = (value: number, label: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} debe ser un numero valido y no negativo.`)
  }

  return value.toFixed(6).replace(/\.?0+$/, '')
}

const formatIntegerAmount = (value: number, label: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} debe ser un monto valido y no negativo.`)
  }

  if (!Number.isInteger(value)) {
    throw new Error(`${label} debe expresarse en pesos enteros para este XML DTE base.`)
  }

  return String(value)
}

const resolveSiiDteCode = (
  documentType: DteXmlGeneratorInput['document']['documentType'],
  explicitCode?: number,
) => {
  if (explicitCode) {
    return explicitCode
  }

  const mapped = defaultDteCodeMap[documentType as SupportedDteDocumentType]
  if (!mapped) {
    throw new Error(
      `No existe un codigo DTE SII preconfigurado para ${documentType}. Debes informar siiDteCode.`,
    )
  }

  return mapped
}

const resolveReferenceDocumentCode = (
  documentType: DteXmlGeneratorInput['references'] extends infer T
    ? T extends readonly unknown[]
      ? T[number] extends { referencedDocumentType: infer U }
        ? U
        : never
      : never
    : never,
) => {
  const mapped = referenceDocumentTypeMap[String(documentType)]
  if (!mapped) {
    throw new Error(
      `No existe un codigo de referencia SII preconfigurado para ${String(documentType)}.`,
    )
  }

  return mapped
}

export const xmlTag = (tagName: string, value?: string | number | null, indent = 0) => {
  if (value === undefined || value === null || value === '') {
    return ''
  }

  const padding = '  '.repeat(indent)
  return `${padding}<${tagName}>${escapeXml(String(value))}</${tagName}>`
}

export const xmlBlock = (tagName: string, children: string[], indent = 0) => {
  const content = children.filter(Boolean)
  if (!content.length) {
    return ''
  }

  const padding = '  '.repeat(indent)
  return `${padding}<${tagName}>\n${content.join('\n')}\n${padding}</${tagName}>`
}

const toDocumentXmlId = (siiDteCode: number, folio: string, documentId?: string) => {
  const safeDocumentId = documentId?.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24)
  const safeFolio = folio.replace(/[^0-9]/g, '') || folio.replace(/[^A-Za-z0-9_-]/g, '')

  return safeDocumentId
    ? `DTE_${siiDteCode}_${safeFolio}_${safeDocumentId}`
    : `DTE_${siiDteCode}_${safeFolio}`
}

const toPaymentFormCode = (
  paymentMethod?: DteXmlGeneratorInput['document']['paymentMethod'],
  dueDate?: string,
) => {
  if (paymentMethod === 'credit' || dueDate) {
    return '2'
  }

  return '1'
}

export const buildDteXmlSections = (input: DteXmlGeneratorInput): DteXmlSections => {
  assertValidDtePayload(input)

  if (input.document.currencyCode !== 'CLP') {
    throw new Error('Esta version del generador solo soporta DTE base en CLP.')
  }

  if (!input.lines.length) {
    throw new Error('El DTE debe incluir al menos una linea de detalle.')
  }

  const siiDteCode = resolveSiiDteCode(input.document.documentType, input.document.siiDteCode)
  const folio = normalizeRequiredText(input.document.folio ?? '', 'El folio')
  const issueDate = normalizeDate(input.document.issueDate, 'La fecha de emision')
  const dueDate = input.document.dueDate
    ? normalizeDate(input.document.dueDate, 'La fecha de vencimiento')
    : undefined
  const xmlEncoding = input.xmlEncoding ?? 'ISO-8859-1'
  const documentXmlId = toDocumentXmlId(siiDteCode, folio, input.documentXmlId ?? input.document.id)

  const emitter = {
    taxId: normalizeTaxId(input.emitter.taxId, 'El RUT del emisor'),
    legalName: normalizeRequiredText(input.emitter.legalName, 'La razon social del emisor'),
    businessLine: normalizeRequiredText(input.emitter.businessLine, 'El giro del emisor'),
    addressLine1: normalizeRequiredText(input.emitter.addressLine1, 'La direccion del emisor'),
    district: normalizeRequiredText(input.emitter.district, 'La comuna del emisor'),
    city: normalizeRequiredText(input.emitter.city, 'La ciudad del emisor'),
  }

  const receiver = {
    taxId: normalizeTaxId(input.receiver.taxId, 'El RUT del receptor'),
    legalName: normalizeRequiredText(input.receiver.legalName, 'La razon social del receptor'),
    businessLine: normalizeRequiredText(input.receiver.businessLine, 'El giro del receptor'),
    addressLine1: normalizeRequiredText(input.receiver.addressLine1, 'La direccion del receptor'),
    district: normalizeRequiredText(input.receiver.district, 'La comuna del receptor'),
    city: normalizeRequiredText(input.receiver.city, 'La ciudad del receptor'),
  }

  const encabezadoChildren = [
    xmlBlock(
      'IdDoc',
      [
        xmlTag('TipoDTE', siiDteCode, 3),
        xmlTag('Folio', folio, 3),
        xmlTag('FchEmis', issueDate, 3),
        (siiDteCode === 33 || siiDteCode === 46)
          ? xmlTag('FmaPago', toPaymentFormCode(input.document.paymentMethod, dueDate), 3)
          : '',
        dueDate ? xmlTag('FchVenc', dueDate, 3) : '',
      ],
      2,
    ),
    xmlBlock(
      'Emisor',
      [
        xmlTag('RUTEmisor', emitter.taxId, 3),
        xmlTag('RznSoc', emitter.legalName, 3),
        xmlTag('GiroEmis', emitter.businessLine, 3),
        xmlTag('DirOrigen', emitter.addressLine1, 3),
        xmlTag('CmnaOrigen', emitter.district, 3),
        xmlTag('CiudadOrigen', emitter.city, 3),
      ],
      2,
    ),
    xmlBlock(
      'Receptor',
      [
        xmlTag('RUTRecep', receiver.taxId, 3),
        xmlTag('RznSocRecep', receiver.legalName, 3),
        xmlTag('GiroRecep', receiver.businessLine, 3),
        xmlTag('DirRecep', receiver.addressLine1, 3),
        xmlTag('CmnaRecep', receiver.district, 3),
        xmlTag('CiudadRecep', receiver.city, 3),
      ],
      2,
    ),
    xmlBlock(
      'Totales',
      [
        input.document.netAmount > 0
          ? xmlTag('MntNeto', formatIntegerAmount(input.document.netAmount, 'El monto neto'), 3)
          : '',
        input.document.exemptAmount > 0
          ? xmlTag(
              'MntExe',
              formatIntegerAmount(input.document.exemptAmount, 'El monto exento'),
              3,
            )
          : '',
        input.document.taxAmount > 0
          ? xmlTag('IVA', formatIntegerAmount(input.document.taxAmount, 'El IVA'), 3)
          : '',
        xmlTag('MntTotal', formatIntegerAmount(input.document.totalAmount, 'El monto total'), 3),
      ],
      2,
    ),
  ]

  const detailXmlBlocks = input.lines.map((line, index) => {
    const lineNumber = line.lineNumber > 0 ? line.lineNumber : index + 1
    const description = normalizeRequiredText(
      line.description,
      `La descripcion de la linea ${lineNumber}`,
    )
    const itemName = description.slice(0, 80)

    return xmlBlock(
      'Detalle',
      [
        xmlTag('NroLinDet', lineNumber, 2),
        line.sku
          ? xmlBlock(
              'CdgItem',
              [xmlTag('TpoCodigo', 'INT1', 3), xmlTag('VlrCodigo', line.sku.trim(), 3)],
              2,
            )
          : '',
        !line.sku && line.barcode
          ? xmlBlock(
              'CdgItem',
              [xmlTag('TpoCodigo', 'EAN13', 3), xmlTag('VlrCodigo', line.barcode.trim(), 3)],
              2,
            )
          : '',
        xmlTag('NmbItem', itemName, 2),
        xmlTag('DscItem', description, 2),
        xmlTag(
          'QtyItem',
          formatDecimal(line.quantity, `La cantidad de la linea ${lineNumber}`),
          2,
        ),
        line.unitLabel ? xmlTag('UnmdItem', line.unitLabel.trim(), 2) : '',
        xmlTag(
          'PrcItem',
          formatDecimal(line.unitPrice, `El precio unitario de la linea ${lineNumber}`),
          2,
        ),
        (line.discountAmount ?? 0) > 0
          ? xmlTag(
              'DescuentoMonto',
              formatIntegerAmount(
                line.discountAmount ?? 0,
                `El descuento de la linea ${lineNumber}`,
              ),
              2,
            )
          : '',
        xmlTag(
          'MontoItem',
          formatIntegerAmount(line.lineTotalAmount, `El monto total de la linea ${lineNumber}`),
          2,
        ),
      ],
      1,
    )
  })

  const referenceXmlBlocks = (input.references ?? []).map((reference, index) =>
    xmlBlock(
      'Referencia',
      [
        xmlTag('NroLinRef', index + 1, 2),
        xmlTag('TpoDocRef', resolveReferenceDocumentCode(reference.referencedDocumentType), 2),
        xmlTag(
          'FolioRef',
          normalizeRequiredText(
            reference.referencedFolio,
            `El folio de referencia ${index + 1}`,
          ),
          2,
        ),
        reference.referencedIssueDate
          ? xmlTag(
              'FchRef',
              normalizeDate(
                reference.referencedIssueDate,
                `La fecha de referencia ${index + 1}`,
              ),
              2,
            )
          : '',
        reference.referenceCode ? xmlTag('CodRef', reference.referenceCode.trim(), 2) : '',
        xmlTag(
          'RazonRef',
          normalizeRequiredText(reference.referenceReason, `La razon de referencia ${index + 1}`),
          2,
        ),
      ],
      1,
    ),
  )

  return {
    documentXmlId,
    siiDteCode,
    folio,
    issueDate,
    dueDate,
    emitter,
    receiver,
    encabezadoXml: xmlBlock('Encabezado', encabezadoChildren, 2),
    detailXmlBlocks,
    referenceXmlBlocks,
    firstItemName: normalizeRequiredText(
      input.lines[0]?.description ?? '',
      'La primera linea de detalle',
    ).slice(0, 40),
    xmlEncoding,
  }
}

export const generateDteXml = (input: DteXmlGeneratorInput): DteXmlGenerationResult => {
  const sections = buildDteXmlSections(input)

  const lines = [
    `<?xml version="1.0" encoding="${sections.xmlEncoding}"?>`,
    '<DTE xmlns="http://www.sii.cl/SiiDte" version="1.0">',
    `  <Documento ID="${escapeXml(sections.documentXmlId)}">`,
    sections.encabezadoXml,
    ...sections.detailXmlBlocks,
    ...sections.referenceXmlBlocks,
    '  </Documento>',
    '</DTE>',
  ]

  return {
    xml: lines.filter(Boolean).join('\n'),
    documentXmlId: sections.documentXmlId,
    siiDteCode: sections.siiDteCode,
  }
}
