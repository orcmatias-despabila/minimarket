import { createId } from '../../lib/ids'
import type { AuditLog, UserRole } from '../../types/domain'
import { auditLogsTableName, supabaseClient } from './supabaseClient'

interface AuditLogRecord {
  id: string
  business_id: string
  actor_user_id: string | null
  actor_membership_id: string | null
  actor_role: UserRole | null
  actor_visible_code: string | null
  entity_name: string
  entity_id: string
  entity_label: string | null
  action: AuditLog['action']
  action_type: AuditLog['actionType'] | null
  summary: string
  created_at: string
}

export interface CreateAuditLogInput {
  businessId: string
  actorUserId?: string | null
  actorMembershipId?: string | null
  actorRole?: UserRole | null
  actorVisibleCode?: string | null
  entityName: string
  entityId: string
  entityLabel?: string
  action: AuditLog['action']
  actionType?: AuditLog['actionType']
  summary: string
  createdAt?: string
}

const mapAuditRecord = (record: AuditLogRecord): AuditLog => ({
  id: record.id,
  tenantId: record.business_id,
  actorUserId: record.actor_user_id ?? undefined,
  actorMembershipId: record.actor_membership_id ?? undefined,
  actorRole: record.actor_role ?? undefined,
  actorVisibleCode: record.actor_visible_code ?? undefined,
  entityName: record.entity_name,
  entityId: record.entity_id,
  entityLabel: record.entity_label ?? undefined,
  action: record.action,
  actionType: record.action_type ?? undefined,
  createdAt: record.created_at,
  summary: record.summary,
})

export const auditLogService = {
  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const createdAt = input.createdAt ?? new Date().toISOString()

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from(auditLogsTableName)
        .insert({
          business_id: input.businessId,
          actor_user_id: input.actorUserId ?? null,
          actor_membership_id: input.actorMembershipId ?? null,
          actor_role: input.actorRole ?? null,
          actor_visible_code: input.actorVisibleCode ?? null,
          entity_name: input.entityName,
          entity_id: input.entityId,
          entity_label: input.entityLabel ?? null,
          action: input.action,
          action_type: input.actionType ?? null,
          summary: input.summary,
          created_at: createdAt,
        })
        .select(
          'id, business_id, actor_user_id, actor_membership_id, actor_role, actor_visible_code, entity_name, entity_id, entity_label, action, action_type, summary, created_at',
        )
        .single<AuditLogRecord>()

      if (error) {
        throw new Error(`No pudimos registrar auditoria: ${error.message}`)
      }

      return mapAuditRecord(data)
    }

    return {
      id: createId('audit-log'),
      tenantId: input.businessId,
      actorUserId: input.actorUserId ?? undefined,
      actorMembershipId: input.actorMembershipId ?? undefined,
      actorRole: input.actorRole ?? undefined,
      actorVisibleCode: input.actorVisibleCode ?? undefined,
      entityName: input.entityName,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      action: input.action,
      actionType: input.actionType,
      createdAt,
      summary: input.summary,
    }
  },

  async listRecentByBusiness(businessId: string, limit = 20): Promise<AuditLog[]> {
    if (!supabaseClient) {
      return []
    }

    const { data, error } = await supabaseClient
      .from(auditLogsTableName)
      .select(
        'id, business_id, actor_user_id, actor_membership_id, actor_role, actor_visible_code, entity_name, entity_id, entity_label, action, action_type, summary, created_at',
      )
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`No pudimos cargar auditoria: ${error.message}`)
    }

    return (data ?? []).map((item) => mapAuditRecord(item as AuditLogRecord))
  },
}
