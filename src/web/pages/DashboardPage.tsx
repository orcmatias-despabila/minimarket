import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency, numberFormatter } from '../../lib/format'
import { AdminEmptyState } from '../components/AdminEmptyState'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { adminCustomersService } from '../services/adminCustomers.service'
import { adminDocumentsService } from '../services/adminDocuments.service'
import { adminReportsService } from '../services/adminReports.service'
import { adminSuppliersService } from '../services/adminSuppliers.service'
import type {
  AdminCreditNoteSummary,
  AdminDailyDocumentSummary,
  AdminPurchasesVsSalesMonthly,
} from '../types/adminReport'
import type { AdminCustomer } from '../types/adminCustomer'
import type { AdminDocument } from '../types/adminDocument'
import { getAccessibleWebModules, getWebModulePathById } from '../navigation/modules'
import type { AdminSupplier } from '../types/adminSupplier'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

const todayDate = () => new Date().toISOString().slice(0, 10)
const firstDayOfMonth = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

const unwrapSettled = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
  result.status === 'fulfilled' ? result.value : fallback

const summarizeFailures = (results: PromiseSettledResult<unknown>[], fallbackMessage: string) => {
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )

  if (!failures.length) {
    return null
  }

  const firstMessage =
    failures[0].reason instanceof Error ? failures[0].reason.message : fallbackMessage

  return failures.length > 1
    ? `${firstMessage} Algunas secciones del dashboard pueden mostrarse incompletas.`
    : firstMessage
}

export function DashboardPage() {
  const {
    business,
    currentRole,
    members,
    invitations,
    pendingInvitations,
    permissions,
    hasPermission,
  } = useWebWorkspace()
  const [isHydrating, setIsHydrating] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [emittedDaily, setEmittedDaily] = useState<AdminDailyDocumentSummary[]>([])
  const [receivedDaily, setReceivedDaily] = useState<AdminDailyDocumentSummary[]>([])
  const [creditNotes, setCreditNotes] = useState<AdminCreditNoteSummary[]>([])
  const [monthly, setMonthly] = useState<AdminPurchasesVsSalesMonthly[]>([])
  const [recentDocuments, setRecentDocuments] = useState<AdminDocument[]>([])
  const [recentCustomers, setRecentCustomers] = useState<AdminCustomer[]>([])
  const [recentSuppliers, setRecentSuppliers] = useState<AdminSupplier[]>([])

  useEffect(() => {
    const loadDashboard = async () => {
      if (!business?.id) {
        setEmittedDaily([])
        setReceivedDaily([])
        setCreditNotes([])
        setMonthly([])
        setRecentDocuments([])
        setRecentCustomers([])
        setRecentSuppliers([])
        setIsHydrating(false)
        return
      }

      setIsHydrating(true)
      setSyncError(null)

      const results = await Promise.allSettled([
          adminReportsService.listEmittedDaily({
            businessId: business.id,
            dateFrom: firstDayOfMonth(),
            dateTo: todayDate(),
          }),
          adminReportsService.listReceivedDaily({
            businessId: business.id,
            dateFrom: firstDayOfMonth(),
            dateTo: todayDate(),
          }),
          adminReportsService.listCreditNotesSummary({
            businessId: business.id,
            dateFrom: firstDayOfMonth(),
            dateTo: todayDate(),
          }),
          adminReportsService.listPurchasesVsSales({ businessId: business.id }),
          adminDocumentsService.listRecentByBusiness(business.id, 6),
          adminCustomersService.listRecent(business.id, 5),
          adminSuppliersService.listRecent(business.id, 5),
        ])

      setEmittedDaily(unwrapSettled(results[0], [] as AdminDailyDocumentSummary[]))
      setReceivedDaily(unwrapSettled(results[1], [] as AdminDailyDocumentSummary[]))
      setCreditNotes(unwrapSettled(results[2], [] as AdminCreditNoteSummary[]))
      setMonthly(unwrapSettled(results[3], [] as AdminPurchasesVsSalesMonthly[]))
      setRecentDocuments(unwrapSettled(results[4], [] as AdminDocument[]))
      setRecentCustomers(unwrapSettled(results[5], [] as AdminCustomer[]))
      setRecentSuppliers(unwrapSettled(results[6], [] as AdminSupplier[]))
      setSyncError(summarizeFailures(results, 'No pudimos cargar el dashboard.'))
      setIsHydrating(false)
    }

    void loadDashboard()
  }, [business?.id])

  const visibleModules = getAccessibleWebModules({ currentRole, hasPermission }).filter(
    (module) => module.id !== 'dashboard',
  )
  const reportsPath = getWebModulePathById('reports') ?? '/reports'

  const backofficeModules = visibleModules.filter((module) => module.group === 'backoffice')
  const operationsModules = visibleModules.filter((module) => module.group === 'operations')
  const quickLinks = backofficeModules.slice(0, 6)

  const dashboardTotals = useMemo(() => {
    const emitted = emittedDaily.reduce((sum, item) => sum + item.totalAmount, 0)
    const received = receivedDaily.reduce((sum, item) => sum + item.totalAmount, 0)
    const creditCount = creditNotes.reduce((sum, item) => sum + item.creditNoteCount, 0)
    const lastMonth = monthly[0]
    const emittedCount = emittedDaily.reduce((sum, item) => sum + item.documentCount, 0)
    const receivedCount = receivedDaily.reduce((sum, item) => sum + item.documentCount, 0)
    const draftDocuments =
      emittedDaily.filter((item) => item.status === 'draft').reduce((sum, item) => sum + item.documentCount, 0) +
      receivedDaily.filter((item) => item.status === 'draft').reduce((sum, item) => sum + item.documentCount, 0)
    const cancelledDocuments =
      emittedDaily
        .filter((item) => item.status === 'cancelled' || item.status === 'voided')
        .reduce((sum, item) => sum + item.documentCount, 0) +
      receivedDaily
        .filter((item) => item.status === 'cancelled' || item.status === 'voided')
        .reduce((sum, item) => sum + item.documentCount, 0)

    return {
      emitted,
      received,
      creditCount,
      netDifference: lastMonth?.netDifferenceAfterCreditNotes ?? 0,
      emittedCount,
      receivedCount,
      draftDocuments,
      cancelledDocuments,
    }
  }, [creditNotes, emittedDaily, monthly, receivedDaily])

  const dashboardAlerts = useMemo(() => {
    const alerts: Array<{ tone: 'warning' | 'info' | 'success'; title: string; description: string }> = []

    if (dashboardTotals.draftDocuments > 0) {
      alerts.push({
        tone: 'warning',
        title: 'Documentos en borrador',
        description: `${numberFormatter.format(dashboardTotals.draftDocuments)} documento(s) aun no quedan cerrados administrativamente.`,
      })
    }

    if (dashboardTotals.cancelledDocuments > 0) {
      alerts.push({
        tone: 'info',
        title: 'Documentos anulados o invalidados',
        description: `${numberFormatter.format(dashboardTotals.cancelledDocuments)} registro(s) requieren seguimiento o validacion interna.`,
      })
    }

    if (!alerts.length) {
      alerts.push({
        tone: 'success',
        title: 'Sin alertas relevantes',
        description: 'No se detectan borradores pendientes ni anulaciones visibles en el periodo actual.',
      })
    }

    return alerts.slice(0, 3)
  }, [dashboardTotals.cancelledDocuments, dashboardTotals.draftDocuments])

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(value))

  const documentTypeLabels: Record<string, string> = {
    boleta: 'Boleta emitida',
    factura: 'Factura emitida',
    nota_credito: 'Nota de credito',
    boleta_compra: 'Boleta de compra',
    factura_compra: 'Factura de compra',
    other: 'Otro documento',
  }

  return (
    <section className="dashboard-page">
      <section className="surface-card dashboard-hero">
        <div>
          <p className="section-kicker">Panel administrativo</p>
          <h3>{business?.name ?? 'Tu negocio'}</h3>
          <p>Resumen ejecutivo del backoffice documental y comercial con foco en lectura rapida y acciones utiles.</p>
        </div>
        <div className="dashboard-hero__actions">
          {quickLinks.map((module) => (
            <Link key={module.id} to={module.path} className="dashboard-chip-link">
              {module.label}
            </Link>
          ))}
        </div>
      </section>

      {isHydrating ? <AdminLoadingBlock label="Cargando indicadores administrativos" /> : null}
      {syncError ? <AdminNotice tone="error">{syncError}</AdminNotice> : null}

      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi"><span>Ventas del periodo</span><strong>{formatCurrency(dashboardTotals.emitted)}</strong><p>{numberFormatter.format(dashboardTotals.emittedCount)} documentos emitidos este mes.</p></article>
        <article className="surface-card dashboard-kpi"><span>Compras del periodo</span><strong>{formatCurrency(dashboardTotals.received)}</strong><p>{numberFormatter.format(dashboardTotals.receivedCount)} documentos recibidos este mes.</p></article>
        <article className="surface-card dashboard-kpi"><span>Notas de credito</span><strong>{numberFormatter.format(dashboardTotals.creditCount)}</strong><p>Notas emitidas y recibidas detectadas en el periodo actual.</p></article>
        <article className="surface-card dashboard-kpi"><span>Diferencia neta</span><strong>{formatCurrency(dashboardTotals.netDifference)}</strong><p>Compras vs ventas segun la ultima vista mensual disponible.</p></article>
      </div>

      <div className="dashboard-grid">
        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Accesos rapidos</p>
              <h3>Operaciones administrativas frecuentes</h3>
              <p>Entra directo a clientes, proveedores, documentos, notas y reportes.</p>
            </div>
          </div>
          <div className="dashboard-links-grid">
            {backofficeModules.map((module) => (
              <article key={module.id} className="dashboard-link-card">
                <div>
                  <span>{module.accent}</span>
                  <strong>{module.label}</strong>
                  <p>{module.description}</p>
                </div>
                <Link to={module.path} className="dashboard-link-card__action">
                  Abrir
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Alertas</p>
              <h3>Atencion administrativa</h3>
              <p>Senales utiles para revisar el estado documental del periodo actual.</p>
            </div>
          </div>
          <div className="dashboard-alerts">
            {dashboardAlerts.map((alert) => (
              <article
                key={alert.title}
                className={`dashboard-alert dashboard-alert--${alert.tone}`}
              >
                <strong>{alert.title}</strong>
                <p>{alert.description}</p>
              </article>
            ))}
          </div>
          <div className="dashboard-context-grid">
            <div>
              <span>Rol actual</span>
              <strong>{currentRole ?? 'sin rol'}</strong>
            </div>
            <div>
              <span>Permisos activos</span>
              <strong>{permissions.length}</strong>
            </div>
            <div>
              <span>Miembros visibles</span>
              <strong>{members.length}</strong>
            </div>
            <div>
              <span>Invitaciones</span>
              <strong>{invitations.length + pendingInvitations.length}</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--recent">
        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Actividad</p>
              <h3>Ultimos documentos</h3>
              <p>Resumen breve de la actividad documental mas reciente del negocio.</p>
            </div>
            <Link to={reportsPath} className="dashboard-link-card__action">
              Ver reportes
            </Link>
          </div>
          <div className="dashboard-recent-list">
            {recentDocuments.length ? (
              recentDocuments.map((document) => (
                <article key={document.id} className="dashboard-recent-item">
                  <div>
                    <strong>{document.folio ? `Folio ${document.folio}` : 'Sin folio'}</strong>
                    <p>
                      {documentTypeLabels[document.documentType] ?? document.documentType} ·{' '}
                      {document.counterpartyName ?? 'Sin contraparte'}
                    </p>
                  </div>
                  <div className="dashboard-recent-item__meta">
                    <span>{formatDate(document.issueDate)}</span>
                    <strong>{formatCurrency(document.totalAmount)}</strong>
                  </div>
                </article>
              ))
            ) : (
              <AdminEmptyState
                compact
                title="Sin actividad documental reciente."
                description="Los ultimos documentos apareceran aqui cuando exista movimiento en backend."
              />
            )}
          </div>
        </section>

        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Altas recientes</p>
              <h3>Clientes y proveedores recientes</h3>
              <p>Acceso rapido a las ultimas fichas creadas en el panel administrativo.</p>
            </div>
          </div>
          <div className="dashboard-summary-columns">
            <div className="dashboard-summary-column">
              <h4>Clientes</h4>
              <div className="dashboard-recent-list">
                {recentCustomers.length ? (
                  recentCustomers.map((customer) => (
                    <article key={customer.id} className="dashboard-recent-item">
                      <div>
                        <strong>{customer.legalName}</strong>
                        <p>{customer.taxId}</p>
                      </div>
                      <span>{customer.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                    </article>
                  ))
                ) : (
                  <AdminEmptyState
                    compact
                    title="Sin clientes recientes."
                    description="Las nuevas fichas apareceran aqui."
                  />
                )}
              </div>
            </div>

            <div className="dashboard-summary-column">
              <h4>Proveedores</h4>
              <div className="dashboard-recent-list">
                {recentSuppliers.length ? (
                  recentSuppliers.map((supplier) => (
                    <article key={supplier.id} className="dashboard-recent-item">
                      <div>
                        <strong>{supplier.legalName}</strong>
                        <p>{supplier.taxId}</p>
                      </div>
                      <span>{supplier.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                    </article>
                  ))
                ) : (
                  <AdminEmptyState
                    compact
                    title="Sin proveedores recientes."
                    description="Las nuevas fichas apareceran aqui."
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {operationsModules.length ? (
        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Operacion</p>
              <h3>Herramientas operativas disponibles</h3>
              <p>La operacion diaria sigue accesible, separada del backoffice administrativo.</p>
            </div>
          </div>
          <div className="dashboard-links-grid">
            {operationsModules.map((module) => (
              <article key={module.id} className="dashboard-link-card">
                <div>
                  <span>{module.accent}</span>
                  <strong>{module.label}</strong>
                  <p>{module.description}</p>
                </div>
                <Link to={module.path} className="dashboard-link-card__action">
                  Abrir
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  )
}
