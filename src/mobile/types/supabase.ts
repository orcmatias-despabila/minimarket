import type {
  BusinessPermissionKey,
  Product,
  Sale,
  UserRole,
} from '../../types/domain'

export interface ProfileRecord {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean | null
}

export interface BusinessRecord {
  id: string
  name: string
  legal_name: string | null
  owner_user_id: string | null
}

export interface BusinessMemberRecord {
  id: string
  business_id: string
  profile_id?: string | null
  user_id?: string | null
  role: UserRole
  permissions?: BusinessPermissionKey[] | Record<string, boolean> | null
  visible_code?: string | null
  created_at?: string | null
}

export interface InvitationRecord {
  id: string
  business_id: string
  email: string
  full_name: string | null
  role: UserRole
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  invitation_token: string | null
  invited_by_user_id: string
  accepted_by_user_id: string | null
  created_at: string
  accepted_at: string | null
  businesses?: Pick<BusinessRecord, 'id' | 'name'> | Array<Pick<BusinessRecord, 'id' | 'name'>> | null
}

export interface ProductRecord {
  id: string
  business_id: string | null
  barcode: string | null
  name: string
  brand: string | null
  quantity_label?: string | null
  quantity?: string | null
  format_content?: string | null
  category?: string | null
  unit_measure: Product['unitMeasure'] | null
  image_url: string | null
  purchase_price?: number | null
  cost_price?: number | null
  sale_price: number | null
  stock: number | null
  min_stock: number | null
  provider: string | null
  supplier?: string | null
  notes: string | null
  allow_decimal?: boolean | null
}

export interface InventoryMovementRecord {
  id: string
  business_id: string | null
  created_by_profile_id?: string | null
  created_by_user_id?: string | null
  product_id: string
  product_name: string
  movement_type?: string | null
  type?: string | null
  quantity: number
  reason: string | null
  unit_cost?: number | null
  associated_cost?: number | null
  created_at: string
}

export interface SaleRecord {
  id: string
  business_id: string | null
  sold_by_profile_id?: string | null
  created_by_user_id?: string | null
  sale_number?: number | null
  document_number?: string | null
  status: Sale['status']
  payment_method: Sale['paymentMethod']
  subtotal: number | null
  discount_total: number | null
  tax_total: number | null
  total?: number | null
  grand_total?: number | null
  received_amount: number | null
  change_amount: number | null
  sold_at?: string | null
  created_at: string
  sale_items?: SaleItemRecord[] | null
}

export interface SaleItemRecord {
  id: string
  business_id: string | null
  sale_id: string
  product_id: string
  product_name: string
  unit_measure: Product['unitMeasure']
  quantity: number
  unit_price: number
  purchase_price?: number | null
  cost_price?: number | null
  discount_total?: number | null
  subtotal: number
}
