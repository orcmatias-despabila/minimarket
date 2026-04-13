import type { AdminActiveStatus, AdminListFilterBase } from './adminShared'

export interface AdminSupplier {
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
  contactName?: string
  notes?: string
  status: AdminActiveStatus
  createdAt: string
  updatedAt: string
  createdByUserId?: string
  updatedByUserId?: string
}

export interface AdminSupplierListFilters extends AdminListFilterBase {
  status?: AdminActiveStatus | 'all'
}

export interface AdminSupplierWriteInput {
  businessId: string
  taxId: string
  legalName: string
  businessLine?: string
  addressLine1?: string
  district?: string
  city?: string
  phone?: string
  email?: string
  contactName?: string
  notes?: string
  status: AdminActiveStatus
}

export interface AdminSuppliersDocumentAvailability {
  items: AdminSupplier[]
  totalActive: number
  totalAll: number
  statusBreakdown: Partial<Record<AdminActiveStatus, number>> & Record<string, number>
}
