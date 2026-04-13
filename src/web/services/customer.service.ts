import { createId } from '../../lib/ids'
import type { Customer, SaveCustomerInput } from '../types/customer'
import { getRutValidationMessage, normalizeRut } from '../../lib/rut'

const storagePrefix = 'minimarket:web:customers'

const buildStorageKey = (businessId: string) => `${storagePrefix}:${businessId}`

const canUseStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const normalizeText = (value?: string) => value?.trim() ?? ''

const readCustomers = (businessId: string): Customer[] => {
  if (!canUseStorage()) {
    return []
  }

  const raw = window.localStorage.getItem(buildStorageKey(businessId))
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Customer[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeCustomers = (businessId: string, customers: Customer[]) => {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(buildStorageKey(businessId), JSON.stringify(customers))
}

const normalizeCustomer = (input: SaveCustomerInput, existing?: Customer): Customer => {
  const timestamp = new Date().toISOString()

  return {
    id: existing?.id ?? input.existingCustomerId ?? createId('customer'),
    businessId: input.businessId,
    rut: normalizeRut(input.rut) ?? normalizeText(input.rut).toUpperCase(),
    legalName: normalizeText(input.legalName),
    businessLine: normalizeText(input.businessLine) || undefined,
    address: normalizeText(input.address) || undefined,
    district: normalizeText(input.district) || undefined,
    city: normalizeText(input.city) || undefined,
    phone: normalizeText(input.phone) || undefined,
    email: normalizeText(input.email).toLowerCase() || undefined,
    notes: normalizeText(input.notes) || undefined,
    status: input.status,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
}

export const customerService = {
  async listByBusiness(businessId?: string | null): Promise<Customer[]> {
    if (!businessId) {
      return []
    }

    return readCustomers(businessId).sort((left, right) =>
      left.legalName.localeCompare(right.legalName, 'es-CL'),
    )
  },

  async saveCustomer(input: SaveCustomerInput): Promise<Customer> {
    const customers = readCustomers(input.businessId)
    const existing = input.existingCustomerId
      ? customers.find((item) => item.id === input.existingCustomerId)
      : undefined

    const duplicatedRut = customers.find(
      (item) =>
        (normalizeRut(item.rut) ?? item.rut.toUpperCase()) ===
          (normalizeRut(input.rut) ?? input.rut.trim().toUpperCase()) &&
        item.id !== input.existingCustomerId,
    )

    const rutError = getRutValidationMessage(input.rut, 'El RUT del cliente')
    if (rutError) {
      throw new Error(rutError)
    }

    if (duplicatedRut) {
      throw new Error('Ya existe un cliente con ese RUT.')
    }

    const nextCustomer = normalizeCustomer(input, existing)
    const nextCustomers = existing
      ? customers.map((item) => (item.id === existing.id ? nextCustomer : item))
      : [nextCustomer, ...customers]

    writeCustomers(input.businessId, nextCustomers)

    return nextCustomer
  },
}
