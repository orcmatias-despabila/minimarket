import {
  getRutValidationMessage,
  normalizeRut as normalizeChileanRut,
  validateRut as validateChileanRut,
} from '../../lib/rut'
import type {
  AdminArchivedFilter,
  AdminEmployeeAccessState,
  AdminEmployeeStatus,
} from '../types/adminEmployee'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const validateRut = validateChileanRut
export const normalizeRut = normalizeChileanRut

export const normalizeText = (value?: string | null) => value?.trim() || undefined

export const normalizeRequiredText = (value: string, label: string) => {
  const normalized = value.trim()
  if (!normalized) {
    throw new Error(`${label} es obligatorio.`)
  }

  return normalized
}

export const normalizeOptionalEmail = (value?: string | null, label = 'El correo') => {
  const normalized = normalizeText(value)?.toLowerCase()
  if (!normalized) {
    return undefined
  }

  if (!emailPattern.test(normalized)) {
    throw new Error(`${label} no es valido.`)
  }

  return normalized
}

export const normalizeRequiredRut = (value: string, label: string) => {
  const requiredValue = normalizeRequiredText(value, label)
  const normalized = normalizeRut(requiredValue)

  if (!normalized) {
    throw new Error(getRutValidationMessage(requiredValue, label) ?? `${label} no es valido.`)
  }

  return normalized
}

export const normalizeEmployeeStatus = (
  value?: string | null,
  fallback: AdminEmployeeStatus = 'active',
): AdminEmployeeStatus => {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) {
    return fallback
  }

  if (normalized === 'active' || normalized === 'inactive' || normalized === 'leave' || normalized === 'terminated') {
    return normalized
  }

  throw new Error('El estado del trabajador no es valido.')
}

export const normalizeAccessStatus = (
  value?: string | null,
  fallback: Exclude<AdminEmployeeAccessState, 'none'> = 'pending',
): Exclude<AdminEmployeeAccessState, 'none'> => {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) {
    return fallback
  }

  if (normalized === 'pending' || normalized === 'active' || normalized === 'suspended' || normalized === 'revoked') {
    return normalized
  }

  throw new Error('El estado del acceso no es valido.')
}

export const normalizeArchivedFilter = (value?: string | null): AdminArchivedFilter => {
  const normalized = value?.trim().toLowerCase()
  if (!normalized || normalized === 'active') {
    return 'active'
  }

  if (normalized === 'archived' || normalized === 'all') {
    return normalized
  }

  throw new Error('El filtro de archivado no es valido.')
}

export const toPeopleDebugContext = (
  sourceName: string,
  action: string,
  context?: Record<string, unknown>,
) => ({
  sourceName,
  action,
  ...(context ?? {}),
})

export const logPeopleDebug = (
  sourceName: string,
  action: string,
  context?: Record<string, unknown>,
) => {
  console.info(`[adminPeople] ${sourceName} ${action}.`, toPeopleDebugContext(sourceName, action, context))
}

export const logPeopleWarning = (
  sourceName: string,
  action: string,
  context?: Record<string, unknown>,
) => {
  console.warn(`[adminPeople] ${sourceName} ${action}.`, toPeopleDebugContext(sourceName, action, context))
}
