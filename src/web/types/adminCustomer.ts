import type { AdminActiveStatus, AdminListFilterBase } from './adminShared'

export interface AdminCustomer {
  id: string
  businessId: string
  taxId: string
  legalName: string
  businessLine?: string
  addressLine1?: string
  district?: string
  city?: string
  phone?: string
  email?: string
  notes?: string
  status: AdminActiveStatus
  createdAt: string
  updatedAt: string
  createdByUserId?: string
  updatedByUserId?: string
}

export interface AdminCustomerListFilters extends AdminListFilterBase {
  status?: AdminActiveStatus | 'all'
}

export interface AdminCustomerWriteInput {
  businessId: string
  taxId: string
  legalName: string
  businessLine?: string
  addressLine1?: string
  district?: string
  city?: string
  phone?: string
  email?: string
  notes?: string
  status: AdminActiveStatus
}

export interface AdminCustomersDocumentAvailability {
  items: AdminCustomer[]
  totalActive: number
  totalAll: number
  statusBreakdown: Partial<Record<AdminActiveStatus, number>> & Record<string, number>
}
