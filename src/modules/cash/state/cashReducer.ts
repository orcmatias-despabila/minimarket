import type { CashSession } from '../../../types/domain'

export interface CashState {
  sessions: CashSession[]
}

export type CashAction =
  | { type: 'open_session'; payload: CashSession }
  | {
      type: 'close_session'
      payload: {
        sessionId: string
        closedAt: string
        actualCashCounted: number
      }
    }

export const cashReducer = (
  state: CashState,
  action: CashAction,
): CashState => {
  switch (action.type) {
    case 'open_session':
      return {
        ...state,
        sessions: [action.payload, ...state.sessions],
      }

    case 'close_session':
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.payload.sessionId
            ? {
                ...session,
                status: 'closed',
                closedAt: action.payload.closedAt,
                actualCashCounted: action.payload.actualCashCounted,
              }
            : session,
        ),
      }

    default:
      return state
  }
}
