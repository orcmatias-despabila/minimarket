import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { formatCurrency } from '../../lib/format'
import { rutMatchesSearch } from '../../lib/rut'
import { AdminEmptyState } from '../components/AdminEmptyState'
import { AdminFilterToolbar } from '../components/AdminFilterToolbar'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { getFriendlyDataError } from '../lib/adminFeedback'
import { adminCustomersService } from '../services/adminCustomers.service'
import { adminDocumentsService } from '../services/adminDocuments.service'
import { adminSuppliersService } from '../services/adminSuppliers.service'
import type { AdminDocument } from '../types/adminDocument'
import {
  creditNotesPageSize,
  formatDate,
  getStatusChipClass,
  statusLabelMap,
  typeLabelMap,
  type CreditNoteScope,
} from '../lib/creditNotes'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

type FeedbackState = {
  feedback?: string
} | null

export function CreditNotesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { business } = useWebWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const [emittedNotes, setEmittedNotes] = useState<AdminDocument[]>([])
  const [receivedNotes, setReceivedNotes] = useState<AdminDocument[]>([])
  const [counterpartyAvailability, setCounterpartyAvailability] = useState({
    customers: { totalActive: 0, totalAll: 0 },
    suppliers: { totalActive: 0, totalAll: 0 },
  })
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') ?? '')
  const [scopeFilter, setScopeFilter] = useState<'all' | CreditNoteScope>(
    (searchParams.get('scope') as 'all' | CreditNoteScope | null) ?? 'all',
  )
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') ?? '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') ?? '')
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1') || 1)
  const [isHydrating, setIsHydrating] = useState(true)
  const [syncError, setSyncError] = useState<{ title: string; description: string } | null>(null)
  const [feedback, setFeedback] = useState<string | null>(
    (location.state as FeedbackState)?.feedback ?? null,
  )

  const currentListUrl = `${location.pathname}${location.search}`

  const loadScreen = useCallback(async () => {
    if (!business?.id) {
      setEmittedNotes([])
      setReceivedNotes([])
      setCounterpartyAvailability({
        customers: { totalActive: 0, totalAll: 0 },
        suppliers: { totalActive: 0, totalAll: 0 },
      })
      setIsHydrating(false)
      return
    }

    setIsHydrating(true)
    setSyncError(null)

    try {
      const [emittedResult, receivedResult, customerAvailability, supplierAvailability] =
        await Promise.all([
          adminDocumentsService.list({
            businessId: business.id,
            direction: 'emitted',
            documentType: 'nota_credito',
            page: 1,
            pageSize: 200,
          }),
          adminDocumentsService.list({
            businessId: business.id,
            direction: 'received',
            documentType: 'nota_credito',
            page: 1,
            pageSize: 200,
          }),
          adminCustomersService.listAvailableForDocuments(business.id),
          adminSuppliersService.listAvailableForDocuments(business.id),
        ])

      setEmittedNotes(emittedResult.items)
      setReceivedNotes(receivedResult.items)
      setCounterpartyAvailability({
        customers: {
          totalActive: customerAvailability.totalActive,
          totalAll: customerAvailability.totalAll,
        },
        suppliers: {
          totalActive: supplierAvailability.totalActive,
          totalAll: supplierAvailability.totalAll,
        },
      })
    } catch (error) {
      setSyncError(
        getFriendlyDataError(error, {
          title: 'No pudimos cargar el modulo',
          description:
            'Ocurrio un problema al consultar notas de credito y sus contrapartes del negocio actual.',
        }),
      )
      setCounterpartyAvailability({
        customers: { totalActive: 0, totalAll: 0 },
        suppliers: { totalActive: 0, totalAll: 0 },
      })
    } finally {
      setIsHydrating(false)
    }
  }, [business?.id])

  useEffect(() => {
    void loadScreen()
  }, [loadScreen])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, scopeFilter, dateFrom, dateTo, business?.id])

  useEffect(() => {
    const nextParams = new URLSearchParams()

    if (searchTerm.trim()) {
      nextParams.set('q', searchTerm.trim())
    }

    if (scopeFilter !== 'all') {
      nextParams.set('scope', scopeFilter)
    }

    if (dateFrom) {
      nextParams.set('dateFrom', dateFrom)
    }

    if (dateTo) {
      nextParams.set('dateTo', dateTo)
    }

    if (page > 1) {
      nextParams.set('page', String(page))
    }

    setSearchParams(nextParams, { replace: true })
  }, [dateFrom, dateTo, page, scopeFilter, searchTerm, setSearchParams])

  useEffect(() => {
    const state = location.state as FeedbackState

    if (!state?.feedback) {
      return
    }

    setFeedback(state.feedback)
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  const allNotes = useMemo(
    () =>
      [...emittedNotes, ...receivedNotes].sort(
        (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime(),
      ),
    [emittedNotes, receivedNotes],
  )

  const totals = useMemo(
    () => ({
      emitted: emittedNotes.length,
      received: receivedNotes.length,
      totalAmount: allNotes.reduce((sum, item) => sum + item.totalAmount, 0),
    }),
    [allNotes, emittedNotes.length, receivedNotes.length],
  )

  const filteredNotes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return allNotes.filter((note) => {
      const matchesSearch =
        !term ||
        (note.folio ?? '').toLowerCase().includes(term) ||
        (note.counterpartyName ?? '').toLowerCase().includes(term) ||
        rutMatchesSearch(note.counterpartyRut, term)
      const matchesScope = scopeFilter === 'all' || note.direction === scopeFilter
      const matchesFrom = !dateFrom || note.issueDate >= dateFrom
      const matchesTo = !dateTo || note.issueDate <= dateTo
      return matchesSearch && matchesScope && matchesFrom && matchesTo
    })
  }, [allNotes, dateFrom, dateTo, scopeFilter, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / creditNotesPageSize))
  const paginatedNotes = useMemo(() => {
    const start = (page - 1) * creditNotesPageSize
    return filteredNotes.slice(start, start + creditNotesPageSize)
  }, [filteredNotes, page])

  const pageSummary = useMemo(() => {
    if (!filteredNotes.length) {
      return 'Sin resultados'
    }

    const from = (page - 1) * creditNotesPageSize + 1
    const to = Math.min(page * creditNotesPageSize, filteredNotes.length)
    return `${from}-${to} de ${filteredNotes.length}`
  }, [filteredNotes.length, page])

  const activeFilters = useMemo(() => {
    const filters: Array<{ label: string; value: string }> = []

    if (searchTerm.trim()) {
      filters.push({ label: 'Busqueda', value: searchTerm.trim() })
    }

    if (scopeFilter !== 'all') {
      filters.push({
        label: 'Origen',
        value: scopeFilter === 'emitted' ? 'Emitidas' : 'Recibidas',
      })
    }

    if (dateFrom) {
      filters.push({ label: 'Desde', value: formatDate(dateFrom) })
    }

    if (dateTo) {
      filters.push({ label: 'Hasta', value: formatDate(dateTo) })
    }

    return filters
  }, [dateFrom, dateTo, scopeFilter, searchTerm])

  const clearFilters = () => {
    setSearchTerm('')
    setScopeFilter('all')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasTechnicalError = Boolean(syncError)
  const hasAnyCounterparty =
    counterpartyAvailability.customers.totalAll > 0 || counterpartyAvailability.suppliers.totalAll > 0
  const hasNoteResults = paginatedNotes.length > 0
  const hasFilteredEmpty = !hasTechnicalError && !hasNoteResults && activeFilters.length > 0
  const hasInitialEmpty = !hasTechnicalError && !hasNoteResults && !activeFilters.length && hasAnyCounterparty
  const hasNoCounterparties = !hasTechnicalError && !hasNoteResults && !activeFilters.length && !hasAnyCounterparty

  return (
    <section className="credit-notes-web">
      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi">
          <span>Total notas</span>
          <strong>{allNotes.length}</strong>
          <p>Consolidado administrativo de notas emitidas y recibidas.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Emitidas</span>
          <strong>{totals.emitted}</strong>
          <p>Asociadas a documentos emitidos por el negocio.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Recibidas</span>
          <strong>{totals.received}</strong>
          <p>Asociadas a compras y respaldos de proveedores.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Monto total</span>
          <strong>{formatCurrency(totals.totalAmount)}</strong>
          <p>Suma consolidada de las notas visibles en la administracion.</p>
        </article>
      </div>

      <section className="surface-card">
        <div className="inventory-section__header">
          <div>
            <p className="section-kicker">Bandeja</p>
            <h3>Notas de credito</h3>
            <p>Visualiza referencias, glosas y trazabilidad documental desde una sola bandeja.</p>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              navigate(`/credit-notes/new?returnTo=${encodeURIComponent(currentListUrl)}`)
            }
          >
            Nueva nota de credito
          </Button>
        </div>

        {isHydrating ? <AdminLoadingBlock label="Cargando notas de credito y contrapartes del negocio" compact /> : null}
        {syncError ? (
          <AdminNotice tone="error" title={syncError.title}>
            {syncError.description}
          </AdminNotice>
        ) : null}
        {feedback ? (
          <AdminNotice tone="success" title="Operacion completada">
            {feedback}
          </AdminNotice>
        ) : null}

        <AdminFilterToolbar
          title="Busqueda y filtros"
          description="Encuentra notas por folio, contraparte, origen o rango de fechas."
          actions={
            <Button
              variant="secondary"
              onClick={() =>
                navigate(`/credit-notes/new?returnTo=${encodeURIComponent(currentListUrl)}`)
              }
            >
              Nueva nota de credito
            </Button>
          }
          activeFilters={activeFilters}
          onClearFilters={activeFilters.length ? clearFilters : undefined}
        >
          <div className="credit-notes-web__filters">
            <Field
              label="Buscar"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Folio, contraparte o referencia"
            />
            <SelectField
              label="Origen"
              value={scopeFilter}
              onChange={(event) =>
                setScopeFilter(event.target.value as 'all' | CreditNoteScope)
              }
              options={[
                { label: 'Todas', value: 'all' },
                { label: 'Emitidas', value: 'emitted' },
                { label: 'Recibidas', value: 'received' },
              ]}
            />
            <Field
              label="Desde"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <Field
              label="Hasta"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
        </AdminFilterToolbar>

        <div className="credit-notes-web__table">
          <div className="credit-notes-web__row credit-notes-web__row--head">
            <span>Nota</span>
            <span>Origen</span>
            <span>Contraparte</span>
            <span>Referencia</span>
            <span>Total</span>
            <span>Gestion</span>
          </div>
          {hasNoteResults ? (
            paginatedNotes.map((note) => (
              <div key={note.id} className="credit-notes-web__row">
                <span className="admin-table__primary">
                  <strong>{note.folio ? `Folio ${note.folio}` : 'Sin folio'}</strong>
                  <small>{formatDate(note.issueDate)}</small>
                </span>
                <span className="admin-table__stack">
                  <strong>{note.direction === 'emitted' ? 'Emitida' : 'Recibida'}</strong>
                  <small>{statusLabelMap[note.status] ?? note.status}</small>
                </span>
                <span className="admin-table__stack">
                  <strong>{note.counterpartyName ?? 'Sin contraparte'}</strong>
                  <small>{note.counterpartyRut ?? 'Sin RUT'}</small>
                </span>
                <span className="admin-table__stack">
                  <strong>{typeLabelMap[note.documentType]}</strong>
                  <small className={getStatusChipClass(note.status)}>
                    {statusLabelMap[note.status]}
                  </small>
                </span>
                <span className="admin-table__amount">
                  <strong>{formatCurrency(note.totalAmount)}</strong>
                  <small>{note.direction === 'emitted' ? 'Nota emitida' : 'Nota recibida'}</small>
                </span>
                <span className="credit-notes-web__actions admin-table__actions">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigate(
                        `/credit-notes/${note.id}?returnTo=${encodeURIComponent(currentListUrl)}`,
                      )
                    }
                  >
                    Ver
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigate(
                        `/credit-notes/${note.id}/edit?returnTo=${encodeURIComponent(currentListUrl)}`,
                      )
                    }
                  >
                    Editar
                  </Button>
                </span>
              </div>
            ))
          ) : hasNoCounterparties ? (
            <AdminEmptyState
              title="Todavia no hay clientes ni proveedores para este negocio."
              description="Antes de registrar notas de credito, conviene crear al menos una contraparte activa para asociar el documento."
            />
          ) : hasFilteredEmpty ? (
            <AdminEmptyState
              tone="search"
              title="No hay notas de credito que coincidan con esos filtros."
              description="Prueba limpiando la busqueda o ampliando el rango de fechas."
              actionLabel="Limpiar filtros"
              onAction={clearFilters}
            />
          ) : hasInitialEmpty ? (
            <AdminEmptyState
              tone="neutral"
              title="Todavia no hay notas de credito registradas."
              description="Registra la primera nota para completar la trazabilidad documental del negocio."
              actionLabel="Nueva nota de credito"
              onAction={() =>
                navigate(`/credit-notes/new?returnTo=${encodeURIComponent(currentListUrl)}`)
              }
            />
          ) : null}
        </div>

        <div className="admin-pagination">
          <span className="admin-pagination__summary">{pageSummary}</span>
          <div className="admin-pagination__actions">
            <Button
              variant="secondary"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || isHydrating}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || isHydrating}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </section>
    </section>
  )
}
