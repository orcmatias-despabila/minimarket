import {
  adminTableNames,
  createAdminDataError,
  getAdminSupabaseClient,
  logAdminEmptyResult,
  resolvePagination,
  toPaginatedResult,
} from './adminBase'
import { mapCustomerRow, toCustomerInsert, type AdminCustomerRow } from './adminMappers'
import { validateCustomerPayload } from './adminValidators'
import type {
  AdminCustomer,
  AdminCustomerListFilters,
  AdminCustomersDocumentAvailability,
  AdminCustomerWriteInput,
} from '../types/adminCustomer'
import type { AdminPaginatedResult } from '../types/adminShared'
import { cleanRut } from '../../lib/rut'

const customerSelect =
  'id, business_id, tax_id, legal_name, business_line, address_line_1, district, city, phone, email, notes, status, created_at, updated_at, created_by_user_id, updated_by_user_id'

export const adminCustomersService = {
  async list(filters: AdminCustomerListFilters): Promise<AdminPaginatedResult<AdminCustomer>> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.customers
    const { from, to, page, pageSize } = resolvePagination(filters)

    let query = client
      .from(sourceName)
      .select(customerSelect, { count: 'exact' })
      .eq('business_id', filters.businessId)

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    const search = filters.search?.trim()
    if (search) {
      const cleanSearch = cleanRut(search)
      const searchClauses = [
        `tax_id.ilike.%${search}%`,
        `legal_name.ilike.%${search}%`,
        `email.ilike.%${search}%`,
        `phone.ilike.%${search}%`,
      ]

      if (cleanSearch.length >= 2) {
        searchClauses.push(`tax_id_normalized.ilike.%${cleanSearch}%`)
      }

      query = query.or(searchClauses.join(','))
    }

    const result = await query.order('legal_name').range(from, to)

    if (result.error) {
      throw createAdminDataError(sourceName, 'clientes', result.error, filters)
    }

    if (!(result.data ?? []).length) {
      logAdminEmptyResult(sourceName, filters)
    }

    return toPaginatedResult(
      (result.data ?? []).map((row) => mapCustomerRow(row as AdminCustomerRow)),
      result.count ?? 0,
      { page, pageSize },
    )
  },

  async getById(customerId: string): Promise<AdminCustomer | null> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.customers
    const result = await client
      .from(sourceName)
      .select(customerSelect)
      .eq('id', customerId)
      .maybeSingle<AdminCustomerRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el detalle del cliente', result.error, { customerId })
    }

    return result.data ? mapCustomerRow(result.data) : null
  },

  async create(input: AdminCustomerWriteInput): Promise<AdminCustomer> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.customers
    const payload = toCustomerInsert(validateCustomerPayload(input))
    const result = await client
      .from(sourceName)
      .insert(payload)
      .select(customerSelect)
      .single<AdminCustomerRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el cliente', result.error, {
        businessId: input.businessId,
        operation: 'create',
      })
    }

    return mapCustomerRow(result.data)
  },

  async update(customerId: string, input: AdminCustomerWriteInput): Promise<AdminCustomer> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.customers
    const payload = toCustomerInsert(validateCustomerPayload(input))
    const result = await client
      .from(sourceName)
      .update(payload)
      .eq('id', customerId)
      .select(customerSelect)
      .single<AdminCustomerRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el cliente', result.error, {
        customerId,
        operation: 'update',
      })
    }

    return mapCustomerRow(result.data)
  },

  async listRecent(businessId: string, limit = 5): Promise<AdminCustomer[]> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.customers
    const result = await client
      .from(sourceName)
      .select(customerSelect)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (result.error) {
      throw createAdminDataError(sourceName, 'clientes recientes', result.error, { businessId, limit })
    }

    if (!(result.data ?? []).length) {
      logAdminEmptyResult(sourceName, { businessId, limit, scope: 'recent' })
    }

    return (result.data ?? []).map((row) => mapCustomerRow(row as AdminCustomerRow))
  },

  async search(
    filters: Pick<AdminCustomerListFilters, 'businessId' | 'search' | 'status'> & {
      limit?: number
    },
  ): Promise<AdminCustomer[]> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.customers
    const limit = Math.min(15, Math.max(1, filters.limit ?? 10))
    const search = filters.search?.trim()

    if (!search) {
      return []
    }

    let query = client.from(sourceName).select(customerSelect).eq('business_id', filters.businessId)

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    const cleanSearch = cleanRut(search)
    const searchClauses = [
      `tax_id.ilike.%${search}%`,
      `legal_name.ilike.%${search}%`,
      `email.ilike.%${search}%`,
      `phone.ilike.%${search}%`,
    ]

    if (cleanSearch.length >= 2) {
      searchClauses.push(`tax_id_normalized.ilike.%${cleanSearch}%`)
    }

    query = query.or(searchClauses.join(','))

    const result = await query.order('legal_name').limit(limit)

    if (result.error) {
      throw createAdminDataError(sourceName, 'clientes', result.error, filters)
    }

    if (!(result.data ?? []).length) {
      logAdminEmptyResult(sourceName, { ...filters, scope: 'search' })
    }

    return (result.data ?? []).map((row) => mapCustomerRow(row as AdminCustomerRow))
  },

  async listAvailableForDocuments(
    businessId: string,
    limit = 200,
  ): Promise<AdminCustomersDocumentAvailability> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.customers
    const safeLimit = Math.min(200, Math.max(1, limit))

    console.info('[adminCustomers] Loading customers for issued documents.', {
      businessId,
      status: 'active',
      limit: safeLimit,
    })

    const activeResult = await client
      .from(sourceName)
      .select(customerSelect, { count: 'exact' })
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('legal_name')
      .limit(safeLimit)

    if (activeResult.error) {
      throw createAdminDataError(sourceName, 'clientes activos', activeResult.error, {
        businessId,
        status: 'active',
        scope: 'issued-documents',
      })
    }

    const activeItems = (activeResult.data ?? []).map((row) => mapCustomerRow(row as AdminCustomerRow))

    if (activeItems.length) {
      console.info('[adminCustomers] Active customers loaded for issued documents.', {
        businessId,
        totalActive: activeItems.length,
      })

      return {
        items: activeItems,
        totalActive: activeResult.count ?? activeItems.length,
        totalAll: activeResult.count ?? activeItems.length,
        statusBreakdown: { active: activeResult.count ?? activeItems.length },
      }
    }

    const allResult = await client
      .from(sourceName)
      .select('id, status', { count: 'exact' })
      .eq('business_id', businessId)

    if (allResult.error) {
      throw createAdminDataError(sourceName, 'clientes del negocio', allResult.error, {
        businessId,
        scope: 'issued-documents-diagnostics',
      })
    }

    const statusBreakdown = (allResult.data ?? []).reduce<Record<string, number>>((accumulator, row) => {
      const key = typeof row.status === 'string' && row.status.trim() ? row.status : 'unknown'
      accumulator[key] = (accumulator[key] ?? 0) + 1
      return accumulator
    }, {})

    console.warn('[adminCustomers] No active customers available for issued documents.', {
      businessId,
      totalActive: 0,
      totalAll: allResult.count ?? 0,
      statusBreakdown,
    })

    return {
      items: [],
      totalActive: 0,
      totalAll: allResult.count ?? 0,
      statusBreakdown,
    }
  },
}
