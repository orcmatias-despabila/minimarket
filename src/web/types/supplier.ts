export type SupplierStatus = 'active' | 'inactive'

export interface Supplier {
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
  contactName?: string
  notes?: string
  status: SupplierStatus
  createdAt: string
  updatedAt: string
}

export interface SaveSupplierInput {
  existingSupplierId?: string
  businessId: string
  rut: string
  legalName: string
  businessLine?: string
  address?: string
  district?: string
  city?: string
  phone?: string
  email?: string
  contactName?: string
  notes?: string
  status: SupplierStatus
}
