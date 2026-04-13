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
const accessStatusOptions = ['todos', 'activos', 'pendientes'] as const

const roleLabels: Record<UserRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  cashier: 'Caja',
  inventory: 'Inventario',
}

const normalizeText = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

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
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<(typeof accessStatusOptions)[number]>('todos')
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

  const pendingInvitationEmails = useMemo(
    () => new Set(invitations.map((item) => normalizeText(item.email))),
    [invitations],
  )

  const filteredMembers = useMemo(() => {
    const search = normalizeText(searchTerm)

    return members.filter((memberItem) => {
      const labelParts = [
        ownerIdSet.has(memberItem.userId) ? 'propietario principal' : `usuario ${memberItem.userId.slice(0, 8)}`,
        roleLabels[memberItem.role],
        memberItem.visibleCode ?? '',
      ]
      const matchesSearch = !search || normalizeText(labelParts.join(' ')).includes(search)
      const hasPendingInvitation = pendingInvitationEmails.has(normalizeText(memberItem.userId))

      if (!matchesSearch) {
        return false
      }

      if (statusFilter === 'activos') {
        return !hasPendingInvitation
      }

      if (statusFilter === 'pendientes') {
        return hasPendingInvitation
      }

      return true
    })
  }, [members, ownerIdSet, pendingInvitationEmails, searchTerm, statusFilter])

  const filteredInvitations = useMemo(() => {
    const search = normalizeText(searchTerm)

    return invitations.filter((invitation) => {
      const invitationLabel = `${invitation.fullName ?? ''} ${invitation.email} ${
        roleLabels[invitation.role]
      } ${invitation.status}`

      if (!search) {
        return statusFilter !== 'activos'
      }

      return normalizeText(invitationLabel).includes(search) && statusFilter !== 'activos'
    })
  }, [invitations, searchTerm, statusFilter])

  const activeMembersCount = useMemo(() => {
    if (!pendingInvitationEmails.size) {
      return members.length
    }

    return members.filter((memberItem) => !pendingInvitationEmails.has(normalizeText(memberItem.userId))).length
  }, [members, pendingInvitationEmails])

  const futureImprovements = [
    'Historial de acceso por usuario con último ingreso, suspensión y reactivación.',
    'Acciones rápidas para reenviar invitación, suspender acceso o filtrar por rol.',
  ]

  const handleInvite = async () => {
    setFeedback(null)
    setErrorMessage(null)

    if (!canInvite) {
      setErrorMessage('Solo propietario o administrador pueden invitar usuarios.')
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
            summary: `Invitación creada para ${email.trim().toLowerCase()} con rol ${roleLabels[selectedRole]}.`,
          })
        } catch {
          // La auditoría no debe bloquear la gestión de accesos.
        }
      }

      setEmail('')
      setFullName('')
      setSelectedRole('cashier')
      setFeedback('Invitación creada correctamente.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No pudimos enviar la invitación.',
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
          // La auditoría es complementaria y no debe romper la actualización.
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
      setFeedback('Accesos actualizados correctamente.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No pudimos actualizar los accesos.',
      )
    } finally {
      setSavingMemberId(null)
    }
  }

  if (!canInvite) {
    return (
      <section className="surface-card admin-empty-state">
        <p className="section-kicker">Usuarios y accesos</p>
        <h3>Acceso restringido</h3>
        <p>Solo propietario o administrador pueden gestionar accesos e invitaciones.</p>
      </section>
    )
  }

  return (
    <section className="admin-web">
      <AdminNotice tone="info" title="Accesos del negocio">
        Esta vista se enfoca en usuarios, invitaciones y permisos de entrada al sistema. La información laboral sigue en Personal y la definición de permisos administrativos vive en Roles y permisos.
      </AdminNotice>

      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi">
          <span>Usuarios con acceso</span>
          <strong>{activeMembersCount}</strong>
          <p>Personas con acceso visible al negocio.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Invitaciones pendientes</span>
          <strong>{invitations.length}</strong>
          <p>Accesos aún pendientes de aceptación.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Rol actual</span>
          <strong>{currentRole ? roleLabels[currentRole] : 'Sin rol'}</strong>
          <p>Tu visibilidad depende de los permisos asignados.</p>
        </article>
      </div>

      <div className="admin-web__grid">
        <section className="surface-card">
          <div className="admin-form-banner">
            <div>
              <strong>Invitar en pocos pasos</strong>
              <p>
                Crea un acceso nuevo por correo y define el rol base desde aquí. Para gestionar fichas laborales usa Personal; para permisos administrativos detallados usa Roles y permisos.
              </p>
            </div>
            <div className="admin-form-actions admin-form-actions--inline">
              <Button variant="secondary" onClick={() => navigate('/employees')}>
                Ir a Personal
              </Button>
              <Button variant="secondary" onClick={() => navigate('/roles')}>
                Ir a Roles y permisos
              </Button>
            </div>
          </div>

          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Nuevo acceso</p>
              <h3>Invitar por correo</h3>
              <p>Asigna un rol base y deja listo el ingreso al sistema.</p>
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
            {isSubmitting ? 'Enviando invitación...' : 'Invitar usuario'}
          </Button>
        </section>

        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Búsqueda y filtros</p>
              <h3>Encontrar accesos rápido</h3>
              <p>Ubica usuarios o invitaciones por nombre, correo, rol o estado.</p>
            </div>
          </div>

          <Field
            label="Buscar"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nombre, correo, rol o código visible"
          />

          <div className="admin-role-row">
            {accessStatusOptions.map((option) => (
              <Button
                key={option}
                variant={statusFilter === option ? 'primary' : 'secondary'}
                onClick={() => setStatusFilter(option)}
              >
                {option === 'todos'
                  ? 'Todos'
                  : option === 'activos'
                    ? 'Activos'
                    : 'Pendientes'}
              </Button>
            ))}
          </div>

          <div className="dashboard-context-grid">
            <div>
              <span>Usuarios filtrados</span>
              <strong>{filteredMembers.length}</strong>
            </div>
            <div>
              <span>Invitaciones filtradas</span>
              <strong>{filteredInvitations.length}</strong>
            </div>
          </div>

          <AdminNotice tone="info" title="Base para la siguiente mejora">
            {futureImprovements.join(' ')}
          </AdminNotice>
        </section>
      </div>

      <section className="surface-card">
        <div className="inventory-section__header">
          <div>
            <p className="section-kicker">Usuarios del negocio</p>
            <h3>Acceso, rol y permisos</h3>
            <p>Revisa rápido quién tiene acceso, qué rol usa y qué puede hacer.</p>
          </div>
        </div>

        <div className="admin-members-list">
          {filteredMembers.length ? (
            filteredMembers.map((memberItem) => {
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
                        {isOwner ? 'Propietario principal' : `Usuario ${memberItem.userId.slice(0, 8)}`}
                      </strong>
                      <p>
                        Rol asignado: {roleLabels[memberItem.role]}
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
                          ? 'Guardando cambios...'
                          : 'Guardar cambios'}
                      </Button>
                    </>
                  ) : (
                    <p className="field__hint">
                      El propietario mantiene control total y no se edita desde esta vista.
                    </p>
                  )}
                </article>
              )
            })
          ) : (
            <article className="products-empty">
              <strong>No encontramos usuarios con ese filtro.</strong>
              <p>Ajusta la búsqueda o cambia el estado para ver más accesos.</p>
            </article>
          )}
        </div>
      </section>

      <section className="surface-card">
        <div className="inventory-section__header">
          <div>
            <p className="section-kicker">Invitaciones</p>
            <h3>Accesos pendientes</h3>
            <p>Seguimiento simple de correo, rol asignado y estado de ingreso.</p>
          </div>
        </div>

        <div className="reports-web__list">
          {filteredInvitations.length ? (
            filteredInvitations.map((invitation) => (
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
              <strong>No hay invitaciones pendientes con ese filtro.</strong>
              <p>Las nuevas invitaciones aparecerán aquí cuando sean creadas.</p>
            </article>
          )}
        </div>
      </section>
    </section>
  )
}
