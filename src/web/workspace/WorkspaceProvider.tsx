import type { PropsWithChildren } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type {
  BusinessInvitation,
  BusinessMembership,
  BusinessPermissionKey,
  BusinessTenant,
  Permission,
  UserRole,
} from '../../types/domain'
import { getRolePermissions, hasPermission as roleHasPermission } from '../../mobile/auth/permissions'
import { useWebAuth } from '../auth/AuthProvider'
import { webBusinessService } from '../services/business.service'

interface WebWorkspaceContextValue {
  business: BusinessTenant | null
  membership: BusinessMembership | null
  currentRole: UserRole | null
  permissions: Permission[]
  members: BusinessMembership[]
  invitations: BusinessInvitation[]
  pendingInvitations: BusinessInvitation[]
  isLoading: boolean
  refreshWorkspace: () => Promise<void>
  refreshMembers: () => Promise<void>
  createBusiness: (input: { name: string; legalName?: string }) => Promise<void>
  inviteMember: (input: { email: string; fullName?: string; role: UserRole }) => Promise<void>
  acceptInvitation: (invitationId: string) => Promise<void>
  rejectInvitation: (invitationId: string) => Promise<void>
  updateMemberAccess: (input: {
    membershipId: string
    role: UserRole
    permissions?: BusinessPermissionKey[] | null
  }) => Promise<void>
  hasPermission: (permission: Permission) => boolean
}

const WebWorkspaceContext = createContext<WebWorkspaceContextValue | null>(null)

export function WebWorkspaceProvider({ children }: PropsWithChildren) {
  const { user, isAuthenticated } = useWebAuth()
  const userId = user?.id ?? null
  const userEmail = user?.email ?? null
  const [business, setBusiness] = useState<BusinessTenant | null>(null)
  const [membership, setMembership] = useState<BusinessMembership | null>(null)
  const [members, setMembers] = useState<BusinessMembership[]>([])
  const [invitations, setInvitations] = useState<BusinessInvitation[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<BusinessInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasBootstrapped, setHasBootstrapped] = useState(false)

  const refreshMembers = useCallback(async () => {
    if (!business?.id) {
      setMembers([])
      setInvitations([])
      return
    }

    const snapshot = await webBusinessService.listBusinessMembers(business.id)
    setMembers(snapshot.members)
    setInvitations(snapshot.invitations)
  }, [business?.id])

  const refreshWorkspace = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setBusiness(null)
      setMembership(null)
      setMembers([])
      setInvitations([])
      setPendingInvitations([])
      setIsLoading(false)
      setHasBootstrapped(true)
      return
    }

    if (!hasBootstrapped) {
      setIsLoading(true)
    }

    try {
      const workspace = await webBusinessService.getUserWorkspace(userId)
      setBusiness(workspace?.business ?? null)
      setMembership(workspace?.membership ?? null)

      if (workspace?.business) {
        const snapshot = await webBusinessService.listBusinessMembers(workspace.business.id)
        setMembers(snapshot.members)
        setInvitations(snapshot.invitations)
        setPendingInvitations([])
      } else {
        setMembers([])
        setInvitations([])
        const pending = userEmail
          ? await webBusinessService.listPendingInvitationsByEmail(userEmail)
          : []
        setPendingInvitations(pending)
      }
    } finally {
      setIsLoading(false)
      setHasBootstrapped(true)
    }
  }, [hasBootstrapped, isAuthenticated, userEmail, userId])

  useEffect(() => {
    void refreshWorkspace()
  }, [refreshWorkspace])

  const value = useMemo<WebWorkspaceContextValue>(
    () => ({
      business,
      membership,
      currentRole: membership?.role ?? (business?.ownerUserId === user?.id ? 'owner' : null),
      permissions: getRolePermissions(
        membership?.role ?? (business?.ownerUserId === user?.id ? 'owner' : null),
        membership?.permissions,
      ),
      members,
      invitations,
      pendingInvitations,
      isLoading,
      refreshWorkspace,
      refreshMembers,
      createBusiness: async ({ name, legalName }) => {
        if (!user) {
          throw new Error('No hay usuario autenticado para crear el negocio.')
        }

        const workspace = await webBusinessService.createBusinessForOwner({
          name,
          legalName,
          owner: user,
        })

        setBusiness(workspace.business)
        setMembership(workspace.membership)
        await refreshWorkspace()
      },
      inviteMember: async ({ email, fullName, role }) => {
        if (!user || !business) {
          throw new Error('Necesitas un negocio activo para invitar miembros.')
        }

        if (membership?.role !== 'owner' && membership?.role !== 'admin') {
          throw new Error('Solo owner o admin pueden invitar usuarios.')
        }

        await webBusinessService.createInvitation({
          businessId: business.id,
          email,
          fullName,
          role,
          invitedByUserId: user.id,
        })

        await refreshMembers()
      },
      acceptInvitation: async (invitationId) => {
        if (!user) {
          throw new Error('Necesitas iniciar sesion para aceptar una invitacion.')
        }

        const workspace = await webBusinessService.acceptInvitation({
          invitationId,
          user,
        })
        const snapshot = await webBusinessService.listBusinessMembers(workspace.business.id)

        setBusiness(workspace.business)
        setMembership(workspace.membership)
        setMembers(snapshot.members)
        setInvitations(snapshot.invitations)
        setPendingInvitations([])
      },
      rejectInvitation: async (invitationId) => {
        if (!user) {
          throw new Error('Necesitas iniciar sesion para rechazar una invitacion.')
        }

        await webBusinessService.rejectInvitation({
          invitationId,
          user,
        })

        await refreshWorkspace()
      },
      updateMemberAccess: async ({ membershipId, role, permissions }) => {
        if (!business) {
          throw new Error('Necesitas un negocio activo para actualizar permisos.')
        }

        await webBusinessService.updateMembershipAccess({
          businessId: business.id,
          membershipId,
          role,
          permissions,
        })

        await refreshWorkspace()
      },
      hasPermission: (permission) =>
        roleHasPermission(
          membership?.role ?? (business?.ownerUserId === user?.id ? 'owner' : null),
          permission,
          membership?.permissions,
        ),
    }),
    [
      business,
      invitations,
      isLoading,
      members,
      membership,
      pendingInvitations,
      refreshMembers,
      refreshWorkspace,
      user,
    ],
  )

  return <WebWorkspaceContext.Provider value={value}>{children}</WebWorkspaceContext.Provider>
}

export const useWebWorkspace = () => {
  const context = useContext(WebWorkspaceContext)
  if (!context) {
    throw new Error('useWebWorkspace must be used inside WebWorkspaceProvider')
  }

  return context
}
