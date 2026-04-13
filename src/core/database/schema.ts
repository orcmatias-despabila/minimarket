import type {
  AuditLog,
  AuthSession,
  BusinessTenant,
  Category,
  CloudSyncJob,
  CashSession,
  ExternalReaderDevice,
  InventoryMovement,
  Product,
  ReportExportJob,
  Sale,
  SaleItem,
  StoreSettings,
  TicketTemplate,
  UserProfile,
} from '../../types/domain'

export interface DatabaseTable<TRecord> {
  tableName: string
  primaryKey: keyof TRecord
  description: string
}

export interface DatabaseSchema {
  products: DatabaseTable<Product>
  categories: DatabaseTable<Category>
  inventoryMovements: DatabaseTable<InventoryMovement>
  sales: DatabaseTable<Sale>
  saleItems: DatabaseTable<SaleItem>
  cashSessions: DatabaseTable<CashSession>
  tenants: DatabaseTable<BusinessTenant>
  users: DatabaseTable<UserProfile>
  authSessions: DatabaseTable<AuthSession>
  settings: DatabaseTable<StoreSettings>
  reportExports: DatabaseTable<ReportExportJob>
  ticketTemplates: DatabaseTable<TicketTemplate>
  devices: DatabaseTable<ExternalReaderDevice>
  cloudSyncJobs: DatabaseTable<CloudSyncJob>
  auditLogs: DatabaseTable<AuditLog>
}

export const databaseSchema: DatabaseSchema = {
  products: {
    tableName: 'products',
    primaryKey: 'id',
    description: 'Maestro de productos y servicios del negocio.',
  },
  categories: {
    tableName: 'categories',
    primaryKey: 'id',
    description: 'Categorias y agrupadores para filtros y reportes.',
  },
  inventoryMovements: {
    tableName: 'inventory_movements',
    primaryKey: 'id',
    description: 'Historial de ingresos, salidas, ajustes, merma y costo asociado.',
  },
  sales: {
    tableName: 'sales',
    primaryKey: 'id',
    description: 'Cabecera de cada venta emitida en caja.',
  },
  saleItems: {
    tableName: 'sale_items',
    primaryKey: 'id',
    description: 'Detalle de productos vendidos por transaccion.',
  },
  cashSessions: {
    tableName: 'cash_sessions',
    primaryKey: 'id',
    description: 'Sesiones de caja para apertura, cierre y conciliacion diaria.',
  },
  tenants: {
    tableName: 'tenants',
    primaryKey: 'id',
    description: 'Negocios o sucursales para soportar multiusuario y nube.',
  },
  users: {
    tableName: 'users',
    primaryKey: 'id',
    description: 'Usuarios del sistema y sus permisos.',
  },
  authSessions: {
    tableName: 'auth_sessions',
    primaryKey: 'id',
    description: 'Sesiones de autenticacion y contexto del usuario activo.',
  },
  settings: {
    tableName: 'settings',
    primaryKey: 'id',
    description: 'Configuracion general de la tienda.',
  },
  reportExports: {
    tableName: 'report_exports',
    primaryKey: 'id',
    description: 'Trabajos de exportacion de reportes para descargas futuras.',
  },
  ticketTemplates: {
    tableName: 'ticket_templates',
    primaryKey: 'id',
    description: 'Plantillas de ticket para impresion en distintos formatos.',
  },
  devices: {
    tableName: 'devices',
    primaryKey: 'id',
    description: 'Registro de lectores, impresoras y otros dispositivos externos.',
  },
  cloudSyncJobs: {
    tableName: 'cloud_sync_jobs',
    primaryKey: 'id',
    description: 'Estado de sincronizacion con servicios en la nube.',
  },
  auditLogs: {
    tableName: 'audit_logs',
    primaryKey: 'id',
    description: 'Bitacora para acciones criticas, exportaciones, sync e impresion.',
  },
}
