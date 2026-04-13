export { isSupabaseConfigured, supabaseClient } from '../../../lib/supabase'

export const productsTableName =
  process.env.EXPO_PUBLIC_SUPABASE_PRODUCTS_TABLE ?? 'products'

export const businessesTableName =
  process.env.EXPO_PUBLIC_SUPABASE_BUSINESSES_TABLE ?? 'businesses'

export const businessMembershipsTableName =
  process.env.EXPO_PUBLIC_SUPABASE_BUSINESS_MEMBERSHIPS_TABLE ?? 'business_memberships'

export const businessInvitationsTableName =
  process.env.EXPO_PUBLIC_SUPABASE_BUSINESS_INVITATIONS_TABLE ?? 'business_invitations'

export const auditLogsTableName =
  process.env.EXPO_PUBLIC_SUPABASE_AUDIT_LOGS_TABLE ?? 'audit_logs'

export const salesTableName =
  process.env.EXPO_PUBLIC_SUPABASE_SALES_TABLE ?? 'sales'

export const saleItemsTableName =
  process.env.EXPO_PUBLIC_SUPABASE_SALE_ITEMS_TABLE ?? 'sale_items'

export const inventoryMovementsTableName =
  process.env.EXPO_PUBLIC_SUPABASE_INVENTORY_MOVEMENTS_TABLE ?? 'inventory_movements'

export const cashSessionsTableName =
  process.env.EXPO_PUBLIC_SUPABASE_CASH_SESSIONS_TABLE ?? 'cash_sessions'
