import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { formatCurrency } from '../../lib/format'
import { AdminEmptyState } from '../components/AdminEmptyState'
import { AdminFilterToolbar } from '../components/AdminFilterToolbar'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { getFriendlyDataError } from '../lib/adminFeedback'
import { adminCustomersService } from '../services/adminCustomers.service'
import { adminDocumentsService } from '../services/adminDocuments.service'
import type { AdminDocument } from '../types/adminDocument'
import type { AdminCustomer } from '../types/adminCustomer'
import {
  documentTypeOptions,
  formatDate,
  getStatusChipClass,
  issuedDocumentsPageSize,
  paymentLabelMap,
  paymentOptions,
  statusLabelMap,
  statusOptions,
  typeChipClassMap,
  typeLabelMap,
  type IssuedDocumentFormValues,
} from '../lib/issuedDocuments'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

type FeedbackState = {
  feedback?: string
} | null

export function IssuedDocumentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { business } = useWebWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const [documents, setDocuments] = useState<AdminDocument[]>([])
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [customerAvailability, setCustomerAvailability] = useState({
    totalActive: 0,
    totalAll: 0,
  })
  const [folioFilter, setFolioFilter] = useState(searchParams.get('folio') ?? '')
  const [customerFilter, setCustomerFilter] = useState<'all' | string>(
    searchParams.get('customer') ?? 'all',
  )
  const [typeFilter, setTypeFilter] = useState<
    'all' | IssuedDocumentFormValues['documentType']
  >((searchParams.get('type') as 'all' | IssuedDocumentFormValues['documentType'] | null) ?? 'all')
  const [statusFilter, setStatusFilter] = useState<
    'all' | IssuedDocumentFormValues['status']
  >((searchParams.get('status') as 'all' | IssuedDocumentFormValues['status'] | null) ?? 'all')
  const [paymentFilter, setPaymentFilter] = useState<
    'all' | IssuedDocumentFormValues['paymentMethod']
  >((searchParams.get('payment') as 'all' | IssuedDocumentFormValues['paymentMethod'] | null) ?? 'all')
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') ?? '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') ?? '')
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1') || 1)
  const [totalDocuments, setTotalDocuments] = useState(0)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
  const [syncError, setSyncError] = useState<{ title: string; description: string } | null>(null)
  const [feedback, setFeedback] = useState<string | null>(
    (location.state as FeedbackState)?.feedback ?? null,
  )

  const totalPages = Math.max(1, Math.ceil(totalDocuments / issuedDocumentsPageSize))
  const currentListUrl = `${location.pathname}${location.search}`
  const hasSearchCriteria = useMemo(
    () =>
      Boolean(
        folioFilter.trim() ||
          customerFilter !== 'all' ||
          typeFilter !== 'all' ||
          statusFilter !== 'all' ||
          (paymentFilter !== 'all' && paymentFilter) ||
          dateFrom ||
          dateTo,
      ),
    [customerFilter, dateFrom, dateTo, folioFilter, paymentFilter, statusFilter, typeFilter],
  )
  const isHydrating = isLoadingCustomers || isLoadingDocuments

  const loadCustomers = useCallback(async () => {
    if (!business?.id) {
      setCustomers([])
      setCustomerAvailability({ totalActive: 0, totalAll: 0 })
      setIsLoadingCustomers(false)
      return
    }

    setIsLoadingCustomers(true)
    setSyncError(null)

    try {
      const customersResult = await Promise.all([
        adminCustomersService.list({
          businessId: business.id,
          page: 1,
          pageSize: 200,
          status: 'all',
        }),
        adminCustomersService.listAvailableForDocuments(business.id),
      ])

      setCustomers(customersResult[0].items)
      setCustomerAvailability({
        totalActive: customersResult[1].totalActive,
        totalAll: customersResult[1].totalAll,
      })
    } catch (error) {
      setSyncError(
        getFriendlyDataError(error, {
          title: 'No pudimos cargar el modulo',
          description:
            'Ocurrio un problema al consultar documentos emitidos y clientes del negocio actual.',
        }),
      )
      setCustomers([])
      setCustomerAvailability({ totalActive: 0, totalAll: 0 })
    } finally {
      setIsLoadingCustomers(false)
    }
  }, [business?.id])

  const loadDocuments = useCallback(
    async (nextPage = page) => {
      if (!business?.id) {
        setDocuments([])
        setTotalDocuments(0)
        setIsLoadingDocuments(false)
        return
      }

      if (!hasSearchCriteria) {
        setDocuments([])
        setTotalDocuments(0)
        setIsLoadingDocuments(false)
        return
      }

      setIsLoadingDocuments(true)
      setSyncError(null)

      try {
        const documentsResult = await adminDocumentsService.list({
          businessId: business.id,
          direction: 'emitted',
          documentType: typeFilter,
          status: statusFilter,
          customerId: customerFilter,
          paymentMethod: paymentFilter || 'all',
          folio: folioFilter,
          dateFrom,
          dateTo,
          page: nextPage,
          pageSize: issuedDocumentsPageSize,
        })

        setDocuments(documentsResult.items.filter((item) => item.direction === 'emitted'))
        setTotalDocuments(documentsResult.total)
      } catch (error) {
        setSyncError(
          getFriendlyDataError(error, {
            title: 'No pudimos cargar el modulo',
            description:
              'Ocurrio un problema al consultar documentos emitidos y clientes del negocio actual.',
          }),
        )
        setDocuments([])
        setTotalDocuments(0)
      } finally {
        setIsLoadingDocuments(false)
      }
    },
    [
      business?.id,
      customerFilter,
      dateFrom,
      dateTo,
      folioFilter,
      hasSearchCriteria,
      page,
      paymentFilter,
      statusFilter,
      typeFilter,
    ],
  )

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    void loadDocuments(page)
  }, [loadDocuments, page])

  useEffect(() => {
    setPage(1)
  }, [folioFilter, customerFilter, typeFilter, statusFilter, paymentFilter, dateFrom, dateTo, business?.id])

  useEffect(() => {
    const nextParams = new URLSearchParams()

    if (folioFilter.trim()) {
      nextParams.set('folio', folioFilter.trim())
    }

    if (customerFilter !== 'all') {
      nextParams.set('customer', customerFilter)
    }

    if (typeFilter !== 'all') {
      nextParams.set('type', typeFilter)
    }

    if (statusFilter !== 'all') {
      nextParams.set('status', statusFilter)
    }

    if (paymentFilter !== 'all' && paymentFilter) {
      nextParams.set('payment', paymentFilter)
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
  }, [
    customerFilter,
    dateFrom,
    dateTo,
    folioFilter,
    page,
    paymentFilter,
    setSearchParams,
    statusFilter,
    typeFilter,
  ])

  useEffect(() => {
    const state = location.state as FeedbackState

    if (!state?.feedback) {
      return
    }

    setFeedback(state.feedback)
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  const currentListTotals = useMemo(
    () => ({
      receipts: documents.filter((item) => item.documentType === 'boleta').length,
      invoices: documents.filter((item) => item.documentType === 'factura').length,
      creditNotes: documents.filter((item) => item.documentType === 'nota_credito').length,
      totalAmount: documents.reduce((sum, item) => sum + item.totalAmount, 0),
    }),
    [documents],
  )

  const pageSummary = useMemo(() => {
    if (!hasSearchCriteria) {
      return 'Aplica filtros para buscar documentos'
    }

    if (!totalDocuments) {
      return 'Sin resultados'
    }

    const from = (page - 1) * issuedDocumentsPageSize + 1
    const to = Math.min(page * issuedDocumentsPageSize, totalDocuments)
    return `${from}-${to} de ${totalDocuments}`
  }, [hasSearchCriteria, page, totalDocuments])

  const activeFilters = useMemo(() => {
    const filters: Array<{ label: string; value: string }> = []

    if (folioFilter.trim()) {
      filters.push({ label: 'Folio', value: folioFilter.trim() })
    }

    if (customerFilter !== 'all') {
      const customerName =
        customers.find((item) => item.id === customerFilter)?.legalName ?? 'Cliente'
      filters.push({ label: 'Cliente', value: customerName })
    }

    if (typeFilter !== 'all') {
      filters.push({ label: 'Tipo', value: typeLabelMap[typeFilter] })
    }

    if (statusFilter !== 'all') {
      filters.push({ label: 'Estado', value: statusLabelMap[statusFilter] })
    }

    if (paymentFilter !== 'all' && paymentFilter) {
      filters.push({ label: 'Pago', value: paymentLabelMap[paymentFilter] })
    }

    if (dateFrom) {
      filters.push({ label: 'Desde', value: formatDate(dateFrom) })
    }

    if (dateTo) {
      filters.push({ label: 'Hasta', value: formatDate(dateTo) })
    }

    return filters
  }, [customerFilter, customers, dateFrom, dateTo, folioFilter, paymentFilter, statusFilter, typeFilter])

  const clearFilters = () => {
    setFolioFilter('')
    setCustomerFilter('all')
    setTypeFilter('all')
    setStatusFilter('all')
    setPaymentFilter('all')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasTechnicalError = Boolean(syncError)
  const hasNoCustomers = !hasTechnicalError && customerAvailability.totalAll === 0
  const hasInactiveCustomers =
    !hasTechnicalError && customerAvailability.totalAll > 0 && customerAvailability.totalActive === 0
  const hasDocumentResults = documents.length > 0
  const hasFilteredEmpty = !hasTechnicalError && !hasDocumentResults && activeFilters.length > 0
  const hasSearchPrompt =
    !hasTechnicalError &&
    !hasDocumentResults &&
    !activeFilters.length &&
    !hasNoCustomers &&
    !hasInactiveCustomers &&
    !hasSearchCriteria
  const hasInitialEmpty =
    !hasTechnicalError &&
    !hasDocumentResults &&
    hasSearchCriteria &&
    !hasNoCustomers &&
    !hasInactiveCustomers

  return (
    <section className="issued-documents-web">
      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi">
          <span>Total documentos</span>
          <strong>{totalDocuments}</strong>
          <p>Control administrativo real de documentos comerciales emitidos.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Boletas y facturas</span>
          <strong>{currentListTotals.receipts + currentListTotals.invoices}</strong>
          <p>
            {currentListTotals.receipts} boletas y {currentListTotals.invoices} facturas en la
            pagina actual.
          </p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Notas de credito</span>
          <strong>{currentListTotals.creditNotes}</strong>
          <p>Trazabilidad lista para referencias documentales futuras.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Monto visible</span>
          <strong>{formatCurrency(currentListTotals.totalAmount)}</strong>
          <p>Total de documentos mostrados con los filtros actuales.</p>
        </article>
      </div>

      <section className="surface-card">
        <div className="inventory-section__header">
          <div>
            <p className="section-kicker">Bandeja</p>
            <h3>Documentos emitidos</h3>
            <p>Filtra por cliente, fecha, tipo, folio, estado o medio de pago.</p>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              navigate(`/issued-documents/new?returnTo=${encodeURIComponent(currentListUrl)}`)
            }
          >
            Nuevo documento
          </Button>
        </div>

        {isHydrating ? <AdminLoadingBlock label="Cargando documentos y clientes del negocio" compact /> : null}
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
          description="Cruza folio, cliente, fechas, tipo, estado y medio de pago."
          activeFilters={activeFilters}
          onClearFilters={activeFilters.length ? clearFilters : undefined}
        >
          <div className="issued-documents-web__filters">
            <Field
              label="Buscar por folio"
              value={folioFilter}
              onChange={(event) => setFolioFilter(event.target.value)}
              placeholder="Ej: 12345"
            />
            <SelectField
              label="Cliente"
              value={customerFilter}
              onChange={(event) => setCustomerFilter(event.target.value as 'all' | string)}
              options={[
                { label: 'Todos', value: 'all' },
                ...customers.map((customer) => ({
                  label: customer.legalName,
                  value: customer.id,
                })),
              ]}
            />
            <SelectField
              label="Tipo"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value as 'all' | IssuedDocumentFormValues['documentType'],
                )
              }
              options={[{ label: 'Todos', value: 'all' }, ...documentTypeOptions]}
            />
            <SelectField
              label="Estado"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as 'all' | IssuedDocumentFormValues['status'],
                )
              }
              options={[{ label: 'Todos', value: 'all' }, ...statusOptions]}
            />
            <SelectField
              label="Medio de pago"
              value={paymentFilter}
              onChange={(event) =>
                setPaymentFilter(
                  event.target.value as 'all' | IssuedDocumentFormValues['paymentMethod'],
                )
              }
              options={[{ label: 'Todos', value: 'all' }, ...paymentOptions]}
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

        <div className="issued-documents-web__table">
          <div className="issued-documents-web__row issued-documents-web__row--head">
            <span>Documento</span>
            <span>Cliente</span>
            <span>Emision</span>
            <span>Total</span>
            <span>Pago</span>
            <span>Estado</span>
            <span>Gestion</span>
          </div>

          {hasDocumentResults ? (
            documents.map((document) => (
              <div key={document.id} className="issued-documents-web__row">
                <span className="admin-table__primary">
                  <strong>{document.folio ? `Folio ${document.folio}` : 'Sin folio'}</strong>
                  <small>
                    {typeLabelMap[
                      document.documentType as IssuedDocumentFormValues['documentType']
                    ] ?? document.documentType}
                  </small>
                </span>
                <span className="admin-table__stack">
                  <strong>{document.counterpartyName ?? 'Cliente no asociado'}</strong>
                  <small>{document.counterpartyRut ?? 'Sin RUT'}</small>
                </span>
                <span className="admin-table__stack">
                  <strong>{formatDate(document.issueDate)}</strong>
                  <small>
                    {document.status === 'draft' ? 'Pendiente de emision' : 'Documento emitido'}
                  </small>
                </span>
                <span className="admin-table__amount">
                  <strong>{formatCurrency(document.totalAmount)}</strong>
                  <small>{formatCurrency(document.netAmount)} neto</small>
                </span>
                <span className="admin-table__stack">
                  <strong>
                    {document.paymentMethod
                      ? paymentLabelMap[document.paymentMethod]
                      : 'Sin medio'}
                  </strong>
                  <small>
                    {document.documentType === 'nota_credito'
                      ? 'Sin cobro directo'
                      : 'Forma de pago registrada'}
                  </small>
                </span>
                <span className="admin-table__status">
                  <div className="issued-documents-web__badges">
                    <span
                      className={
                        typeChipClassMap[
                          document.documentType as IssuedDocumentFormValues['documentType']
                        ]
                      }
                    >
                      {
                        typeLabelMap[
                          document.documentType as IssuedDocumentFormValues['documentType']
                        ]
                      }
                    </span>
                    <span
                      className={getStatusChipClass(
                        document.status as IssuedDocumentFormValues['status'],
                      )}
                    >
                      {statusLabelMap[document.status as IssuedDocumentFormValues['status']]}
                    </span>
                  </div>
                </span>
                <span className="issued-documents-web__actions admin-table__actions">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigate(
                        `/issued-documents/${document.id}?returnTo=${encodeURIComponent(currentListUrl)}`,
                      )
                    }
                  >
                    Ver
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigate(
                        `/issued-documents/${document.id}/edit?returnTo=${encodeURIComponent(currentListUrl)}`,
                      )
                    }
                  >
                    Editar
                  </Button>
                </span>
              </div>
            ))
          ) : hasNoCustomers ? (
            <AdminEmptyState
              title="Todavia no hay clientes para este negocio."
              description="Puedes emitir boletas sin cliente, pero para facturas y notas de credito conviene crear al menos un cliente activo desde el maestro."
            />
          ) : hasInactiveCustomers ? (
            <AdminEmptyState
              title="Hay clientes cargados, pero ninguno esta activo."
              description="Activa al menos un cliente del negocio actual para asociarlo con documentos emitidos y referencias."
            />
          ) : hasFilteredEmpty ? (
            <AdminEmptyState
              tone="search"
              title="No encontramos documentos emitidos con esos filtros."
              description="Prueba limpiando fechas, cliente, folio, estado o medio de pago."
              actionLabel="Limpiar filtros"
              onAction={clearFilters}
            />
          ) : hasSearchPrompt ? (
            <AdminEmptyState
              tone="search"
              title="Busca documentos emitidos con los filtros."
              description="Para evitar sobrecargar la vista, los documentos se muestran cuando aplicas al menos un criterio como folio, cliente, tipo, estado, fecha o medio de pago."
            />
          ) : hasInitialEmpty ? (
            <AdminEmptyState
              tone="neutral"
              title="Todavia no hay documentos emitidos registrados."
              description="Cuando registres el primero, aparecera aqui con su cliente, estado, medio de pago y montos."
              actionLabel="Nuevo documento"
              onAction={() =>
                navigate(`/issued-documents/new?returnTo=${encodeURIComponent(currentListUrl)}`)
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
