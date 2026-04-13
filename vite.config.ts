import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      'import.meta.env.EXPO_PUBLIC_SUPABASE_URL': JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      ),
      'import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      ),
      'import.meta.env.EXPO_PUBLIC_SUPABASE_PROFILES_TABLE': JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_PROFILES_TABLE ?? '',
      ),
      'import.meta.env.EXPO_PUBLIC_SUPABASE_BUSINESSES_TABLE': JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_BUSINESSES_TABLE ?? '',
      ),
      'import.meta.env.EXPO_PUBLIC_SUPABASE_BUSINESS_MEMBERS_TABLE': JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_BUSINESS_MEMBERS_TABLE ?? '',
      ),
      'import.meta.env.EXPO_PUBLIC_SUPABASE_BUSINESS_MEMBERSHIPS_TABLE': JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_BUSINESS_MEMBERSHIPS_TABLE ?? '',
      ),
      'import.meta.env.EXPO_PUBLIC_SUPABASE_BUSINESS_INVITATIONS_TABLE': JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_BUSINESS_INVITATIONS_TABLE ?? '',
      ),
      'import.meta.env.EXPO_PUBLIC_SUPABASE_PRODUCTS_TABLE': JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_PRODUCTS_TABLE ?? '',
      ),
      'import.meta.env.EXPO_PUBLIC_SUPABASE_INVENTORY_MOVEMENTS_TABLE': JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_INVENTORY_MOVEMENTS_TABLE ?? '',
      ),
      'import.meta.env.EXPO_PUBLIC_SUPABASE_SALES_TABLE': JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_SALES_TABLE ?? '',
      ),
      'import.meta.env.EXPO_PUBLIC_SUPABASE_SALE_ITEMS_TABLE': JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_SALE_ITEMS_TABLE ?? '',
      ),
      'import.meta.env.EXPO_PUBLIC_SUPABASE_CASH_SESSIONS_TABLE': JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_CASH_SESSIONS_TABLE ?? '',
      ),
      'import.meta.env.EXPO_PUBLIC_SUPABASE_AUDIT_LOGS_TABLE': JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_AUDIT_LOGS_TABLE ?? '',
      ),
    },
  }
})
