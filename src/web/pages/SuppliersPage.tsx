import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { AdminEmptyState } from '../components/AdminEmptyState'
import { AdminFilterToolbar } from '../components/AdminFilterToolbar'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { adminSuppliersService } from '../services/adminSuppliers.service'
import type { AdminSupplier } from '../types/adminSupplier'
import type { AdminActiveStatus } from '../types/adminShared'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

type FeedbackState = {
  feedback?: string
} | null

export function SuppliersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { business } = useWebWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([])
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
      setSuppliers([])
      setIsSearching(false)
      setSyncError(null)
      return
    }

    if (searchTerm.trim() === '') {
      setSuppliers([])
      setIsSearching(false)
      setSyncError(null)
      return
    }

    const runSearch = async () => {
      setIsSearching(true)
      setSyncError(null)

      try {
        const results = await adminSuppliersService.search({
          businessId: business.id,
          search: searchTerm,
          status: statusFilter,
          limit: 10,
        })

        if (!isCancelled) {
          setSuppliers(results)
        }
      } catch (error) {
        if (!isCancelled) {
          setSuppliers([])
          setSyncError(error instanceof Error ? error.message : 'No pudimos buscar proveedores.')
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
  const hasResults = suppliers.length > 0

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  return (
    <section className="suppliers-web">
      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi">
          <span>Proveedores</span>
          <strong>{suppliers.length}</strong>
          <p>Resultados en vivo desde Supabase segun lo que escribes.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Activos visibles</span>
          <strong>{suppliers.filter((item) => item.status === 'active').length}</strong>
          <p>Proveedores activos dentro de los resultados mostrados.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Filtro actual</span>
          <strong>{statusFilter === 'all' ? 'Todos' : statusFilter}</strong>
          <p>Busqueda por RUT, razon social, contacto, correo o telefono.</p>
        </article>
      </div>

      <section className="surface-card">
        <div className="inventory-section__header">
          <div>
            <p className="section-kicker">Listado</p>
            <h3>Proveedores del negocio</h3>
            <p>Consulta, busca y filtra proveedores usando una vista enfocada solo en el listado.</p>
          </div>
        </div>

        {isSearching ? <AdminLoadingBlock label="Buscando..." compact /> : null}
        {syncError ? <AdminNotice tone="error">{syncError}</AdminNotice> : null}
        {feedback ? <AdminNotice tone="success">{feedback}</AdminNotice> : null}

        <AdminFilterToolbar
          title="Busqueda y filtros"
          description="Encuentra proveedores por RUT, razon social, contacto o estado."
          actions={
            <Button
              variant="secondary"
              onClick={() =>
                navigate(`/suppliers/new?returnTo=${encodeURIComponent(currentListUrl)}`)
              }
            >
              Nuevo proveedor
            </Button>
          }
          activeFilters={activeFilters}
          onClearFilters={activeFilters.length ? clearFilters : undefined}
        >
          <div className="suppliers-web__filters">
            <Field
              label="Buscar"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="RUT, razon social, contacto, correo o telefono"
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

        <div className="suppliers-web__table">
          {hasResults ? (
            <>
              <div className="suppliers-web__row suppliers-web__row--head">
                <span>Ficha</span>
                <span>ID fiscal</span>
                <span>Contacto</span>
                <span>Estado</span>
                <span>Gestion</span>
              </div>

              {suppliers.map((supplier) => (
                <div key={supplier.id} className="suppliers-web__row">
                  <span className="admin-table__primary">
                    <strong>{supplier.legalName}</strong>
                    <small>{supplier.businessLine || 'Sin giro informado'}</small>
                  </span>
                  <span className="admin-table__key">{supplier.taxId}</span>
                  <span className="admin-table__stack">
                    <strong>{supplier.contactName || supplier.email || 'Sin contacto'}</strong>
                    <small>{supplier.phone || 'Sin telefono'}</small>
                  </span>
                  <span className="admin-table__status">
                    <span
                      className={`status-chip admin-status-badge ${
                        supplier.status === 'active' ? '' : 'status-chip--muted'
                      }`}
                    >
                      {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </span>
                  <span className="suppliers-web__actions admin-table__actions">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(
                          `/suppliers/${supplier.id}?returnTo=${encodeURIComponent(currentListUrl)}`,
                        )
                      }
                    >
                      Ver
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(
                          `/suppliers/${supplier.id}/edit?returnTo=${encodeURIComponent(currentListUrl)}`,
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
              description="Empieza a escribir y mostraremos coincidencias parciales de proveedores al instante."
              actionLabel="Nuevo proveedor"
              onAction={() =>
                navigate(`/suppliers/new?returnTo=${encodeURIComponent(currentListUrl)}`)
              }
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
