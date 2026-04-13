import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { formatCurrency, formatDateTime } from '../../lib/format'
import { createId } from '../../lib/ids'
import type { CashSession, Sale } from '../../types/domain'
import { useWebAuth } from '../auth/AuthProvider'
import { webCashSessionService } from '../services/cashSessionService'
import { salesService } from '../services/salesService'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

const todayDate = () => new Date().toISOString().slice(0, 10)

export function CashPage() {
  const { user } = useWebAuth()
  const { business, hasPermission } = useWebWorkspace()
  const [sales, setSales] = useState<Sale[]>([])
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [isHydrating, setIsHydrating] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [openingAmount, setOpeningAmount] = useState('')
  const [actualCashCounted, setActualCashCounted] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canOpenCash = hasPermission('cash:open')
  const canCloseCash = hasPermission('cash:close')

  useEffect(() => {
    const loadCashData = async () => {
      if (!business?.id) {
        setSales([])
        setSessions([])
        setIsHydrating(false)
        return
      }

      setIsHydrating(true)
      setSyncError(null)

      try {
        const [saleItems, cashItems] = await Promise.all([
          salesService.listByBusiness(business.id),
          webCashSessionService.listByBusiness(business.id),
        ])
        setSales(saleItems)
        setSessions(cashItems)
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : 'No pudimos cargar la caja.')
      } finally {
        setIsHydrating(false)
      }
    }

    void loadCashData()
  }, [business?.id])

  const currentSession = sessions.find((session) => session.status === 'open') ?? null

  const relevantSales = useMemo(() => {
    if (!currentSession) return sales

    const openedAt = new Date(currentSession.openedAt).valueOf()
    const closedAt = currentSession.closedAt
      ? new Date(currentSession.closedAt).valueOf()
      : Number.POSITIVE_INFINITY

    return sales.filter((sale) => {
      const createdAt = new Date(sale.createdAt).valueOf()
      return createdAt >= openedAt && createdAt <= closedAt
    })
  }, [currentSession, sales])

  const summary = useMemo(() => {
    const totals = { total: 0, cash: 0, debit: 0, credit: 0, transfer: 0 }
    for (const sale of relevantSales) {
      totals.total += sale.grandTotal
      totals[sale.paymentMethod] += sale.grandTotal
    }
    const expected = (currentSession?.openingAmount ?? 0) + totals.cash
    const counted = Number(actualCashCounted || currentSession?.actualCashCounted || 0)

    return {
      ...totals,
      expected,
      difference: counted ? counted - expected : 0,
    }
  }, [actualCashCounted, currentSession, relevantSales])

  const openCash = async () => {
    const amount = Number(openingAmount)
    if (Number.isNaN(amount) || amount < 0) {
      setFeedback('Ingresa un monto inicial valido.')
      return
    }

    const session: CashSession = {
      id: createId('cash-session'),
      tenantId: business?.id,
      openedByUserId: user?.id,
      businessDate: todayDate(),
      openedAt: new Date().toISOString(),
      openingAmount: amount,
      status: 'open',
    }

    setIsSubmitting(true)
    try {
      const persisted = await webCashSessionService.openSession({
        session,
        businessId: business?.id,
        actorUserId: user?.id,
      })

      setSessions((current) => [persisted.session, ...current])
      setOpeningAmount('')
      setFeedback('Caja abierta correctamente.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No pudimos abrir la caja ahora.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeCash = async () => {
    if (!currentSession) return

    const counted = Number(actualCashCounted)
    if (Number.isNaN(counted) || counted < 0) {
      setFeedback('Ingresa el efectivo real al cierre.')
      return
    }

    const closedAt = new Date().toISOString()
    setIsSubmitting(true)
    try {
      const result = await webCashSessionService.closeSession({
        sessionId: currentSession.id,
        businessId: business?.id,
        actorUserId: user?.id,
        closedAt,
        actualCashCounted: counted,
      })

      setSessions((current) =>
        current.map((session) => (session.id === currentSession.id ? result.session : session)),
      )
      setActualCashCounted('')
      setFeedback('Caja cerrada correctamente.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No pudimos cerrar la caja ahora.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="cash-web">
      <div className="cash-web__grid">
        <section className="surface-card cash-panel">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Apertura y cierre</p>
              <h3>{currentSession ? 'Caja abierta' : 'Abrir caja'}</h3>
              <p>Controla apertura, efectivo inicial, cierre y diferencia de caja.</p>
            </div>
          </div>

          {isHydrating ? <p>Sincronizando caja...</p> : null}
          {syncError ? <p className="form-error">{syncError}</p> : null}
          {feedback ? (
            <p className="products-web__message products-web__message--success">{feedback}</p>
          ) : null}

          {!currentSession ? (
            <div className="cash-form">
              <Field
                label="Monto inicial"
                type="number"
                value={openingAmount}
                onChange={(event) => setOpeningAmount(event.target.value)}
              />
              <Button onClick={() => void openCash()} disabled={!canOpenCash || isSubmitting}>
                {isSubmitting ? 'Abriendo...' : 'Abrir caja'}
              </Button>
            </div>
          ) : (
            <div className="cash-form">
              <div className="cash-session-status">
                <span className="report-pill">Caja abierta</span>
                <p>Apertura: {formatDateTime(currentSession.openedAt)}</p>
                <p>Monto inicial: {formatCurrency(currentSession.openingAmount)}</p>
              </div>

              <Field
                label="Efectivo real al cierre"
                type="number"
                value={actualCashCounted}
                onChange={(event) => setActualCashCounted(event.target.value)}
              />
              <Button onClick={() => void closeCash()} disabled={!canCloseCash || isSubmitting}>
                {isSubmitting ? 'Cerrando...' : 'Cerrar caja'}
              </Button>
            </div>
          )}
        </section>

        <section className="surface-card cash-panel">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Resumen</p>
              <h3>Caja del periodo</h3>
              <p>Consolidado de ventas por medio de pago y diferencia de caja.</p>
            </div>
          </div>

          <div className="cash-summary">
            <div>
              <span>Total vendido</span>
              <strong>{formatCurrency(summary.total)}</strong>
            </div>
            <div>
              <span>Efectivo</span>
              <strong>{formatCurrency(summary.cash)}</strong>
            </div>
            <div>
              <span>Debito</span>
              <strong>{formatCurrency(summary.debit)}</strong>
            </div>
            <div>
              <span>Credito</span>
              <strong>{formatCurrency(summary.credit)}</strong>
            </div>
            <div>
              <span>Transferencia</span>
              <strong>{formatCurrency(summary.transfer)}</strong>
            </div>
            <div>
              <span>Efectivo esperado</span>
              <strong>{formatCurrency(summary.expected)}</strong>
            </div>
            <div>
              <span>Diferencia</span>
              <strong className={summary.difference >= 0 ? 'text-ok' : 'text-alert'}>
                {formatCurrency(summary.difference)}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <div className="cash-web__grid">
        <section className="surface-card cash-panel">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Ventas incluidas</p>
              <h3>Ventas del periodo</h3>
              <p>Detalle de ventas consideradas en la caja actual o en el total disponible.</p>
            </div>
          </div>

          <div className="sales-web__history">
            {relevantSales.length ? (
              relevantSales.map((sale) => (
                <article key={sale.id} className="sales-web__history-item">
                  <div>
                    <strong>{sale.documentNumber}</strong>
                    <p>{formatDateTime(sale.createdAt)} · {sale.paymentMethod}</p>
                  </div>
                  <strong>{formatCurrency(sale.grandTotal)}</strong>
                </article>
              ))
            ) : (
              <article className="products-empty">
                <strong>No hay ventas en la caja actual.</strong>
                <p>Cuando registres ventas apareceran aqui.</p>
              </article>
            )}
          </div>
        </section>

        <section className="surface-card cash-panel">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Sesiones</p>
              <h3>Historial de caja</h3>
              <p>Ultimas aperturas y cierres registrados para el negocio.</p>
            </div>
          </div>

          <div className="sales-web__history">
            {sessions.length ? (
              sessions.map((session) => (
                <article key={session.id} className="sales-web__history-item">
                  <div>
                    <strong>{session.status === 'open' ? 'Caja abierta' : 'Caja cerrada'}</strong>
                    <p>{formatDateTime(session.openedAt)}</p>
                  </div>
                  <strong>{formatCurrency(session.openingAmount)}</strong>
                </article>
              ))
            ) : (
              <article className="products-empty">
                <strong>Aun no hay sesiones de caja.</strong>
                <p>Abre una caja para comenzar el control diario.</p>
              </article>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
