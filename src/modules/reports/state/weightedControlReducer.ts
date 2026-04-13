import type { WeightedDailyControl } from '../../../types/domain'

export interface WeightedControlState {
  items: WeightedDailyControl[]
}

export type WeightedControlAction =
  | { type: 'create'; payload: WeightedDailyControl }
  | { type: 'remove'; payload: { controlId: string } }

export const weightedControlReducer = (
  state: WeightedControlState,
  action: WeightedControlAction,
): WeightedControlState => {
  switch (action.type) {
    case 'create':
      return {
        ...state,
        items: [action.payload, ...state.items],
      }

    case 'remove':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload.controlId),
      }

    default:
      return state
  }
}
