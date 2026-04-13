import { formatCurrency, formatDateTime, formatQuantity } from '../../../lib/format'
import type { InventoryMovement, UnitMeasure } from '../../../types/domain'

interface InventoryHistoryTableProps {
  movements: InventoryMovement[]
  getUnitMeasure: (productId: string) => UnitMeasure
}

const movementLabels = {
  stock_in: 'Ingreso de stock',
  manual_adjustment: 'Ajuste manual',
  waste: 'Merma',
  sale_output: 'Salida por venta',
} as const

export function InventoryHistoryTable({
  movements,
  getUnitMeasure,
}: InventoryHistoryTableProps) {
  return (
    <section className="surface-card inventory-section">
      <div className="inventory-section__header">
        <div>
          <p className="section-kicker">Historial</p>
          <h3>Movimientos de inventario</h3>
          <p>Cada cambio queda registrado con cantidad, fecha, motivo y costo cuando aplica.</p>
        </div>
      </div>

      <div className="inventory-table">
        <div className="inventory-table__row inventory-table__row--head">
          <span>Producto</span>
          <span>Movimiento</span>
          <span>Cantidad</span>
          <span>Fecha y hora</span>
          <span>Motivo</span>
          <span>Costo asociado</span>
        </div>

        {movements.length ? (
          movements.map((movement) => (
            <article key={movement.id} className="inventory-table__row">
              <span>{movement.productName}</span>
              <span>{movementLabels[movement.type]}</span>
              <span>
                {formatQuantity(movement.quantity, getUnitMeasure(movement.productId))}
              </span>
              <span>{formatDateTime(movement.createdAt)}</span>
              <span>{movement.reason}</span>
              <span>
                {typeof movement.associatedCost === 'number'
                  ? formatCurrency(movement.associatedCost)
                  : 'No aplica'}
              </span>
            </article>
          ))
        ) : (
          <article className="products-empty">
            <strong>No hay movimientos registrados.</strong>
            <p>Los ingresos, ajustes, mermas y salidas apareceran aqui.</p>
          </article>
        )}
      </div>
    </section>
  )
}
