import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { webSupabaseClient } from '../lib/supabase'
import type { AdminPaginatedResult, AdminPaginationInput } from '../types/adminShared'

const defaultPageSize = 20

export const adminTableNames = {
  customers: 'customers',
  suppliers: 'suppliers',
  employees: 'employees',
  employeeJobInfo: 'employee_job_info',
  roles: 'roles',
  permissions: 'permissions',
  rolePermissions: 'role_permissions',
  employeeAccess: 'employee_access',
  employeePermissionOverrides: 'employee_permission_overrides',
  documents: 'business_documents',
  documentLines: 'business_document_lines',
  documentReferences: 'business_document_references',
  documentAttachments: 'business_document_attachments',
  documentSiiSubmissions: 'business_document_sii_submissions',
  receivedDteInbox: 'business_received_dte_inbox',
  cafFiles: 'caf_files',
  entityEvents: 'business_entity_events',
  emittedDailyView: 'v_document_emitted_summary_daily',
  receivedDailyView: 'v_document_received_summary_daily',
  supplierRollupView: 'v_purchases_by_supplier_rollup',
  customerRollupView: 'v_sales_by_customer_rollup',
  typeRollupView: 'v_documents_by_type_rollup',
  creditNotesView: 'v_credit_notes_summary',
  purchasesVsSalesView: 'v_purchases_vs_sales_monthly',
  attachmentBucket: 'business-document-attachments',
} as const

const missingSchemaCacheCode = 'PGRST205'

export const getAdminSupabaseClient = (): SupabaseClient => {
  if (!webSupabaseClient) {
    throw new Error('Configura Supabase para habilitar el backoffice administrativo.')
  }

  return webSupabaseClient
}

export const createAdminDataError = (
  sourceName: string,
  label: string,
  error: PostgrestError,
  context?: Record<string, unknown>,
) => {
  const details = {
    sourceName,
    code: error.code ?? 'unknown',
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
    ...(context ?? {}),
  }

  if (error.code === missingSchemaCacheCode) {
    console.warn(`[adminData] ${sourceName} missing in schema cache.`, details)
    return new Error(
      `No pudimos cargar ${label} porque la tabla ${sourceName} no existe en Supabase o el schema cache no se ha actualizado.`,
    )
  }

  if (/permission denied|insufficient privileges|forbidden|not allowed/i.test(error.message)) {
    console.error(`[adminData] ${sourceName} permission error.`, details)
    return new Error(`No tienes permisos para acceder a ${label}.`)
  }

  console.error(`[adminData] ${sourceName} query failed.`, details)
  return new Error(`No pudimos cargar ${label} en este momento.`)
}

export const logAdminEmptyResult = (sourceName: string, context?: Record<string, unknown>) => {
  console.info(`[adminData] ${sourceName} returned no rows.`, context ?? {})
}

export const resolvePagination = (input?: AdminPaginationInput) => {
  const page = Math.max(1, input?.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, input?.pageSize ?? defaultPageSize))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  return { page, pageSize, from, to }
}

export const toPaginatedResult = <T>(
  items: T[],
  total: number,
  pagination?: AdminPaginationInput,
): AdminPaginatedResult<T> => {
  const { page, pageSize } = resolvePagination(pagination)

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  }
}

type DateRangeQuery = {
  gte: (column: string, value: string) => DateRangeQuery
  lte: (column: string, value: string) => DateRangeQuery
}

export const applyDateRange = <T extends DateRangeQuery>(
  query: T,
  column: string,
  dateFrom?: string,
  dateTo?: string,
) => {
  let nextQuery = query

  if (dateFrom) {
    nextQuery = nextQuery.gte(column, dateFrom) as T
  }

  if (dateTo) {
    nextQuery = nextQuery.lte(column, dateTo) as T
  }

  return nextQuery
}
