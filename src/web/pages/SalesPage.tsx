import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { formatCurrency, formatQuantity } from '../../lib/format'
import { createInventoryMovement } from '../../modules/inventory/state/movementFactory'
import { buildSale, getCartSubtotal, type PosCartItem } from '../../modules/sales/state/saleHelpers'
import type { Product, Sale } from '../../types/domain'
import { useWebAuth } from '../auth/AuthProvider'
import { BarcodeCameraScanner } from '../components/BarcodeCameraScanner'
import { inventoryMovementService } from '../services/inventoryMovementService'
import { productCatalogService } from '../services/productCatalogService'
import { salesService } from '../services/salesService'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

const isWeightProduct = (product: Product) => product.type === 'manual_weight'

const getDefaultAmount = (product: Product) => {
  if (product.type === 'manual_weight') {
    if (product.unitMeasure === 'kg') return '0.5'
    if (product.unitMeasure === 'g') return '250'
    if (product.unitMeasure === 'l') return '1'
  }

  return '1'
}

const paymentOptions: Array<{ label: string; value: Sale['paymentMethod'] }> = [
  { label: 'Efectivo', value: 'cash' },
  { label: 'Tarjeta', value: 'debit' },
  { label: 'Credito', value: 'credit' },
  { label: 'Transferencia', value: 'transfer' },
]

export function SalesPage() {
  const { user } = useWebAuth()
  const { business, hasPermission } = useWebWorkspace()
  const scannerInputRef = useRef<HTMLInputElement | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [isHydrating, setIsHydrating] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [search, setSearch] = useState('')
  const [cartItems, setCartItems] = useState<PosCartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [searchAmounts, setSearchAmounts] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<string | null>(null)
  const [missingScannedCode, setMissingScannedCode] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canCreateSales = hasPermission('sales:create')
  const canManageProducts = hasPermission('products:write')

  useEffect(() => {
    const loadSalesData = async () => {
      if (!business?.id) {
        setProducts([])
        setSales([])
        setIsHydrating(false)
        return
      }

      setIsHydrating(true)
      setSyncError(null)

      try {
        const [productItems, saleItems] = await Promise.all([
          productCatalogService.listByBusiness(business.id),
          salesService.listByBusiness(business.id),
        ])
        setProducts(productItems)
        setSales(saleItems)
      } catch (error) {
        setSyncError(
          error instanceof Error ? error.message : 'No pudimos sincronizar productos y ventas.',
        )
      } finally {
        setIsHydrating(false)
      }
    }

    void loadSalesData()
  }, [business?.id])

  useEffect(() => {
    scannerInputRef.current?.focus()
  }, [])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return []

    return products.filter((product) => product.name.toLowerCase().includes(term)).slice(0, 12)
  }, [products, search])

  const subtotal = getCartSubtotal(cartItems)
  const cashAmount = Number(cashReceived || 0)
  const changeAmount = paymentMethod === 'cash' ? Math.max(cashAmount - subtotal, 0) : 0
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const updateFeedback = (message: string) => setFeedback(message)

  const addProductToCart = (product: Product, requestedQuantity: number) => {
    if (!canCreateSales) {
      updateFeedback('Tu rol actual no puede registrar ventas.')
      return false
    }

    if (!requestedQuantity || Number.isNaN(requestedQuantity) || requestedQuantity <= 0) {
      updateFeedback('Ingresa una cantidad o peso valido.')
      return false
    }

    let wasAdded = false

    setCartItems((current) => {
      const existing = current.find((item) => item.productId === product.id)
      const nextQuantity = (existing?.quantity ?? 0) + requestedQuantity

      if (nextQuantity > product.currentStock) {
        updateFeedback('La cantidad supera el stock disponible.')
        return current
      }

      wasAdded = true

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

    setMissingScannedCode(null)
    if (wasAdded) {
      updateFeedback(`${product.name} agregado a la venta.`)
    }

    return wasAdded
  }

  const handleBarcodeScanned = async (code: string) => {
    const normalized = code.trim()
    if (!normalized) return false

    const product = products.find((item) => item.barcode === normalized)

    if (!product) {
      if (!canManageProducts) {
        updateFeedback(`Codigo ${normalized} no existe y tu rol no puede crear productos.`)
        return false
      }

      setMissingScannedCode(normalized)
      updateFeedback(`Codigo ${normalized} no existe. Ve a Ingresar para crearlo.`)
      return false
    }

    const wasAdded = addProductToCart(product, 1)
    if (wasAdded) {
      setBarcodeInput('')
    }

    return wasAdded
  }

  const handleConfirmSale = async () => {
    if (!cartItems.length) {
      updateFeedback('Agrega productos antes de confirmar la venta.')
      return
    }

    if (paymentMethod === 'cash' && cashAmount < subtotal) {
      updateFeedback('El monto recibido no alcanza para cubrir la venta.')
      return
    }

    setIsSubmitting(true)

    try {
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
      setSales((current) => [finalizedSale, ...current])

      const inventoryResults = await Promise.allSettled(
        cartItems.map(async (item) => {
          const product = products.find((entry) => entry.id === item.productId)
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

          setProducts((current) =>
            current.map((entry) =>
              entry.id === item.productId
                ? { ...entry, currentStock: Math.max(entry.currentStock - item.quantity, 0) }
                : entry,
            ),
          )
        }),
      )

      setCartItems([])
      setCashReceived('')
      setPaymentMethod('cash')
      setMissingScannedCode(null)
      setSearch('')
      setSearchAmounts({})
      scannerInputRef.current?.focus()

      const hasInventorySyncErrors = inventoryResults.some(
        (result) => result.status === 'rejected',
      )

      updateFeedback(
        hasInventorySyncErrors
          ? `Venta ${finalizedSale.documentNumber} registrada. El stock local se actualizo, pero hubo movimientos que no se pudieron sincronizar.`
          : `Venta ${finalizedSale.documentNumber} registrada con exito.`,
      )
    } catch (error) {
      updateFeedback(error instanceof Error ? error.message : 'No pudimos registrar la venta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="sales-web">
      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi">
          <span>Productos en ticket</span>
          <strong>{totalItems}</strong>
          <p>Total de unidades o peso cargado en la venta actual.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Ticket actual</span>
          <strong>{formatCurrency(subtotal)}</strong>
          <p>Total acumulado para cobrar.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Ventas recientes</span>
          <strong>{sales.length}</strong>
          <p>Ultimas ventas cargadas para este negocio.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Entrada rapida</span>
          <strong>Lector listo</strong>
          <p>El input superior esta pensado para escaner por teclado.</p>
        </article>
      </div>

      <div className="sales-web__top">
        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Caja rapida</p>
              <h3>Escaneo o ingreso manual</h3>
              <p>
                Usa lector por teclado, Enter para agregar y activa la camara solo si
                necesitas escaneo web en tiempo real.
              </p>
            </div>
          </div>

          {isHydrating ? <p>Sincronizando productos y ventas...</p> : null}
          {syncError ? <p className="form-error">{syncError}</p> : null}

          <form
            className="sales-web__scanner-form"
            onSubmit={(event) => {
              event.preventDefault()
              void handleBarcodeScanned(barcodeInput)
            }}
          >
            <Field
              ref={scannerInputRef}
              label="Escanear o escribir codigo"
              value={barcodeInput}
              onChange={(event) => setBarcodeInput(event.target.value)}
              placeholder="El lector puede escribir aqui y confirmar con Enter"
            />
            <Button type="submit">Agregar por codigo</Button>
          </form>

          <div className="sales-web__scanner-meta">
            <span className="status-chip">Lector por teclado habilitado</span>
            <span className="status-chip status-chip--muted">Camara web: opcional</span>
          </div>

          <BarcodeCameraScanner onDetected={handleBarcodeScanned} />

          {feedback ? (
            <p className="products-web__message products-web__message--success">{feedback}</p>
          ) : null}

          {missingScannedCode ? (
            <section className="surface-card sales-missing-code">
              <div>
                <p className="section-kicker">Codigo no registrado</p>
                <h3>Producto no encontrado</h3>
                <p>
                  El codigo <strong>{missingScannedCode}</strong> no existe aun en el catalogo.
                </p>
              </div>
              <Link
                to={`/products?barcode=${encodeURIComponent(missingScannedCode)}`}
                className="dashboard-link-card__action"
              >
                Crear producto
              </Link>
            </section>
          ) : null}
        </section>

        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Cobro</p>
              <h3>Pago y confirmacion</h3>
              <p>Total, medio de pago, monto recibido y vuelto.</p>
            </div>
          </div>

          <div className="sales-summary">
            <div>
              <span>Total</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div>
              <span>Vuelto</span>
              <strong className="text-ok">{formatCurrency(changeAmount)}</strong>
            </div>
          </div>

          <SelectField
            label="Metodo de pago"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as Sale['paymentMethod'])}
            options={paymentOptions}
          />

          {paymentMethod === 'cash' ? (
            <Field
              label="Monto recibido"
              type="number"
              value={cashReceived}
              onChange={(event) => setCashReceived(event.target.value)}
              placeholder="Ingresa el efectivo recibido"
            />
          ) : null}

          <Button onClick={() => void handleConfirmSale()} disabled={isSubmitting || !canCreateSales}>
            {isSubmitting ? 'Confirmando venta...' : 'Confirmar venta'}
          </Button>
        </section>
      </div>

      <div className="sales-web__grid">
        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Busqueda rapida</p>
              <h3>Agregar productos</h3>
              <p>Encuentra productos por nombre y carga cantidades o peso en pocos pasos.</p>
            </div>
          </div>

          <Field
            label="Buscar producto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej: bebida, pan, arroz"
          />

          <div className="sales-web__product-list">
            {search.trim().length === 0 ? (
              <article className="products-empty">
                <strong>Escribe un producto para empezar.</strong>
                <p>Tambien puedes usar el lector por teclado arriba.</p>
              </article>
            ) : filteredProducts.length ? (
              filteredProducts.map((product) => {
                const amountValue = searchAmounts[product.id] ?? getDefaultAmount(product)
                const quantity = Number(amountValue || 0)

                return (
                  <article key={product.id} className="sales-web__product-item">
                    <div>
                      <strong>{product.name}</strong>
                      <p>
                        {product.category} - {formatCurrency(product.salePrice)} -{' '}
                        {formatQuantity(product.currentStock, product.unitMeasure)}
                      </p>
                      <p>{product.barcode || 'Sin codigo de barras'}</p>
                    </div>
                    <div className="sales-web__product-actions">
                      <Field
                        label={isWeightProduct(product) ? 'Peso' : 'Cantidad'}
                        type="number"
                        step={isWeightProduct(product) ? '0.1' : '1'}
                        min="0"
                        value={amountValue}
                        onChange={(event) =>
                          setSearchAmounts((current) => ({
                            ...current,
                            [product.id]: event.target.value,
                          }))
                        }
                      />
                      <div className="sales-web__product-meta">
                        <strong>{formatCurrency(quantity * product.salePrice)}</strong>
                        <Button
                          onClick={() => addProductToCart(product, quantity)}
                          disabled={product.currentStock <= 0}
                        >
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })
            ) : (
              <article className="products-empty">
                <strong>No encontramos productos con ese nombre.</strong>
                <p>Prueba otra busqueda o usa el lector.</p>
              </article>
            )}
          </div>
        </section>

        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Carrito</p>
              <h3>Detalle de venta</h3>
              <p>Ajusta cantidades, quita items y revisa el total antes de cobrar.</p>
            </div>
          </div>

          <div className="sales-web__cart-list">
            {cartItems.length ? (
              cartItems.map((item) => (
                <article key={item.productId} className="sales-web__cart-item">
                  <div>
                    <strong>{item.name}</strong>
                    <p>
                      {formatQuantity(item.quantity, item.unitMeasure)} -{' '}
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </p>
                  </div>
                  <div className="sales-web__cart-actions">
                    <Field
                      label={item.productType === 'manual_weight' ? 'Peso' : 'Cant.'}
                      type="number"
                      step={item.productType === 'manual_weight' ? '0.1' : '1'}
                      min="0"
                      value={String(item.quantity)}
                      onChange={(event) => {
                        const quantity = Number(event.target.value)
                        if (Number.isNaN(quantity)) return
                        if (quantity <= 0) {
                          setCartItems((current) =>
                            current.filter((entry) => entry.productId !== item.productId),
                          )
                          return
                        }
                        if (quantity > item.stockAvailable) {
                          updateFeedback('No puedes vender mas unidades de las disponibles en stock.')
                          return
                        }
                        setCartItems((current) =>
                          current.map((entry) =>
                            entry.productId === item.productId ? { ...entry, quantity } : entry,
                          ),
                        )
                      }}
                    />
                    <Button
                      variant="danger"
                      onClick={() =>
                        setCartItems((current) =>
                          current.filter((entry) => entry.productId !== item.productId),
                        )
                      }
                    >
                      Quitar
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <article className="products-empty">
                <strong>Todavia no agregas productos a esta venta.</strong>
                <p>Busca un producto o escanea un codigo para comenzar.</p>
              </article>
            )}
          </div>
        </section>
      </div>

      <section className="surface-card">
        <div className="inventory-section__header">
          <div>
            <p className="section-kicker">Historial</p>
            <h3>Ultimas ventas</h3>
            <p>Referencia rapida de tickets recientes para la caja actual.</p>
          </div>
        </div>

        <div className="sales-web__history">
          {sales.length ? (
            sales.slice(0, 8).map((sale) => (
              <article key={sale.id} className="sales-web__history-item">
                <div>
                  <strong>{sale.documentNumber}</strong>
                  <p>
                    {sale.items.length} productos - {sale.paymentMethod}
                  </p>
                </div>
                <strong>{formatCurrency(sale.grandTotal)}</strong>
              </article>
            ))
          ) : (
            <article className="products-empty">
              <strong>Aun no hay ventas registradas.</strong>
              <p>Las ventas confirmadas apareceran aqui.</p>
            </article>
          )}
        </div>
      </section>
    </section>
  )
}


