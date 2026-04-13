import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '../../types/domain'
import { supabaseClient } from '../../../lib/supabase'
import type { ProfileRecord } from '../types/supabase'

const profilesTableName =
  process.env.EXPO_PUBLIC_SUPABASE_PROFILES_TABLE ?? 'profiles'

const ensureClient = () => {
  if (!supabaseClient) {
    throw new Error('Configura Supabase para habilitar perfiles.')
  }

  return supabaseClient
}

const toUserProfile = (record: ProfileRecord): UserProfile => ({
  id: record.id,
  fullName: record.full_name ?? '',
  email: record.email ?? '',
  role: 'cashier',
  isActive: record.is_active ?? true,
})

export const profileService = {
  async ensureProfile(user: Pick<User, 'id' | 'email' | 'user_metadata'>): Promise<UserProfile> {
    const client = ensureClient()
    const fullName =
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : ''

    const result = await client
      .from(profilesTableName)
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name: fullName,
        },
        { onConflict: 'id' },
      )
      .select('id, email, full_name, phone, avatar_url, is_active')
      .single<ProfileRecord>()

    if (result.error) {
      throw new Error(`No pudimos sincronizar tu perfil: ${result.error.message}`)
    }

    return toUserProfile(result.data)
  },

  async getMyProfile(userId: string): Promise<UserProfile | null> {
    const client = ensureClient()
    const result = await client
      .from(profilesTableName)
      .select('id, email, full_name, phone, avatar_url, is_active')
      .eq('id', userId)
      .maybeSingle<ProfileRecord>()

    if (result.error) {
      throw new Error(`No pudimos cargar tu perfil: ${result.error.message}`)
    }

    return result.data ? toUserProfile(result.data) : null
  },
}
