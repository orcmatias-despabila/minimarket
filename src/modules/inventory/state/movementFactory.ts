import type { InventoryMovement, Product } from '../../../types/domain'
import { createId } from '../../../lib/ids'

export type InventoryMovementType =
  | 'stock_in'
  | 'manual_adjustment'
  | 'waste'
  | 'sale_output'

export interface InventoryMovementInput {
  product: Product
  type: InventoryMovementType
  quantity: number
  reason: string
  createdAt: string
  businessId?: string
  createdByUserId?: string
  associatedCost?: number
}

export const createInventoryMovement = ({
  product,
  type,
  quantity,
  reason,
  createdAt,
  businessId,
  createdByUserId,
  associatedCost,
}: InventoryMovementInput): InventoryMovement => ({
  id: createId('inventory-movement'),
  tenantId: businessId,
  createdByUserId,
  productId: product.id,
  productName: product.name,
  type,
  quantity,
  reason,
  associatedCost,
  createdAt,
})
