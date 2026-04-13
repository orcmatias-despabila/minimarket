import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '../../types/domain'
import { webSupabaseClient } from '../lib/supabase'

interface ProfileRecord {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean | null
}

const profilesTableName =
  import.meta.env.EXPO_PUBLIC_SUPABASE_PROFILES_TABLE || 'profiles'

const ensureClient = () => {
  if (!webSupabaseClient) {
    throw new Error('Configura Supabase para habilitar perfiles.')
  }

  return webSupabaseClient
}

const toUserProfile = (record: ProfileRecord): UserProfile => ({
  id: record.id,
  fullName: record.full_name ?? '',
  email: record.email ?? '',
  role: 'cashier',
  isActive: record.is_active ?? true,
})

export const webProfileService = {
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
}
