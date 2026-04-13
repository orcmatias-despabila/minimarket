export const serviceTokens = {
  auth: 'auth-capability',
  reporting: 'reporting-capability',
  ticketPrinting: 'ticket-printing-capability',
  externalReader: 'external-reader-capability',
  cloudSync: 'cloud-sync-capability',
  adminPanel: 'admin-panel-capability',
} as const

export type ServiceToken = (typeof serviceTokens)[keyof typeof serviceTokens]
