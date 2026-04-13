export type AdminEntityType =
  | 'document'
  | 'document_line'
  | 'document_reference'
  | 'document_attachment'
  | 'customer'
  | 'supplier'
  | 'other'

export type AdminActionType =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'deleted'
  | 'attachment_uploaded'
  | 'attachment_deleted'
  | 'other'

export interface AdminEntityEvent {
  id: string
  businessId: string
  entityType: AdminEntityType
  entityId: string
  actionType: AdminActionType
  previousData?: unknown
  newData?: unknown
  actorUserId?: string
  createdAt: string
}

export interface AdminEntityEventWriteInput {
  businessId: string
  entityType: AdminEntityType
  entityId: string
  actionType: AdminActionType
  previousData?: unknown
  newData?: unknown
}

export interface AdminEntityEventListFilters {
  businessId: string
  entityType?: AdminEntityType | 'all'
  entityId?: string
  page?: number
  pageSize?: number
}
