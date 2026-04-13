import { useMemo, useState } from 'react'
import type { Dispatch } from 'react'
import { Button } from '../../../components/ui/Button'
import {
  BarcodeScanner,
  type ScanDetection,
} from '../components/BarcodeScanner'
import { CartPanel } from '../components/CartPanel'
import { PaymentPanel } from '../components/PaymentPanel'
import { ProductSearchPanel } from '../components/ProductSearchPanel'
import { SalesHistoryPanel } from '../components/SalesHistoryPanel'
import { buildSale, getCartSubtotal, type PosCartItem } from '../state/saleHelpers'
import type { SalesAction, SalesState } from '../state/salesReducer'
import type { Product, Sale } from '../../../types/domain'
import type { ProductsAction } from '../../products/state/productsReducer'
import type { InventoryAction } from '../../inventory/state/inventoryReducer'
import { createInventoryMovement } from '../../inventory/state/movementFactory'

export interface SalesPageProps {
  products: Product[]
  sales: SalesState['items']
  salesDispatch: Dispatch<SalesAction>
  productsDispatch: Dispatch<ProductsAction>
  inventoryDispatch: Dispatch<InventoryAction>
  onRequestCreateProduct: (barcode: string) => void
}

interface PaymentErrors {
  payment?: string
  cashReceived?: string
  general?: string
}

export function SalesPage({
  products,
  sales,
  salesDispatch,
  productsDispatch,
  inventoryDispatch,
  onRequestCreateProduct,
}: SalesPageProps) {
  const [search, setSearch] = useState('')
  const [cartItems, setCartItems] = useState<PosCartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [errors, setErrors] = useState<PaymentErrors>({})
  const [missingScannedCode, setMissingScannedCode] = useState<string | null>(null)

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products
    return products.filter((product) => product.name.toLowerCase().includes(term))
  }, [products, search])

  const subtotal = getCartSubtotal(cartItems)
  const cashAmount = Number(cashReceived || 0)
  const changeAmount =
    paymentMethod === 'cash' ? Math.max(cashAmount - subtotal, 0) : 0

  const addProductToCart = (product: Product, requestedQuantity = 1) => {
    setErrors({})
    setMissingScannedCode(null)

    if (!requestedQuantity || Number.isNaN(requestedQuantity) || requestedQuantity <= 0) {
      setErrors({
        general: 'Ingresa una cantidad o peso valido para agregar el producto.',
      })
      return
    }

    setCartItems((current) => {
      const existing = current.find((item) => item.productId === product.id)
      const nextQuantity = (existing?.quantity ?? 0) + requestedQuantity

      if (nextQuantity > product.currentStock) {
        setErrors({
          general: 'La cantidad supera el stock disponible para ese producto.',
        })
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
  }

  const handleBarcodeDetected = (detection: ScanDetection) => {
    const product = products.find((item) => item.barcode === detection.code)

    if (!product) {
      setMissingScannedCode(detection.code)
      setErrors({
        general: `No se encontro un producto con codigo ${detection.code}.`,
      })
      return
    }

    addProductToCart(product)
  }

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (Number.isNaN(quantity)) return

    const product = products.find((item) => item.id === productId)
    if (!product) return

    if (quantity <= 0) {
      setCartItems((current) => current.filter((item) => item.productId !== productId))
      return
    }

    if (quantity > product.currentStock) {
      setErrors({
        general: 'No puedes vender mas unidades de las disponibles en stock.',
      })
      return
    }

    setErrors({})
    setCartItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity, stockAvailable: product.currentStock }
          : item,
      ),
    )
  }

  const handleRemoveItem = (productId: string) => {
    setCartItems((current) => current.filter((item) => item.productId !== productId))
  }

  const handleConfirmSale = () => {
    if (!cartItems.length) {
      setErrors({ general: 'Agrega al menos un producto antes de confirmar.' })
      return
    }

    if (paymentMethod === 'cash' && cashAmount < subtotal) {
      setErrors({
        cashReceived: 'El monto entregado debe cubrir el total de la venta.',
      })
      return
    }

    const sale = buildSale({
      items: cartItems,
      paymentMethod,
      receivedAmount: paymentMethod === 'cash' ? cashAmount : subtotal,
    })

    salesDispatch({ type: 'record_sale', payload: sale })

    cartItems.forEach((item) => {
      const product = products.find((entry) => entry.id === item.productId)
      if (!product) return

      const movement = createInventoryMovement({
        product,
        type: 'sale_output',
        quantity: item.quantity * -1,
        reason: `Salida automatica por venta ${sale.documentNumber}`,
        createdAt: sale.createdAt,
        associatedCost: item.costPrice,
      })

      inventoryDispatch({ type: 'record_movement', payload: movement })
      productsDispatch({ type: 'apply_inventory_movement', payload: movement })
    })

    setCartItems([])
    setCashReceived('')
    setPaymentMethod('cash')
    setErrors({})
    setMissingScannedCode(null)
  }

  return (
    <section className="sales-module">
      <div className="sales-module__top">
        <BarcodeScanner onDetected={handleBarcodeDetected} />
        <PaymentPanel
          subtotal={subtotal}
          paymentMethod={paymentMethod}
          cashReceived={cashReceived}
          changeAmount={changeAmount}
          errors={errors}
          onPaymentMethodChange={(value) => {
            setPaymentMethod(value)
            setErrors({})
          }}
          onCashReceivedChange={(value) => {
            setCashReceived(value)
            setErrors((current) => ({ ...current, cashReceived: undefined }))
          }}
          onConfirmSale={handleConfirmSale}
        />
      </div>

      {missingScannedCode ? (
        <section className="surface-card sales-missing-code">
          <div>
            <p className="section-kicker">Codigo no registrado</p>
            <h3>Producto no encontrado</h3>
            <p>
              El codigo <strong>{missingScannedCode}</strong> no existe aun en el
              catalogo.
            </p>
          </div>
          <Button onClick={() => onRequestCreateProduct(missingScannedCode)}>
            Crear producto con este codigo
          </Button>
        </section>
      ) : null}

      <div className="sales-module__grid">
        <ProductSearchPanel
          search={search}
          products={filteredProducts}
          onSearchChange={setSearch}
          onAddProduct={addProductToCart}
        />

        <CartPanel
          items={cartItems}
          subtotal={subtotal}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
        />
      </div>

      <SalesHistoryPanel
        sales={sales}
      />
    </section>
  )
}
