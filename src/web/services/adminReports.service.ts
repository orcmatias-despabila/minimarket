import type { PostgrestError } from '@supabase/supabase-js'
import { applyDateRange, adminTableNames, getAdminSupabaseClient } from './adminBase'
import {
  mapCreditNoteSummaryRow,
  mapCustomerRollupRow,
  mapDailySummaryRow,
  mapPurchasesVsSalesRow,
  mapSupplierRollupRow,
  mapTypeRollupRow,
  type AdminCreditNoteSummaryRow,
  type AdminCustomerRollupRow,
  type AdminDailySummaryRow,
  type AdminDocumentsByTypeRollupRow,
  type AdminPurchasesVsSalesMonthlyRow,
  type AdminSupplierRollupRow,
} from './adminMappers'
import type {
  AdminCreditNoteSummary,
  AdminCustomerRollup,
  AdminDailyDocumentSummary,
  AdminDocumentsByTypeRollup,
  AdminPurchasesVsSalesMonthly,
  AdminReportQueryFilters,
  AdminSupplierRollup,
} from '../types/adminReport'

const missingSchemaCacheCode = 'PGRST205'

const getReportError = (
  sourceName: string,
  label: string,
  error: PostgrestError,
  context: Record<string, unknown>,
) => {
  const baseContext = {
    sourceName,
    code: error.code ?? 'unknown',
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
    ...context,
  }

  if (error.code === missingSchemaCacheCode) {
    console.warn(`[adminReports] ${sourceName} missing in schema cache.`, baseContext)
    return new Error(
      `No pudimos cargar ${label} porque la vista ${sourceName} no existe en Supabase o el schema cache no se ha actualizado.`,
    )
  }

  if (/permission denied|insufficient privileges|forbidden|not allowed/i.test(error.message)) {
    console.error(`[adminReports] ${sourceName} permission error.`, baseContext)
    return new Error(`No tienes permisos para leer ${label}.`)
  }

  console.error(`[adminReports] ${sourceName} query failed.`, baseContext)
  return new Error(`No pudimos cargar ${label} en este momento.`)
}

const logEmptyResult = (sourceName: string, context: Record<string, unknown>) => {
  console.info(`[adminReports] ${sourceName} returned no rows.`, context)
}

export const adminReportsService = {
  async listEmittedDaily(filters: AdminReportQueryFilters): Promise<AdminDailyDocumentSummary[]> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.emittedDailyView
    let query = client
      .from(sourceName)
      .select('*')
      .eq('business_id', filters.businessId)

    query = applyDateRange(query, 'issue_date', filters.dateFrom, filters.dateTo)

    const result = await query.order('issue_date', { ascending: false })

    if (result.error) {
      throw getReportError(sourceName, 'el resumen emitido', result.error, filters)
    }

    const rows = result.data ?? []
    if (!rows.length) {
      logEmptyResult(sourceName, filters)
    }

    return rows.map((row) => mapDailySummaryRow(row as AdminDailySummaryRow))
  },

  async listReceivedDaily(filters: AdminReportQueryFilters): Promise<AdminDailyDocumentSummary[]> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.receivedDailyView
    let query = client
      .from(sourceName)
      .select('*')
      .eq('business_id', filters.businessId)

    query = applyDateRange(query, 'issue_date', filters.dateFrom, filters.dateTo)

    const result = await query.order('issue_date', { ascending: false })

    if (result.error) {
      throw getReportError(sourceName, 'el resumen recibido', result.error, filters)
    }

    const rows = result.data ?? []
    if (!rows.length) {
      logEmptyResult(sourceName, filters)
    }

    return rows.map((row) => mapDailySummaryRow(row as AdminDailySummaryRow))
  },

  async listSupplierRollups(filters: AdminReportQueryFilters): Promise<AdminSupplierRollup[]> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.supplierRollupView
    const result = await client
      .from(sourceName)
      .select('*')
      .eq('business_id', filters.businessId)
      .order('total_amount', { ascending: false })

    if (result.error) {
      throw getReportError(sourceName, 'el resumen por proveedor', result.error, filters)
    }

    const rows = result.data ?? []
    if (!rows.length) {
      logEmptyResult(sourceName, filters)
    }

    return rows.map((row) => mapSupplierRollupRow(row as AdminSupplierRollupRow))
  },

  async listCustomerRollups(filters: AdminReportQueryFilters): Promise<AdminCustomerRollup[]> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.customerRollupView
    const result = await client
      .from(sourceName)
      .select('*')
      .eq('business_id', filters.businessId)
      .order('total_amount', { ascending: false })

    if (result.error) {
      throw getReportError(sourceName, 'el resumen por cliente', result.error, filters)
    }

    const rows = result.data ?? []
    if (!rows.length) {
      logEmptyResult(sourceName, filters)
    }

    return rows.map((row) => mapCustomerRollupRow(row as AdminCustomerRollupRow))
  },

  async listTypeRollups(filters: AdminReportQueryFilters): Promise<AdminDocumentsByTypeRollup[]> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.typeRollupView
    const result = await client
      .from(sourceName)
      .select('*')
      .eq('business_id', filters.businessId)
      .order('direction')
      .order('document_type')

    if (result.error) {
      throw getReportError(sourceName, 'el resumen por tipo documental', result.error, filters)
    }

    const rows = result.data ?? []
    if (!rows.length) {
      logEmptyResult(sourceName, filters)
    }

    return rows.map((row) => mapTypeRollupRow(row as AdminDocumentsByTypeRollupRow))
  },

  async listCreditNotesSummary(filters: AdminReportQueryFilters): Promise<AdminCreditNoteSummary[]> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.creditNotesView
    let query = client
      .from(sourceName)
      .select('*')
      .eq('business_id', filters.businessId)

    query = applyDateRange(query, 'issue_date', filters.dateFrom, filters.dateTo)

    const result = await query.order('issue_date', { ascending: false })

    if (result.error) {
      throw getReportError(sourceName, 'el resumen de notas de credito', result.error, filters)
    }

    const rows = result.data ?? []
    if (!rows.length) {
      logEmptyResult(sourceName, filters)
    }

    return rows.map((row) =>
      mapCreditNoteSummaryRow(row as AdminCreditNoteSummaryRow),
    )
  },

  async listPurchasesVsSales(filters: AdminReportQueryFilters): Promise<AdminPurchasesVsSalesMonthly[]> {
    const client = getAdminSupabaseClient()
    const sourceName = adminTableNames.purchasesVsSalesView
    const result = await client
      .from(sourceName)
      .select('*')
      .eq('business_id', filters.businessId)
      .order('period_month', { ascending: false })

    if (result.error) {
      throw getReportError(
        sourceName,
        'la comparacion de compras y ventas',
        result.error,
        filters,
      )
    }

    const rows = result.data ?? []
    if (!rows.length) {
      logEmptyResult(sourceName, filters)
    }

    return rows.map((row) =>
      mapPurchasesVsSalesRow(row as AdminPurchasesVsSalesMonthlyRow),
    )
  },
}
