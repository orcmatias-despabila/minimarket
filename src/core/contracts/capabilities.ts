import type {
  AuthSession,
  ExternalReaderDevice,
  Permission,
  ReportExportJob,
  Sale,
  TicketTemplate,
  UserProfile,
} from '../../types/domain'

export interface AuthCapability {
  getCurrentSession(): AuthSession | null
  can(permission: Permission): boolean
  signIn(email: string, password: string): Promise<AuthSession>
  signOut(): Promise<void>
}

export interface ReportingCapability {
  exportSalesReport(payload: {
    dateFrom: string
    dateTo: string
    format: ReportExportJob['format']
  }): Promise<ReportExportJob>
}

export interface TicketPrintingCapability {
  printSaleTicket(payload: {
    sale: Sale
    template: TicketTemplate
  }): Promise<void>
}

export interface ExternalReaderCapability {
  getDevices(): Promise<ExternalReaderDevice[]>
  startListening(): Promise<void>
  stopListening(): Promise<void>
}

export interface CloudSyncCapability {
  syncNow(): Promise<void>
  getLastSyncState(): Promise<{
    status: 'idle' | 'running' | 'completed' | 'failed'
    lastRunAt?: string
  }>
}

export interface AdminPanelCapability {
  getUsers(): Promise<UserProfile[]>
  saveUser(user: UserProfile): Promise<UserProfile>
}
