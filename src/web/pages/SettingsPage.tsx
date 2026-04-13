import { Button } from '../../components/ui/Button'
import { useWebAuth } from '../auth/AuthProvider'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

export function SettingsPage() {
  const { user, signOut } = useWebAuth()
  const { business, membership, currentRole, permissions, members, invitations, refreshWorkspace } =
    useWebWorkspace()

  return (
    <section className="admin-web">
      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi">
          <span>Negocio</span>
          <strong>{business?.name ?? 'Sin nombre'}</strong>
          <p>Perfil actual cargado desde el workspace.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Rol</span>
          <strong>{currentRole ?? 'sin rol'}</strong>
          <p>El acceso visible respeta las reglas actuales de mobile.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Permisos activos</span>
          <strong>{permissions.length}</strong>
          <p>Permisos efectivos para esta sesion administrativa.</p>
        </article>
      </div>

      <div className="admin-web__grid">
        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Perfil del negocio</p>
              <h3>Datos actuales del minimarket</h3>
              <p>
                Mobile hoy crea estos datos desde onboarding. En web se muestran sin
                inventar reglas nuevas de edicion.
              </p>
            </div>
          </div>

          <div className="settings-summary">
            <div>
              <span>Nombre comercial</span>
              <strong>{business?.name ?? 'No disponible'}</strong>
            </div>
            <div>
              <span>Razon social</span>
              <strong>{business?.legalName ?? 'No configurada'}</strong>
            </div>
            <div>
              <span>ID negocio</span>
              <strong>{business?.id ?? 'No disponible'}</strong>
            </div>
            <div>
              <span>Sincronizacion</span>
              <strong>{business?.isCloudSyncEnabled ? 'Activa' : 'No disponible'}</strong>
            </div>
          </div>
        </section>

        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Sesion administrativa</p>
              <h3>Acceso actual</h3>
              <p>Identificacion visible del usuario y del workspace activo.</p>
            </div>
          </div>

          <div className="settings-summary">
            <div>
              <span>Correo</span>
              <strong>{user?.email ?? 'No disponible'}</strong>
            </div>
            <div>
              <span>Rol</span>
              <strong>{currentRole ?? 'Sin rol'}</strong>
            </div>
            <div>
              <span>Codigo visible</span>
              <strong>{membership?.visibleCode ?? 'No asignado'}</strong>
            </div>
            <div>
              <span>Miembros / invitaciones</span>
              <strong>
                {members.length} / {invitations.length}
              </strong>
            </div>
          </div>

          <div className="admin-role-row">
            <Button variant="secondary" onClick={() => void refreshWorkspace()}>
              Recargar estado
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void signOut()
              }}
            >
              Cerrar sesion
            </Button>
          </div>
        </section>
      </div>

      <section className="surface-card">
        <div className="inventory-section__header">
          <div>
            <p className="section-kicker">Permisos efectivos</p>
            <h3>Restricciones por accion</h3>
            <p>Resumen de permisos activos aplicado por las reglas actuales de roles.</p>
          </div>
        </div>

        <div className="admin-permissions-grid">
          {permissions.length ? (
            permissions.map((permission) => (
              <span key={permission} className="status-chip">
                {permission}
              </span>
            ))
          ) : (
            <p className="field__hint">No hay permisos efectivos cargados.</p>
          )}
        </div>
      </section>
    </section>
  )
}
