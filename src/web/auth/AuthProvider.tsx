import type { Session } from '@supabase/supabase-js'
import type { PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { webProfileService } from '../services/profile.service'
import { webAuthService } from '../services/auth.service'
import { webSupabaseClient } from '../lib/supabase'
import type { WebAuthContextValue, AuthCredentials, AuthProviderName } from '../types/auth'

const WebAuthContext = createContext<WebAuthContextValue | null>(null)

export function WebAuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authCallbackMessage, setAuthCallbackMessage] = useState<string | null>(null)
  const [authCallbackError, setAuthCallbackError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const clearAuthUrlArtifacts = () => {
      if (typeof window === 'undefined') return

      const url = new URL(window.location.href)
      const hadSearch = Boolean(url.search)
      const hadHash = Boolean(url.hash)

      if (!hadSearch && !hadHash) return

      url.hash = ''
      url.search = ''
      window.history.replaceState({}, document.title, url.toString())
    }

    const parseAuthCallbackFromUrl = () => {
      if (typeof window === 'undefined') return

      const searchParams = new URLSearchParams(window.location.search)
      const hashSource = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      const hashParams = new URLSearchParams(hashSource)

      const accessToken = searchParams.get('access_token') ?? hashParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token') ?? hashParams.get('refresh_token')
      const errorCode = searchParams.get('error_code') ?? hashParams.get('error_code')
      const errorDescription =
        searchParams.get('error_description') ?? hashParams.get('error_description')
      const authError = searchParams.get('error') ?? hashParams.get('error')
      const authType = searchParams.get('type') ?? hashParams.get('type')

      if (authError || errorCode || errorDescription) {
        const normalizedError = `${authError ?? ''} ${errorCode ?? ''} ${errorDescription ?? ''}`
          .toLowerCase()
          .trim()

        if (normalizedError.includes('otp_expired')) {
          setAuthCallbackError(
            'El enlace de confirmacion vencio. Vuelve a registrarte o solicita uno nuevo.',
          )
        } else {
          setAuthCallbackError(
            decodeURIComponent(errorDescription ?? authError ?? 'No pudimos validar ese enlace.'),
          )
        }

        clearAuthUrlArtifacts()
        return
      }

      if (accessToken || refreshToken || authType === 'signup') {
        setAuthCallbackMessage('Correo confirmado. Estamos preparando tu acceso...')
      }
    }

    const bootstrap = async () => {
      if (!webSupabaseClient) {
        if (isMounted) setIsLoading(false)
        return
      }

      parseAuthCallbackFromUrl()

      try {
        const currentSession = await webAuthService.getSession()
        if (isMounted) {
          setSession(currentSession)
        }
        if (currentSession?.user) {
          await webProfileService.ensureProfile(currentSession.user)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void bootstrap()

    if (!webSupabaseClient) {
      return () => {
        isMounted = false
      }
    }

    const client = webSupabaseClient
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      setIsLoading(false)

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setAuthCallbackError(null)
        setAuthCallbackMessage('Acceso validado correctamente.')
        clearAuthUrlArtifacts()
      }

      if (nextSession?.user) {
        void webProfileService.ensureProfile(nextSession.user).catch(() => undefined)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<WebAuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isLoading,
      isAuthenticated: Boolean(session?.user),
      authCallbackMessage,
      authCallbackError,
      clearAuthCallbackState: () => {
        setAuthCallbackMessage(null)
        setAuthCallbackError(null)
      },
      signIn: async (credentials: AuthCredentials) => {
        await webAuthService.signIn(credentials)
      },
      signUp: async (credentials: AuthCredentials) => {
        const result = await webAuthService.signUp(credentials)
        return {
          requiresEmailConfirmation: !result.session,
        }
      },
      signOut: async () => {
        await webAuthService.signOut()
      },
      signInWithOAuth: async (provider: AuthProviderName) => {
        await webAuthService.signInWithOAuth(provider)
      },
    }),
    [authCallbackError, authCallbackMessage, isLoading, session],
  )

  return <WebAuthContext.Provider value={value}>{children}</WebAuthContext.Provider>
}

export const useWebAuth = () => {
  const context = useContext(WebAuthContext)
  if (!context) {
    throw new Error('useWebAuth must be used inside WebAuthProvider')
  }

  return context
}
