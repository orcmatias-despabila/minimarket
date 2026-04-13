import { formatQuantity } from '../../../lib/format'
import type { Product } from '../../../types/domain'

interface InventoryStockTableProps {
  products: Product[]
  search: string
  onSearchChange: (value: string) => void
}

export function InventoryStockTable({
  products,
  search,
  onSearchChange,
}: InventoryStockTableProps) {
  return (
    <section className="surface-card inventory-section">
      <div className="inventory-section__header">
        <div>
          <p className="section-kicker">Stock actual</p>
          <h3>Existencias por producto</h3>
          <p>Busca rapido por nombre y detecta de inmediato productos en nivel critico.</p>
        </div>
      </div>

      <label className="field">
        <span className="field__label">Buscar producto</span>
        <input
          className="field__input"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Ej: bebida, pan, hielo"
        />
      </label>

      <div className="inventory-table">
        <div className="inventory-table__row inventory-table__row--head">
          <span>Producto</span>
          <span>Categoria</span>
          <span>Unidad</span>
          <span>Stock actual</span>
          <span>Stock minimo</span>
          <span>Estado</span>
        </div>

        {products.length ? (
          products.map((product) => {
            const isLowStock = product.currentStock <= product.minStock

            return (
              <article
                key={product.id}
                className={`inventory-table__row ${isLowStock ? 'inventory-table__row--alert' : ''}`}
              >
                <span>
                  <strong>{product.name}</strong>
                  <small>{product.supplier || 'Sin proveedor asignado'}</small>
                </span>
                <span>{product.category}</span>
                <span>{product.unitMeasure}</span>
                <span>{formatQuantity(product.currentStock, product.unitMeasure)}</span>
                <span>{formatQuantity(product.minStock, product.unitMeasure)}</span>
                <span>
                  <strong className={isLowStock ? 'text-alert' : 'text-ok'}>
                    {isLowStock ? 'Stock bajo' : 'Normal'}
                  </strong>
                </span>
              </article>
            )
          })
        ) : (
          <article className="products-empty">
            <strong>No se encontraron productos.</strong>
            <p>Prueba con otra busqueda.</p>
          </article>
        )}
      </div>
    </section>
  )
}
