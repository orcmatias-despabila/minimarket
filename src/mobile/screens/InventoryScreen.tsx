import { useMemo, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { StyleSheet, Text, View } from 'react-native'
import { formatCurrency, formatQuantity } from '../../lib/format'
import { useBusiness } from '../state/BusinessProvider'
import { useWorkspace } from '../state/WorkspaceProvider'
import { appFonts, mobileTheme } from '../theme'
import { AppButton } from '../ui/AppButton'
import { AppField } from '../ui/AppField'
import { AccessDeniedState } from '../ui/AccessDeniedState'
import { Card } from '../ui/Card'
import { Screen } from '../ui/Screen'

export function InventoryScreen() {
  const navigation = useNavigation()
  const {
    productsState: [productsState],
    inventoryState: [inventoryState],
    isHydrating,
    syncError,
    setProductIngressRequest,
  } = useBusiness()
  const { hasPermission } = useWorkspace()

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todos')

  const categories = useMemo(
    () => ['Todos', ...new Set(productsState.items.map((product) => product.category))],
    [productsState.items],
  )

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()

    return productsState.items.filter((product) => {
      const matchesCategory =
        activeCategory === 'Todos' || product.category === activeCategory
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.brand?.toLowerCase().includes(term) ||
        product.barcode?.includes(term)

      return matchesCategory && matchesSearch
    })
  }, [activeCategory, productsState.items, search])

  const lowStock = productsState.items.filter(
    (product) => product.currentStock <= product.minStock,
  )
  const canReadInventory = hasPermission('inventory:read')
  const canEditInventory = hasPermission('inventory:write') || hasPermission('products:write')

  if (!canReadInventory) {
    return (
      <Screen
        title="Inventario"
        subtitle="Buscador, filtros, catalogo y acceso directo para editar o sumar stock."
      >
        <AccessDeniedState message="Tu rol actual no tiene acceso al inventario del negocio." />
      </Screen>
    )
  }

  return (
    <Screen
      title="Inventario"
      subtitle="Buscador, filtros, catalogo y acceso directo para editar o sumar stock."
    >
      <Card>
        {isHydrating ? <Text style={styles.infoText}>Sincronizando inventario...</Text> : null}
        {syncError ? <Text style={styles.errorText}>{syncError}</Text> : null}
        <View style={styles.summaryRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Productos</Text>
            <Text style={styles.metricValue}>{productsState.items.length}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Stock bajo</Text>
            <Text style={styles.metricValue}>{lowStock.length}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Movimientos</Text>
            <Text style={styles.metricValue}>{inventoryState.movements.length}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Buscar producto</Text>
        <AppField
          label="Buscador"
          value={search}
          onChangeText={setSearch}
          placeholder="Nombre, marca, categoria o codigo"
          icon="magnify"
        />

        <View style={styles.filters}>
          {categories.map((category) => {
            const isActive = activeCategory === category
            return (
              <Text
                key={category}
                onPress={() => setActiveCategory(category)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                {category}
              </Text>
            )
          })}
        </View>
      </Card>

      <Card>
        <View style={styles.catalogHeader}>
          <Text style={styles.sectionTitle}>Catalogo</Text>
          <Text style={styles.catalogMeta}>{filteredProducts.length} resultados</Text>
        </View>

        {filteredProducts.length ? (
          filteredProducts.map((product) => (
            <View key={product.id} style={styles.productRow}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productMeta}>
                  {product.brand ? `${product.brand} · ` : ''}
                  {product.formatContent ? `${product.formatContent} · ` : ''}
                  {product.category}
                </Text>
                <Text style={styles.productPrice}>{formatCurrency(product.salePrice)}</Text>
                <Text style={styles.productStock}>
                  Stock {formatQuantity(product.currentStock, product.unitMeasure)}
                </Text>
              </View>

              <AppButton
                label="Editar"
                variant="secondary"
                icon="square-edit-outline"
                disabled={!canEditInventory}
                onPress={() => {
                  if (!canEditInventory) return
                  setProductIngressRequest({ productId: product.id })
                  navigation.navigate('Products' as never)
                }}
              />
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No hay productos que coincidan con esos filtros.</Text>
        )}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: mobileTheme.spacing.sm,
  },
  metric: {
    flex: 1,
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: mobileTheme.radius.md,
    padding: mobileTheme.spacing.md,
    gap: mobileTheme.spacing.xxs,
  },
  metricLabel: {
    color: mobileTheme.colors.muted,
    ...appFonts.regular,
  },
  metricValue: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.fontSizes.xl,
    ...appFonts.bold,
  },
  sectionTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.fontSizes.lg,
    ...appFonts.bold,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: mobileTheme.radius.full,
    backgroundColor: mobileTheme.colors.surface,
    color: mobileTheme.colors.text,
    ...appFonts.semibold,
  },
  filterChipActive: {
    backgroundColor: mobileTheme.colors.primary,
    color: mobileTheme.colors.white,
  },
  catalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: mobileTheme.spacing.md,
  },
  catalogMeta: {
    color: mobileTheme.colors.muted,
    ...appFonts.regular,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    color: mobileTheme.colors.text,
    ...appFonts.semibold,
  },
  productMeta: {
    color: mobileTheme.colors.muted,
    ...appFonts.regular,
  },
  productPrice: {
    color: mobileTheme.colors.text,
    ...appFonts.bold,
  },
  productStock: {
    color: mobileTheme.colors.primaryDark,
    ...appFonts.semibold,
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
