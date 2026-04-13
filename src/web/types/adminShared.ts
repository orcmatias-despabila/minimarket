export interface AdminPaginationInput {
  page?: number
  pageSize?: number
}

export interface AdminPaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface AdminDateRangeFilter {
  dateFrom?: string
  dateTo?: string
}

export interface AdminListFilterBase extends AdminPaginationInput {
  businessId: string
  search?: string
}

export type AdminActiveStatus = 'active' | 'inactive'

export interface AdminSortOption {
  column: string
  ascending?: boolean
}
