import type { Session, User } from '@supabase/supabase-js'
import { supabaseClient } from '../../../../lib/supabase'
import type { AuthCredentials, AuthProviderName, AuthResult } from '../../types/auth'

const ensureClient = () => {
  if (!supabaseClient) {
    throw new Error('Configura Supabase para habilitar autenticacion.')
  }

  return supabaseClient
}

const toFriendlyAuthError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return new Error('No pudimos completar la autenticacion.')
  }

  const normalized = error.message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return new Error('Correo o contrasena incorrectos.')
  }

  if (normalized.includes('email not confirmed')) {
    return new Error('Debes confirmar tu correo antes de ingresar.')
  }

  if (normalized.includes('user already registered')) {
    return new Error('Ese correo ya esta registrado.')
  }

  if (normalized.includes('password should be at least')) {
    return new Error('La contrasena es demasiado corta.')
  }

  return error
}

export const supabaseAuthService = {
  async getSession(): Promise<Session | null> {
    const client = ensureClient()
    const { data, error } = await client.auth.getSession()
    if (error) throw toFriendlyAuthError(error)
    return data.session
  },

  async signIn({ email, password }: AuthCredentials): Promise<User> {
    const client = ensureClient()
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw toFriendlyAuthError(error)
    if (!data.user) {
      throw new Error('No pudimos iniciar sesion con esa cuenta.')
    }

    return data.user
  },

  async signUp({ email, password }: AuthCredentials): Promise<AuthResult> {
    const client = ensureClient()
    const { data, error } = await client.auth.signUp({ email, password })
    if (error) throw toFriendlyAuthError(error)

    return {
      user: data.user,
      session: data.session,
    }
  },

  async signOut() {
    const client = ensureClient()
    const { error } = await client.auth.signOut()
    if (error) throw toFriendlyAuthError(error)
  },

  async signInWithOAuth(provider: AuthProviderName) {
    throw new Error(`Login con ${provider} aun no esta habilitado en esta fase.`)
  },
}
