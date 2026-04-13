export type CustomerStatus = 'active' | 'inactive'

export interface Customer {
  id: string
  businessId: string
  rut: string
  legalName: string
  businessLine?: string
  address?: string
  district?: string
  city?: string
  phone?: string
  email?: string
  notes?: string
  status: CustomerStatus
  createdAt: string
  updatedAt: string
}

export interface SaveCustomerInput {
  existingCustomerId?: string
  businessId: string
  rut: string
  legalName: string
  businessLine?: string
  address?: string
  district?: string
  city?: string
  phone?: string
  email?: string
  notes?: string
  status: CustomerStatus
}
