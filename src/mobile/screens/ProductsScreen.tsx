import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image, StyleSheet, Text, TextInput, View } from 'react-native'
import { createInventoryMovement } from '../../modules/inventory/state/movementFactory'
import {
  emptyProductForm,
  toProductFormValues,
  type ProductFormValues,
} from '../../modules/products/state/productsReducer'
import { formatCurrency } from '../../lib/format'
import type { Product } from '../../types/domain'
import type { GlobalProductLookupResult } from '../../services/openFoodFacts'
import { inventoryMovementService } from '../services/inventoryMovementService'
import { useAuth } from '../state/AuthProvider'
import { useBusiness } from '../state/BusinessProvider'
import { useAuditLogs } from '../state/AuditLogProvider'
import { useWorkspace } from '../state/WorkspaceProvider'
import {
  resolveProductByBarcode,
  type ResolvedBarcodeLookupResult,
} from '../services/productBarcodeResolver'
import { productCatalogService } from '../services/productCatalogService'
import { appFonts, mobileTheme } from '../theme'
import { AccessDeniedState } from '../ui/AccessDeniedState'
import { AppButton } from '../ui/AppButton'
import { AppField } from '../ui/AppField'
import { BarcodeLookupPanel } from '../ui/BarcodeLookupPanel'
import { Card } from '../ui/Card'
import { Screen } from '../ui/Screen'

const parseNumber = (value: string) => Number(value.replace(',', '.'))

type FieldErrors = Partial<
  Record<'barcode' | 'name' | 'category' | 'costPrice' | 'salePrice' | 'currentStock', string>
>
type LookupStatus = 'idle' | 'loading' | 'success' | 'error'
type SubmitStatus = 'idle' | 'success' | 'error'

export function ProductsScreen() {
  const {
    productsState: [productsState, productsDispatch],
    inventoryState: [, inventoryDispatch],
    productIngressRequest,
    setProductIngressRequest,
  } = useBusiness()
  const { user } = useAuth()
  const { business, hasPermission } = useWorkspace()
  const { logAction } = useAuditLogs()

  const [form, setForm] = useState<ProductFormValues>(emptyProductForm)
  const [activeProductId, setActiveProductId] = useState<string | null>(null)
  const [lookupCode, setLookupCode] = useState('')
  const [stockToAdd, setStockToAdd] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [lookupMessage, setLookupMessage] = useState<string | null>(null)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
  const [isLookupLoading, setIsLookupLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle')
  const [globalImageUrl, setGlobalImageUrl] = useState('')
  const canManageProducts = hasPermission('products:write')
  const canManageInventory = hasPermission('inventory:write')

  const barcodeLookupFieldRef = useRef<TextInput>(null)
  const nameFieldRef = useRef<TextInput>(null)
  const costPriceFieldRef = useRef<TextInput>(null)
  const salePriceFieldRef = useRef<TextInput>(null)
  const stockFieldRef = useRef<TextInput>(null)
  const stockToAddFieldRef = useRef<TextInput>(null)

  const focusNextField = useCallback((ref: { current: TextInput | null }) => {
    requestAnimationFrame(() => {
      ref.current?.focus()
    })
  }, [])

  const activeProduct = useMemo(
    () =>
      productsState.items.find(
        (product) =>
          product.id === activeProductId ||
          (product.barcode && product.barcode === form.barcode.trim()),
      ) ?? null,
    [activeProductId, form.barcode, productsState.items],
  )

  const syncProductIntoStore = useCallback(
    (product: Product) => {
      const existing = productsState.items.find(
        (item) =>
          item.id === product.id ||
          (item.barcode && product.barcode && item.barcode === product.barcode),
      )

      if (existing) {
        productsDispatch({
          type: 'update',
          payload: {
            ...product,
            id: existing.id,
          },
        })
        setActiveProductId(existing.id)
        return existing.id
      }

      productsDispatch({ type: 'create', payload: product })
      setActiveProductId(product.id)
      return product.id
    },
    [productsDispatch, productsState.items],
  )

  const applyProductToForm = useCallback((product: Product) => {
    setForm(toProductFormValues(product))
    setLookupCode(product.barcode ?? '')
    setActiveProductId(product.id)
    setGlobalImageUrl(product.imageUrl ?? '')
  }, [])

  const resetMessages = useCallback(() => {
    setFieldErrors({})
    setLookupMessage(null)
    setSubmitMessage(null)
    setSubmitStatus('idle')
    setLookupStatus('idle')
  }, [])

  const focusBarcodeInput = useCallback(() => {
    focusNextField(barcodeLookupFieldRef)
  }, [focusNextField])

  const clearForm = useCallback(() => {
    setForm(emptyProductForm())
    setActiveProductId(null)
    setLookupCode('')
    setStockToAdd('')
    setFieldErrors({})
    setLookupMessage(null)
    setLookupStatus('idle')
    setGlobalImageUrl('')
    setIsLookupLoading(false)
    setIsSaving(false)
  }, [])

  const applyResolvedProduct = useCallback(
    (result: ResolvedBarcodeLookupResult, fallbackBarcode: string) => {
      if (result.source === 'local' && result.product) {
        const localProduct = result.product as Product
        const syncedId = syncProductIntoStore(localProduct)
        applyProductToForm({ ...localProduct, id: syncedId })
        setLookupStatus('success')
        setLookupMessage(
          'Producto encontrado. Puedes actualizar los datos o agregar mas stock.',
        )
        setStockToAdd('')
        focusNextField(stockToAddFieldRef)
        return
      }

      if (result.source === 'global' && result.product) {
        const globalProduct = result.product as GlobalProductLookupResult
        setActiveProductId(null)
        setForm({
          ...emptyProductForm(),
          barcode: globalProduct.barcode,
          name: globalProduct.name,
          brand: globalProduct.brand,
          formatContent: globalProduct.quantity,
          category:
            globalProduct.categories
              .split(',')
              .map((item) => item.trim())
              .find(Boolean) ?? '',
          type: 'barcode',
          unitMeasure: 'unit',
        })
        setLookupCode(globalProduct.barcode)
        setGlobalImageUrl(globalProduct.imageUrl)
        setLookupStatus('success')
        setLookupMessage(
          'Producto encontrado en base global. Completa precios y stock para guardarlo.',
        )
        focusNextField(costPriceFieldRef)
        return
      }

      setActiveProductId(null)
      setGlobalImageUrl('')
      setForm({
        ...emptyProductForm(),
        barcode: fallbackBarcode,
        type: 'barcode',
        unitMeasure: 'unit',
      })
      setLookupCode(fallbackBarcode)
      setLookupStatus('success')
      setLookupMessage(
        'Codigo no registrado. Completa la ficha para crear el producto.',
      )
      focusNextField(nameFieldRef)
    },
    [applyProductToForm, focusNextField, syncProductIntoStore],
  )

  const handleLookup = useCallback(
    async (barcode: string) => {
      const normalized = barcode.trim()
      resetMessages()

      if (!normalized) {
        setFieldErrors({ barcode: 'Ingresa o escanea un codigo primero.' })
        setLookupStatus('error')
        return
      }

      setIsLookupLoading(true)
      setLookupStatus('loading')

      try {
        const result = await resolveProductByBarcode(
          normalized,
          productsState.items,
          business?.id,
        )
        applyResolvedProduct(result, normalized)
      } catch (error) {
        setLookupStatus('error')
        setGlobalImageUrl('')
        setLookupMessage(
          error instanceof Error
            ? error.message
            : 'No pudimos consultar el codigo ahora.',
        )
      } finally {
        setIsLookupLoading(false)
      }
    },
    [applyResolvedProduct, business?.id, productsState.items, resetMessages],
  )

  useEffect(() => {
    if (!productIngressRequest) return

    if (productIngressRequest.productId) {
      setProductIngressRequest(null)
      const product = productsState.items.find(
        (item) => item.id === productIngressRequest.productId,
      )

      if (product) {
        applyProductToForm(product)
        setLookupStatus('success')
        setLookupMessage(
          'Producto encontrado. Puedes actualizar los datos o agregar mas stock.',
        )
        focusNextField(stockToAddFieldRef)
      }
      return
    }

    if (productIngressRequest.barcode) {
      setProductIngressRequest(null)
      setLookupCode(productIngressRequest.barcode)
      void handleLookup(productIngressRequest.barcode)
    }
  }, [
    applyProductToForm,
    focusNextField,
    handleLookup,
    productIngressRequest,
    productsState.items,
    setProductIngressRequest,
  ])

  useEffect(() => {
    if (submitStatus !== 'success' || !submitMessage) return

    const timeoutId = setTimeout(() => {
      setSubmitMessage(null)
      setSubmitStatus('idle')
    }, 2600)

    return () => clearTimeout(timeoutId)
  }, [submitMessage, submitStatus])

  const validateForm = () => {
    const nextErrors: FieldErrors = {}

    if (!form.barcode.trim()) nextErrors.barcode = 'El codigo de barras es obligatorio.'
    if (!form.name.trim()) nextErrors.name = 'Ingresa el nombre del producto.'
    if (!form.category.trim()) nextErrors.category = 'Ingresa la categoria.'
    if (!form.costPrice.trim() || Number.isNaN(parseNumber(form.costPrice))) {
      nextErrors.costPrice = 'Ingresa un precio de compra valido.'
    }
    if (!form.salePrice.trim() || Number.isNaN(parseNumber(form.salePrice))) {
      nextErrors.salePrice = 'Ingresa un precio de venta valido.'
    }
    if (!form.currentStock.trim() || Number.isNaN(parseNumber(form.currentStock))) {
      nextErrors.currentStock = 'Ingresa un stock valido.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const saveProduct = async () => {
    resetMessages()
    if (!canManageProducts) {
      setSubmitStatus('error')
      setSubmitMessage('Tu rol actual no puede guardar productos.')
      return
    }
    if (!validateForm()) return

    setIsSaving(true)

    try {
      const result = await productCatalogService.saveProduct({
        existingProductId: activeProduct?.id ?? activeProductId,
        businessId: business?.id,
        barcode: form.barcode.trim(),
        name: form.name.trim(),
        brand: form.brand.trim(),
        formatContent: form.formatContent.trim(),
        imageUrl: globalImageUrl,
        category: form.category.trim(),
        costPrice: parseNumber(form.costPrice),
        salePrice: parseNumber(form.salePrice),
        stock: parseNumber(form.currentStock),
        minStock: parseNumber(form.minStock || '0'),
        type: form.type,
        unitMeasure: form.unitMeasure,
        supplier: form.supplier.trim(),
        notes: form.notes.trim(),
      })

      syncProductIntoStore(result.product)
      await logAction({
        entityName: 'product',
        entityId: result.product.id,
        entityLabel: result.product.name,
        action: activeProduct ? 'update' : 'create',
        actionType: activeProduct ? 'product_updated' : 'product_created',
        summary: activeProduct
          ? `Actualizo el producto ${result.product.name}.`
          : `Creo el producto ${result.product.name}.`,
      })

      if (activeProduct && Number(form.salePrice) !== Number(activeProduct.salePrice)) {
        await logAction({
          entityName: 'product',
          entityId: result.product.id,
          entityLabel: result.product.name,
          action: 'update',
          actionType: 'price_updated',
          summary: `Edito el precio de ${result.product.name}.`,
        })
      }

      setSubmitStatus('success')
      setSubmitMessage('Producto guardado correctamente')
      clearForm()
      focusBarcodeInput()
    } catch (error) {
      setSubmitStatus('error')
      setSubmitMessage(
        error instanceof Error ? error.message : 'No pudimos guardar el producto.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const addStock = async () => {
    resetMessages()

    if (!activeProduct) {
      setSubmitMessage('Busca primero un producto existente para sumar stock.')
      return
    }

    if (!canManageInventory) {
      setSubmitStatus('error')
      setSubmitMessage('Tu rol actual no puede agregar stock.')
      return
    }

    const delta = parseNumber(stockToAdd)
    if (Number.isNaN(delta) || delta <= 0) {
      setSubmitMessage('Ingresa un stock valido para agregar.')
      return
    }

    setIsSaving(true)

    try {
      const nextStock = activeProduct.currentStock + delta
      const result = await productCatalogService.saveProduct({
        existingProductId: activeProduct.id,
        businessId: business?.id,
        barcode: form.barcode.trim(),
        name: form.name.trim(),
        brand: form.brand.trim(),
        formatContent: form.formatContent.trim(),
        imageUrl: globalImageUrl || activeProduct.imageUrl,
        category: form.category.trim(),
        costPrice: parseNumber(form.costPrice || String(activeProduct.costPrice)),
        salePrice: parseNumber(form.salePrice || String(activeProduct.salePrice)),
        stock: nextStock,
        minStock: parseNumber(form.minStock || String(activeProduct.minStock)),
        type: form.type,
        unitMeasure: form.unitMeasure,
        supplier: form.supplier.trim(),
        notes: form.notes.trim(),
      })

      const syncedId = syncProductIntoStore(result.product)
      const syncedProduct = { ...result.product, id: syncedId }
      applyProductToForm(syncedProduct)

      const movement = createInventoryMovement({
        product: syncedProduct,
        type: 'stock_in',
        quantity: delta,
        reason: 'Ingreso manual desde pantalla Ingresar',
        createdAt: new Date().toISOString(),
        businessId: business?.id,
        createdByUserId: user?.id,
        associatedCost: parseNumber(form.costPrice || String(activeProduct.costPrice)),
      })

      const movementSync = await inventoryMovementService
        .record({
          movement,
          businessId: business?.id,
          actorUserId: user?.id,
        })
        .catch(() => null)

      inventoryDispatch({
        type: 'record_movement',
        payload: movementSync?.movement ?? movement,
      })

      await logAction({
        entityName: 'inventory_movement',
        entityId: syncedProduct.id,
        entityLabel: syncedProduct.name,
        action: 'update',
        actionType: 'stock_added',
        summary: `Agrego ${delta} unidades de stock a ${syncedProduct.name}.`,
      })

      setStockToAdd('')
      setSubmitStatus('success')
      setSubmitMessage(
        movementSync
          ? 'Stock agregado correctamente.'
          : 'Stock agregado. El movimiento quedo pendiente de sincronizacion.',
      )
      focusNextField(stockToAddFieldRef)
    } catch (error) {
      setSubmitStatus('error')
      setSubmitMessage(
        error instanceof Error ? error.message : 'No pudimos agregar stock.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Screen
      title="Ingresar"
      subtitle="Escanea un codigo para crear, actualizar productos o sumar stock sin pasos extra."
    >
      {!canManageProducts ? (
        <AccessDeniedState message="Tu rol actual no puede crear ni actualizar productos." />
      ) : (
        <>
      <Card>
        <BarcodeLookupPanel
          barcodeInputRef={barcodeLookupFieldRef}
          value={lookupCode}
          onChange={(value) => {
            setLookupCode(value)
            setForm((current) => ({ ...current, barcode: value }))
          }}
          onLookup={handleLookup}
          helperText={lookupMessage}
          busy={isLookupLoading}
        />
      </Card>

      <Card>
        <Text style={styles.title}>Nuevo producto</Text>

        {lookupStatus === 'loading' ? (
          <View style={[styles.statusBanner, styles.statusLoading]}>
            <Text style={styles.statusText}>Buscando producto...</Text>
          </View>
        ) : null}

        {lookupMessage ? (
          <View
            style={[
              styles.statusBanner,
              lookupStatus === 'error' ? styles.statusError : styles.statusSuccess,
            ]}
          >
            <Text style={styles.statusText}>{lookupMessage}</Text>
          </View>
        ) : null}

        {globalImageUrl ? (
          <View style={styles.imagePreviewWrap}>
            <Image source={{ uri: globalImageUrl }} style={styles.imagePreview} />
            <Text style={styles.imageCaption}>Imagen encontrada en base global</Text>
          </View>
        ) : null}

        <AppField
          label="Codigo de barras"
          value={form.barcode}
          onChangeText={(value) => setForm((current) => ({ ...current, barcode: value }))}
          error={fieldErrors.barcode}
          icon="barcode"
          returnKeyType="next"
          onSubmitEditing={() => nameFieldRef.current?.focus()}
        />
        <AppField
          ref={nameFieldRef}
          label="Nombre"
          value={form.name}
          onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
          error={fieldErrors.name}
          returnKeyType="next"
        />
        <AppField
          label="Marca"
          value={form.brand}
          onChangeText={(value) => setForm((current) => ({ ...current, brand: value }))}
          returnKeyType="next"
        />
        <AppField
          label="Formato / contenido"
          value={form.formatContent}
          onChangeText={(value) =>
            setForm((current) => ({ ...current, formatContent: value }))
          }
          returnKeyType="next"
        />
        <AppField
          label="Categoria"
          value={form.category}
          onChangeText={(value) => setForm((current) => ({ ...current, category: value }))}
          error={fieldErrors.category}
          returnKeyType="next"
          onSubmitEditing={() => costPriceFieldRef.current?.focus()}
        />
        <AppField
          ref={costPriceFieldRef}
          label="Precio de compra"
          value={form.costPrice}
          onChangeText={(value) => setForm((current) => ({ ...current, costPrice: value }))}
          keyboardType="numeric"
          error={fieldErrors.costPrice}
          returnKeyType="next"
          onSubmitEditing={() => salePriceFieldRef.current?.focus()}
        />
        <AppField
          ref={salePriceFieldRef}
          label="Precio de venta"
          value={form.salePrice}
          onChangeText={(value) => setForm((current) => ({ ...current, salePrice: value }))}
          keyboardType="numeric"
          error={fieldErrors.salePrice}
          returnKeyType="next"
          onSubmitEditing={() => stockFieldRef.current?.focus()}
        />
        <AppField
          ref={stockFieldRef}
          label="Stock"
          value={form.currentStock}
          onChangeText={(value) =>
            setForm((current) => ({ ...current, currentStock: value }))
          }
          keyboardType="numeric"
          error={fieldErrors.currentStock}
          returnKeyType="done"
        />

        {activeProduct ? (
          <View style={styles.stockHelper}>
            <Text style={styles.stockHelperTitle}>
              Stock actual: {activeProduct.currentStock}
            </Text>
            <Text style={styles.stockHelperMeta}>
              Venta actual {formatCurrency(Number(form.salePrice || activeProduct.salePrice))}
            </Text>
            <AppField
              ref={stockToAddFieldRef}
              label="Agregar stock"
              value={stockToAdd}
              onChangeText={setStockToAdd}
              keyboardType="numeric"
              icon="package-variant-plus"
              returnKeyType="done"
            />
        <AppButton
          label={isSaving ? 'Agregando...' : 'Agregar stock'}
          onPress={addStock}
          icon="package-variant-plus"
          variant="secondary"
          disabled={isSaving || !canManageInventory}
        />
          </View>
        ) : null}

        {submitMessage ? <Text style={styles.feedback}>{submitMessage}</Text> : null}

        <AppButton
          label={
            isSaving
              ? 'Guardando...'
              : activeProduct
                ? 'Actualizar producto'
                : 'Crear producto'
          }
          onPress={saveProduct}
          icon={activeProduct ? 'content-save-outline' : 'plus-circle-outline'}
          disabled={isSaving || !canManageProducts}
        />
      </Card>
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: mobileTheme.fontSizes.lg,
    color: mobileTheme.colors.text,
    ...appFonts.bold,
  },
  stockHelper: {
    gap: mobileTheme.spacing.sm,
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.surface,
  },
  stockHelperTitle: {
    color: mobileTheme.colors.text,
    ...appFonts.semibold,
  },
  stockHelperMeta: {
    color: mobileTheme.colors.muted,
    ...appFonts.regular,
  },
  feedback: {
    color: mobileTheme.colors.primaryDark,
    ...appFonts.semibold,
  },
  statusBanner: {
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusLoading: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusSuccess: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statusText: {
    color: mobileTheme.colors.text,
    ...appFonts.semibold,
  },
  imagePreviewWrap: {
    gap: mobileTheme.spacing.xs,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.surface,
  },
  imageCaption: {
    color: mobileTheme.colors.muted,
    ...appFonts.regular,
  },
})
