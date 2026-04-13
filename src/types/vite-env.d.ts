/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly EXPO_PUBLIC_SUPABASE_URL?: string
  readonly EXPO_PUBLIC_SUPABASE_ANON_KEY?: string
  readonly EXPO_PUBLIC_SUPABASE_PROFILES_TABLE?: string
  readonly EXPO_PUBLIC_SUPABASE_BUSINESSES_TABLE?: string
  readonly EXPO_PUBLIC_SUPABASE_BUSINESS_MEMBERS_TABLE?: string
  readonly EXPO_PUBLIC_SUPABASE_BUSINESS_MEMBERSHIPS_TABLE?: string
  readonly EXPO_PUBLIC_SUPABASE_BUSINESS_INVITATIONS_TABLE?: string
  readonly EXPO_PUBLIC_SUPABASE_PRODUCTS_TABLE?: string
  readonly EXPO_PUBLIC_SUPABASE_INVENTORY_MOVEMENTS_TABLE?: string
  readonly EXPO_PUBLIC_SUPABASE_SALES_TABLE?: string
  readonly EXPO_PUBLIC_SUPABASE_SALE_ITEMS_TABLE?: string
  readonly EXPO_PUBLIC_SUPABASE_CASH_SESSIONS_TABLE?: string
  readonly EXPO_PUBLIC_SUPABASE_AUDIT_LOGS_TABLE?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
