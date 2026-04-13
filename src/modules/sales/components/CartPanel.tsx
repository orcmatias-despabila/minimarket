import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { formatCurrency, formatQuantity } from '../../../lib/format'
import type { PosCartItem } from '../state/saleHelpers'

interface CartPanelProps {
  items: PosCartItem[]
  subtotal: number
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemoveItem: (productId: string) => void
}

export function CartPanel({
  items,
  subtotal,
  onUpdateQuantity,
  onRemoveItem,
}: CartPanelProps) {
  const getStepValue = (item: PosCartItem) => {
    if (item.productType === 'manual_weight') {
      if (item.unitMeasure === 'kg') return '0.1'
      if (item.unitMeasure === 'g') return '10'
      if (item.unitMeasure === 'l') return '0.1'
    }

    return '1'
  }

  const getFieldLabel = (item: PosCartItem) =>
    item.productType === 'manual_weight' ? 'Peso' : 'Cantidad'

  return (
    <section className="surface-card sales-cart">
      <div className="inventory-section__header">
        <div>
          <p className="section-kicker">Carrito</p>
          <h3>Venta actual</h3>
          <p>Modifica cantidades, elimina productos y revisa el subtotal.</p>
        </div>
      </div>

      <div className="sales-cart__list">
        {items.length ? (
          items.map((item) => (
            <article key={item.productId} className="sales-cart__item">
              <div>
                <strong>{item.name}</strong>
                <p>
                  {formatCurrency(item.unitPrice)} - Disponible:{' '}
                  {formatQuantity(item.stockAvailable, item.unitMeasure)}
                </p>
              </div>

              <div className="sales-cart__item-actions">
                <Field
                  label={getFieldLabel(item)}
                  type="number"
                  min="0"
                  step={getStepValue(item)}
                  value={String(item.quantity)}
                  onChange={(event) =>
                    onUpdateQuantity(item.productId, Number(event.target.value))
                  }
                />
                <strong>{formatCurrency(item.quantity * item.unitPrice)}</strong>
                <Button variant="danger" onClick={() => onRemoveItem(item.productId)}>
                  Quitar
                </Button>
              </div>
            </article>
          ))
        ) : (
          <article className="products-empty">
            <strong>No hay productos en el carrito.</strong>
            <p>Escanea o agrega productos manualmente para comenzar una venta.</p>
          </article>
        )}
      </div>

      <div className="sales-summary">
        <div>
          <span>Subtotal</span>
          <strong>{formatCurrency(subtotal)}</strong>
        </div>
        <div>
          <span>Total final</span>
          <strong>{formatCurrency(subtotal)}</strong>
        </div>
      </div>
    </section>
  )
}
