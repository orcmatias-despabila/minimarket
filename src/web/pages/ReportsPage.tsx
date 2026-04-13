import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { formatCurrency, numberFormatter } from '../../lib/format'
import { downloadCsv, printElementById } from '../lib/adminExport'
import { AdminEmptyState } from '../components/AdminEmptyState'
import { AdminFilterToolbar } from '../components/AdminFilterToolbar'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { adminReportsService } from '../services/adminReports.service'
import type {
  AdminCreditNoteSummary,
  AdminCustomerRollup,
  AdminDailyDocumentSummary,
  AdminDocumentsByTypeRollup,
  AdminPurchasesVsSalesMonthly,
  AdminSupplierRollup,
} from '../types/adminReport'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

type ReportPeriod = 'today' | '7d' | '30d' | 'month' | 'custom'

const todayDate = () => new Date().toISOString().slice(0, 10)
const firstDayOfMonth = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}
const daysAgo = (days: number) => {
  const current = new Date()
  current.setDate(current.getDate() - days)
  return current.toISOString().slice(0, 10)
}
const monthKey = (value: string) => value.slice(0, 7)
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(value))
const formatMonth = (value: string) =>
  new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T00:00:00`))

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
    ? `${firstMessage} Algunos bloques del reporte pueden mostrarse incompletos.`
    : firstMessage
}

const documentTypeLabels: Record<string, string> = {
  boleta: 'Boleta emitida',
  factura: 'Factura emitida',
  nota_credito: 'Nota de credito',
  boleta_compra: 'Boleta de compra',
  factura_compra: 'Factura de compra',
  other: 'Otro documento',
}

const directionLabels: Record<string, string> = {
  emitted: 'Emitidos',
  received: 'Recibidos',
}

export function ReportsPage() {
  const { business, hasPermission } = useWebWorkspace()
  const [period, setPeriod] = useState<ReportPeriod>('month')
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth())
  const [dateTo, setDateTo] = useState(todayDate())
  const [isHydrating, setIsHydrating] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [emittedDaily, setEmittedDaily] = useState<AdminDailyDocumentSummary[]>([])
  const [receivedDaily, setReceivedDaily] = useState<AdminDailyDocumentSummary[]>([])
  const [supplierRollups, setSupplierRollups] = useState<AdminSupplierRollup[]>([])
  const [customerRollups, setCustomerRollups] = useState<AdminCustomerRollup[]>([])
  const [typeRollups, setTypeRollups] = useState<AdminDocumentsByTypeRollup[]>([])
  const [creditNotes, setCreditNotes] = useState<AdminCreditNoteSummary[]>([])
  const [purchasesVsSales, setPurchasesVsSales] = useState<AdminPurchasesVsSalesMonthly[]>([])

  useEffect(() => {
    if (period === 'today') {
      const current = todayDate()
      setDateFrom(current)
      setDateTo(current)
    } else if (period === '7d') {
      setDateFrom(daysAgo(6))
      setDateTo(todayDate())
    } else if (period === '30d') {
      setDateFrom(daysAgo(29))
      setDateTo(todayDate())
    } else if (period === 'month') {
      setDateFrom(firstDayOfMonth())
      setDateTo(todayDate())
    }
  }, [period])

  useEffect(() => {
    const loadReports = async () => {
      if (!business?.id) {
        setEmittedDaily([])
        setReceivedDaily([])
        setSupplierRollups([])
        setCustomerRollups([])
        setTypeRollups([])
        setCreditNotes([])
        setPurchasesVsSales([])
        setIsHydrating(false)
        return
      }

      setIsHydrating(true)
      setSyncError(null)

      const filters = { businessId: business.id, dateFrom, dateTo }
      const results = await Promise.allSettled([
          adminReportsService.listEmittedDaily(filters),
          adminReportsService.listReceivedDaily(filters),
          adminReportsService.listSupplierRollups({ businessId: business.id }),
          adminReportsService.listCustomerRollups({ businessId: business.id }),
          adminReportsService.listTypeRollups({ businessId: business.id }),
          adminReportsService.listCreditNotesSummary(filters),
          adminReportsService.listPurchasesVsSales({ businessId: business.id }),
        ])

      setEmittedDaily(unwrapSettled(results[0], [] as AdminDailyDocumentSummary[]))
      setReceivedDaily(unwrapSettled(results[1], [] as AdminDailyDocumentSummary[]))
      setSupplierRollups(unwrapSettled(results[2], [] as AdminSupplierRollup[]))
      setCustomerRollups(unwrapSettled(results[3], [] as AdminCustomerRollup[]))
      setTypeRollups(unwrapSettled(results[4], [] as AdminDocumentsByTypeRollup[]))
      setCreditNotes(unwrapSettled(results[5], [] as AdminCreditNoteSummary[]))
      setPurchasesVsSales(unwrapSettled(results[6], [] as AdminPurchasesVsSalesMonthly[]))
      setSyncError(summarizeFailures(results, 'No pudimos cargar los reportes.'))
      setIsHydrating(false)
    }

    void loadReports()
  }, [business?.id, dateFrom, dateTo])

  const emittedTotal = useMemo(() => emittedDaily.reduce((sum, item) => sum + item.totalAmount, 0), [emittedDaily])
  const receivedTotal = useMemo(() => receivedDaily.reduce((sum, item) => sum + item.totalAmount, 0), [receivedDaily])
  const emittedCount = useMemo(() => emittedDaily.reduce((sum, item) => sum + item.documentCount, 0), [emittedDaily])
  const receivedCount = useMemo(() => receivedDaily.reduce((sum, item) => sum + item.documentCount, 0), [receivedDaily])

  const filteredMonthly = useMemo(() => {
    const from = monthKey(dateFrom)
    const to = monthKey(dateTo)
    return purchasesVsSales.filter((item) => item.periodMonth >= from && item.periodMonth <= to)
  }, [dateFrom, dateTo, purchasesVsSales])

  const monthlyTotals = useMemo(() => ({
    sales: filteredMonthly.reduce((sum, item) => sum + item.salesTotalAmount, 0),
    purchases: filteredMonthly.reduce((sum, item) => sum + item.purchaseTotalAmount, 0),
    net: filteredMonthly.reduce((sum, item) => sum + item.netDifferenceAfterCreditNotes, 0),
  }), [filteredMonthly])

  const creditSummary = useMemo(() => ({
    emittedCount: creditNotes.filter((item) => item.direction === 'emitted').reduce((sum, item) => sum + item.creditNoteCount, 0),
    receivedCount: creditNotes.filter((item) => item.direction === 'received').reduce((sum, item) => sum + item.creditNoteCount, 0),
    emittedAmount: creditNotes.filter((item) => item.direction === 'emitted').reduce((sum, item) => sum + item.totalAmount, 0),
    receivedAmount: creditNotes.filter((item) => item.direction === 'received').reduce((sum, item) => sum + item.totalAmount, 0),
    internalReferences: creditNotes.reduce((sum, item) => sum + item.referencedInternalDocuments, 0),
  }), [creditNotes])

  const periodTypeSummary = useMemo(() => {
    const rows = [...emittedDaily, ...receivedDaily]
    const grouped = rows.reduce<Record<string, {
      direction: string
      documentType: string
      documentCount: number
      totalAmount: number
    }>>((acc, item) => {
      const direction = emittedDaily.includes(item) ? 'emitted' : 'received'
      const key = `${direction}:${item.documentType}`
      const current = acc[key] ?? {
        direction,
        documentType: item.documentType,
        documentCount: 0,
        totalAmount: 0,
      }
      acc[key] = {
        direction,
        documentType: item.documentType,
        documentCount: current.documentCount + item.documentCount,
        totalAmount: current.totalAmount + item.totalAmount,
      }
      return acc
    }, {})

    return Object.values(grouped).sort((left, right) => right.totalAmount - left.totalAmount)
  }, [emittedDaily, receivedDaily])

  const cumulativeTypeRollups = useMemo(
    () => typeRollups.slice().sort((left, right) => right.totalAmount - left.totalAmount).slice(0, 6),
    [typeRollups],
  )

  const exportRows = useMemo(() => [
    ...emittedDaily.map((item) => [item.issueDate, 'emitido', documentTypeLabels[item.documentType] ?? item.documentType, item.status, item.documentCount, item.totalAmount]),
    ...receivedDaily.map((item) => [item.issueDate, 'recibido', documentTypeLabels[item.documentType] ?? item.documentType, item.status, item.documentCount, item.totalAmount]),
  ], [emittedDaily, receivedDaily])

  const canExport = hasPermission('exports:run')
  const handleExportCsv = () => {
    downloadCsv(
      `reportes-admin-${dateFrom}-${dateTo}.csv`,
      ['Fecha', 'Direccion', 'Tipo', 'Estado', 'Cantidad', 'Total'],
      exportRows,
    )
  }
  const handlePrint = () => {
    printElementById(
      'reports-print-area',
      `Reportes administrativos ${business?.name ?? 'Minimarket'}`,
    )
  }

  const activeFilters = useMemo(() => {
    const filters: Array<{ label: string; value: string }> = []

    filters.push({
      label: 'Periodo',
      value:
        period === 'today'
          ? 'Hoy'
          : period === '7d'
            ? 'Ultimos 7 dias'
            : period === '30d'
              ? 'Ultimos 30 dias'
              : period === 'month'
                ? 'Mes actual'
                : 'Personalizado',
    })

    if (dateFrom) {
      filters.push({ label: 'Desde', value: formatDate(dateFrom) })
    }

    if (dateTo) {
      filters.push({ label: 'Hasta', value: formatDate(dateTo) })
    }

    return filters
  }, [dateFrom, dateTo, period])

  const clearFilters = () => {
    setPeriod('month')
    setDateFrom(firstDayOfMonth())
    setDateTo(todayDate())
  }

  return (
    <section className="reports-admin-web">
      <section className="surface-card reports-web__hero print-hide">
        <div>
          <p className="section-kicker">Reportes administrativos</p>
          <h3>{business?.name ?? 'Tu negocio'}</h3>
          <p>Resumen real desde vistas SQL del backoffice documental y comercial.</p>
        </div>
        <div className="reports-web__hero-actions">
          <Button onClick={handleExportCsv} disabled={!canExport || !exportRows.length}>
            Exportar CSV
          </Button>
          <Button variant="secondary" onClick={handlePrint}>
            Imprimir reporte
          </Button>
        </div>
      </section>

      <section className="surface-card print-hide">
        <div className="inventory-section__header">
          <div>
            <p className="section-kicker">Filtros</p>
            <h3>Periodo</h3>
            <p>Los bloques por periodo respetan este rango; los acumulados historicos se muestran aparte.</p>
          </div>
        </div>
        {isHydrating ? <AdminLoadingBlock label="Sincronizando reportes administrativos" compact /> : null}
        {syncError ? <AdminNotice tone="error">{syncError}</AdminNotice> : null}
        <AdminFilterToolbar
          title="Filtros del reporte"
          description="Controla el rango visible y exporta solo la actividad que necesitas revisar."
          actions={
            <Button onClick={handleExportCsv} disabled={!canExport || !exportRows.length}>
              Exportar CSV
            </Button>
          }
          activeFilters={activeFilters}
          onClearFilters={clearFilters}
        >
          <div className="reports-admin-web__filters">
            <SelectField
              label="Periodo"
              value={period}
              onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
              options={[
                { label: 'Hoy', value: 'today' },
                { label: 'Ultimos 7 dias', value: '7d' },
                { label: 'Ultimos 30 dias', value: '30d' },
                { label: 'Mes actual', value: 'month' },
                { label: 'Personalizado', value: 'custom' },
              ]}
            />
            <Field label="Desde" type="date" value={dateFrom} onChange={(event) => { setPeriod('custom'); setDateFrom(event.target.value) }} />
            <Field label="Hasta" type="date" value={dateTo} onChange={(event) => { setPeriod('custom'); setDateTo(event.target.value) }} />
          </div>
        </AdminFilterToolbar>
      </section>

      <div id="reports-print-area" className="reports-admin-web__print-area print-sheet">
      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi"><span>Emitidos por periodo</span><strong>{formatCurrency(emittedTotal)}</strong><p>{numberFormatter.format(emittedCount)} documentos en el rango actual.</p></article>
        <article className="surface-card dashboard-kpi"><span>Recibidos por periodo</span><strong>{formatCurrency(receivedTotal)}</strong><p>{numberFormatter.format(receivedCount)} documentos en el rango actual.</p></article>
        <article className="surface-card dashboard-kpi"><span>Compras vs ventas</span><strong>{formatCurrency(monthlyTotals.net)}</strong><p>Diferencia neta acumulada del rango mensual filtrado.</p></article>
        <article className="surface-card dashboard-kpi"><span>Notas de credito</span><strong>{numberFormatter.format(creditSummary.emittedCount + creditSummary.receivedCount)}</strong><p>{numberFormatter.format(creditSummary.internalReferences)} referencias internas detectadas.</p></article>
      </div>

      <div className="reports-admin-web__grid">
        <section className="surface-card">
          <div className="inventory-section__header"><div><p className="section-kicker">Emitidos</p><h3>Documentos emitidos por periodo</h3></div></div>
          <div className="reports-admin-web__table">
            <div className="reports-admin-web__row reports-admin-web__row--head"><span>Fecha</span><span>Tipo</span><span>Estado</span><span>Cantidad</span><span>Neto</span><span>Total</span><span>Mes</span></div>
            {emittedDaily.length ? emittedDaily.map((item) => (
              <div key={`emitted-${item.issueDate}-${item.documentType}-${item.status}`} className="reports-admin-web__row">
                <span>{formatDate(item.issueDate)}</span><span>{documentTypeLabels[item.documentType] ?? item.documentType}</span><span>{item.status}</span><span>{numberFormatter.format(item.documentCount)}</span><span>{formatCurrency(item.netAmount)}</span><span>{formatCurrency(item.totalAmount)}</span><span>{formatMonth(item.periodMonth)}</span>
              </div>
            )) : <AdminEmptyState compact tone="search" title="No hay emitidos en este rango." description="Ajusta fechas para revisar la actividad documental emitida." actionLabel="Limpiar filtros" onAction={clearFilters} />}
          </div>
        </section>

        <section className="surface-card">
          <div className="inventory-section__header"><div><p className="section-kicker">Recibidos</p><h3>Documentos recibidos por periodo</h3></div></div>
          <div className="reports-admin-web__table">
            <div className="reports-admin-web__row reports-admin-web__row--head"><span>Fecha</span><span>Tipo</span><span>Estado</span><span>Cantidad</span><span>Neto</span><span>Total</span><span>Mes</span></div>
            {receivedDaily.length ? receivedDaily.map((item) => (
              <div key={`received-${item.issueDate}-${item.documentType}-${item.status}`} className="reports-admin-web__row">
                <span>{formatDate(item.issueDate)}</span><span>{documentTypeLabels[item.documentType] ?? item.documentType}</span><span>{item.status}</span><span>{numberFormatter.format(item.documentCount)}</span><span>{formatCurrency(item.netAmount)}</span><span>{formatCurrency(item.totalAmount)}</span><span>{formatMonth(item.periodMonth)}</span>
              </div>
            )) : <AdminEmptyState compact tone="search" title="No hay recibidos en este rango." description="Ajusta fechas para revisar compras y respaldos documentales." actionLabel="Limpiar filtros" onAction={clearFilters} />}
          </div>
        </section>
      </div>

      <div className="reports-admin-web__grid">
        <section className="surface-card">
          <div className="inventory-section__header"><div><p className="section-kicker">Proveedores</p><h3>Total de compras por proveedor</h3><p>Vista acumulada real del backend.</p></div></div>
          <div className="reports-web__list">
            {supplierRollups.length ? supplierRollups.slice(0, 8).map((item) => (
              <article key={item.supplierId ?? item.supplierName} className="report-list__item">
                <div><strong>{item.supplierName}</strong><p>{item.supplierTaxId ?? 'Sin RUT'} · {numberFormatter.format(item.documentCount)} documentos</p></div>
                <strong>{formatCurrency(item.totalAmount)}</strong>
              </article>
            )) : <AdminEmptyState compact title="No hay compras acumuladas por proveedor." description="Necesitas documentos recibidos registrados en backend." />}
          </div>
        </section>

        <section className="surface-card">
          <div className="inventory-section__header"><div><p className="section-kicker">Clientes</p><h3>Total de ventas por cliente</h3><p>Vista acumulada real del backend.</p></div></div>
          <div className="reports-web__list">
            {customerRollups.length ? customerRollups.slice(0, 8).map((item) => (
              <article key={item.customerId ?? item.customerName} className="report-list__item">
                <div><strong>{item.customerName}</strong><p>{item.customerTaxId ?? 'Sin RUT'} · {numberFormatter.format(item.documentCount)} documentos</p></div>
                <strong>{formatCurrency(item.totalAmount)}</strong>
              </article>
            )) : <AdminEmptyState compact title="No hay ventas acumuladas por cliente." description="Necesitas documentos emitidos registrados en backend." />}
          </div>
        </section>
      </div>

      <div className="reports-admin-web__grid">
        <section className="surface-card">
          <div className="inventory-section__header"><div><p className="section-kicker">Tipos</p><h3>Resumen por tipo de documento</h3><p>Calculado con las vistas diarias reales del período filtrado.</p></div></div>
          <div className="reports-admin-web__table">
            <div className="reports-admin-web__row reports-admin-web__row--head"><span>Direccion</span><span>Tipo</span><span>Cantidad</span><span>Total</span></div>
            {periodTypeSummary.length ? periodTypeSummary.map((item) => (
              <div key={`${item.direction}-${item.documentType}`} className="reports-admin-web__row">
                <span>{directionLabels[item.direction] ?? item.direction}</span><span>{documentTypeLabels[item.documentType] ?? item.documentType}</span><span>{numberFormatter.format(item.documentCount)}</span><span>{formatCurrency(item.totalAmount)}</span>
              </div>
            )) : <AdminEmptyState compact tone="search" title="No hay resumen por tipo para este rango." description="Ajusta fechas para revisar actividad documental del periodo." actionLabel="Limpiar filtros" onAction={clearFilters} />}
          </div>
        </section>

        <section className="surface-card">
          <div className="inventory-section__header"><div><p className="section-kicker">Notas de credito</p><h3>Resumen administrativo</h3></div></div>
          <div className="reports-admin-web__summary-grid">
            <div className="reports-web__mini-card"><span>Emitidas</span><strong>{numberFormatter.format(creditSummary.emittedCount)}</strong></div>
            <div className="reports-web__mini-card"><span>Recibidas</span><strong>{numberFormatter.format(creditSummary.receivedCount)}</strong></div>
            <div className="reports-web__mini-card"><span>Monto emitido</span><strong>{formatCurrency(creditSummary.emittedAmount)}</strong></div>
            <div className="reports-web__mini-card"><span>Monto recibido</span><strong>{formatCurrency(creditSummary.receivedAmount)}</strong></div>
            <div className="reports-web__mini-card"><span>Referencias internas</span><strong>{numberFormatter.format(creditSummary.internalReferences)}</strong></div>
          </div>
        </section>
      </div>

      <section className="surface-card">
        <div className="inventory-section__header"><div><p className="section-kicker">Acumulados</p><h3>Tipos documentales historicos</h3><p>Vista acumulada adicional desde los rollups reales del backend.</p></div></div>
        <div className="reports-web__list">
          {cumulativeTypeRollups.length ? cumulativeTypeRollups.map((item) => (
            <article key={`rollup-${item.direction}-${item.documentType}-${item.status}`} className="report-list__item">
              <div><strong>{directionLabels[item.direction] ?? item.direction} · {documentTypeLabels[item.documentType] ?? item.documentType}</strong><p>{item.status} · {numberFormatter.format(item.documentCount)} documentos</p></div>
              <strong>{formatCurrency(item.totalAmount)}</strong>
            </article>
          )) : <AdminEmptyState compact title="No hay acumulados historicos disponibles." description="Los rollups apareceran aqui cuando exista actividad documental consolidada." />}
        </div>
      </section>

      <section className="surface-card">
        <div className="inventory-section__header"><div><p className="section-kicker">Comparacion</p><h3>Compras vs ventas por mes</h3><p>Vista mensual real desde backend, filtrada en frontend por el rango visible.</p></div></div>
        <div className="reports-admin-web__table">
          <div className="reports-admin-web__row reports-admin-web__row--head"><span>Mes</span><span>Ventas</span><span>Compras</span><span>NC emitidas</span><span>NC recibidas</span><span>Diferencia bruta</span><span>Diferencia neta</span></div>
          {filteredMonthly.length ? filteredMonthly.map((item) => (
            <div key={item.periodMonth} className="reports-admin-web__row">
              <span>{formatMonth(item.periodMonth)}</span><span>{formatCurrency(item.salesTotalAmount)}</span><span>{formatCurrency(item.purchaseTotalAmount)}</span><span>{formatCurrency(item.emittedCreditNoteTotal)}</span><span>{formatCurrency(item.receivedCreditNoteTotal)}</span><span>{formatCurrency(item.grossDifferenceAmount)}</span><span>{formatCurrency(item.netDifferenceAfterCreditNotes)}</span>
            </div>
          )) : <AdminEmptyState compact tone="search" title="No hay comparacion mensual en este rango." description="Amplia las fechas para revisar la evolucion compras vs ventas." actionLabel="Limpiar filtros" onAction={clearFilters} />}
        </div>
      </section>
      </div>
    </section>
  )
}

