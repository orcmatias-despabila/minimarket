import type { InventoryMovement } from '../../types/domain'
import { supabaseClient } from '../../../lib/supabase'
import type { InventoryMovementRecord } from '../types/supabase'

const inventoryMovementsTableName =
  process.env.EXPO_PUBLIC_SUPABASE_INVENTORY_MOVEMENTS_TABLE ?? 'inventory_movements'

export interface PersistInventoryMovementInput {
  movement: InventoryMovement
  businessId?: string | null
  actorUserId?: string | null
}

export interface PersistInventoryMovementResult {
  movement: InventoryMovement
  source: 'supabase' | 'local'
}

const toMovement = (record: InventoryMovementRecord): InventoryMovement => ({
  id: record.id,
  tenantId: record.business_id ?? undefined,
  createdByUserId: record.created_by_profile_id ?? undefined,
  productId: record.product_id,
  productName: record.product_name,
  type:
    record.movement_type === 'stock_in'
      ? 'stock_in'
      : record.movement_type === 'waste'
        ? 'waste'
        : record.movement_type === 'sale'
          ? 'sale_output'
          : 'manual_adjustment',
  quantity: Number(record.quantity ?? 0),
  reason: record.reason ?? '',
  associatedCost: record.unit_cost ?? undefined,
  createdAt: record.created_at,
})

export const inventoryService = {
  async listByBusiness(businessId?: string | null): Promise<InventoryMovement[]> {
    if (!supabaseClient || !businessId) {
      return []
    }

    const result = await supabaseClient
      .from(inventoryMovementsTableName)
      .select(
        'id, business_id, created_by_profile_id, product_id, product_name, movement_type, quantity, reason, unit_cost, created_at',
      )
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (result.error) {
      throw new Error(`No pudimos cargar inventario: ${result.error.message}`)
    }

    return (result.data ?? []).map((item) => toMovement(item as InventoryMovementRecord))
  },

  async record(
    input: PersistInventoryMovementInput,
  ): Promise<PersistInventoryMovementResult> {
    const movement: InventoryMovement = {
      ...input.movement,
      tenantId: input.businessId ?? input.movement.tenantId,
      createdByUserId: input.actorUserId ?? input.movement.createdByUserId,
    }

    if (!supabaseClient) {
      return {
        movement,
        source: 'local',
      }
    }

    const result = await supabaseClient
      .from(inventoryMovementsTableName)
      .insert({
        id: movement.id,
        business_id: movement.tenantId ?? null,
        created_by_profile_id: movement.createdByUserId ?? null,
        product_id: movement.productId,
        product_name: movement.productName,
        movement_type:
          movement.type === 'sale_output'
            ? 'sale'
            : movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
        unit_cost: movement.associatedCost ?? null,
        created_at: movement.createdAt,
      })
      .select(
        'id, business_id, created_by_profile_id, product_id, product_name, movement_type, quantity, reason, unit_cost, created_at',
      )
      .single<InventoryMovementRecord>()

    if (result.error) {
      throw new Error(
        `No pudimos guardar el movimiento de inventario: ${result.error.message}`,
      )
    }

    return {
      movement: toMovement(result.data),
      source: 'supabase',
    }
  },
}
