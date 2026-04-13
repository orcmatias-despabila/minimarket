/// <reference types="node" />

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  X509Certificate,
} from 'crypto'
import { buildDteXmlSections, escapeXml, xmlTag } from './dteXml'
import { getRutValidationMessage, normalizeRut } from '../../lib/rut'
import type {
  DteIntegrityValidationResult,
  DteSignedDocumentArtifacts,
  DteSignedDocumentResult,
  DteSigningInput,
} from '../types/dteSignature'

const xmlDsigNamespace = 'http://www.w3.org/2000/09/xmldsig#'
const siiNamespace = 'http://www.sii.cl/SiiDte'

const normalizeRequiredText = (value: string, label: string) => {
  const normalized = value.trim()
  if (!normalized) {
    throw new Error(`${label} es obligatorio para firmar el DTE.`)
  }

  return normalized
}

const normalizeRequiredRut = (value: string, label: string) => {
  const normalized = normalizeRut(normalizeRequiredText(value, label))

  if (!normalized) {
    throw new Error(getRutValidationMessage(value, label) ?? `${label} no es valido.`)
  }

  return normalized
}

const ensureLatin1Compatible = (value: string, label: string) => {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) > 255) {
      throw new Error(`${label} contiene caracteres fuera de ISO-8859-1.`)
    }
  }

  return value
}

const toLatin1Buffer = (value: string, label: string) =>
  Buffer.from(ensureLatin1Compatible(value, label), 'latin1')

const extractXmlBlock = (xml: string, tagName: string) => {
  const match = xml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tagName}>`, 'i'))
  if (!match) {
    throw new Error(`No pudimos encontrar el bloque <${tagName}> dentro del XML CAF.`)
  }

  return match[0]
}

const formatLocalTimestamp = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')
  const seconds = String(value.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

const toBase64FromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4
  return padding ? normalized.padEnd(normalized.length + (4 - padding), '=') : normalized
}

const indentXml = (value: string, level: number) =>
  value
    .split('\n')
    .map((line) => `${'  '.repeat(level)}${line}`)
    .join('\n')

const sha1Base64 = (value: string, label: string) =>
  createHash('sha1').update(toLatin1Buffer(value, label)).digest('base64')

const signRsaSha1Base64 = (value: string, privateKeyPem: string, label: string) => {
  const signer = createSign('RSA-SHA1')
  signer.update(toLatin1Buffer(value, label))
  signer.end()

  return signer.sign(createPrivateKey(privateKeyPem), 'base64')
}

const verifyRsaSha1Base64 = (
  value: string,
  signatureBase64: string,
  keyPemOrCert: string,
  label: string,
) => {
  const verifier = createVerify('RSA-SHA1')
  verifier.update(toLatin1Buffer(value, label))
  verifier.end()

  return verifier.verify(keyPemOrCert, signatureBase64, 'base64')
}

const buildTedArtifacts = (
  input: DteSigningInput,
  siiDteCode: number,
  timestamp: string,
  firstItemName: string,
) => {
  const cafBlock = extractXmlBlock(input.ted.cafXml, 'CAF')
  const totalAmount = Number(input.dte.document.totalAmount)

  if (!Number.isInteger(totalAmount) || totalAmount < 0) {
    throw new Error('El monto total debe estar expresado en pesos enteros para generar el TED.')
  }

  const ddXml = [
    '<DD>',
    xmlTag('RE', normalizeRequiredRut(input.dte.emitter.taxId, 'El RUT del emisor TED'), 1),
    xmlTag('TD', siiDteCode, 1),
    xmlTag('F', normalizeRequiredText(input.dte.document.folio ?? '', 'El folio TED'), 1),
    xmlTag('FE', normalizeRequiredText(input.dte.document.issueDate, 'La fecha TED'), 1),
    xmlTag('RR', normalizeRequiredRut(input.dte.receiver.taxId, 'El RUT del receptor TED'), 1),
    xmlTag(
      'RSR',
      normalizeRequiredText(input.dte.receiver.legalName, 'La razon social del receptor TED').slice(0, 40),
      1,
    ),
    xmlTag('MNT', totalAmount, 1),
    xmlTag('IT1', firstItemName.slice(0, 40), 1),
    indentXml(cafBlock, 1),
    xmlTag('TSTED', timestamp, 1),
    '</DD>',
  ].join('\n')

  const tedSignatureValue = signRsaSha1Base64(
    ddXml,
    normalizeRequiredText(input.ted.cafPrivateKeyPem, 'La llave privada CAF'),
    'Los datos DD del TED',
  )

  const tedXml = [
    '<TED version="1.0">',
    ddXml,
    `  <FRMT algoritmo="SHA1withRSA">${tedSignatureValue}</FRMT>`,
    '</TED>',
  ].join('\n')

  return {
    ddXml,
    tedXml,
    tedSignatureValue,
  }
}

const buildSignedInfoXml = (documentXmlId: string, digestValue: string) =>
  [
    '<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">',
    '  <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315" />',
    '  <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1" />',
    `  <Reference URI="#${escapeXml(documentXmlId)}">`,
    '    <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1" />',
    `    <DigestValue>${digestValue}</DigestValue>`,
    '  </Reference>',
    '</SignedInfo>',
  ].join('\n')

const buildKeyInfoXml = (certificatePem: string) => {
  const x509 = new X509Certificate(certificatePem)
  const publicKey = createPublicKey(certificatePem)
  const jwk = publicKey.export({ format: 'jwk' }) as { n?: string; e?: string }

  if (!jwk.n || !jwk.e) {
    throw new Error('No pudimos extraer la llave publica del certificado digital.')
  }

  return [
    `  <KeyInfo xmlns="${xmlDsigNamespace}">`,
    '    <KeyValue>',
    '      <RSAKeyValue>',
    `        <Modulus>${toBase64FromBase64Url(jwk.n)}</Modulus>`,
    `        <Exponent>${toBase64FromBase64Url(jwk.e)}</Exponent>`,
    '      </RSAKeyValue>',
    '    </KeyValue>',
    '    <X509Data>',
    `      <X509Certificate>${x509.raw.toString('base64')}</X509Certificate>`,
    '    </X509Data>',
    '  </KeyInfo>',
  ].join('\n')
}

const buildSignatureXml = (
  signedInfoXml: string,
  signatureValue: string,
  certificatePem: string,
) =>
  [
    `<Signature xmlns="${xmlDsigNamespace}">`,
    signedInfoXml.replace(/^/gm, '  '),
    `  <SignatureValue>${signatureValue}</SignatureValue>`,
    buildKeyInfoXml(certificatePem),
    '</Signature>',
  ].join('\n')

const buildUnsignedDocumentoXml = (
  documentXmlId: string,
  encabezadoXml: string,
  detailXmlBlocks: string[],
  referenceXmlBlocks: string[],
  tedXml: string,
  tmstFirma: string,
) =>
  [
    `  <Documento ID="${escapeXml(documentXmlId)}">`,
    encabezadoXml,
    ...detailXmlBlocks,
    ...referenceXmlBlocks,
    `    ${tedXml}`,
    xmlTag('TmstFirma', tmstFirma, 2),
    '  </Documento>',
  ].join('\n')

const buildFinalSignedXml = (
  xmlEncoding: 'ISO-8859-1' | 'UTF-8',
  unsignedDocumentoXml: string,
  signatureXml: string,
) =>
  [
    `<?xml version="1.0" encoding="${xmlEncoding}"?>`,
    `<DTE xmlns="${siiNamespace}" version="1.0">`,
    unsignedDocumentoXml.replace('\n  </Documento>', `\n${signatureXml.replace(/^/gm, '    ')}\n  </Documento>`),
    '</DTE>',
  ].join('\n')

const validateCertificateInput = (input: DteSigningInput) => {
  normalizeRequiredText(input.certificate.certificatePem, 'El certificado digital')
  normalizeRequiredText(input.certificate.privateKeyPem, 'La llave privada del certificado')
  normalizeRequiredText(input.ted.cafXml, 'El XML CAF')
  normalizeRequiredText(input.ted.cafPrivateKeyPem, 'La llave privada CAF')
}

export const signDteXml = (input: DteSigningInput): DteSignedDocumentResult => {
  validateCertificateInput(input)

  const sections = buildDteXmlSections(input.dte)
  const timestamp = formatLocalTimestamp(input.timestamp ?? new Date())

  const { ddXml, tedXml, tedSignatureValue } = buildTedArtifacts(
    input,
    sections.siiDteCode,
    timestamp,
    sections.firstItemName,
  )

  const unsignedDocumentoXml = buildUnsignedDocumentoXml(
    sections.documentXmlId,
    sections.encabezadoXml,
    sections.detailXmlBlocks,
    sections.referenceXmlBlocks,
    tedXml,
    timestamp,
  )

  const digestValue = sha1Base64(unsignedDocumentoXml, 'El Documento XML sin firma')
  const signedInfoXml = buildSignedInfoXml(sections.documentXmlId, digestValue)
  const signatureValue = signRsaSha1Base64(
    signedInfoXml,
    input.certificate.privateKeyPem,
    'El bloque SignedInfo del DTE',
  )

  const signatureXml = buildSignatureXml(signedInfoXml, signatureValue, input.certificate.certificatePem)
  const xml = buildFinalSignedXml(sections.xmlEncoding, unsignedDocumentoXml, signatureXml)

  return {
    xml,
    documentXmlId: sections.documentXmlId,
    siiDteCode: sections.siiDteCode,
    artifacts: {
      ddXml,
      tedXml,
      tmstFirma: timestamp,
      unsignedDocumentoXml,
      signedInfoXml,
      signatureValue,
      digestValue,
      tedSignatureValue,
    },
  }
}

export const validateSignedDteIntegrity = (
  signed: DteSignedDocumentResult,
  input: DteSigningInput,
): DteIntegrityValidationResult => {
  const recalculatedTedSignature = signRsaSha1Base64(
    signed.artifacts.ddXml,
    input.ted.cafPrivateKeyPem,
    'Los datos DD del TED',
  )
  const recalculatedDigest = sha1Base64(
    signed.artifacts.unsignedDocumentoXml,
    'El Documento XML sin firma',
  )

  const tedSignatureOk = recalculatedTedSignature === signed.artifacts.tedSignatureValue
  const digestOk = recalculatedDigest === signed.artifacts.digestValue
  const xmlSignatureOk = verifyRsaSha1Base64(
    signed.artifacts.signedInfoXml,
    signed.artifacts.signatureValue,
    input.certificate.certificatePem,
    'El bloque SignedInfo del DTE',
  )

  return {
    isValid: tedSignatureOk && digestOk && xmlSignatureOk,
    checks: {
      tedSignature: tedSignatureOk,
      documentDigest: digestOk,
      xmlSignature: xmlSignatureOk,
    },
  }
}

export const explainDteSigningFlow = () => [
  '1. Se construye el Documento XML con Encabezado, Detalle y Referencias usando tags oficiales del SII.',
  '2. Se arma el bloque DD del TED con datos representativos del DTE y el CAF.',
  '3. El DD se firma con la llave privada del CAF para generar FRMT.',
  '4. Se inserta el TED y la marca TmstFirma dentro del Documento.',
  '5. Se calcula el digest SHA-1 del Documento XML sin Signature.',
  '6. Se arma SignedInfo y se firma con el certificado digital configurado.',
  '7. Se incrusta Signature XMLDSig dentro del DTE final.',
].join('\n')

export type { DteSignedDocumentArtifacts }
