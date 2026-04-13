export type AppModuleId =
  | 'products'
  | 'inventory'
  | 'sales'
  | 'cash'
  | 'reports'
  | 'settings'

export type ProductKind = 'barcode' | 'manual_unit' | 'manual_weight'

export type UnitMeasure = 'unit' | 'kg' | 'g' | 'l'

export type UserRole = 'owner' | 'admin' | 'cashier' | 'inventory'

export type BusinessPermissionKey =
  | 'can_sell'
  | 'can_add_stock'
  | 'can_create_products'
  | 'can_edit_products'
  | 'can_view_reports'
  | 'can_manage_users'

export type Permission =
  | 'sales:create'
  | 'sales:read'
  | 'inventory:read'
  | 'inventory:write'
  | 'products:read'
  | 'products:write'
  | 'reports:read'
  | 'cash:open'
  | 'cash:close'
  | 'settings:manage'
  | 'users:manage'
  | 'exports:run'
  | 'devices:manage'
  | 'sync:manage'

export interface BusinessTenant {
  id: string
  name: string
  legalName?: string
  ownerUserId?: string
  isCloudSyncEnabled: boolean
}

export interface BusinessMembership {
  id: string
  businessId: string
  userId: string
  role: UserRole
  permissions?: BusinessPermissionKey[]
  visibleCode?: string
  joinedAt?: string
}

export interface BusinessInvitation {
  id: string
  businessId: string
  businessName?: string
  email: string
  fullName?: string
  role: UserRole
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  invitedByUserId: string
  acceptedByUserId?: string
  invitationToken?: string
  createdAt: string
  acceptedAt?: string
}

export interface Category {
  id: string
  name: string
  description?: string
  isActive: boolean
}

export interface Product {
  id: string
  tenantId?: string
  name: string
  brand?: string
  formatContent?: string
  imageUrl?: string
  category: string
  type: ProductKind
  barcode?: string
  unitMeasure: UnitMeasure
  salePrice: number
  costPrice: number
  currentStock: number
  minStock: number
  supplier?: string
  notes?: string
}

export interface InventoryMovement {
  id: string
  tenantId?: string
  createdByUserId?: string
  productId: string
  productName: string
  type: 'stock_in' | 'manual_adjustment' | 'waste' | 'sale_output'
  quantity: number
  reason: string
  associatedCost?: number
  createdAt: string
}

export interface SaleItem {
  id: string
  tenantId?: string
  saleId: string
  productId: string
  productName: string
  unitMeasure: UnitMeasure
  quantity: number
  unitPrice: number
  costPrice: number
  subtotal: number
}

export interface Sale {
  id: string
  tenantId?: string
  createdByUserId?: string
  documentNumber?: string
  status: 'draft' | 'paid' | 'cancelled'
  paymentMethod: 'cash' | 'debit' | 'credit' | 'transfer'
  subtotal: number
  discountTotal: number
  taxTotal: number
  grandTotal: number
  receivedAmount: number
  changeAmount: number
  createdAt: string
  items: SaleItem[]
}

export interface WeightedDailyControl {
  id: string
  tenantId?: string
  productId: string
  productName: string
  controlDate: string
  enteredQuantity: number
  soldQuantity: number
  leftoverQuantity: number
  wasteQuantity: number
  costPrice: number
  salePrice: number
  notes?: string
}

export interface CashSession {
  id: string
  tenantId?: string
  openedByUserId?: string
  closedByUserId?: string
  businessDate: string
  openedAt: string
  openingAmount: number
  status: 'open' | 'closed'
  closedAt?: string
  actualCashCounted?: number
}

export interface UserProfile {
  id: string
  tenantId?: string
  fullName: string
  email: string
  role: UserRole
  permissions?: Permission[]
  isActive: boolean
}

export interface AuthSession {
  id: string
  userId: string
  tenantId?: string
  role: UserRole
  issuedAt: string
  expiresAt?: string
}

export interface ReportExportJob {
  id: string
  tenantId?: string
  reportType: 'sales' | 'inventory' | 'cash' | 'waste' | 'custom'
  format: 'pdf' | 'xlsx' | 'csv'
  status: 'queued' | 'running' | 'completed' | 'failed'
  requestedByUserId: string
  createdAt: string
  finishedAt?: string
  fileUrl?: string
}

export interface TicketTemplate {
  id: string
  tenantId?: string
  name: string
  headerText?: string
  footerText?: string
  printerWidth: '58mm' | '80mm'
  isDefault: boolean
}

export interface ExternalReaderDevice {
  id: string
  tenantId?: string
  name: string
  type: 'barcode_scanner' | 'qr_scanner' | 'printer' | 'scale'
  connection: 'usb' | 'bluetooth' | 'network' | 'web'
  isEnabled: boolean
}

export interface CloudSyncJob {
  id: string
  tenantId?: string
  entityName: string
  direction: 'push' | 'pull' | 'bidirectional'
  status: 'idle' | 'running' | 'completed' | 'failed'
  lastRunAt?: string
}

export interface AuditLog {
  id: string
  tenantId?: string
  actorUserId?: string
  actorMembershipId?: string
  actorRole?: UserRole
  actorVisibleCode?: string
  entityName: string
  entityId: string
  entityLabel?: string
  action: 'create' | 'update' | 'delete' | 'export' | 'sync' | 'print'
  actionType?:
    | 'sale_completed'
    | 'product_created'
    | 'product_updated'
    | 'product_deleted'
    | 'stock_added'
    | 'inventory_adjusted'
    | 'price_updated'
  createdAt: string
  summary: string
}

export interface StoreSettings {
  id: string
  tenantId?: string
  businessName: string
  currencyCode: string
  timezone: string
  taxRate: number
  defaultTicketTemplateId?: string
}

export interface AppState {
  businessName: string
  activeModule: AppModuleId
}
