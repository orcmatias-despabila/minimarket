import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { AdminEmptyState } from '../components/AdminEmptyState'
import { AdminFilterToolbar } from '../components/AdminFilterToolbar'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { adminRolesService } from '../services/adminRoles.service'
import type { AdminRole, AdminRoleState } from '../types/adminRole'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

type FeedbackState = {
  feedback?: string
} | null

export function RolesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { business } = useWebWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '')
  const [statusFilter, setStatusFilter] = useState<'all' | AdminRoleState>(
    (searchParams.get('status') as 'all' | AdminRoleState | null) ?? 'all',
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isMutatingRoleId, setIsMutatingRoleId] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(
    (location.state as FeedbackState)?.feedback ?? null,
  )

  const currentListUrl = `${location.pathname}${location.search}`

  const loadRoles = async () => {
    if (!business?.id) {
      setRoles([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setSyncError(null)

    try {
      const result = await adminRolesService.list({
        businessId: business.id,
        search: searchTerm,
        status: statusFilter,
        page: 1,
        pageSize: 100,
      })

      setRoles(result.items)
    } catch (error) {
      setRoles([])
      setSyncError(error instanceof Error ? error.message : 'No pudimos cargar roles.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const nextParams = new URLSearchParams()

    if (searchTerm.trim()) {
      nextParams.set('search', searchTerm.trim())
    }

    if (statusFilter !== 'all') {
      nextParams.set('status', statusFilter)
    }

    setSearchParams(nextParams, { replace: true })
  }, [searchTerm, setSearchParams, statusFilter])

  useEffect(() => {
    void loadRoles()
  }, [business?.id, searchTerm, statusFilter])

  useEffect(() => {
    const state = location.state as FeedbackState

    if (!state?.feedback) {
      return
    }

    setFeedback(state.feedback)
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  const activeFilters = useMemo(() => {
    const filters: Array<{ label: string; value: string }> = []

    if (searchTerm.trim()) {
      filters.push({ label: 'Busqueda', value: searchTerm.trim() })
    }

    if (statusFilter !== 'all') {
      filters.push({
        label: 'Estado',
        value: statusFilter === 'active' ? 'Activo' : 'Inactivo',
      })
    }

    return filters
  }, [searchTerm, statusFilter])

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  const handleToggleStatus = async (role: AdminRole) => {
    setFeedback(null)
    setSyncError(null)
    setIsMutatingRoleId(role.id)

    try {
      if (role.status === 'active') {
        await adminRolesService.deactivate(role.id)
        setFeedback(`Rol ${role.name} desactivado.`)
      } else {
        await adminRolesService.activate(role.id)
        setFeedback(`Rol ${role.name} activado.`)
      }

      await loadRoles()
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'No pudimos cambiar el estado del rol.')
    } finally {
      setIsMutatingRoleId(null)
    }
  }

  return (
    <section className="roles-web">
      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi">
          <span>Roles visibles</span>
          <strong>{roles.length}</strong>
          <p>Listado administrativo de roles disponibles para personal y accesos.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Activos</span>
          <strong>{roles.filter((role) => role.status === 'active').length}</strong>
          <p>Roles utilizables en este momento dentro del negocio.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Permisos asignados</span>
          <strong>{roles.reduce((total, role) => total + (role.permissionCount ?? 0), 0)}</strong>
          <p>Total de asignaciones registradas entre roles y permisos.</p>
        </article>
      </div>

      <section className="surface-card">
        <div className="inventory-section__header">
          <div>
            <p className="section-kicker">Roles y permisos</p>
            <h3>Roles administrativos</h3>
            <p>Crea, edita y controla el estado de roles internos del negocio.</p>
          </div>
        </div>

        {isLoading ? <AdminLoadingBlock label="Cargando roles" compact /> : null}
        {syncError ? <AdminNotice tone="error">{syncError}</AdminNotice> : null}
        {feedback ? <AdminNotice tone="success">{feedback}</AdminNotice> : null}

        <AdminFilterToolbar
          title="Busqueda y filtros"
          description="Encuentra roles por nombre, codigo o estado."
          actions={
            <Button
              variant="secondary"
              onClick={() => navigate(`/roles/new?returnTo=${encodeURIComponent(currentListUrl)}`)}
            >
              Nuevo rol
            </Button>
          }
          activeFilters={activeFilters}
          onClearFilters={activeFilters.length ? clearFilters : undefined}
        >
          <div className="roles-web__filters">
            <Field
              label="Buscar"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nombre, codigo o descripcion"
            />
            <SelectField
              label="Estado"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | AdminRoleState)}
              options={[
                { label: 'Todos', value: 'all' },
                { label: 'Activos', value: 'active' },
                { label: 'Inactivos', value: 'inactive' },
              ]}
            />
          </div>
        </AdminFilterToolbar>

        <div className="roles-web__table-shell">
          <div className="roles-web__table">
          {roles.length ? (
            <>
              <div className="roles-web__row roles-web__row--head">
                <span>Nombre</span>
                <span>Codigo</span>
                <span>Permisos</span>
                <span>Estado</span>
                <span>Acciones</span>
              </div>

              {roles.map((role) => (
                <div key={role.id} className="roles-web__row">
                  <span className="admin-table__primary">
                    <strong>{role.name}</strong>
                    <small>{role.description || 'Sin descripcion'}</small>
                  </span>
                  <span className="admin-table__key">{role.code}</span>
                  <span>{role.permissionCount ?? 0}</span>
                  <span>
                    <span
                      className={`status-chip admin-status-badge ${
                        role.status === 'active' ? '' : 'status-chip--muted'
                      }`.trim()}
                    >
                      {role.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </span>
                  <span className="roles-web__actions admin-table__actions">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(
                          `/roles/${role.id}/edit?returnTo=${encodeURIComponent(currentListUrl)}`,
                        )
                      }
                    >
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(
                          `/roles/${role.id}/permissions?returnTo=${encodeURIComponent(currentListUrl)}`,
                        )
                      }
                    >
                      Permisos
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => void handleToggleStatus(role)}
                      disabled={isMutatingRoleId === role.id}
                    >
                      {isMutatingRoleId === role.id
                        ? 'Aplicando...'
                        : role.status === 'active'
                          ? 'Desactivar'
                          : 'Activar'}
                    </Button>
                  </span>
                </div>
              ))}
            </>
          ) : !isLoading && !syncError ? (
            <AdminEmptyState
              tone={activeFilters.length ? 'search' : 'neutral'}
              title={activeFilters.length ? 'No se encontraron roles' : 'No hay roles creados'}
              description={
                activeFilters.length
                  ? 'Prueba con otro termino o cambia el filtro de estado.'
                  : 'Crea un rol nuevo para comenzar a estructurar permisos del negocio.'
              }
              actionLabel={activeFilters.length ? 'Limpiar filtros' : 'Nuevo rol'}
              onAction={() =>
                activeFilters.length
                  ? clearFilters()
                  : navigate(`/roles/new?returnTo=${encodeURIComponent(currentListUrl)}`)
              }
            />
          ) : null}
          </div>
        </div>
      </section>
    </section>
  )
}
