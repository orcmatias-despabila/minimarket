import type { InventoryMovement } from '../../../types/domain'

export interface InventoryState {
  movements: InventoryMovement[]
}

export type InventoryAction =
  | { type: 'hydrate'; payload: InventoryMovement[] }
  | { type: 'record_movement'; payload: InventoryMovement }

export const inventoryReducer = (
  state: InventoryState,
  action: InventoryAction,
): InventoryState => {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        movements: action.payload,
      }

    case 'record_movement':
      return {
        ...state,
        movements: [action.payload, ...state.movements],
      }

    default:
      return state
  }
}
