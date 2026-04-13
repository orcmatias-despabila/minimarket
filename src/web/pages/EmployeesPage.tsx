import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { AdminEmptyState } from '../components/AdminEmptyState'
import { AdminFilterToolbar } from '../components/AdminFilterToolbar'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { adminEmployeesService } from '../services/adminEmployees.service'
import { adminRolesService } from '../services/adminRoles.service'
import type {
  AdminArchivedFilter,
  AdminEmployee,
  AdminEmployeeAccessState,
  AdminEmployeeStatus,
} from '../types/adminEmployee'
import type { AdminRole } from '../types/adminRole'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

type FeedbackState = {
  feedback?: string
} | null

export function EmployeesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { business } = useWebWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const [employees, setEmployees] = useState<AdminEmployee[]>([])
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '')
  const [statusFilter, setStatusFilter] = useState<'all' | AdminEmployeeStatus>(
    (searchParams.get('status') as 'all' | AdminEmployeeStatus | null) ?? 'all',
  )
  const [roleFilter, setRoleFilter] = useState(searchParams.get('roleId') ?? 'all')
  const [accessFilter, setAccessFilter] = useState<'all' | AdminEmployeeAccessState>(
    (searchParams.get('access') as 'all' | AdminEmployeeAccessState | null) ?? 'all',
  )
  const [archivedFilter, setArchivedFilter] = useState<AdminArchivedFilter>(
    (searchParams.get('archived') as AdminArchivedFilter | null) ?? 'active',
  )
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1') || 1)
  const [isLoading, setIsLoading] = useState(true)
  const [isMutatingId, setIsMutatingId] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(
    (location.state as FeedbackState)?.feedback ?? null,
  )
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  const currentListUrl = `${location.pathname}${location.search}`

  useEffect(() => {
    const nextParams = new URLSearchParams()

    if (searchTerm.trim()) {
      nextParams.set('search', searchTerm.trim())
    }
    if (statusFilter !== 'all') {
      nextParams.set('status', statusFilter)
    }
    if (roleFilter !== 'all') {
      nextParams.set('roleId', roleFilter)
    }
    if (accessFilter !== 'all') {
      nextParams.set('access', accessFilter)
    }
    if (archivedFilter !== 'active') {
      nextParams.set('archived', archivedFilter)
    }
    if (page > 1) {
      nextParams.set('page', String(page))
    }

    setSearchParams(nextParams, { replace: true })
  }, [accessFilter, archivedFilter, page, roleFilter, searchTerm, setSearchParams, statusFilter])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter, roleFilter, accessFilter, archivedFilter])

  useEffect(() => {
    let isCancelled = false

    const loadData = async () => {
      if (!business?.id) {
        setEmployees([])
        setRoles([])
        setHasMore(false)
        setTotal(0)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setSyncError(null)

      try {
        const [employeesResult, rolesResult] = await Promise.all([
          adminEmployeesService.list({
            businessId: business.id,
            search: searchTerm,
            status: statusFilter,
            roleId: roleFilter !== 'all' ? roleFilter : undefined,
            accessStatus: accessFilter,
            archived: archivedFilter,
            page,
            pageSize: 20,
          }),
          adminRolesService.list({
            businessId: business.id,
            status: 'all',
            page: 1,
            pageSize: 100,
          }),
        ])

        if (!isCancelled) {
          setEmployees(employeesResult.items)
          setHasMore(employeesResult.hasMore)
          setTotal(employeesResult.total)
          setRoles(rolesResult.items)
        }
      } catch (error) {
        if (!isCancelled) {
          setEmployees([])
          setHasMore(false)
          setTotal(0)
          setRoles([])
          setSyncError(error instanceof Error ? error.message : 'No pudimos cargar personal.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      isCancelled = true
    }
  }, [accessFilter, archivedFilter, business?.id, page, roleFilter, searchTerm, statusFilter])

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
      filters.push({ label: 'Estado', value: statusFilter })
    }
    if (accessFilter !== 'all') {
      filters.push({ label: 'Acceso', value: accessFilter })
    }
    if (roleFilter !== 'all') {
      const role = roles.find((item) => item.id === roleFilter)
      filters.push({ label: 'Rol', value: role?.name ?? roleFilter })
    }
    if (archivedFilter !== 'active') {
      filters.push({ label: 'Archivado', value: archivedFilter })
    }

    return filters
  }, [accessFilter, archivedFilter, roleFilter, roles, searchTerm, statusFilter])

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setRoleFilter('all')
    setAccessFilter('all')
    setArchivedFilter('active')
    setPage(1)
  }

  const handleToggleStatus = async (employee: AdminEmployee) => {
    setFeedback(null)
    setSyncError(null)
    setIsMutatingId(employee.id)

    try {
      if (employee.status === 'active') {
        await adminEmployeesService.deactivate(employee.id)
        setFeedback(`Trabajador ${employee.fullName} desactivado.`)
      } else {
        await adminEmployeesService.activate(employee.id)
        setFeedback(`Trabajador ${employee.fullName} activado.`)
      }

      const refreshed = await adminEmployeesService.list({
        businessId: business?.id ?? '',
        search: searchTerm,
        status: statusFilter,
        roleId: roleFilter !== 'all' ? roleFilter : undefined,
        accessStatus: accessFilter,
        archived: archivedFilter,
        page,
        pageSize: 20,
      })

      setEmployees(refreshed.items)
      setHasMore(refreshed.hasMore)
      setTotal(refreshed.total)
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'No pudimos actualizar el estado del trabajador.',
      )
    } finally {
      setIsMutatingId(null)
    }
  }

  const hasResults = employees.length > 0

  return (
    <section className="employees-web">
      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi">
          <span>Trabajadores visibles</span>
          <strong>{employees.length}</strong>
          <p>Resultados paginados del negocio segun filtros y busqueda actual.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Total estimado</span>
          <strong>{total}</strong>
          <p>Conteo entregado por Supabase para esta combinacion de filtros.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Con acceso activo</span>
          <strong>
            {employees.filter((item) => item.currentAccess?.accessStatus === 'active').length}
          </strong>
          <p>Trabajadores del tramo actual con acceso vigente al sistema.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Filtro archivado</span>
          <strong>{archivedFilter}</strong>
          <p>Control de activos, archivados o todos los registros del modulo.</p>
        </article>
      </div>

      <section className="surface-card">
        <div className="inventory-section__header">
          <div>
            <p className="section-kicker">Personal</p>
            <h3>Trabajadores del negocio</h3>
            <p>Listado administrativo para revisar fichas, acceso y estado laboral.</p>
          </div>
        </div>

        {isLoading ? <AdminLoadingBlock label="Cargando trabajadores" compact /> : null}
        {syncError ? <AdminNotice tone="error">{syncError}</AdminNotice> : null}
        {feedback ? <AdminNotice tone="success">{feedback}</AdminNotice> : null}

        <AdminFilterToolbar
          title="Busqueda y filtros"
          description="Encuentra trabajadores por nombre, RUT, correo, acceso o rol."
          actions={
            <Button
              variant="secondary"
              onClick={() =>
                navigate(`/employees/new?returnTo=${encodeURIComponent(currentListUrl)}`)
              }
            >
              Nuevo trabajador
            </Button>
          }
          activeFilters={activeFilters}
          onClearFilters={activeFilters.length ? clearFilters : undefined}
        >
          <div className="employees-web__filters">
            <Field
              label="Buscar"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nombre, RUT, correo, telefono o codigo"
            />
            <SelectField
              label="Estado"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | AdminEmployeeStatus)}
              options={[
                { label: 'Todos', value: 'all' },
                { label: 'Activos', value: 'active' },
                { label: 'Inactivos', value: 'inactive' },
                { label: 'Licencia / permiso', value: 'leave' },
                { label: 'Terminados', value: 'terminated' },
              ]}
            />
            <SelectField
              label="Rol"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              options={[
                { label: 'Todos', value: 'all' },
                ...roles.map((role) => ({ label: role.name, value: role.id })),
              ]}
            />
            <SelectField
              label="Acceso"
              value={accessFilter}
              onChange={(event) =>
                setAccessFilter(event.target.value as 'all' | AdminEmployeeAccessState)
              }
              options={[
                { label: 'Todos', value: 'all' },
                { label: 'Sin acceso', value: 'none' },
                { label: 'Pendiente', value: 'pending' },
                { label: 'Activo', value: 'active' },
                { label: 'Suspendido', value: 'suspended' },
                { label: 'Revocado', value: 'revoked' },
              ]}
            />
            <SelectField
              label="Archivado"
              value={archivedFilter}
              onChange={(event) => setArchivedFilter(event.target.value as AdminArchivedFilter)}
              options={[
                { label: 'Activos', value: 'active' },
                { label: 'Archivados', value: 'archived' },
                { label: 'Todos', value: 'all' },
              ]}
            />
          </div>
        </AdminFilterToolbar>

        <div className="employees-web__table-shell">
          <div className="employees-web__table">
          {hasResults ? (
            <>
              <div className="employees-web__row employees-web__row--head">
                <span>Nombre</span>
                <span>RUT</span>
                <span>Cargo</span>
                <span>Area</span>
                <span>Telefono</span>
                <span>Correo</span>
                <span>Estado</span>
                <span>Acceso</span>
                <span>Rol</span>
                <span>Acciones</span>
              </div>

              {employees.map((employee) => (
                <div key={employee.id} className="employees-web__row">
                  <span className="admin-table__primary">
                    <strong>{employee.fullName}</strong>
                    <small>{employee.employeeCode || employee.preferredName || 'Sin codigo'}</small>
                  </span>
                  <span className="admin-table__key">{employee.taxId}</span>
                  <span>{employee.currentJob?.jobTitle || 'Sin cargo'}</span>
                  <span>{employee.currentJob?.department || 'Sin area'}</span>
                  <span>{employee.phone || 'Sin telefono'}</span>
                  <span>{employee.personalEmail || 'Sin correo'}</span>
                  <span>
                    <span
                      className={`status-chip admin-status-badge ${
                        employee.status === 'active' ? '' : 'status-chip--muted'
                      }`.trim()}
                    >
                      {employee.status}
                    </span>
                  </span>
                  <span>
                    {employee.currentAccess?.accessStatus === 'active'
                      ? 'Activo'
                      : employee.currentAccess?.accessStatus === 'pending'
                        ? 'Pendiente'
                        : employee.currentAccess?.accessStatus === 'suspended'
                          ? 'Suspendido'
                          : employee.currentAccess?.accessStatus === 'revoked'
                            ? 'Revocado'
                            : 'Sin acceso'}
                  </span>
                  <span>{employee.currentAccess?.roleName || 'Sin rol'}</span>
                  <span className="employees-web__actions admin-table__actions">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(`/employees/${employee.id}?returnTo=${encodeURIComponent(currentListUrl)}`)
                      }
                    >
                      Ver
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(
                          `/employees/${employee.id}/edit?returnTo=${encodeURIComponent(currentListUrl)}`,
                        )
                      }
                    >
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(
                          `/employees/${employee.id}?tab=access&returnTo=${encodeURIComponent(currentListUrl)}`,
                        )
                      }
                    >
                      Permisos
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => void handleToggleStatus(employee)}
                      disabled={isMutatingId === employee.id}
                    >
                      {isMutatingId === employee.id
                        ? 'Aplicando...'
                        : employee.status === 'active'
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
              title={activeFilters.length ? 'No se encontraron trabajadores' : 'No hay trabajadores aun'}
              description={
                activeFilters.length
                  ? 'Prueba con otro termino o ajusta filtros de estado, rol o acceso.'
                  : 'Cuando registres trabajadores aqui veras sus fichas, acceso y estado laboral.'
              }
              actionLabel={activeFilters.length ? 'Limpiar filtros' : 'Nuevo trabajador'}
              onAction={() =>
                activeFilters.length
                  ? clearFilters()
                  : navigate(`/employees/new?returnTo=${encodeURIComponent(currentListUrl)}`)
              }
            />
          ) : null}
          </div>
        </div>

        {hasResults ? (
          <div className="employees-web__pagination">
            <span>
              Pagina {page}
              {total ? ` de ${Math.max(1, Math.ceil(total / 20))}` : ''}
            </span>
            <div className="employees-web__pagination-actions">
              <Button variant="secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1 || isLoading}>
                Anterior
              </Button>
              <Button variant="secondary" onClick={() => setPage((current) => current + 1)} disabled={!hasMore || isLoading}>
                Siguiente
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  )
}
