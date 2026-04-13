import { StyleSheet, Text, View } from 'react-native'
import { formatCurrency, formatQuantity } from '../../lib/format'
import { useBusiness } from '../state/BusinessProvider'
import { useAuditLogs } from '../state/AuditLogProvider'
import { useWorkspace } from '../state/WorkspaceProvider'
import { appFonts, mobileTheme } from '../theme'
import { AccessDeniedState } from '../ui/AccessDeniedState'
import { Card } from '../ui/Card'
import { Screen } from '../ui/Screen'

export function ReportsScreen() {
  const {
    productsState: [productsState],
    salesState: [salesState],
    reportsState: [reportsState],
  } = useBusiness()
  const { auditLogs } = useAuditLogs()
  const { hasPermission } = useWorkspace()
  const canReadReports = hasPermission('reports:read')

  const salesToday = salesState.items.reduce((sum, sale) => sum + sale.grandTotal, 0)
  const profitToday = salesState.items.reduce(
    (sum, sale) =>
      sum +
      sale.items.reduce(
        (acc, item) => acc + (item.unitPrice - item.costPrice) * item.quantity,
        0,
      ),
    0,
  )
  const waste = reportsState.items.reduce(
    (sum, item) => sum + item.wasteQuantity * item.costPrice,
    0,
  )
  const lowStock = productsState.items.filter(
    (product) => product.currentStock <= product.minStock,
  )

  if (!canReadReports) {
    return (
      <Screen
        headerTitle="Resumen del negocio"
        headerSubtitle="Ventas, utilidad y alertas en una vista compacta y clara."
        title="Reportes"
        subtitle="Resumen rapido del negocio para revisar desde celular o tablet."
      >
        <AccessDeniedState message="Tu rol actual no puede ver reportes del negocio." />
      </Screen>
    )
  }

  return (
    <Screen
      headerTitle="Resumen del negocio"
      headerSubtitle="Ventas, utilidad y alertas en una vista compacta y clara."
      title="Reportes"
      subtitle="Resumen rapido del negocio para revisar desde celular o tablet."
    >
      <Card>
        <Text style={styles.title}>Resumen del dia</Text>
        <Metric label="Ventas" value={formatCurrency(salesToday)} />
        <Metric label="Utilidad estimada" value={formatCurrency(profitToday - waste)} />
        <Metric label="Merma acumulada" value={formatCurrency(waste)} />
      </Card>

      <Card>
        <Text style={styles.title}>Stock bajo</Text>
        {lowStock.length ? (
          lowStock.map((product) => (
            <View key={product.id} style={styles.row}>
              <Text style={styles.itemTitle}>{product.name}</Text>
              <Text style={styles.meta}>
                {formatQuantity(product.currentStock, product.unitMeasure)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>No hay productos en nivel critico.</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.title}>Control especial por peso</Text>
        {reportsState.items.map((item) => (
          <View key={item.id} style={styles.row}>
            <View>
              <Text style={styles.itemTitle}>{item.productName}</Text>
              <Text style={styles.meta}>{item.controlDate}</Text>
            </View>
            <Text style={styles.value}>
              {formatCurrency(item.soldQuantity * item.salePrice)}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.title}>Actividad reciente</Text>
        {auditLogs.length ? (
          auditLogs.slice(0, 8).map((log) => (
            <View key={log.id} style={styles.auditRow}>
              <View style={styles.auditInfo}>
                <Text style={styles.itemTitle}>{log.summary}</Text>
                <Text style={styles.meta}>
                  {(log.actorVisibleCode || log.actorRole || 'Usuario') + ' - ' + new Date(log.createdAt).toLocaleString('es-CL')}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>Todavia no hay actividad registrada.</Text>
        )}
      </Card>
    </Screen>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: mobileTheme.spacing.md,
  },
  itemTitle: {
    color: mobileTheme.colors.text,
    ...appFonts.semibold,
  },
  meta: {
    color: mobileTheme.colors.muted,
    ...appFonts.regular,
  },
  value: {
    color: mobileTheme.colors.text,
    ...appFonts.bold,
  },
  auditRow: {
    paddingVertical: mobileTheme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border,
  },
  auditInfo: {
    gap: 2,
  },
})
