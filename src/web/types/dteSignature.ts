import type { DteXmlGeneratorInput } from './dteXml'

export interface DteSignatureCertificateConfig {
  certificatePem: string
  privateKeyPem: string
}

export interface DteTedConfig {
  cafXml: string
  cafPrivateKeyPem: string
}

export interface DteSigningInput {
  dte: DteXmlGeneratorInput
  certificate: DteSignatureCertificateConfig
  ted: DteTedConfig
  timestamp?: Date
}

export interface DteSignedDocumentArtifacts {
  ddXml: string
  tedXml: string
  tmstFirma: string
  unsignedDocumentoXml: string
  signedInfoXml: string
  signatureValue: string
  digestValue: string
  tedSignatureValue: string
}

export interface DteSignedDocumentResult {
  xml: string
  documentXmlId: string
  siiDteCode: number
  artifacts: DteSignedDocumentArtifacts
}

export interface DteIntegrityValidationResult {
  isValid: boolean
  checks: {
    tedSignature: boolean
    documentDigest: boolean
    xmlSignature: boolean
  }
}
