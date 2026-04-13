import type { InventoryMovement } from '../../../types/domain'

export const initialInventoryMovements: InventoryMovement[] = [
  {
    id: 'mov-1',
    productId: 'prod-1',
    productName: 'Pan Amasado',
    type: 'stock_in',
    quantity: 35,
    reason: 'Carga inicial de inventario',
    associatedCost: 790,
    createdAt: '2026-04-05T09:00:00',
  },
  {
    id: 'mov-2',
    productId: 'prod-2',
    productName: 'Leche Entera 1L',
    type: 'stock_in',
    quantity: 18,
    reason: 'Ingreso inicial de lacteos',
    associatedCost: 860,
    createdAt: '2026-04-05T08:30:00',
  },
  {
    id: 'mov-3',
    productId: 'prod-3',
    productName: 'Azucar 1kg',
    type: 'stock_in',
    quantity: 22,
    reason: 'Reposicion inicial',
    associatedCost: 930,
    createdAt: '2026-04-05T10:00:00',
  },
]
