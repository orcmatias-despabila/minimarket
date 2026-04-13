import type { Session, User } from '@supabase/supabase-js'

export interface AuthCredentials {
  email: string
  password: string
}

export type AuthProviderName = 'google' | 'facebook'

export interface AuthResult {
  user: User | null
  session: Session | null
}

export interface WebAuthContextValue {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  authCallbackMessage: string | null
  authCallbackError: string | null
  clearAuthCallbackState: () => void
  signIn: (credentials: AuthCredentials) => Promise<void>
  signUp: (credentials: AuthCredentials) => Promise<{ requiresEmailConfirmation: boolean }>
  signOut: () => Promise<void>
  signInWithOAuth: (provider: AuthProviderName) => Promise<void>
}
