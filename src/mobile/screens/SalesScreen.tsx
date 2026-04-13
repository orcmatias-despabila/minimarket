import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useCameraPermissions } from 'expo-camera'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { createInventoryMovement } from '../../modules/inventory/state/movementFactory'
import {
  buildSale,
  getCartSubtotal,
  type PosCartItem,
} from '../../modules/sales/state/saleHelpers'
import { formatCurrency, formatQuantity } from '../../lib/format'
import type { Product, Sale } from '../../types/domain'
import { inventoryMovementService } from '../services/inventoryMovementService'
import { salesService } from '../services/salesService'
import { useAuth } from '../state/AuthProvider'
import { useBusiness } from '../state/BusinessProvider'
import { useAuditLogs } from '../state/AuditLogProvider'
import { useWorkspace } from '../state/WorkspaceProvider'
import { appFonts, mobileTheme } from '../theme'
import { AccessDeniedState } from '../ui/AccessDeniedState'
import { AppButton } from '../ui/AppButton'
import { AppField } from '../ui/AppField'
import { BarcodeScanner } from '../ui/BarcodeScanner'
import { Card } from '../ui/Card'
import { Screen } from '../ui/Screen'

const isWeightProduct = (product: Product) => product.type === 'manual_weight'

const getDefaultAmount = (product: Product) => {
  if (product.type === 'manual_weight') {
    if (product.unitMeasure === 'kg') return '0.5'
    if (product.unitMeasure === 'g') return '250'
    if (product.unitMeasure === 'l') return '1'
  }

  return '1'
}

const paymentOptions: Array<{
  label: string
  value: Sale['paymentMethod']
  icon: keyof typeof MaterialCommunityIcons.glyphMap
}> = [
  { label: 'Efectivo', value: 'cash', icon: 'cash' },
  { label: 'Tarjeta', value: 'debit', icon: 'credit-card-outline' },
  { label: 'Credito', value: 'credit', icon: 'card-account-details-outline' },
  { label: 'Transfer', value: 'transfer', icon: 'transfer-right' },
]

export function SalesScreen() {
  const navigation = useNavigation()
  const {
    productsState: [productsState, productsDispatch],
    inventoryState: [, inventoryDispatch],
    salesState: [salesState, salesDispatch],
    isHydrating,
    syncError,
    setProductIngressRequest,
  } = useBusiness()
  const { user } = useAuth()
  const { business, hasPermission } = useWorkspace()
  const { logAction } = useAuditLogs()

  const [permission, requestPermission] = useCameraPermissions()
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [cartItems, setCartItems] = useState<PosCartItem[]>([])
  const [paymentMethod, setPaymentMethod] =
    useState<Sale['paymentMethod']>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [searchAmounts, setSearchAmounts] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<string | null>(null)

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return []

    return productsState.items.filter((product) =>
      product.name.toLowerCase().includes(term),
    )
  }, [productsState.items, search])

  const subtotal = getCartSubtotal(cartItems)
  const cashAmount = Number(cashReceived || 0)
  const changeAmount =
    paymentMethod === 'cash' ? Math.max(cashAmount - subtotal, 0) : 0
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const canCreateSales = hasPermission('sales:create')
  const canManageProducts = hasPermission('products:write')

  if (!canCreateSales) {
    return (
      <Screen
        headerTitle="Tu punto de venta listo"
        headerSubtitle="Escanea, cobra y controla ventas con una interfaz rapida y profesional."
        title="Venta"
        subtitle="Diseno POS minimalista para cobrar en pocos toques."
      >
        <AccessDeniedState message="Tu rol actual no puede registrar ventas ni pagos." />
      </Screen>
    )
  }

  const updateFeedback = (message: string) => setFeedback(message)

  const addProductToCart = (product: Product, requestedQuantity: number) => {
    if (!canCreateSales) {
      updateFeedback('Tu rol actual no puede registrar ventas.')
      return
    }

    if (!requestedQuantity || Number.isNaN(requestedQuantity) || requestedQuantity <= 0) {
      updateFeedback('Ingresa una cantidad o peso valido.')
      return
    }

    setCartItems((current) => {
      const existing = current.find((item) => item.productId === product.id)
      const nextQuantity = (existing?.quantity ?? 0) + requestedQuantity

      if (nextQuantity > product.currentStock) {
        updateFeedback('La cantidad supera el stock disponible.')
        return current
      }

      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: nextQuantity, stockAvailable: product.currentStock }
            : item,
        )
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          productType: product.type,
          unitMeasure: product.unitMeasure,
          quantity: requestedQuantity,
          unitPrice: product.salePrice,
          costPrice: product.costPrice,
          barcode: product.barcode,
          stockAvailable: product.currentStock,
        },
      ]
    })

    updateFeedback(`${product.name} agregado a la venta.`)
  }

  const toggleScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission()
      if (!result.granted) {
        updateFeedback('Debes permitir la camara para escanear.')
        return
      }
    }

    setIsScannerOpen((current) => !current)
  }

  const handleBarcodeScanned = (data: string) => {
    const product = productsState.items.find((item) => item.barcode === data)

    if (!product) {
      if (!canManageProducts) {
        updateFeedback(`Codigo ${data} no existe y tu rol no puede crear productos.`)
        return
      }

      setProductIngressRequest({ barcode: data })
      updateFeedback(`Codigo ${data} no existe. Ve a Ingresar para crearlo.`)
      navigation.navigate('Products' as never)
      return
    }

    addProductToCart(product, 1)
  }

  const confirmSale = async () => {
    if (!cartItems.length) {
      updateFeedback('Agrega productos antes de confirmar la venta.')
      return
    }

    if (paymentMethod === 'cash' && cashAmount < subtotal) {
      updateFeedback('El monto recibido no alcanza para cubrir la venta.')
      return
    }

    const sale = buildSale({
      items: cartItems,
      paymentMethod,
      receivedAmount: paymentMethod === 'cash' ? cashAmount : subtotal,
      businessId: business?.id,
      createdByUserId: user?.id,
    })

    const persistedSale = await salesService.recordSale({
      sale,
      businessId: business?.id,
      actorUserId: user?.id,
    })

    const finalizedSale = persistedSale.sale
    salesDispatch({ type: 'record_sale', payload: finalizedSale })

    await logAction({
      entityName: 'sale',
      entityId: finalizedSale.id,
      entityLabel: finalizedSale.documentNumber,
      action: 'create',
      actionType: 'sale_completed',
      summary: `Registro la venta ${finalizedSale.documentNumber} por ${formatCurrency(finalizedSale.grandTotal)}.`,
      createdAt: finalizedSale.createdAt,
    })

    const inventoryResults = await Promise.allSettled(
      cartItems.map(async (item) => {
        const product = productsState.items.find((entry) => entry.id === item.productId)
        if (!product) return

        const movement = createInventoryMovement({
          product,
          type: 'sale_output',
          quantity: item.quantity * -1,
          reason: `Salida automatica por venta ${finalizedSale.documentNumber}`,
          createdAt: finalizedSale.createdAt,
          businessId: business?.id,
          createdByUserId: user?.id,
          associatedCost: item.costPrice,
        })

        await inventoryMovementService.record({
          movement,
          businessId: business?.id,
          actorUserId: user?.id,
        })

        inventoryDispatch({ type: 'record_movement', payload: movement })
        productsDispatch({ type: 'apply_inventory_movement', payload: movement })
      }),
    )

    await Promise.all(
      cartItems.map(async (item) => {
        await logAction({
          entityName: 'inventory_movement',
          entityId: item.productId,
          entityLabel: item.name,
          action: 'update',
          actionType: 'inventory_adjusted',
          summary: `Descuento ${item.quantity} por venta en ${item.name}.`,
          createdAt: finalizedSale.createdAt,
        })
      }),
    )

    setCartItems([])
    setCashReceived('')
    setPaymentMethod('cash')
    setIsScannerOpen(false)
    const hasInventorySyncErrors = inventoryResults.some(
      (result) => result.status === 'rejected',
    )
    updateFeedback(
      hasInventorySyncErrors
        ? `Venta ${finalizedSale.documentNumber} registrada. El stock local se actualizo, pero hubo movimientos que no se pudieron sincronizar.`
        : `Venta ${finalizedSale.documentNumber} registrada con exito.`,
    )
  }

  return (
    <Screen
      headerTitle="Tu punto de venta listo"
      headerSubtitle="Escanea, cobra y controla ventas con una interfaz rapida y profesional."
      title="Venta"
      subtitle="Diseno POS minimalista para cobrar en pocos toques."
    >
      <Card>
        {isHydrating ? <Text style={styles.infoText}>Sincronizando productos y ventas...</Text> : null}
        {syncError ? <Text style={styles.errorText}>{syncError}</Text> : null}
        <View style={styles.heroTopRow}>
          <View style={styles.heroMetric}>
            <Text style={styles.heroLabel}>Productos</Text>
            <Text style={styles.heroValue}>{formatCount(totalItems)}</Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.heroLabel}>Ticket actual</Text>
            <Text style={styles.heroValue}>{formatCurrency(subtotal)}</Text>
          </View>
        </View>

        <View style={styles.totalBanner}>
          <Text style={styles.totalBannerLabel}>Total a pagar</Text>
          <Text style={styles.totalBannerValue}>{formatCurrency(subtotal)}</Text>
        </View>

        <AppButton
          label={isScannerOpen ? 'Ocultar escaner' : 'Escanear producto'}
          onPress={toggleScanner}
          icon="barcode-scan"
          disabled={!canCreateSales}
        />

        {isScannerOpen ? (
          <View style={styles.cameraFrame}>
            <BarcodeScanner onDetected={handleBarcodeScanned} height={240} />
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Busqueda rapida</Text>

        <AppField
          label="Buscar producto"
          value={search}
          onChangeText={setSearch}
          placeholder="Escanear o escribir producto"
          icon="magnify"
        />

        {feedback ? (
          <View style={styles.feedbackPill}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={16}
              color={mobileTheme.colors.primaryDark}
            />
            <Text style={styles.feedback}>{feedback}</Text>
          </View>
        ) : null}
        <View style={styles.productList}>
          {search.trim().length === 0 ? null : filteredProducts.length ? (
            filteredProducts.slice(0, 12).map((product) => {
              const amountValue = searchAmounts[product.id] ?? getDefaultAmount(product)
              const quantity = Number(amountValue || 0)

              return (
                <View key={product.id} style={styles.productRow}>
                  <View style={styles.productIdentity}>
                    <View style={styles.productThumb}>
                      <Text style={styles.productThumbLabel}>
                        {product.name
                          .split(' ')
                          .slice(0, 2)
                          .map((piece) => piece[0])
                          .join('')}
                      </Text>
                    </View>

                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productMeta}>{product.category}</Text>
                      <Text style={styles.productPrice}>{formatCurrency(product.salePrice)}</Text>
                    </View>
                  </View>

                  <View style={styles.amountBox}>
                    <AppField
                      label={isWeightProduct(product) ? 'Peso' : 'Cantidad'}
                      value={amountValue}
                      onChangeText={(value) =>
                        setSearchAmounts((current) => ({
                          ...current,
                          [product.id]: value,
                        }))
                      }
                      keyboardType="numeric"
                    />

                    <View style={styles.stockRow}>
                      <Text style={styles.stockText}>
                        Stock {formatQuantity(product.currentStock, product.unitMeasure)}
                      </Text>
                      <Text style={styles.amountPrice}>
                        {formatCurrency(quantity * product.salePrice)}
                      </Text>
                    </View>

                    <AppButton
                      label="Agregar"
                      onPress={() => addProductToCart(product, quantity)}
                      disabled={product.currentStock <= 0}
                      icon="plus"
                    />
                  </View>
                </View>
              )
            })
          ) : (
            <Text style={styles.emptyText}>No encontramos productos con ese nombre.</Text>
          )}
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Carrito</Text>
          <Text style={styles.sectionMeta}>{cartItems.length} productos</Text>
        </View>

        {cartItems.length ? (
          cartItems.map((item) => (
            <View key={item.productId} style={styles.cartRow}>
              <View style={styles.productIdentity}>
                <View style={[styles.productThumb, styles.cartThumb]}>
                  <MaterialCommunityIcons
                    name="shopping-outline"
                    size={18}
                    color={mobileTheme.colors.primaryDark}
                  />
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productMeta}>
                    {formatQuantity(item.quantity, item.unitMeasure)}
                  </Text>
                  <Text style={styles.productPrice}>
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </Text>
                </View>
              </View>

              <View style={styles.cartActions}>
                <AppField
                  label={item.productType === 'manual_weight' ? 'Peso' : 'Cant.'}
                  value={String(item.quantity)}
                  onChangeText={(value) => {
                    const quantity = Number(value)
                    if (Number.isNaN(quantity)) return

                    if (quantity <= 0) {
                      setCartItems((current) =>
                        current.filter((entry) => entry.productId !== item.productId),
                      )
                      return
                    }

                    setCartItems((current) =>
                      current.map((entry) =>
                        entry.productId === item.productId
                          ? { ...entry, quantity }
                          : entry,
                      ),
                    )
                  }}
                  keyboardType="numeric"
                />
                <AppButton
                  label="Quitar"
                  variant="danger"
                  icon="trash-can-outline"
                  onPress={() =>
                    setCartItems((current) =>
                      current.filter((entry) => entry.productId !== item.productId),
                    )
                  }
                />
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Todavia no agregas productos a esta venta.</Text>
        )}

        <View style={styles.summaryPanel}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>

          {paymentMethod === 'cash' ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Vuelto</Text>
              <Text style={[styles.summaryValue, styles.successValue]}>
                {formatCurrency(changeAmount)}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Metodo de pago</Text>

        <View style={styles.paymentGrid}>
          {paymentOptions.map((option) => {
            const isActive = paymentMethod === option.value

            return (
              <Pressable
                key={option.value}
                onPress={() => setPaymentMethod(option.value)}
                style={[styles.paymentOption, isActive && styles.paymentOptionActive]}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={18}
                  color={isActive ? mobileTheme.colors.white : mobileTheme.colors.primaryDark}
                />
                <Text
                  style={[
                    styles.paymentLabel,
                    isActive ? styles.paymentLabelActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {paymentMethod === 'cash' ? (
          <AppField
            label="Monto recibido"
            value={cashReceived}
            onChangeText={setCashReceived}
            keyboardType="numeric"
            icon="cash"
          />
        ) : null}

        <AppButton
          label="Confirmar venta"
          onPress={() => {
            void confirmSale()
          }}
          icon="check-bold"
          disabled={!canCreateSales}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Ultimas ventas</Text>

        {salesState.items.length ? (
          salesState.items.slice(0, 5).map((sale) => (
            <View key={sale.id} style={styles.historyRow}>
              <View>
                <Text style={styles.productName}>{sale.documentNumber}</Text>
                <Text style={styles.productMeta}>
                  {sale.items.length} productos - {sale.paymentMethod}
                </Text>
              </View>
              <Text style={styles.summaryValue}>{formatCurrency(sale.grandTotal)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aun no hay ventas registradas.</Text>
        )}
      </Card>
    </Screen>
  )
}

const formatCount = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value)

const styles = StyleSheet.create({
  heroTopRow: {
    flexDirection: 'row',
    gap: mobileTheme.spacing.sm,
  },
  heroMetric: {
    flex: 1,
    backgroundColor: mobileTheme.colors.white,
    borderRadius: mobileTheme.radius.md,
    padding: mobileTheme.spacing.md,
    gap: mobileTheme.spacing.xxs,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  heroLabel: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.fontSizes.sm,
    ...appFonts.regular,
  },
  heroValue: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.fontSizes.lg,
    ...appFonts.bold,
  },
  totalBanner: {
    backgroundColor: '#F0FDF4',
    borderRadius: mobileTheme.radius.md,
    padding: mobileTheme.spacing.lg,
    gap: mobileTheme.spacing.xs,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  totalBannerLabel: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.fontSizes.md,
    ...appFonts.semibold,
  },
  totalBannerValue: {
    color: mobileTheme.colors.black,
    fontSize: mobileTheme.fontSizes.xxl,
    ...appFonts.bold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: mobileTheme.spacing.md,
  },
  sectionTitle: {
    fontSize: mobileTheme.fontSizes.lg,
    color: mobileTheme.colors.text,
    ...appFonts.bold,
  },
  sectionMeta: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.fontSizes.sm,
    ...appFonts.regular,
  },
  cameraFrame: {
    height: 240,
    borderRadius: mobileTheme.radius.lg,
    overflow: 'hidden',
    backgroundColor: mobileTheme.colors.dark,
  },
  feedbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileTheme.spacing.xs,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: mobileTheme.radius.full,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  feedback: {
    color: mobileTheme.colors.text,
    ...appFonts.semibold,
  },
  productList: {
    gap: mobileTheme.spacing.sm,
  },
  productRow: {
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.white,
    padding: mobileTheme.spacing.sm,
    gap: mobileTheme.spacing.sm,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  productIdentity: {
    flexDirection: 'row',
    gap: mobileTheme.spacing.sm,
  },
  productThumb: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: mobileTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartThumb: {
    backgroundColor: mobileTheme.colors.primarySoft,
  },
  productThumbLabel: {
    color: mobileTheme.colors.primaryDark,
    fontSize: mobileTheme.fontSizes.md,
    ...appFonts.bold,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontSize: mobileTheme.fontSizes.md,
    color: mobileTheme.colors.text,
    ...appFonts.semibold,
  },
  productMeta: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.fontSizes.sm,
    ...appFonts.regular,
  },
  productPrice: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.fontSizes.md,
    ...appFonts.bold,
  },
  amountBox: {
    gap: mobileTheme.spacing.sm,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: mobileTheme.spacing.md,
  },
  stockText: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.fontSizes.sm,
    ...appFonts.regular,
  },
  amountPrice: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.fontSizes.md,
    ...appFonts.bold,
  },
  cartRow: {
    flexDirection: 'row',
    gap: mobileTheme.spacing.md,
    paddingBottom: mobileTheme.spacing.sm,
  },
  cartActions: {
    width: 120,
    gap: mobileTheme.spacing.sm,
  },
  summaryPanel: {
    backgroundColor: mobileTheme.colors.white,
    borderRadius: mobileTheme.radius.md,
    padding: mobileTheme.spacing.md,
    gap: mobileTheme.spacing.sm,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: mobileTheme.fontSizes.md,
    color: mobileTheme.colors.text,
    ...appFonts.semibold,
  },
  summaryValue: {
    fontSize: mobileTheme.fontSizes.lg,
    color: mobileTheme.colors.text,
    ...appFonts.bold,
  },
  successValue: {
    color: mobileTheme.colors.success,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing.sm,
  },
  paymentOption: {
    minWidth: 132,
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileTheme.spacing.xs,
    backgroundColor: mobileTheme.colors.white,
    borderRadius: mobileTheme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  paymentOptionActive: {
    backgroundColor: mobileTheme.colors.primary,
    borderColor: mobileTheme.colors.primary,
  },
  paymentLabel: {
    color: mobileTheme.colors.text,
    ...appFonts.semibold,
  },
  paymentLabelActive: {
    color: mobileTheme.colors.white,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: mobileTheme.spacing.md,
    paddingBottom: mobileTheme.spacing.sm,
  },
  emptyText: {
    color: mobileTheme.colors.muted,
    ...appFonts.regular,
  },
  infoText: {
    color: mobileTheme.colors.primaryDark,
    ...appFonts.semibold,
  },
  errorText: {
    color: mobileTheme.colors.danger,
    ...appFonts.semibold,
  },
})
