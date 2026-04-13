import type {
  AdminPanelCapability,
  AuthCapability,
  CloudSyncCapability,
  ExternalReaderCapability,
  ReportingCapability,
  TicketPrintingCapability,
} from '../contracts/capabilities'
import type { ServiceToken } from '../platform/serviceTokens'

export interface ServiceRegistry {
  auth?: AuthCapability
  reporting?: ReportingCapability
  ticketPrinting?: TicketPrintingCapability
  externalReader?: ExternalReaderCapability
  cloudSync?: CloudSyncCapability
  adminPanel?: AdminPanelCapability
}

const registry: ServiceRegistry = {}

export const registerService = <T extends keyof ServiceRegistry>(
  key: T,
  service: NonNullable<ServiceRegistry[T]>,
) => {
  registry[key] = service
}

export const getService = <T extends keyof ServiceRegistry>(
  key: T,
): ServiceRegistry[T] => registry[key]

export const hasService = (token: ServiceToken) =>
  Object.values(registry).some((service) => Boolean(service)) && Boolean(token)
