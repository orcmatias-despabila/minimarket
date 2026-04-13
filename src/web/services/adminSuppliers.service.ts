import {
  adminTableNames,
  createAdminDataError,
  getAdminSupabaseClient,
  logAdminEmptyResult,
  resolvePagination,
  toPaginatedResult,
} from './adminBase'
import { mapSupplierRow, toSupplierInsert, type AdminSupplierRow } from './adminMappers'
import { validateSupplierPayload } from './adminValidators'
import type {
  AdminSupplier,
  AdminSupplierListFilters,
  AdminSupplierWriteInput,
  AdminSuppliersDocumentAvailability,
} from '../types/adminSupplier'
import type { AdminPaginatedResult } from '../types/adminShared'
import { cleanRut } from '../../lib/rut'

const supplierSelect =
  'id, business_id, tax_id, legal_name, business_line, address_line_1, district, city, phone, email, contact_name, notes, status, created_at, updated_at, created_by_user_id, updated_by_user_id'

export const adminSuppliersService = {
  async list(filters: AdminSupplierListFilters): Promise<AdminPaginatedResult<AdminSupplier>> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.suppliers
    const { from, to, page, pageSize } = resolvePagination(filters)

    let query = client
      .from(sourceName)
      .select(supplierSelect, { count: 'exact' })
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
        `contact_name.ilike.%${search}%`,
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
      throw createAdminDataError(sourceName, 'proveedores', result.error, filters)
    }

    if (!(result.data ?? []).length) {
      logAdminEmptyResult(sourceName, filters)
    }

    return toPaginatedResult(
      (result.data ?? []).map((row) => mapSupplierRow(row as AdminSupplierRow)),
      result.count ?? 0,
      { page, pageSize },
    )
  },

  async getById(supplierId: string): Promise<AdminSupplier | null> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.suppliers
    const result = await client
      .from(sourceName)
      .select(supplierSelect)
      .eq('id', supplierId)
      .maybeSingle<AdminSupplierRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el detalle del proveedor', result.error, { supplierId })
    }

    return result.data ? mapSupplierRow(result.data) : null
  },

  async findByTaxId(businessId: string, taxId: string): Promise<AdminSupplier | null> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.suppliers
    const normalized = cleanRut(taxId)

    if (!normalized) {
      return null
    }

    const result = await client
      .from(sourceName)
      .select(supplierSelect)
      .eq('business_id', businessId)
      .eq('tax_id_normalized', normalized)
      .maybeSingle<AdminSupplierRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el proveedor por RUT', result.error, {
        businessId,
        taxId: normalized,
      })
    }

    return result.data ? mapSupplierRow(result.data) : null
  },

  async create(input: AdminSupplierWriteInput): Promise<AdminSupplier> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.suppliers
    const payload = toSupplierInsert(validateSupplierPayload(input))
    const result = await client
      .from(sourceName)
      .insert(payload)
      .select(supplierSelect)
      .single<AdminSupplierRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el proveedor', result.error, {
        businessId: input.businessId,
        operation: 'create',
      })
    }

    return mapSupplierRow(result.data)
  },

  async update(supplierId: string, input: AdminSupplierWriteInput): Promise<AdminSupplier> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.suppliers
    const payload = toSupplierInsert(validateSupplierPayload(input))
    const result = await client
      .from(sourceName)
      .update(payload)
      .eq('id', supplierId)
      .select(supplierSelect)
      .single<AdminSupplierRow>()

    if (result.error) {
      throw createAdminDataError(sourceName, 'el proveedor', result.error, {
        supplierId,
        operation: 'update',
      })
    }

    return mapSupplierRow(result.data)
  },

  async listRecent(businessId: string, limit = 5): Promise<AdminSupplier[]> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.suppliers
    const result = await client
      .from(sourceName)
      .select(supplierSelect)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (result.error) {
      throw createAdminDataError(sourceName, 'proveedores recientes', result.error, { businessId, limit })
    }

    if (!(result.data ?? []).length) {
      logAdminEmptyResult(sourceName, { businessId, limit, scope: 'recent' })
    }

    return (result.data ?? []).map((row) => mapSupplierRow(row as AdminSupplierRow))
  },

  async search(
    filters: Pick<AdminSupplierListFilters, 'businessId' | 'search' | 'status'> & {
      limit?: number
    },
  ): Promise<AdminSupplier[]> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.suppliers
    const limit = Math.min(15, Math.max(1, filters.limit ?? 10))
    const search = filters.search?.trim()

    if (!search) {
      return []
    }

    let query = client.from(sourceName).select(supplierSelect).eq('business_id', filters.businessId)

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    const cleanSearch = cleanRut(search)
    const searchClauses = [
      `tax_id.ilike.%${search}%`,
      `legal_name.ilike.%${search}%`,
      `contact_name.ilike.%${search}%`,
      `email.ilike.%${search}%`,
      `phone.ilike.%${search}%`,
    ]

    if (cleanSearch.length >= 2) {
      searchClauses.push(`tax_id_normalized.ilike.%${cleanSearch}%`)
    }

    query = query.or(searchClauses.join(','))

    const result = await query.order('legal_name').limit(limit)

    if (result.error) {
      throw createAdminDataError(sourceName, 'proveedores', result.error, filters)
    }

    if (!(result.data ?? []).length) {
      logAdminEmptyResult(sourceName, { ...filters, scope: 'search' })
    }

    return (result.data ?? []).map((row) => mapSupplierRow(row as AdminSupplierRow))
  },

  async listAvailableForDocuments(
    businessId: string,
    limit = 200,
  ): Promise<AdminSuppliersDocumentAvailability> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.suppliers
    const safeLimit = Math.min(200, Math.max(1, limit))

    console.info('[adminSuppliers] Loading suppliers for received documents.', {
      businessId,
      status: 'active',
      limit: safeLimit,
    })

    const activeResult = await client
      .from(sourceName)
      .select(supplierSelect, { count: 'exact' })
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('legal_name')
      .limit(safeLimit)

    if (activeResult.error) {
      throw createAdminDataError(sourceName, 'proveedores activos', activeResult.error, {
        businessId,
        status: 'active',
        scope: 'received-documents',
      })
    }

    const activeItems = (activeResult.data ?? []).map((row) => mapSupplierRow(row as AdminSupplierRow))

    if (activeItems.length) {
      console.info('[adminSuppliers] Active suppliers loaded for received documents.', {
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
      throw createAdminDataError(sourceName, 'proveedores del negocio', allResult.error, {
        businessId,
        scope: 'received-documents-diagnostics',
      })
    }

    const statusBreakdown = (allResult.data ?? []).reduce<Record<string, number>>((accumulator, row) => {
      const key = typeof row.status === 'string' && row.status.trim() ? row.status : 'unknown'
      accumulator[key] = (accumulator[key] ?? 0) + 1
      return accumulator
    }, {})

    console.warn('[adminSuppliers] No active suppliers available for received documents.', {
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
