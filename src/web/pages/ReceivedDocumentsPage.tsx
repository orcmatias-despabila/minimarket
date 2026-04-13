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
import {
  documentTypeOptions,
  formatDate,
  getStatusChipClass,
  receivedDocumentsPageSize,
  statusLabelMap,
  statusOptions,
  typeChipClassMap,
  typeLabelMap,
  type ReceivedDocumentFormValues,
} from '../lib/receivedDocuments'
import { adminDocumentsService } from '../services/adminDocuments.service'
import { adminSuppliersService } from '../services/adminSuppliers.service'
import type { AdminDocument } from '../types/adminDocument'
import type { AdminSupplier } from '../types/adminSupplier'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

type FeedbackState = {
  feedback?: string
} | null

export function ReceivedDocumentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { business } = useWebWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const [documents, setDocuments] = useState<AdminDocument[]>([])
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([])
  const [supplierAvailability, setSupplierAvailability] = useState({
    totalActive: 0,
    totalAll: 0,
  })
  const [folioFilter, setFolioFilter] = useState(searchParams.get('folio') ?? '')
  const [supplierFilter, setSupplierFilter] = useState<'all' | string>(
    searchParams.get('supplier') ?? 'all',
  )
  const [typeFilter, setTypeFilter] = useState<
    'all' | ReceivedDocumentFormValues['documentType']
  >((searchParams.get('type') as 'all' | ReceivedDocumentFormValues['documentType'] | null) ?? 'all')
  const [statusFilter, setStatusFilter] = useState<
    'all' | ReceivedDocumentFormValues['status']
  >((searchParams.get('status') as 'all' | ReceivedDocumentFormValues['status'] | null) ?? 'all')
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') ?? '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') ?? '')
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1') || 1)
  const [totalDocuments, setTotalDocuments] = useState(0)
  const [isHydrating, setIsHydrating] = useState(true)
  const [syncError, setSyncError] = useState<{ title: string; description: string } | null>(null)
  const [feedback, setFeedback] = useState<string | null>(
    (location.state as FeedbackState)?.feedback ?? null,
  )

  const totalPages = Math.max(1, Math.ceil(totalDocuments / receivedDocumentsPageSize))
  const currentListUrl = `${location.pathname}${location.search}`

  const loadDocuments = useCallback(
    async (nextPage = page) => {
      if (!business?.id) {
        setDocuments([])
        setSuppliers([])
        setTotalDocuments(0)
        setIsHydrating(false)
        return
      }

      setIsHydrating(true)
      setSyncError(null)

      try {
        const [documentsResult, suppliersResult] = await Promise.all([
          adminDocumentsService.list({
            businessId: business.id,
            direction: 'received',
            documentType: typeFilter,
            status: statusFilter,
            supplierId: supplierFilter,
            folio: folioFilter,
            dateFrom,
            dateTo,
            page: nextPage,
            pageSize: receivedDocumentsPageSize,
          }),
          Promise.all([
            adminSuppliersService.list({
              businessId: business.id,
              page: 1,
              pageSize: 200,
              status: 'all',
            }),
            adminSuppliersService.listAvailableForDocuments(business.id),
          ]),
        ])

        setDocuments(documentsResult.items.filter((item) => item.direction === 'received'))
        setSuppliers(suppliersResult[0].items)
        setSupplierAvailability({
          totalActive: suppliersResult[1].totalActive,
          totalAll: suppliersResult[1].totalAll,
        })
        setTotalDocuments(documentsResult.total)
      } catch (error) {
        setSyncError(
          getFriendlyDataError(error, {
            title: 'No pudimos cargar el modulo',
            description:
              'Ocurrio un problema al consultar documentos recibidos y proveedores del negocio actual.',
          }),
        )
        setSuppliers([])
        setSupplierAvailability({ totalActive: 0, totalAll: 0 })
      } finally {
        setIsHydrating(false)
      }
    },
    [business?.id, dateFrom, dateTo, folioFilter, page, statusFilter, supplierFilter, typeFilter],
  )

  useEffect(() => {
    void loadDocuments(page)
  }, [loadDocuments, page])

  useEffect(() => {
    setPage(1)
  }, [folioFilter, supplierFilter, typeFilter, statusFilter, dateFrom, dateTo, business?.id])

  useEffect(() => {
    const nextParams = new URLSearchParams()

    if (folioFilter.trim()) {
      nextParams.set('folio', folioFilter.trim())
    }

    if (supplierFilter !== 'all') {
      nextParams.set('supplier', supplierFilter)
    }

    if (typeFilter !== 'all') {
      nextParams.set('type', typeFilter)
    }

    if (statusFilter !== 'all') {
      nextParams.set('status', statusFilter)
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
    dateFrom,
    dateTo,
    folioFilter,
    page,
    setSearchParams,
    statusFilter,
    supplierFilter,
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
      invoices: documents.filter((item) => item.documentType === 'factura_compra').length,
      receipts: documents.filter((item) => item.documentType === 'boleta_compra').length,
      creditNotes: documents.filter((item) => item.documentType === 'nota_credito').length,
      totalAmount: documents.reduce((sum, item) => sum + item.totalAmount, 0),
    }),
    [documents],
  )

  const pageSummary = useMemo(() => {
    if (!totalDocuments) {
      return 'Sin resultados'
    }

    const from = (page - 1) * receivedDocumentsPageSize + 1
    const to = Math.min(page * receivedDocumentsPageSize, totalDocuments)
    return `${from}-${to} de ${totalDocuments}`
  }, [page, totalDocuments])

  const activeFilters = useMemo(() => {
    const filters: Array<{ label: string; value: string }> = []

    if (folioFilter.trim()) {
      filters.push({ label: 'Folio', value: folioFilter.trim() })
    }

    if (supplierFilter !== 'all') {
      const supplierName =
        suppliers.find((item) => item.id === supplierFilter)?.legalName ?? 'Proveedor'
      filters.push({ label: 'Proveedor', value: supplierName })
    }

    if (typeFilter !== 'all') {
      filters.push({ label: 'Tipo', value: typeLabelMap[typeFilter] })
    }

    if (statusFilter !== 'all') {
      filters.push({ label: 'Estado', value: statusLabelMap[statusFilter] })
    }

    if (dateFrom) {
      filters.push({ label: 'Desde', value: formatDate(dateFrom) })
    }

    if (dateTo) {
      filters.push({ label: 'Hasta', value: formatDate(dateTo) })
    }

    return filters
  }, [dateFrom, dateTo, folioFilter, statusFilter, supplierFilter, suppliers, typeFilter])

  const clearFilters = () => {
    setFolioFilter('')
    setSupplierFilter('all')
    setTypeFilter('all')
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasTechnicalError = Boolean(syncError)
  const hasNoSuppliers = !hasTechnicalError && supplierAvailability.totalAll === 0
  const hasInactiveSuppliers =
    !hasTechnicalError && supplierAvailability.totalAll > 0 && supplierAvailability.totalActive === 0
  const hasDocumentResults = documents.length > 0
  const hasFilteredEmpty = !hasTechnicalError && !hasDocumentResults && activeFilters.length > 0
  const hasInitialEmpty =
    !hasTechnicalError &&
    !hasDocumentResults &&
    !activeFilters.length &&
    !hasNoSuppliers &&
    !hasInactiveSuppliers

  return (
    <section className="received-documents-web">
      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi">
          <span>Total documentos</span>
          <strong>{totalDocuments}</strong>
          <p>Registro administrativo real de compras y respaldos del negocio.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Facturas y boletas</span>
          <strong>{currentListTotals.invoices + currentListTotals.receipts}</strong>
          <p>
            {currentListTotals.invoices} facturas y {currentListTotals.receipts} boletas en la
            pagina actual.
          </p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Notas de credito</span>
          <strong>{currentListTotals.creditNotes}</strong>
          <p>Referencias documentales listas para trazabilidad administrativa.</p>
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
            <h3>Documentos recibidos</h3>
            <p>Filtra por proveedor, fecha, tipo, folio o estado desde una vista de escritorio.</p>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              navigate(`/received-documents/new?returnTo=${encodeURIComponent(currentListUrl)}`)
            }
          >
            Nuevo documento
          </Button>
        </div>

        {isHydrating ? <AdminLoadingBlock label="Cargando documentos y proveedores del negocio" compact /> : null}
        {syncError ? (
          <AdminNotice tone="error" title={syncError.title}>
            {syncError.description}
          </AdminNotice>
        ) : null}
        {feedback ? <AdminNotice tone="success" title="Operacion completada">{feedback}</AdminNotice> : null}

        {hasNoSuppliers ? (
          <AdminEmptyState
            title="Todavia no hay proveedores para este negocio."
            description="Necesitas al menos un proveedor activo para relacionar nuevos documentos recibidos."
          />
        ) : null}

        {hasInactiveSuppliers ? (
          <AdminEmptyState
            title="Hay proveedores cargados, pero ninguno esta activo."
            description="Activa al menos un proveedor del negocio actual para registrar y filtrar documentos recibidos sin errores."
          />
        ) : null}

        <AdminFilterToolbar
          title="Busqueda y filtros"
          description="Cruza folio, proveedor, fechas, tipo y estado documental."
          actions={
            <Button
              variant="secondary"
              onClick={() =>
                navigate(`/received-documents/new?returnTo=${encodeURIComponent(currentListUrl)}`)
              }
            >
              Nuevo documento
            </Button>
          }
          activeFilters={activeFilters}
          onClearFilters={activeFilters.length ? clearFilters : undefined}
        >
          <div className="received-documents-web__filters">
            <Field
              label="Buscar por folio"
              value={folioFilter}
              onChange={(event) => setFolioFilter(event.target.value)}
              placeholder="Ej: 12345"
            />
            <SelectField
              label="Proveedor"
              value={supplierFilter}
              onChange={(event) => setSupplierFilter(event.target.value as 'all' | string)}
              options={[
                { label: 'Todos', value: 'all' },
                ...suppliers.map((supplier) => ({
                  label: supplier.legalName,
                  value: supplier.id,
                })),
              ]}
            />
            <SelectField
              label="Tipo"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value as 'all' | ReceivedDocumentFormValues['documentType'],
                )
              }
              options={[{ label: 'Todos', value: 'all' }, ...documentTypeOptions]}
            />
            <SelectField
              label="Estado"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as 'all' | ReceivedDocumentFormValues['status'],
                )
              }
              options={[{ label: 'Todos', value: 'all' }, ...statusOptions]}
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

        <div className="received-documents-web__table">
          <div className="received-documents-web__row received-documents-web__row--head">
            <span>Documento</span>
            <span>Proveedor</span>
            <span>Emision</span>
            <span>Total</span>
            <span>Estado</span>
            <span>Gestion</span>
          </div>

          {hasDocumentResults ? (
            documents.map((document) => (
              <div key={document.id} className="received-documents-web__row">
                <span className="admin-table__primary">
                  <strong>{document.folio ? `Folio ${document.folio}` : 'Sin folio'}</strong>
                  <small>
                    {typeLabelMap[
                      document.documentType as ReceivedDocumentFormValues['documentType']
                    ] ?? document.documentType}
                  </small>
                </span>
                <span className="admin-table__stack">
                  <strong>{document.counterpartyName ?? 'Proveedor sin nombre'}</strong>
                  <small>{document.counterpartyRut ?? 'Sin RUT'}</small>
                </span>
                <span className="admin-table__stack">
                  <strong>{formatDate(document.issueDate)}</strong>
                  <small>
                    {document.status === 'draft'
                      ? 'Pendiente de registro'
                      : 'Documento registrado'}
                  </small>
                </span>
                <span className="admin-table__amount">
                  <strong>{formatCurrency(document.totalAmount)}</strong>
                  <small>{formatCurrency(document.netAmount)} neto</small>
                </span>
                <span className="admin-table__status">
                  <div className="received-documents-web__badges">
                    <span
                      className={
                        typeChipClassMap[
                          document.documentType as ReceivedDocumentFormValues['documentType']
                        ]
                      }
                    >
                      {
                        typeLabelMap[
                          document.documentType as ReceivedDocumentFormValues['documentType']
                        ]
                      }
                    </span>
                    <span
                      className={getStatusChipClass(
                        document.status as ReceivedDocumentFormValues['status'],
                      )}
                    >
                      {statusLabelMap[document.status as ReceivedDocumentFormValues['status']]}
                    </span>
                  </div>
                </span>
                <span className="received-documents-web__actions admin-table__actions">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigate(
                        `/received-documents/${document.id}?returnTo=${encodeURIComponent(currentListUrl)}`,
                      )
                    }
                  >
                    Ver
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigate(
                        `/received-documents/${document.id}/edit?returnTo=${encodeURIComponent(currentListUrl)}`,
                      )
                    }
                  >
                    Editar
                  </Button>
                </span>
              </div>
            ))
          ) : hasFilteredEmpty ? (
            <AdminEmptyState
              tone="search"
              title="No encontramos documentos con esos filtros."
              description="Prueba limpiando proveedor, fechas, folio o estado para ampliar la busqueda."
              actionLabel="Limpiar filtros"
              onAction={clearFilters}
            />
          ) : hasInitialEmpty ? (
            <AdminEmptyState
              tone="neutral"
              title="Todavia no hay documentos recibidos registrados."
              description="Cuando registres el primero, aparecera aqui con su proveedor, estado y montos."
              actionLabel="Nuevo documento"
              onAction={() =>
                navigate(`/received-documents/new?returnTo=${encodeURIComponent(currentListUrl)}`)
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
