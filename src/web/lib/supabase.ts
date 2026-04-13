import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined

const supabaseUrl =
  env?.EXPO_PUBLIC_SUPABASE_URL ||
  env?.VITE_SUPABASE_URL ||
  ''

const supabaseAnonKey =
  env?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  env?.VITE_SUPABASE_ANON_KEY ||
  ''

export const isWebSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const webSupabaseClient: SupabaseClient | null = isWebSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
