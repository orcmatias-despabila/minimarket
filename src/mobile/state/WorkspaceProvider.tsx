import type { PropsWithChildren } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type {
  BusinessInvitation,
  BusinessMembership,
  BusinessTenant,
  BusinessPermissionKey,
  Permission,
  UserRole,
} from '../../types/domain'
import { getRolePermissions, hasPermission as roleHasPermission } from '../auth/permissions'
import { businessService } from '../services/business.service'
import { useAuth } from './AuthProvider'

interface WorkspaceContextValue {
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
  hasPermission: (permission: import('../../types/domain').Permission) => boolean
  updateMemberAccess: (input: {
    membershipId: string
    role: UserRole
    permissions?: BusinessPermissionKey[] | null
  }) => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: PropsWithChildren) {
  const { user, isAuthenticated } = useAuth()
  const [business, setBusiness] = useState<BusinessTenant | null>(null)
  const [membership, setMembership] = useState<BusinessMembership | null>(null)
  const [members, setMembers] = useState<BusinessMembership[]>([])
  const [invitations, setInvitations] = useState<BusinessInvitation[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<BusinessInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshMembers = useCallback(async () => {
    if (!business?.id) {
      setMembers([])
      setInvitations([])
      return
    }

    const snapshot = await businessService.listBusinessMembers(business.id)
    setMembers(snapshot.members)
    setInvitations(snapshot.invitations)
  }, [business?.id])

  const refreshWorkspace = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setBusiness(null)
      setMembership(null)
      setMembers([])
      setInvitations([])
      setPendingInvitations([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const workspace = await businessService.getUserWorkspace(user.id)
      setBusiness(workspace?.business ?? null)
      setMembership(workspace?.membership ?? null)

      if (workspace?.business) {
        const snapshot = await businessService.listBusinessMembers(workspace.business.id)
        setMembers(snapshot.members)
        setInvitations(snapshot.invitations)
        setPendingInvitations([])
      } else {
        setMembers([])
        setInvitations([])
        const pending = user.email
          ? await businessService.listPendingInvitationsByEmail(user.email)
          : []
        setPendingInvitations(pending)
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    void refreshWorkspace()
  }, [refreshWorkspace])

  const value = useMemo<WorkspaceContextValue>(
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

        const workspace = await businessService.createBusinessForOwner({
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

        await businessService.createInvitation({
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

        const workspace = await businessService.acceptInvitation({
          invitationId,
          user,
        })
        const snapshot = await businessService.listBusinessMembers(workspace.business.id)

        setBusiness(workspace.business)
        setMembership(workspace.membership)
        setMembers(snapshot.members)
        setInvitations(snapshot.invitations)
        setPendingInvitations([])
      },
      hasPermission: (permission) =>
        roleHasPermission(
          membership?.role ?? (business?.ownerUserId === user?.id ? 'owner' : null),
          permission,
          membership?.permissions,
        ),
      updateMemberAccess: async ({ membershipId, role, permissions }) => {
        if (!business) {
          throw new Error('Necesitas un negocio activo para actualizar permisos.')
        }

        await businessService.updateMembershipAccess({
          businessId: business.id,
          membershipId,
          role,
          permissions,
        })

        await refreshWorkspace()
      },
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

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used inside WorkspaceProvider')
  }
  return context
}
