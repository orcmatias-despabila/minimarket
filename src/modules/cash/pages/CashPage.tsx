import { useMemo, useState } from 'react'
import type { Dispatch } from 'react'
import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { formatCurrency, formatDateTime } from '../../../lib/format'
import type { CashSession, Sale } from '../../../types/domain'
import type { CashAction, CashState } from '../state/cashReducer'

export interface CashPageProps {
  sales: Sale[]
  cashState: CashState
  cashDispatch: Dispatch<CashAction>
}

const paymentLabels: Record<Sale['paymentMethod'], string> = {
  cash: 'Efectivo',
  debit: 'Debito',
  credit: 'Credito',
  transfer: 'Transferencia',
}

const todayDate = () => new Date().toISOString().slice(0, 10)

export function CashPage({ sales, cashState, cashDispatch }: CashPageProps) {
  const [openingAmount, setOpeningAmount] = useState('')
  const [actualCashCounted, setActualCashCounted] = useState('')
  const [error, setError] = useState('')

  const currentSession =
    cashState.sessions.find((session) => session.status === 'open') ?? null

  const relevantSales = useMemo(() => {
    if (!currentSession) return []

    return sales.filter((sale) => {
      const createdAt = new Date(sale.createdAt).valueOf()
      const openedAt = new Date(currentSession.openedAt).valueOf()
      const closedAt = currentSession.closedAt
        ? new Date(currentSession.closedAt).valueOf()
        : Number.POSITIVE_INFINITY

      return createdAt >= openedAt && createdAt <= closedAt
    })
  }, [currentSession, sales])

  const summary = useMemo(() => {
    const totals = {
      totalSold: 0,
      cash: 0,
      debit: 0,
      credit: 0,
      transfer: 0,
    }

    for (const sale of relevantSales) {
      totals.totalSold += sale.grandTotal
      totals[sale.paymentMethod] += sale.grandTotal
    }

    const expectedCash = (currentSession?.openingAmount ?? 0) + totals.cash
    const difference =
      typeof currentSession?.actualCashCounted === 'number'
        ? currentSession.actualCashCounted - expectedCash
        : 0

    return {
      ...totals,
      expectedCash,
      difference,
    }
  }, [currentSession, relevantSales])

  const openSession = () => {
    const amount = Number(openingAmount)

    if (currentSession) {
      setError('Ya existe una caja abierta.')
      return
    }

    if (Number.isNaN(amount) || amount < 0) {
      setError('Ingresa un monto inicial valido.')
      return
    }

    const now = new Date().toISOString()
    const session: CashSession = {
      id: crypto.randomUUID(),
      businessDate: todayDate(),
      openedAt: now,
      openingAmount: amount,
      status: 'open',
    }

    cashDispatch({ type: 'open_session', payload: session })
    setOpeningAmount('')
    setError('')
  }

  const closeSession = () => {
    if (!currentSession) {
      setError('No hay una caja abierta para cerrar.')
      return
    }

    const counted = Number(actualCashCounted)
    if (Number.isNaN(counted) || counted < 0) {
      setError('Ingresa el efectivo real contado en caja.')
      return
    }

    cashDispatch({
      type: 'close_session',
      payload: {
        sessionId: currentSession.id,
        closedAt: new Date().toISOString(),
        actualCashCounted: counted,
      },
    })
    setActualCashCounted('')
    setError('')
  }

  return (
    <section className="cash-module">
      <div className="cash-module__grid">
        <section className="surface-card cash-panel">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Apertura y cierre</p>
              <h3>Caja diaria</h3>
              <p>
                Controla apertura, efectivo inicial, cierre y diferencia de caja
                comparando contra las ventas registradas.
              </p>
            </div>
          </div>

          {!currentSession ? (
            <div className="cash-form">
              <Field
                label="Monto inicial de apertura"
                type="number"
                min="0"
                step="1"
                value={openingAmount}
                onChange={(event) => setOpeningAmount(event.target.value)}
              />
              <Button onClick={openSession}>Abrir caja</Button>
            </div>
          ) : (
            <div className="cash-form">
              <div className="cash-session-status">
                <span className="report-pill">Caja abierta</span>
                <p>Apertura: {formatDateTime(currentSession.openedAt)}</p>
              </div>

              <Field
                label="Efectivo real contado al cierre"
                type="number"
                min="0"
                step="1"
                value={actualCashCounted}
                onChange={(event) => setActualCashCounted(event.target.value)}
                hint="Ingresa el efectivo que realmente hay en caja."
              />
              <Button onClick={closeSession}>Cerrar caja</Button>
            </div>
          )}

          {error ? <p className="form-error">{error}</p> : null}
        </section>

        <section className="surface-card cash-panel">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Resumen del dia</p>
              <h3>Efectivo esperado</h3>
              <p>
                Consolidado de ventas y medios de pago para la jornada actual de caja.
              </p>
            </div>
          </div>

          <div className="cash-summary">
            <div>
              <span>Total vendido</span>
              <strong>{formatCurrency(summary.totalSold)}</strong>
            </div>
            <div>
              <span>Total por efectivo</span>
              <strong>{formatCurrency(summary.cash)}</strong>
            </div>
            <div>
              <span>Total por debito</span>
              <strong>{formatCurrency(summary.debit)}</strong>
            </div>
            <div>
              <span>Total por credito</span>
              <strong>{formatCurrency(summary.credit)}</strong>
            </div>
            <div>
              <span>Total por transferencia</span>
              <strong>{formatCurrency(summary.transfer)}</strong>
            </div>
            <div>
              <span>Efectivo esperado</span>
              <strong>{formatCurrency(summary.expectedCash)}</strong>
            </div>
            <div>
              <span>Diferencia de caja</span>
              <strong
                className={
                  summary.difference === 0
                    ? 'text-ok'
                    : summary.difference > 0
                      ? 'text-ok'
                      : 'text-alert'
                }
              >
                {formatCurrency(summary.difference)}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <section className="surface-card cash-panel">
        <div className="inventory-section__header">
          <div>
            <p className="section-kicker">Registro de ventas del dia</p>
            <h3>Ventas incluidas en caja</h3>
            <p>
              Detalle de ventas registradas durante la sesion abierta o la ultima sesion cerrada.
            </p>
          </div>
        </div>

        <div className="report-list">
          {relevantSales.length ? (
            relevantSales.map((sale) => (
              <article key={sale.id} className="report-list__item">
                <div>
                  <strong>{sale.documentNumber}</strong>
                  <p>
                    {formatDateTime(sale.createdAt)} - {paymentLabels[sale.paymentMethod]}
                  </p>
                </div>
                <strong>{formatCurrency(sale.grandTotal)}</strong>
              </article>
            ))
          ) : (
            <article className="products-empty">
              <strong>No hay ventas en la caja actual.</strong>
              <p>Cuando registres ventas del dia apareceran aqui.</p>
            </article>
          )}
        </div>
      </section>
    </section>
  )
}
