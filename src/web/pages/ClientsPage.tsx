import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { AdminEmptyState } from '../components/AdminEmptyState'
import { AdminFilterToolbar } from '../components/AdminFilterToolbar'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { adminCustomersService } from '../services/adminCustomers.service'
import type { AdminCustomer } from '../types/adminCustomer'
import type { AdminActiveStatus } from '../types/adminShared'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

type FeedbackState = {
  feedback?: string
} | null

export function ClientsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { business } = useWebWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '')
  const [statusFilter, setStatusFilter] = useState<'all' | AdminActiveStatus>(
    (searchParams.get('status') as 'all' | AdminActiveStatus | null) ?? 'all',
  )
  const [isSearching, setIsSearching] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(
    (location.state as FeedbackState)?.feedback ?? null,
  )

  const currentListUrl = `${location.pathname}${location.search}`

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
    let isCancelled = false

    if (!business?.id) {
      setCustomers([])
      setIsSearching(false)
      setSyncError(null)
      return
    }

    if (searchTerm.trim() === '') {
      setCustomers([])
      setIsSearching(false)
      setSyncError(null)
      return
    }

    const runSearch = async () => {
      setIsSearching(true)
      setSyncError(null)

      try {
        const results = await adminCustomersService.search({
          businessId: business.id,
          search: searchTerm,
          status: statusFilter,
          limit: 10,
        })

        if (!isCancelled) {
          setCustomers(results)
        }
      } catch (error) {
        if (!isCancelled) {
          setCustomers([])
          setSyncError(error instanceof Error ? error.message : 'No pudimos buscar clientes.')
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false)
        }
      }
    }

    void runSearch()

    return () => {
      isCancelled = true
    }
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

  const isInitialState = searchTerm.trim() === ''
  const hasResults = customers.length > 0

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  return (
    <section className="customers-web">
      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi">
          <span>Clientes</span>
          <strong>{customers.length}</strong>
          <p>Resultados en vivo desde Supabase segun lo que escribes.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Activos visibles</span>
          <strong>{customers.filter((item) => item.status === 'active').length}</strong>
          <p>Clientes activos dentro de los resultados mostrados.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Filtro actual</span>
          <strong>{statusFilter === 'all' ? 'Todos' : statusFilter}</strong>
          <p>Busqueda por RUT, razon social, correo o telefono.</p>
        </article>
      </div>

      <section className="surface-card">
        <div className="inventory-section__header">
          <div>
            <p className="section-kicker">Listado</p>
            <h3>Clientes del negocio</h3>
            <p>Consulta, busca y filtra clientes usando una vista enfocada solo en el listado.</p>
          </div>
        </div>

        {isSearching ? <AdminLoadingBlock label="Buscando..." compact /> : null}
        {syncError ? <AdminNotice tone="error">{syncError}</AdminNotice> : null}
        {feedback ? <AdminNotice tone="success">{feedback}</AdminNotice> : null}

        <AdminFilterToolbar
          title="Busqueda y filtros"
          description="Encuentra clientes por RUT, razon social o estado."
          actions={
            <Button
              variant="secondary"
              onClick={() =>
                navigate(`/clients/new?returnTo=${encodeURIComponent(currentListUrl)}`)
              }
            >
              Nuevo cliente
            </Button>
          }
          activeFilters={activeFilters}
          onClearFilters={activeFilters.length ? clearFilters : undefined}
        >
          <div className="customers-web__filters">
            <Field
              label="Buscar"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="RUT, nombre, razon social, correo o telefono"
            />
            <SelectField
              label="Estado"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | AdminActiveStatus)}
              options={[
                { label: 'Todos', value: 'all' },
                { label: 'Activos', value: 'active' },
                { label: 'Inactivos', value: 'inactive' },
              ]}
            />
          </div>
        </AdminFilterToolbar>

        <div className="customers-web__table">
          {hasResults ? (
            <>
              <div className="customers-web__row customers-web__row--head">
                <span>Ficha</span>
                <span>ID fiscal</span>
                <span>Contacto</span>
                <span>Estado</span>
                <span>Gestion</span>
              </div>

              {customers.map((customer) => (
                <div key={customer.id} className="customers-web__row">
                  <span className="admin-table__primary">
                    <strong>{customer.legalName}</strong>
                    <small>{customer.businessLine || 'Sin giro informado'}</small>
                  </span>
                  <span className="admin-table__key">{customer.taxId}</span>
                  <span className="admin-table__stack">
                    <strong>{customer.email || 'Sin correo'}</strong>
                    <small>{customer.phone || 'Sin telefono'}</small>
                  </span>
                  <span className="admin-table__status">
                    <span
                      className={`status-chip admin-status-badge ${
                        customer.status === 'active' ? '' : 'status-chip--muted'
                      }`}
                    >
                      {customer.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </span>
                  <span className="customers-web__actions admin-table__actions">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(
                          `/clients/${customer.id}?returnTo=${encodeURIComponent(currentListUrl)}`,
                        )
                      }
                    >
                      Ver
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(
                          `/clients/${customer.id}/edit?returnTo=${encodeURIComponent(currentListUrl)}`,
                        )
                      }
                    >
                      Editar
                    </Button>
                  </span>
                </div>
              ))}
            </>
          ) : isInitialState ? (
            <AdminEmptyState
              tone="neutral"
              title="Escribe para buscar"
              description="Empieza a escribir y mostraremos coincidencias parciales de clientes al instante."
              actionLabel="Nuevo cliente"
              onAction={() => navigate(`/clients/new?returnTo=${encodeURIComponent(currentListUrl)}`)}
            />
          ) : !isSearching && !syncError ? (
            <AdminEmptyState
              tone="search"
              title="No se encontraron resultados"
              description="Prueba con otro termino o ajusta el filtro de estado."
              actionLabel="Limpiar filtros"
              onAction={clearFilters}
            />
          ) : null}
        </div>
      </section>
    </section>
  )
}
