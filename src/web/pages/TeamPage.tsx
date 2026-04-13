import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import {
  businessPermissionLabels,
  businessPermissionOptions,
  getGrantedBusinessPermissions,
} from '../../mobile/auth/permissions'
import { AdminNotice } from '../components/AdminNotice'
import type { BusinessPermissionKey, UserRole } from '../../types/domain'
import { useWebAuth } from '../auth/AuthProvider'
import { webAuditLogService } from '../services/auditLog.service'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

const inviteRoleOptions: UserRole[] = ['admin', 'cashier', 'inventory']
const editableRoleOptions: UserRole[] = ['admin', 'cashier', 'inventory']

const roleLabels: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  cashier: 'Caja',
  inventory: 'Inventario',
}

export function TeamPage() {
  const navigate = useNavigate()
  const { user } = useWebAuth()
  const {
    business,
    membership,
    currentRole,
    members,
    invitations,
    inviteMember,
    hasPermission,
    updateMemberAccess,
  } = useWebWorkspace()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('cashier')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [draftRoles, setDraftRoles] = useState<Record<string, UserRole>>({})
  const [draftPermissions, setDraftPermissions] = useState<
    Record<string, BusinessPermissionKey[]>
  >({})
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null)

  const canInvite = hasPermission('users:manage')

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

      if (business?.id) {
        try {
          await webAuditLogService.create({
            businessId: business.id,
            actorUserId: user?.id ?? null,
            actorMembershipId: membership?.id ?? null,
            actorRole: currentRole,
            actorVisibleCode: membership?.visibleCode ?? null,
            entityName: 'business_invitation',
            entityId: email.trim().toLowerCase(),
            entityLabel: fullName.trim() || email.trim().toLowerCase(),
            action: 'create',
            summary: `Invitacion creada para ${email.trim().toLowerCase()} con rol ${roleLabels[selectedRole]}.`,
          })
        } catch {
          // No bloqueamos la gestion de equipo si auditoria no esta disponible.
        }
      }

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

      if (business?.id) {
        try {
          await webAuditLogService.create({
            businessId: business.id,
            actorUserId: user?.id ?? null,
            actorMembershipId: membership?.id ?? null,
            actorRole: currentRole,
            actorVisibleCode: membership?.visibleCode ?? null,
            entityName: 'business_membership',
            entityId: memberId,
            action: 'update',
            actionType: 'inventory_adjusted',
            summary: `Accesos actualizados para miembro ${memberId.slice(0, 8)} con rol ${roleLabels[nextRole]}.`,
          })
        } catch {
          // La auditoria es complementaria y no debe romper la actualizacion.
        }
      }

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
      <section className="surface-card admin-empty-state">
        <p className="section-kicker">Equipo</p>
        <h3>Acceso restringido</h3>
        <p>Solo owner o admin pueden gestionar el equipo y las invitaciones.</p>
      </section>
    )
  }

  return (
    <section className="admin-web">
      <AdminNotice
        tone="info"
        title="Modulo transitorio"
      >
        Equipo sigue administrando invitaciones y membresias del negocio. La ficha del trabajador ahora vive en Personal y los permisos administrativos granulares se gestionan en Roles y permisos.
      </AdminNotice>

      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi">
          <span>Miembros</span>
          <strong>{members.length}</strong>
          <p>Usuarios asociados actualmente al negocio.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Invitaciones</span>
          <strong>{invitations.length}</strong>
          <p>Invitaciones creadas y visibles para este negocio.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Rol actual</span>
          <strong>{currentRole ? roleLabels[currentRole] : 'Sin rol'}</strong>
          <p>El acceso visible depende de tus permisos efectivos.</p>
        </article>
      </div>

      <div className="admin-web__grid">
        <section className="surface-card">
          <div className="admin-form-banner">
            <div>
              <strong>Compatibilidad temporal activa</strong>
              <p>
                Usa este modulo para invitar usuarios y mantener membresias del negocio. Para administrar fichas laborales ve a Personal, y para permisos administrativos usa Roles y permisos.
              </p>
            </div>
            <div className="admin-form-actions admin-form-actions--inline">
              <Button variant="secondary" onClick={() => navigate('/employees')}>
                Ir a Personal
              </Button>
              <Button variant="secondary" onClick={() => navigate('/roles')}>
                Ir a Roles
              </Button>
            </div>
          </div>

          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Invitar usuario</p>
              <h3>Nuevo acceso por correo</h3>
              <p>Replica el flujo mobile para invitar trabajadores al minimarket.</p>
            </div>
          </div>

          <div className="admin-form-grid">
            <Field
              label="Correo"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="trabajador@correo.com"
              type="email"
            />
            <Field
              label="Nombre"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nombre del trabajador"
            />
          </div>

          <div className="admin-role-row">
            {inviteRoleOptions.map((role) => (
              <Button
                key={role}
                variant={selectedRole === role ? 'primary' : 'secondary'}
                onClick={() => setSelectedRole(role)}
                disabled={isSubmitting}
              >
                {roleLabels[role]}
              </Button>
            ))}
          </div>

          {feedback ? (
            <p className="products-web__message products-web__message--success">{feedback}</p>
          ) : null}
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <Button onClick={() => void handleInvite()} disabled={isSubmitting}>
            {isSubmitting ? 'Invitando...' : 'Invitar por correo'}
          </Button>
        </section>

        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Invitaciones pendientes</p>
              <h3>Seguimiento del equipo</h3>
              <p>Visibilidad simple de correos, rol base y estado de la invitacion.</p>
            </div>
          </div>

          <div className="reports-web__list">
            {invitations.length ? (
              invitations.map((invitation) => (
                <article key={invitation.id} className="report-list__item">
                  <div>
                    <strong>{invitation.fullName || invitation.email}</strong>
                    <p>
                      {invitation.email} · {roleLabels[invitation.role]} · {invitation.status}
                    </p>
                  </div>
                  <span className="status-chip status-chip--muted">
                    {new Date(invitation.createdAt).toLocaleDateString('es-CL')}
                  </span>
                </article>
              ))
            ) : (
              <article className="products-empty">
                <strong>No hay invitaciones pendientes.</strong>
                <p>Las nuevas invitaciones apareceran en este panel.</p>
              </article>
            )}
          </div>
        </section>
      </div>

      <section className="surface-card">
        <div className="inventory-section__header">
          <div>
            <p className="section-kicker">Miembros</p>
            <h3>Roles y permisos</h3>
            <p>Owner no se edita desde esta vista, igual que en mobile.</p>
          </div>
        </div>

        <div className="admin-members-list">
          {members.length ? (
            members.map((memberItem) => {
              const isOwner = ownerIdSet.has(memberItem.userId)
              const effectiveRole = getEffectiveRole(memberItem.id, memberItem.role)
              const effectivePermissions = getEffectivePermissions(
                memberItem.id,
                effectiveRole,
                memberItem.permissions,
              )

              return (
                <article key={memberItem.id} className="admin-member-card">
                  <div className="admin-member-card__header">
                    <div>
                      <strong>
                        {isOwner ? 'Owner principal' : `Usuario ${memberItem.userId.slice(0, 8)}`}
                      </strong>
                      <p>
                        Rol base: {roleLabels[memberItem.role]}
                        {memberItem.visibleCode ? ` · ${memberItem.visibleCode}` : ''}
                      </p>
                    </div>
                    <span className="status-chip">{roleLabels[effectiveRole]}</span>
                  </div>

                  {!isOwner ? (
                    <>
                      <div className="admin-role-row">
                        {editableRoleOptions.map((role) => (
                          <Button
                            key={`${memberItem.id}-${role}`}
                            variant={effectiveRole === role ? 'primary' : 'secondary'}
                            onClick={() =>
                              setDraftRoles((current) => ({
                                ...current,
                                [memberItem.id]: role,
                              }))
                            }
                            disabled={savingMemberId === memberItem.id}
                          >
                            {roleLabels[role]}
                          </Button>
                        ))}
                      </div>

                      <div className="admin-permissions-grid">
                        {businessPermissionOptions.map((permissionKey) => {
                          const isActive = effectivePermissions.includes(permissionKey)
                          return (
                            <Button
                              key={`${memberItem.id}-${permissionKey}`}
                              variant={isActive ? 'primary' : 'secondary'}
                              onClick={() =>
                                toggleMemberPermission(
                                  memberItem.id,
                                  effectiveRole,
                                  permissionKey,
                                  memberItem.permissions,
                                )
                              }
                              disabled={savingMemberId === memberItem.id}
                            >
                              {businessPermissionLabels[permissionKey]}
                            </Button>
                          )
                        })}
                      </div>

                      <Button
                        onClick={() =>
                          void saveMemberAccess(
                            memberItem.id,
                            memberItem.role,
                            memberItem.permissions,
                          )
                        }
                        disabled={savingMemberId === memberItem.id}
                      >
                        {savingMemberId === memberItem.id
                          ? 'Guardando permisos...'
                          : 'Guardar permisos'}
                      </Button>
                    </>
                  ) : (
                    <p className="field__hint">
                      El owner mantiene control total y no se edita desde esta vista.
                    </p>
                  )}
                </article>
              )
            })
          ) : (
            <article className="products-empty">
              <strong>Todavia no hay miembros asociados.</strong>
              <p>Invita al equipo para empezar a configurar accesos.</p>
            </article>
          )}
        </div>
      </section>
    </section>
  )
}
