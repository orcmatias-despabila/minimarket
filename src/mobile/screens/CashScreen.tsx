import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { CashSession } from '../../types/domain'
import { formatCurrency } from '../../lib/format'
import { createId } from '../../lib/ids'
import { cashSessionService } from '../services/cashSessionService'
import { useAuth } from '../state/AuthProvider'
import { useBusiness } from '../state/BusinessProvider'
import { useWorkspace } from '../state/WorkspaceProvider'
import { appFonts, mobileTheme } from '../theme'
import { AccessDeniedState } from '../ui/AccessDeniedState'
import { AppButton } from '../ui/AppButton'
import { AppField } from '../ui/AppField'
import { Card } from '../ui/Card'
import { Screen } from '../ui/Screen'

const todayDate = () => new Date().toISOString().slice(0, 10)

export function CashScreen() {
  const {
    salesState: [salesState],
    cashState: [cashState, cashDispatch],
  } = useBusiness()
  const { user } = useAuth()
  const { business, hasPermission } = useWorkspace()
  const [openingAmount, setOpeningAmount] = useState('')
  const [actualCashCounted, setActualCashCounted] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const currentSession =
    cashState.sessions.find((session) => session.status === 'open') ?? null
  const canOpenCash = hasPermission('cash:open')
  const canCloseCash = hasPermission('cash:close')

  const summary = useMemo(() => {
    const totals = { total: 0, cash: 0, debit: 0, credit: 0, transfer: 0 }
    for (const sale of salesState.items) {
      if (currentSession && sale.createdAt < currentSession.openedAt) continue
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
  }, [actualCashCounted, currentSession, salesState.items])

  const openCash = async () => {
    const amount = Number(openingAmount)
    if (Number.isNaN(amount) || amount < 0) return

    const session: CashSession = {
      id: createId('cash-session'),
      tenantId: business?.id,
      openedByUserId: user?.id,
      businessDate: todayDate(),
      openedAt: new Date().toISOString(),
      openingAmount: amount,
      status: 'open',
    }

    try {
      const persisted = await cashSessionService.openSession({
        session,
        businessId: business?.id,
        actorUserId: user?.id,
      })

      cashDispatch({ type: 'open_session', payload: persisted.session })
      setOpeningAmount('')
      setFeedback('Caja abierta correctamente.')
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'No pudimos abrir la caja ahora.',
      )
    }
  }

  const closeCash = async () => {
    if (!currentSession) return
    const counted = Number(actualCashCounted)
    if (Number.isNaN(counted) || counted < 0) return

    const closedAt = new Date().toISOString()

    try {
      await cashSessionService.closeSession({
        sessionId: currentSession.id,
        businessId: business?.id,
        actorUserId: user?.id,
        closedAt,
        actualCashCounted: counted,
      })

      cashDispatch({
        type: 'close_session',
        payload: {
          sessionId: currentSession.id,
          closedAt,
          actualCashCounted: counted,
        },
      })
      setActualCashCounted('')
      setFeedback('Caja cerrada correctamente.')
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'No pudimos cerrar la caja ahora.',
      )
    }
  }

  return (
    <Screen
      headerTitle="Caja al dia"
      headerSubtitle="Abre, controla y cierra caja con una vista simple."
      title="Caja diaria"
      subtitle="Abre, controla y cierra caja desde el movil."
    >
      {!canOpenCash && !canCloseCash ? (
        <AccessDeniedState message="Tu rol actual no tiene acceso a la caja diaria." />
      ) : (
        <>
      <Card>
        <Text style={styles.title}>{currentSession ? 'Caja abierta' : 'Abrir caja'}</Text>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        {!currentSession ? (
          <>
            <AppField
              label="Monto inicial"
              value={openingAmount}
              onChangeText={setOpeningAmount}
              keyboardType="numeric"
            />
            <AppButton
              label="Abrir caja"
              onPress={() => {
                void openCash()
              }}
              disabled={!canOpenCash}
            />
          </>
        ) : (
          <>
            <Text style={styles.meta}>
              Monto inicial: {formatCurrency(currentSession.openingAmount)}
            </Text>
            <AppField
              label="Efectivo real al cierre"
              value={actualCashCounted}
              onChangeText={setActualCashCounted}
              keyboardType="numeric"
            />
            <AppButton
              label="Cerrar caja"
              onPress={() => {
                void closeCash()
              }}
              disabled={!canCloseCash}
            />
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.title}>Resumen</Text>
        <SummaryRow label="Total vendido" value={formatCurrency(summary.total)} />
        <SummaryRow label="Efectivo" value={formatCurrency(summary.cash)} />
        <SummaryRow label="Debito" value={formatCurrency(summary.debit)} />
        <SummaryRow label="Credito" value={formatCurrency(summary.credit)} />
        <SummaryRow label="Transferencia" value={formatCurrency(summary.transfer)} />
        <SummaryRow label="Efectivo esperado" value={formatCurrency(summary.expected)} />
        <SummaryRow label="Diferencia" value={formatCurrency(summary.difference)} />
      </Card>
        </>
      )}
    </Screen>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    color: mobileTheme.colors.text,
    ...appFonts.bold,
  },
  meta: {
    color: mobileTheme.colors.muted,
    ...appFonts.regular,
  },
  feedback: {
    color: mobileTheme.colors.primaryDark,
    ...appFonts.semibold,
  },
  value: {
    color: mobileTheme.colors.text,
    ...appFonts.bold,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: mobileTheme.spacing.md,
  },
})
