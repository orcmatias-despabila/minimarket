import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency, numberFormatter } from '../../lib/format'
import { AdminEmptyState } from '../components/AdminEmptyState'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { getAccessibleWebModules, getWebModulePathById } from '../navigation/modules'
import { adminCustomersService } from '../services/adminCustomers.service'
import { adminDocumentsService } from '../services/adminDocuments.service'
import { adminReportsService } from '../services/adminReports.service'
import { adminSuppliersService } from '../services/adminSuppliers.service'
import type { AdminCustomer } from '../types/adminCustomer'
import type { AdminDocument } from '../types/adminDocument'
import type {
  AdminCreditNoteSummary,
  AdminDailyDocumentSummary,
  AdminPurchasesVsSalesMonthly,
} from '../types/adminReport'
import type { AdminSupplier } from '../types/adminSupplier'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

const todayDate = () => new Date().toISOString().slice(0, 10)
const dashboardUsageStorageKey = 'web-dashboard-module-usage'
const quickAccessModuleIds = [
  'clients',
  'suppliers',
  'issued-documents',
  'received-documents',
  'reports',
  'credit-notes',
] as const
const managementModuleIds = ['clients', 'suppliers', 'reports'] as const

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

type ModuleUsageMap = Partial<Record<string, { count: number; lastUsedAt: number }>>

const readModuleUsage = (): ModuleUsageMap => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const rawValue = window.localStorage.getItem(dashboardUsageStorageKey)
    if (!rawValue) {
      return {}
    }

    const parsed = JSON.parse(rawValue)
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
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
  const [moduleUsage, setModuleUsage] = useState<ModuleUsageMap>(() => readModuleUsage())

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
        adminCustomersService.listRecent(business.id, 6),
        adminSuppliersService.listRecent(business.id, 6),
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

  const rankedBackofficeModules = useMemo(() => {
    return [...backofficeModules].sort((left, right) => {
      const leftUsage = moduleUsage[left.id]
      const rightUsage = moduleUsage[right.id]
      const leftScore = leftUsage ? leftUsage.count * 1000000 + leftUsage.lastUsedAt : 0
      const rightScore = rightUsage ? rightUsage.count * 1000000 + rightUsage.lastUsedAt : 0

      if (rightScore !== leftScore) {
        return rightScore - leftScore
      }

      const leftPriority = quickAccessModuleIds.indexOf(left.id as (typeof quickAccessModuleIds)[number])
      const rightPriority = quickAccessModuleIds.indexOf(
        right.id as (typeof quickAccessModuleIds)[number],
      )
      const normalizedLeft = leftPriority === -1 ? Number.MAX_SAFE_INTEGER : leftPriority
      const normalizedRight = rightPriority === -1 ? Number.MAX_SAFE_INTEGER : rightPriority

      if (normalizedLeft !== normalizedRight) {
        return normalizedLeft - normalizedRight
      }

      return left.label.localeCompare(right.label)
    })
  }, [backofficeModules, moduleUsage])

  const quickLinks = rankedBackofficeModules.slice(0, 6)
  const highlightedQuickLinks = quickLinks.slice(0, 3)
  const managementLinks = rankedBackofficeModules
    .filter((module) =>
      managementModuleIds.includes(module.id as (typeof managementModuleIds)[number]),
    )
    .slice(0, 3)
  const recentDocumentsPreview = recentDocuments.slice(0, 3)
  const recentCustomersPreview = recentCustomers.slice(0, 3)
  const recentSuppliersPreview = recentSuppliers.slice(0, 3)

  const dashboardTotals = useMemo(() => {
    const emitted = emittedDaily.reduce((sum, item) => sum + item.totalAmount, 0)
    const received = receivedDaily.reduce((sum, item) => sum + item.totalAmount, 0)
    const creditCount = creditNotes.reduce((sum, item) => sum + item.creditNoteCount, 0)
    const lastMonth = monthly[0]
    const emittedCount = emittedDaily.reduce((sum, item) => sum + item.documentCount, 0)
    const receivedCount = receivedDaily.reduce((sum, item) => sum + item.documentCount, 0)
    const draftDocuments =
      emittedDaily
        .filter((item) => item.status === 'draft')
        .reduce((sum, item) => sum + item.documentCount, 0) +
      receivedDaily
        .filter((item) => item.status === 'draft')
        .reduce((sum, item) => sum + item.documentCount, 0)
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
        description:
          'No se detectan borradores pendientes ni anulaciones visibles en el periodo actual.',
      })
    }

    return alerts.slice(0, 3)
  }, [dashboardTotals.cancelledDocuments, dashboardTotals.draftDocuments])

  const alertSummary = dashboardAlerts[0] ?? {
    tone: 'success' as const,
    title: 'Sin alertas relevantes',
    description: 'No se detectan pendientes visibles.',
  }

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

  const registerModuleVisit = (moduleId: string) => {
    setModuleUsage((current) => {
      const nextUsage = {
        ...current,
        [moduleId]: {
          count: (current[moduleId]?.count ?? 0) + 1,
          lastUsedAt: Date.now(),
        },
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(dashboardUsageStorageKey, JSON.stringify(nextUsage))
      }

      return nextUsage
    })
  }

  return (
    <section className="dashboard-page">
      <section className="surface-card dashboard-hero">
        <div className="dashboard-hero__copy">
          <h3>{business?.name ?? 'Tu negocio'}</h3>
          <p>
            Vista resumida del negocio con foco en lo urgente, lo frecuente y la actividad mas
            reciente.
          </p>
        </div>
        <div className="dashboard-hero__actions" aria-label="Accesos frecuentes">
          {highlightedQuickLinks.map((module) => (
            <Link
              key={module.id}
              to={module.path}
              className="dashboard-chip-link"
              onClick={() => registerModuleVisit(module.id)}
            >
              <strong>{module.shortLabel}</strong>
              <span>{module.accent}</span>
            </Link>
          ))}
        </div>
      </section>

      {isHydrating ? <AdminLoadingBlock label="Cargando indicadores administrativos" /> : null}
      {syncError ? <AdminNotice tone="error">{syncError}</AdminNotice> : null}

      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi">
          <span>Ventas del periodo</span>
          <strong>{formatCurrency(dashboardTotals.emitted)}</strong>
          <p>{numberFormatter.format(dashboardTotals.emittedCount)} documentos emitidos este mes.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Compras del periodo</span>
          <strong>{formatCurrency(dashboardTotals.received)}</strong>
          <p>{numberFormatter.format(dashboardTotals.receivedCount)} documentos recibidos este mes.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Notas de credito</span>
          <strong>{numberFormatter.format(dashboardTotals.creditCount)}</strong>
          <p>Notas emitidas y recibidas detectadas en el periodo actual.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Diferencia neta</span>
          <strong>{formatCurrency(dashboardTotals.netDifference)}</strong>
          <p>Compras vs ventas segun la ultima vista mensual disponible.</p>
        </article>
      </div>

      <section
        className={`surface-card dashboard-alert-banner dashboard-alert-banner--${alertSummary.tone}`}
      >
        <div className="dashboard-alert-banner__main">
          <span className="dashboard-alert-banner__eyebrow">Estado del panel</span>
          <strong>{alertSummary.title}</strong>
          <p>{alertSummary.description}</p>
        </div>
        <div className="dashboard-alert-banner__meta">
          <span className="dashboard-alert-banner__count">
            {dashboardAlerts[0]?.tone === 'success' ? 'Todo OK' : `${dashboardAlerts.length} alerta(s)`}
          </span>
          <Link to={reportsPath} className="dashboard-alert-banner__link">
            Revisar reportes
          </Link>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <h3>Accesos frecuentes</h3>
              <p>Se ordenan segun lo que mas vas usando dentro del panel.</p>
            </div>
          </div>
          <div className="dashboard-quick-strip">
            {quickLinks.map((module) => (
              <Link
                key={module.id}
                to={module.path}
                className="dashboard-quick-strip__item"
                onClick={() => registerModuleVisit(module.id)}
              >
                <span>{module.accent}</span>
                <strong>{module.label}</strong>
              </Link>
            ))}
          </div>
        </section>

        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <h3>Administracion frecuente</h3>
              <p>Entradas directas a las fichas que mas conviene tener a mano.</p>
            </div>
          </div>
          <div className="dashboard-admin-shortcuts">
            {managementLinks.map((module) => (
              <article key={module.id} className="dashboard-admin-shortcuts__item">
                <div>
                  <strong>{module.label}</strong>
                  <p>{module.accent}</p>
                </div>
                <Link
                  to={module.path}
                  className="dashboard-admin-shortcuts__action"
                  onClick={() => registerModuleVisit(module.id)}
                >
                  Abrir
                </Link>
              </article>
            ))}
          </div>
          <div className="dashboard-context-grid dashboard-context-grid--compact">
            <div>
              <span>Rol</span>
              <strong>{currentRole ?? 'sin rol'}</strong>
            </div>
            <div>
              <span>Permisos</span>
              <strong>{permissions.length}</strong>
            </div>
            <div>
              <span>Equipo</span>
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
              <h3>Documentos recientes</h3>
              <p>Solo los ultimos movimientos visibles para no saturar la pantalla.</p>
            </div>
            <Link to={reportsPath} className="dashboard-link-card__action">
              Ver reportes
            </Link>
          </div>
          <div className="dashboard-recent-list">
            {recentDocumentsPreview.length ? (
              recentDocumentsPreview.map((document) => (
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
              <h3>Fichas recientes</h3>
              <p>Clientes y proveedores mas nuevos, listos para entrar a su detalle.</p>
            </div>
          </div>
          <div className="dashboard-summary-columns">
            <div className="dashboard-summary-column">
              <h4>Clientes</h4>
              <div className="dashboard-recent-list">
                {recentCustomersPreview.length ? (
                  recentCustomersPreview.map((customer) => (
                    <Link
                      key={customer.id}
                      to={`/clients/${customer.id}`}
                      className="dashboard-recent-link"
                    >
                      <article className="dashboard-recent-item">
                        <div>
                          <strong>{customer.legalName}</strong>
                          <p>{customer.taxId}</p>
                        </div>
                        <span>{customer.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                      </article>
                    </Link>
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
                {recentSuppliersPreview.length ? (
                  recentSuppliersPreview.map((supplier) => (
                    <Link
                      key={supplier.id}
                      to={`/suppliers/${supplier.id}`}
                      className="dashboard-recent-link"
                    >
                      <article className="dashboard-recent-item">
                        <div>
                          <strong>{supplier.legalName}</strong>
                          <p>{supplier.taxId}</p>
                        </div>
                        <span>{supplier.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                      </article>
                    </Link>
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

      {dashboardAlerts.length > 1 ? (
        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <h3>Seguimiento rapido</h3>
              <p>Alertas secundarias para revisar cuando haga falta.</p>
            </div>
          </div>
          <div className="dashboard-alerts dashboard-alerts--inline">
            {dashboardAlerts.slice(1).map((alert) => (
              <article
                key={alert.title}
                className={`dashboard-alert dashboard-alert--${alert.tone}`}
              >
                <strong>{alert.title}</strong>
                <p>{alert.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  )
}
