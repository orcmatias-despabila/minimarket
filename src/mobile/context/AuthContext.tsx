import type { Session } from '@supabase/supabase-js'
import type { PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'
import { supabaseClient } from '../../../lib/supabase'
import { profileService } from '../services/profile.service'
import { supabaseAuthService } from '../services/supabase/auth.service'
import type { AuthContextValue, AuthCredentials, AuthProviderName } from '../types/auth'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      if (!supabaseClient) {
        if (isMounted) setIsLoading(false)
        return
      }

      try {
        const currentSession = await supabaseAuthService.getSession()
        if (isMounted) {
          setSession(currentSession)
        }
        if (currentSession?.user) {
          await profileService.ensureProfile(currentSession.user)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void bootstrap()

    if (!supabaseClient) {
      return () => {
        isMounted = false
      }
    }

    const client = supabaseClient

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      setIsLoading(false)
      if (nextSession?.user) {
        void profileService.ensureProfile(nextSession.user).catch(() => undefined)
      }
    })

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        client.auth.startAutoRefresh()
      } else {
        client.auth.stopAutoRefresh()
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
      appStateSubscription.remove()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isLoading,
      isAuthenticated: Boolean(session?.user),
      signIn: async (credentials: AuthCredentials) => {
        await supabaseAuthService.signIn(credentials)
      },
      signUp: async (credentials: AuthCredentials) => {
        const result = await supabaseAuthService.signUp(credentials)
        return {
          requiresEmailConfirmation: !result.session,
        }
      },
      signOut: async () => {
        await supabaseAuthService.signOut()
      },
      signInWithOAuth: async (provider: AuthProviderName) => {
        await supabaseAuthService.signInWithOAuth(provider)
      },
    }),
    [isLoading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
