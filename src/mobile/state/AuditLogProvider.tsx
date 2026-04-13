import type { PropsWithChildren } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuditLog } from '../../types/domain'
import { auditLogService, type CreateAuditLogInput } from '../services/auditLogService'
import { useAuth } from './AuthProvider'
import { useWorkspace } from './WorkspaceProvider'

interface AuditLogContextValue {
  auditLogs: AuditLog[]
  isLoading: boolean
  refreshAuditLogs: () => Promise<void>
  logAction: (input: Omit<CreateAuditLogInput, 'businessId' | 'actorUserId' | 'actorMembershipId' | 'actorRole' | 'actorVisibleCode'> & { createdAt?: string }) => Promise<void>
}

const AuditLogContext = createContext<AuditLogContextValue | null>(null)

export function AuditLogProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const { business, membership, currentRole } = useWorkspace()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const refreshAuditLogs = useCallback(async () => {
    if (!business?.id) {
      setAuditLogs([])
      return
    }

    setIsLoading(true)
    try {
      const logs = await auditLogService.listRecentByBusiness(business.id)
      setAuditLogs(logs)
    } finally {
      setIsLoading(false)
    }
  }, [business?.id])

  useEffect(() => {
    void refreshAuditLogs()
  }, [refreshAuditLogs])

  const value = useMemo<AuditLogContextValue>(
    () => ({
      auditLogs,
      isLoading,
      refreshAuditLogs,
      logAction: async (input) => {
        if (!business?.id) {
          throw new Error('Necesitas un negocio activo para registrar auditoria.')
        }

        const log = await auditLogService.create({
          ...input,
          businessId: business.id,
          actorUserId: user?.id ?? null,
          actorMembershipId: membership?.id ?? null,
          actorRole: currentRole,
          actorVisibleCode: membership?.visibleCode ?? null,
        })

        setAuditLogs((current) => [log, ...current].slice(0, 30))
      },
    }),
    [
      auditLogs,
      business?.id,
      currentRole,
      isLoading,
      membership?.id,
      membership?.visibleCode,
      refreshAuditLogs,
      user?.id,
    ],
  )

  return <AuditLogContext.Provider value={value}>{children}</AuditLogContext.Provider>
}

export const useAuditLogs = () => {
  const context = useContext(AuditLogContext)
  if (!context) {
    throw new Error('useAuditLogs must be used inside AuditLogProvider')
  }
  return context
}
