import { Button } from '../../../components/ui/Button'
import { formatCurrency, formatQuantity } from '../../../lib/format'
import type { Product, WeightedDailyControl } from '../../../types/domain'

interface WeightedControlTableProps {
  items: WeightedDailyControl[]
  products: Product[]
  onRemove: (controlId: string) => void
}

const buildMetrics = (item: WeightedDailyControl) => {
  const salesIncome = item.soldQuantity * item.salePrice
  const soldCost = item.soldQuantity * item.costPrice
  const wasteCost = item.wasteQuantity * item.costPrice
  const grossProfit = salesIncome - soldCost
  const realProfit = grossProfit - wasteCost

  return {
    salesIncome,
    soldCost,
    wasteCost,
    grossProfit,
    realProfit,
  }
}

export function WeightedControlTable({
  items,
  products,
  onRemove,
}: WeightedControlTableProps) {
  const getUnitMeasure = (productId: string) =>
    products.find((product) => product.id === productId)?.unitMeasure ?? 'kg'

  return (
    <section className="surface-card weighted-control-table">
      <div className="inventory-section__header">
        <div>
          <p className="section-kicker">Resumen especial</p>
          <h3>Pan, fruta, verdura y granel</h3>
          <p>
            Cada registro calcula ingreso por ventas, costo vendido, costo de merma
            y utilidad real del dia.
          </p>
        </div>
      </div>

      <div className="weighted-control-list">
        {items.length ? (
          items.map((item) => {
            const metrics = buildMetrics(item)
            const unitMeasure = getUnitMeasure(item.productId)

            return (
              <article key={item.id} className="weighted-card">
                <div className="weighted-card__header">
                  <div>
                    <strong>{item.productName}</strong>
                    <p>{item.controlDate}</p>
                  </div>
                  <Button variant="secondary" onClick={() => onRemove(item.id)}>
                    Quitar
                  </Button>
                </div>

                <div className="weighted-card__grid">
                  <div>
                    <span>Entro</span>
                    <strong>{formatQuantity(item.enteredQuantity, unitMeasure)}</strong>
                  </div>
                  <div>
                    <span>Vendio</span>
                    <strong>{formatQuantity(item.soldQuantity, unitMeasure)}</strong>
                  </div>
                  <div>
                    <span>Sobro</span>
                    <strong>{formatQuantity(item.leftoverQuantity, unitMeasure)}</strong>
                  </div>
                  <div>
                    <span>Merma</span>
                    <strong>{formatQuantity(item.wasteQuantity, unitMeasure)}</strong>
                  </div>
                </div>

                <div className="weighted-card__grid weighted-card__grid--money">
                  <div>
                    <span>Ingreso por ventas</span>
                    <strong>{formatCurrency(metrics.salesIncome)}</strong>
                  </div>
                  <div>
                    <span>Costo vendido</span>
                    <strong>{formatCurrency(metrics.soldCost)}</strong>
                  </div>
                  <div>
                    <span>Costo merma</span>
                    <strong>{formatCurrency(metrics.wasteCost)}</strong>
                  </div>
                  <div>
                    <span>Ganancia bruta</span>
                    <strong>{formatCurrency(metrics.grossProfit)}</strong>
                  </div>
                  <div>
                    <span>Ganancia real</span>
                    <strong>{formatCurrency(metrics.realProfit)}</strong>
                  </div>
                </div>
              </article>
            )
          })
        ) : (
          <article className="products-empty">
            <strong>No hay controles diarios registrados.</strong>
            <p>Agrega uno para empezar a medir utilidad real y merma.</p>
          </article>
        )}
      </div>
    </section>
  )
}
