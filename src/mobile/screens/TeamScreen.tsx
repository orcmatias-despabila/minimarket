import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  businessPermissionLabels,
  businessPermissionOptions,
  getGrantedBusinessPermissions,
} from '../auth/permissions'
import { useAuth } from '../hooks/useAuth'
import { useWorkspace } from '../state/WorkspaceProvider'
import { AppButton } from '../ui/AppButton'
import { AppField } from '../ui/AppField'
import { AccessDeniedState } from '../ui/AccessDeniedState'
import { Card } from '../ui/Card'
import { Screen } from '../ui/Screen'
import { appFonts, mobileTheme } from '../theme'
import type { BusinessPermissionKey, UserRole } from '../../types/domain'

const inviteRoleOptions: UserRole[] = ['admin', 'cashier', 'inventory']
const editableRoleOptions: UserRole[] = ['admin', 'cashier', 'inventory']

export function TeamScreen() {
  const { signOut } = useAuth()
  const {
    business,
    currentRole,
    members,
    invitations,
    inviteMember,
    hasPermission,
    updateMemberAccess,
  } = useWorkspace()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('cashier')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [draftRoles, setDraftRoles] = useState<Record<string, UserRole>>({})
  const [draftPermissions, setDraftPermissions] = useState<
    Record<string, BusinessPermissionKey[]>
  >({})
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null)

  const canInvite = hasPermission('users:manage')

  const handleSignOut = async () => {
    setFeedback(null)
    setErrorMessage(null)
    setIsSigningOut(true)

    try {
      await signOut()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No pudimos cerrar sesion.',
      )
    } finally {
      setIsSigningOut(false)
    }
  }

  const ownerIdSet = useMemo(
    () => new Set(members.filter((item) => item.role === 'owner').map((item) => item.userId)),
    [members],
  )

  const handleInvite = async () => {
    setFeedback(null)
    setErrorMessage(null)

    if (!canInvite) {
      setErrorMessage('Solo owner o admin pueden invitar usuarios.')
      return
    }

    if (!email.trim()) {
      setErrorMessage('Ingresa el correo del trabajador.')
      return
    }

    setIsSubmitting(true)

    try {
      await inviteMember({
        email: email.trim(),
        fullName: fullName.trim() || undefined,
        role: selectedRole,
      })
      setEmail('')
      setFullName('')
      setSelectedRole('cashier')
      setFeedback('Invitacion creada correctamente.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No pudimos enviar la invitacion.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const getEffectiveRole = (memberId: string, fallbackRole: UserRole) =>
    draftRoles[memberId] ?? fallbackRole

  const getEffectivePermissions = (
    memberId: string,
    role: UserRole,
    customPermissions?: BusinessPermissionKey[],
  ) => draftPermissions[memberId] ?? getGrantedBusinessPermissions(role, customPermissions)

  const toggleMemberPermission = (
    memberId: string,
    role: UserRole,
    permissionKey: BusinessPermissionKey,
    currentPermissions?: BusinessPermissionKey[],
  ) => {
    const activePermissions = getEffectivePermissions(memberId, role, currentPermissions)
    const nextPermissions = activePermissions.includes(permissionKey)
      ? activePermissions.filter((item) => item !== permissionKey)
      : [...activePermissions, permissionKey]

    setDraftPermissions((current) => ({
      ...current,
      [memberId]: nextPermissions,
    }))
  }

  const saveMemberAccess = async (
    memberId: string,
    currentMemberRole: UserRole,
    currentPermissions?: BusinessPermissionKey[],
  ) => {
    setFeedback(null)
    setErrorMessage(null)
    setSavingMemberId(memberId)

    const nextRole = getEffectiveRole(memberId, currentMemberRole)
    const nextPermissions = getEffectivePermissions(memberId, nextRole, currentPermissions)

    try {
      await updateMemberAccess({
        membershipId: memberId,
        role: nextRole,
        permissions: nextPermissions,
      })

      setDraftPermissions((current) => {
        const next = { ...current }
        delete next[memberId]
        return next
      })
      setDraftRoles((current) => {
        const next = { ...current }
        delete next[memberId]
        return next
      })
      setFeedback('Permisos actualizados correctamente.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No pudimos actualizar permisos.',
      )
    } finally {
      setSavingMemberId(null)
    }
  }

  if (!canInvite) {
    return (
      <Screen
        title="Equipo"
        subtitle="Invita trabajadores, revisa roles y controla quienes forman parte de tu negocio."
      >
        <AccessDeniedState message="Solo owner o admin pueden gestionar el equipo y las invitaciones." />
      </Screen>
    )
  }

  return (
    <Screen
      title="Equipo"
      subtitle="Invita trabajadores, revisa roles y controla quienes forman parte de tu negocio."
    >
      <Card>
        <Text style={styles.title}>Negocio actual</Text>
        <Text style={styles.primaryText}>{business?.name ?? 'Sin negocio activo'}</Text>
        <Text style={styles.metaText}>Tu rol actual: {currentRole ?? 'sin rol'}</Text>
        <AppButton
          label={isSigningOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
          onPress={() => {
            void handleSignOut()
          }}
          variant="secondary"
          icon="logout"
          disabled={isSigningOut}
        />
      </Card>

      <Card>
        <Text style={styles.title}>Invitar usuario</Text>

        <AppField
          label="Correo"
          value={email}
          onChangeText={setEmail}
          placeholder="trabajador@correo.com"
          icon="email-outline"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AppField
          label="Nombre"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Nombre del trabajador"
          icon="account-outline"
        />

        <View style={styles.roleRow}>
          {inviteRoleOptions.map((role) => {
            const isActive = role === selectedRole
            return (
              <AppButton
                key={role}
                label={
                  role === 'admin' ? 'Admin' : role === 'inventory' ? 'Inventario' : 'Caja'
                }
                onPress={() => setSelectedRole(role)}
                variant={isActive ? 'primary' : 'secondary'}
                disabled={isSubmitting}
                icon={
                  role === 'admin'
                    ? 'shield-account-outline'
                    : role === 'inventory'
                      ? 'package-variant-closed'
                      : 'cash-register'
                }
              />
            )
          })}
        </View>

        {feedback ? <Text style={styles.successText}>{feedback}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <AppButton
          label={isSubmitting ? 'Invitando...' : 'Invitar por correo'}
          onPress={handleInvite}
          disabled={isSubmitting}
          icon="email-plus-outline"
        />
      </Card>

      <Card>
        <Text style={styles.title}>Miembros</Text>
        {members.length ? (
          members.map((member) => {
            const isOwner = ownerIdSet.has(member.userId)
            const effectiveRole = getEffectiveRole(member.id, member.role)
            const effectivePermissions = getEffectivePermissions(
              member.id,
              effectiveRole,
              member.permissions,
            )

            return (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.row}>
                  <View style={styles.invitationInfo}>
                    <Text style={styles.primaryText}>
                      {isOwner ? 'Owner principal' : `Usuario ${member.userId.slice(0, 8)}`}
                    </Text>
                    <Text style={styles.metaText}>
                      Rol base: {member.role}
                      {member.visibleCode ? ` - ${member.visibleCode}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.badge}>{effectiveRole}</Text>
                </View>

                {!isOwner ? (
                  <>
                    <View style={styles.roleRow}>
                      {editableRoleOptions.map((role) => (
                        <AppButton
                          key={`${member.id}-${role}`}
                          label={
                            role === 'admin'
                              ? 'Admin'
                              : role === 'inventory'
                                ? 'Inventario'
                                : 'Caja'
                          }
                          onPress={() =>
                            setDraftRoles((current) => ({
                              ...current,
                              [member.id]: role,
                            }))
                          }
                          variant={effectiveRole === role ? 'primary' : 'secondary'}
                          disabled={savingMemberId === member.id}
                        />
                      ))}
                    </View>

                    <View style={styles.permissionsGrid}>
                      {businessPermissionOptions.map((permissionKey) => {
                        const isActive = effectivePermissions.includes(permissionKey)
                        return (
                          <AppButton
                            key={`${member.id}-${permissionKey}`}
                            label={businessPermissionLabels[permissionKey]}
                            onPress={() =>
                              toggleMemberPermission(
                                member.id,
                                effectiveRole,
                                permissionKey,
                                member.permissions,
                              )
                            }
                            variant={isActive ? 'primary' : 'secondary'}
                            disabled={savingMemberId === member.id}
                          />
                        )
                      })}
                    </View>

                    <AppButton
                      label={
                        savingMemberId === member.id
                          ? 'Guardando permisos...'
                          : 'Guardar permisos'
                      }
                      onPress={() =>
                        saveMemberAccess(member.id, member.role, member.permissions)
                      }
                      disabled={savingMemberId === member.id}
                      icon="content-save-outline"
                    />
                  </>
                ) : (
                  <Text style={styles.metaText}>
                    El owner mantiene control total y no se edita desde esta vista.
                  </Text>
                )}
              </View>
            )
          })
        ) : (
          <Text style={styles.metaText}>Todavia no hay miembros asociados.</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.title}>Invitaciones pendientes</Text>
        {invitations.length ? (
          invitations.map((invitation) => (
            <View key={invitation.id} style={styles.row}>
              <View style={styles.invitationInfo}>
                <Text style={styles.primaryText}>
                  {invitation.fullName || invitation.email}
                </Text>
                <Text style={styles.metaText}>
                  {invitation.email} - {invitation.role} - {invitation.status}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.metaText}>No hay invitaciones pendientes.</Text>
        )}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.fontSizes.lg,
    ...appFonts.bold,
  },
  primaryText: {
    color: mobileTheme.colors.text,
    ...appFonts.semibold,
  },
  metaText: {
    color: mobileTheme.colors.muted,
    ...appFonts.regular,
  },
  successText: {
    color: mobileTheme.colors.success,
    ...appFonts.semibold,
  },
  errorText: {
    color: mobileTheme.colors.danger,
    ...appFonts.semibold,
  },
  roleRow: {
    gap: mobileTheme.spacing.sm,
  },
  permissionsGrid: {
    gap: mobileTheme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.xs,
  },
  invitationInfo: {
    flex: 1,
    gap: 2,
  },
  badge: {
    color: mobileTheme.colors.primaryDark,
    backgroundColor: mobileTheme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: mobileTheme.radius.full,
    ...appFonts.semibold,
  },
  memberCard: {
    gap: mobileTheme.spacing.sm,
    paddingBottom: mobileTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border,
  },
})
