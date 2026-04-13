import { generateDteXml } from './dteXml'
import type { DteXmlGeneratorInput } from '../types/dteXml'

export const sampleDteXmlInput: DteXmlGeneratorInput = {
  document: {
    id: 'doc-demo-001',
    documentType: 'factura',
    siiDteCode: 33,
    folio: '125',
    issueDate: '2026-04-08',
    dueDate: '2026-04-30',
    currencyCode: 'CLP',
    netAmount: 10000,
    taxAmount: 1900,
    exemptAmount: 0,
    totalAmount: 11900,
    paymentMethod: 'credit',
  },
  emitter: {
    taxId: '76000000-1',
    legalName: 'Minimarket Demo SpA',
    businessLine: 'Venta al por menor de alimentos y abarrotes',
    addressLine1: 'Av. Central 123',
    district: 'Santiago',
    city: 'Santiago',
  },
  receiver: {
    taxId: '96543210-9',
    legalName: 'Cliente de Prueba Ltda.',
    businessLine: 'Servicios administrativos',
    addressLine1: 'Los Aromos 456',
    district: 'Providencia',
    city: 'Santiago',
  },
  lines: [
    {
      lineNumber: 1,
      sku: 'ARROZ-1KG',
      description: 'Arroz grado 1 bolsa 1 kg',
      quantity: 2,
      unitPrice: 2500,
      discountAmount: 0,
      lineTotalAmount: 5000,
      unitLabel: 'UN',
    },
    {
      lineNumber: 2,
      sku: 'ACEITE-900',
      description: 'Aceite vegetal 900 ml',
      quantity: 1,
      unitPrice: 5000,
      discountAmount: 0,
      lineTotalAmount: 5000,
      unitLabel: 'UN',
    },
  ],
  references: [
    {
      referencedDocumentType: 'factura',
      referencedFolio: '100',
      referencedIssueDate: '2026-04-01',
      referenceReason: 'Referencia comercial interna de prueba',
      referenceCode: '1',
    },
  ],
}

export const sampleDteXml = generateDteXml(sampleDteXmlInput).xml
