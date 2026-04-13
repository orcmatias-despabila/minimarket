import type { Sale } from '../../../types/domain'

export interface SalesState {
  items: Sale[]
}

export type SalesAction =
  | { type: 'hydrate'; payload: Sale[] }
  | { type: 'record_sale'; payload: Sale }

export const salesReducer = (
  state: SalesState,
  action: SalesAction,
): SalesState => {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        items: action.payload,
      }

    case 'record_sale':
      return {
        ...state,
        items: [action.payload, ...state.items],
      }

    default:
      return state
  }
}
