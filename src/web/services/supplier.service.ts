import { createId } from '../../lib/ids'
import type { SaveSupplierInput, Supplier } from '../types/supplier'
import { getRutValidationMessage, normalizeRut } from '../../lib/rut'

const storagePrefix = 'minimarket:web:suppliers'

const buildStorageKey = (businessId: string) => `${storagePrefix}:${businessId}`

const canUseStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const normalizeText = (value?: string) => value?.trim() ?? ''

const readSuppliers = (businessId: string): Supplier[] => {
  if (!canUseStorage()) {
    return []
  }

  const raw = window.localStorage.getItem(buildStorageKey(businessId))
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Supplier[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeSuppliers = (businessId: string, suppliers: Supplier[]) => {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(buildStorageKey(businessId), JSON.stringify(suppliers))
}

const normalizeSupplier = (input: SaveSupplierInput, existing?: Supplier): Supplier => {
  const timestamp = new Date().toISOString()

  return {
    id: existing?.id ?? input.existingSupplierId ?? createId('supplier'),
    businessId: input.businessId,
    rut: normalizeRut(input.rut) ?? normalizeText(input.rut).toUpperCase(),
    legalName: normalizeText(input.legalName),
    businessLine: normalizeText(input.businessLine) || undefined,
    address: normalizeText(input.address) || undefined,
    district: normalizeText(input.district) || undefined,
    city: normalizeText(input.city) || undefined,
    phone: normalizeText(input.phone) || undefined,
    email: normalizeText(input.email).toLowerCase() || undefined,
    contactName: normalizeText(input.contactName) || undefined,
    notes: normalizeText(input.notes) || undefined,
    status: input.status,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
}

export const supplierService = {
  async listByBusiness(businessId?: string | null): Promise<Supplier[]> {
    if (!businessId) {
      return []
    }

    return readSuppliers(businessId).sort((left, right) =>
      left.legalName.localeCompare(right.legalName, 'es-CL'),
    )
  },

  async saveSupplier(input: SaveSupplierInput): Promise<Supplier> {
    const suppliers = readSuppliers(input.businessId)
    const existing = input.existingSupplierId
      ? suppliers.find((item) => item.id === input.existingSupplierId)
      : undefined

    const duplicatedRut = suppliers.find(
      (item) =>
        (normalizeRut(item.rut) ?? item.rut.toUpperCase()) ===
          (normalizeRut(input.rut) ?? input.rut.trim().toUpperCase()) &&
        item.id !== input.existingSupplierId,
    )

    const rutError = getRutValidationMessage(input.rut, 'El RUT del proveedor')
    if (rutError) {
      throw new Error(rutError)
    }

    if (duplicatedRut) {
      throw new Error('Ya existe un proveedor con ese RUT.')
    }

    const nextSupplier = normalizeSupplier(input, existing)
    const nextSuppliers = existing
      ? suppliers.map((item) => (item.id === existing.id ? nextSupplier : item))
      : [nextSupplier, ...suppliers]

    writeSuppliers(input.businessId, nextSuppliers)

    return nextSupplier
  },
}
