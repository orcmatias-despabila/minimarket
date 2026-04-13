export type RutFormatStyle = 'compact' | 'dots'

export type RutValidationErrorCode =
  | 'empty'
  | 'invalid_length'
  | 'invalid_body'
  | 'invalid_verifier'
  | 'invalid_dv'

export interface RutValidationResult {
  isValid: boolean
  clean: string
  body: string
  verifier: string
  normalized: string | null
  formatted: string | null
  errorCode: RutValidationErrorCode | null
}

const minRutBodyLength = 7
const maxRutBodyLength = 8

export const cleanRut = (value?: string | null) =>
  (value ?? '')
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^0-9K]/g, '')

export const sanitizeRutInput = (value?: string | null) => {
  const raw = (value ?? '')
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\s]/g, '')
    .replace(/[^0-9K-]/g, '')

  if (!raw.includes('-')) {
    return raw
  }

  const [rawBody, ...rest] = raw.split('-')
  const body = rawBody.replace(/\D/g, '')
  const verifier = rest.join('').replace(/[^0-9K]/g, '').slice(0, 1)

  return verifier ? `${body}-${verifier}` : `${body}-`
}

const computeRutVerifier = (body: string) => {
  let sum = 0
  let multiplier = 2

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const remainder = 11 - (sum % 11)
  if (remainder === 11) {
    return '0'
  }

  if (remainder === 10) {
    return 'K'
  }

  return String(remainder)
}

const formatRutBodyWithDots = (body: string) => body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export const validateRut = (value?: string | null): RutValidationResult => {
  const clean = cleanRut(value)

  if (!clean) {
    return {
      isValid: false,
      clean,
      body: '',
      verifier: '',
      normalized: null,
      formatted: null,
      errorCode: 'empty',
    }
  }

  if (clean.length < 2) {
    return {
      isValid: false,
      clean,
      body: clean.slice(0, -1),
      verifier: clean.slice(-1),
      normalized: null,
      formatted: null,
      errorCode: 'invalid_length',
    }
  }

  const body = clean.slice(0, -1)
  const verifier = clean.slice(-1)

  if (!/^\d+$/.test(body)) {
    return {
      isValid: false,
      clean,
      body,
      verifier,
      normalized: null,
      formatted: null,
      errorCode: 'invalid_body',
    }
  }

  if (body.length < minRutBodyLength || body.length > maxRutBodyLength) {
    return {
      isValid: false,
      clean,
      body,
      verifier,
      normalized: null,
      formatted: null,
      errorCode: 'invalid_length',
    }
  }

  if (!/^[0-9K]$/.test(verifier)) {
    return {
      isValid: false,
      clean,
      body,
      verifier,
      normalized: null,
      formatted: null,
      errorCode: 'invalid_verifier',
    }
  }

  const expectedVerifier = computeRutVerifier(body)
  if (verifier !== expectedVerifier) {
    return {
      isValid: false,
      clean,
      body,
      verifier,
      normalized: null,
      formatted: null,
      errorCode: 'invalid_dv',
    }
  }

  const normalized = `${body}-${verifier}`

  return {
    isValid: true,
    clean,
    body,
    verifier,
    normalized,
    formatted: normalized,
    errorCode: null,
  }
}

export const normalizeRut = (value?: string | null) => validateRut(value).normalized

export const formatRut = (value?: string | null, style: RutFormatStyle = 'compact') => {
  const validation = validateRut(value)

  if (!validation.isValid || !validation.normalized) {
    return sanitizeRutInput(value)
  }

  if (style === 'dots') {
    return `${formatRutBodyWithDots(validation.body)}-${validation.verifier}`
  }

  return validation.normalized
}

export const formatRutForDisplay = (
  value?: string | null,
  style: RutFormatStyle = 'compact',
) => {
  const normalized = normalizeRut(value)

  if (!normalized) {
    const trimmed = value?.trim()
    return trimmed || undefined
  }

  return formatRut(normalized, style)
}

export const getRutValidationMessage = (
  value?: string | null,
  label = 'El RUT',
) => {
  const validation = validateRut(value)

  switch (validation.errorCode) {
    case 'empty':
      return `${label} es obligatorio.`
    case 'invalid_length':
      return `${label} debe tener entre 7 y 8 digitos mas el digito verificador.`
    case 'invalid_body':
      return `${label} solo puede contener numeros antes del digito verificador.`
    case 'invalid_verifier':
      return `${label} debe terminar en un digito o K.`
    case 'invalid_dv':
      return `${label} no es valido: el digito verificador no coincide.`
    default:
      return null
  }
}

export const rutMatchesSearch = (rut: string | null | undefined, searchTerm: string) => {
  const trimmedSearch = searchTerm.trim()
  if (!trimmedSearch) {
    return true
  }

  const rawRut = rut ?? ''
  const normalizedRut = normalizeRut(rawRut) ?? sanitizeRutInput(rawRut)
  const loweredSearch = trimmedSearch.toLowerCase()
  const cleanedSearch = cleanRut(trimmedSearch)

  return (
    rawRut.toLowerCase().includes(loweredSearch) ||
    normalizedRut.toLowerCase().includes(loweredSearch) ||
    (cleanedSearch.length >= 2 && cleanRut(rawRut).includes(cleanedSearch))
  )
}
