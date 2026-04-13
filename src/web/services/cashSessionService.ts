import type { CashSession } from '../../types/domain'
import { webSupabaseClient } from '../lib/supabase'

interface CashSessionRecord {
  id: string
  business_id: string | null
  business_date: string
  opened_at: string
  opened_by_user_id: string | null
  opening_amount: number
  status: CashSession['status']
  closed_at: string | null
  closed_by_user_id: string | null
  actual_cash_counted: number | null
}

const cashSessionsTableName =
  import.meta.env.EXPO_PUBLIC_SUPABASE_CASH_SESSIONS_TABLE || 'cash_sessions'

export interface OpenCashSessionInput {
  session: CashSession
  businessId?: string | null
  actorUserId?: string | null
}

export interface CloseCashSessionInput {
  sessionId: string
  businessId?: string | null
  actorUserId?: string | null
  closedAt: string
  actualCashCounted: number
}

export interface CashSessionResult {
  session: CashSession
  source: 'supabase' | 'local'
}

const isMissingSchemaError = (message: string) =>
  message.includes('relation') ||
  message.includes('does not exist') ||
  message.includes('business_id') ||
  message.includes('column')

const toSession = (record: CashSessionRecord): CashSession => ({
  id: record.id,
  tenantId: record.business_id ?? undefined,
  businessDate: record.business_date,
  openedAt: record.opened_at,
  openedByUserId: record.opened_by_user_id ?? undefined,
  openingAmount: Number(record.opening_amount ?? 0),
  status: record.status,
  closedAt: record.closed_at ?? undefined,
  closedByUserId: record.closed_by_user_id ?? undefined,
  actualCashCounted: record.actual_cash_counted ?? undefined,
})

export const webCashSessionService = {
  async listByBusiness(businessId?: string | null): Promise<CashSession[]> {
    if (!webSupabaseClient || !businessId) {
      return []
    }

    const response = await webSupabaseClient
      .from(cashSessionsTableName)
      .select(
        'id, business_id, business_date, opened_at, opened_by_user_id, opening_amount, status, closed_at, closed_by_user_id, actual_cash_counted',
      )
      .eq('business_id', businessId)
      .order('opened_at', { ascending: false })
      .limit(30)

    if (response.error) {
      if (isMissingSchemaError(response.error.message)) {
        return []
      }
      throw new Error(`No pudimos cargar las cajas: ${response.error.message}`)
    }

    return (response.data ?? []).map((item) => toSession(item as CashSessionRecord))
  },

  async openSession(input: OpenCashSessionInput): Promise<CashSessionResult> {
    const session: CashSession = {
      ...input.session,
      tenantId: input.businessId ?? input.session.tenantId,
      openedByUserId: input.actorUserId ?? input.session.openedByUserId,
    }

    if (!webSupabaseClient) {
      return {
        session,
        source: 'local',
      }
    }

    const response = await webSupabaseClient
      .from(cashSessionsTableName)
      .insert({
        id: session.id,
        business_id: session.tenantId ?? null,
        business_date: session.businessDate,
        opened_at: session.openedAt,
        opened_by_user_id: session.openedByUserId ?? null,
        opening_amount: session.openingAmount,
        status: session.status,
      })
      .select(
        'id, business_id, business_date, opened_at, opened_by_user_id, opening_amount, status, closed_at, closed_by_user_id, actual_cash_counted',
      )
      .single<CashSessionRecord>()

    if (response.error) {
      if (isMissingSchemaError(response.error.message)) {
        return {
          session,
          source: 'local',
        }
      }
      throw new Error(`No pudimos abrir la caja en Supabase: ${response.error.message}`)
    }

    return {
      session: toSession(response.data),
      source: 'supabase',
    }
  },

  async closeSession(input: CloseCashSessionInput): Promise<CashSessionResult> {
    if (!webSupabaseClient) {
      return {
        session: {
          id: input.sessionId,
          tenantId: input.businessId ?? undefined,
          businessDate: '',
          openedAt: '',
          openingAmount: 0,
          status: 'closed',
          closedAt: input.closedAt,
          closedByUserId: input.actorUserId ?? undefined,
          actualCashCounted: input.actualCashCounted,
        },
        source: 'local',
      }
    }

    const response = await webSupabaseClient
      .from(cashSessionsTableName)
      .update({
        status: 'closed',
        closed_at: input.closedAt,
        closed_by_user_id: input.actorUserId ?? null,
        actual_cash_counted: input.actualCashCounted,
      })
      .eq('id', input.sessionId)
      .select(
        'id, business_id, business_date, opened_at, opened_by_user_id, opening_amount, status, closed_at, closed_by_user_id, actual_cash_counted',
      )
      .single<CashSessionRecord>()

    if (response.error) {
      if (isMissingSchemaError(response.error.message)) {
        return {
          session: {
            id: input.sessionId,
            tenantId: input.businessId ?? undefined,
            businessDate: '',
            openedAt: '',
            openingAmount: 0,
            status: 'closed',
            closedAt: input.closedAt,
            closedByUserId: input.actorUserId ?? undefined,
            actualCashCounted: input.actualCashCounted,
          },
          source: 'local',
        }
      }
      throw new Error(`No pudimos cerrar la caja en Supabase: ${response.error.message}`)
    }

    return {
      session: toSession(response.data),
      source: 'supabase',
    }
  },
}
