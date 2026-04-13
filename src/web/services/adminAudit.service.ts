import { adminTableNames, getAdminSupabaseClient, resolvePagination, toPaginatedResult } from './adminBase'
import { mapEntityEventRow, type AdminEntityEventRow } from './adminMappers'
import type {
  AdminEntityEvent,
  AdminEntityEventListFilters,
  AdminEntityEventWriteInput,
} from '../types/adminAudit'
import type { AdminPaginatedResult } from '../types/adminShared'

const eventSelect =
  'id, business_id, entity_type, entity_id, action_type, previous_data, new_data, actor_user_id, created_at'

export const adminAuditService = {
  async list(filters: AdminEntityEventListFilters): Promise<AdminPaginatedResult<AdminEntityEvent>> {
    const client = getAdminSupabaseClient()
    const { from, to, page, pageSize } = resolvePagination(filters)

    let query = client
      .from(adminTableNames.entityEvents)
      .select(eventSelect, { count: 'exact' })
      .eq('business_id', filters.businessId)

    if (filters.entityType && filters.entityType !== 'all') {
      query = query.eq('entity_type', filters.entityType)
    }

    if (filters.entityId) {
      query = query.eq('entity_id', filters.entityId)
    }

    const result = await query.order('created_at', { ascending: false }).range(from, to)

    if (result.error) {
      throw new Error(`No pudimos cargar la auditoria administrativa: ${result.error.message}`)
    }

    return toPaginatedResult(
      (result.data ?? []).map((row) => mapEntityEventRow(row as AdminEntityEventRow)),
      result.count ?? 0,
      { page, pageSize },
    )
  },

  async recordEvent(input: AdminEntityEventWriteInput): Promise<void> {
    const client = getAdminSupabaseClient()
    const result = await client.rpc('log_business_entity_event', {
      p_business_id: input.businessId,
      p_entity_type: input.entityType,
      p_entity_id: input.entityId,
      p_action_type: input.actionType,
      p_previous_data: input.previousData ?? null,
      p_new_data: input.newData ?? null,
    })

    if (result.error) {
      throw new Error(`No pudimos registrar el evento de auditoria: ${result.error.message}`)
    }
  },

  async recordEventSafely(input: AdminEntityEventWriteInput): Promise<boolean> {
    try {
      await this.recordEvent(input)
      return true
    } catch (error) {
      console.warn('No pudimos registrar auditoria administrativa.', error)
      return false
    }
  },

  async recordEntityMutation(params: {
    businessId: string
    entityType: AdminEntityEventWriteInput['entityType']
    entityId: string
    actionType: 'created' | 'updated'
    previousData?: unknown
    newData?: unknown
  }): Promise<boolean> {
    return this.recordEventSafely({
      businessId: params.businessId,
      entityType: params.entityType,
      entityId: params.entityId,
      actionType: params.actionType,
      previousData: params.previousData ?? null,
      newData: params.newData ?? null,
    })
  },

  async recordDocumentMutation(params: {
    businessId: string
    documentId: string
    actionType: 'created' | 'updated'
    previousData?: unknown
    newData: unknown
    previousStatus?: string | null
    nextStatus?: string | null
  }): Promise<void> {
    await this.recordEntityMutation({
      businessId: params.businessId,
      entityType: 'document',
      entityId: params.documentId,
      actionType: params.actionType,
      previousData: params.previousData ?? null,
      newData: params.newData,
    })

    if (
      params.actionType === 'updated' &&
      params.previousStatus &&
      params.nextStatus &&
      params.previousStatus !== params.nextStatus
    ) {
      await this.recordEventSafely({
        businessId: params.businessId,
        entityType: 'document',
        entityId: params.documentId,
        actionType: 'status_changed',
        previousData: { status: params.previousStatus },
        newData: { status: params.nextStatus },
      })
    }
  },
}
