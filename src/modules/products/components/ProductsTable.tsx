import { Button } from '../../../components/ui/Button'
import { formatCurrency, formatQuantity } from '../../../lib/format'
import type { Product } from '../../../types/domain'

interface ProductsTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (productId: string) => void
}

const productTypeLabels = {
  barcode: 'Con codigo de barras',
  manual_unit: 'Manual por unidad',
  manual_weight: 'Manual por peso',
} as const

export function ProductsTable({
  products,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  return (
    <section className="surface-card products-list">
      <div className="products-list__header">
        <div>
          <p className="section-kicker">Catalogo actual</p>
          <h3>Listado de productos</h3>
          <p>Busca, filtra y administra productos desde un solo lugar.</p>
        </div>
      </div>

      <div className="products-table">
        <div className="products-table__row products-table__row--head">
          <span>Producto</span>
          <span>Categoria</span>
          <span>Tipo</span>
          <span>Precios</span>
          <span>Stock</span>
          <span>Acciones</span>
        </div>

        {products.length ? (
          products.map((product) => (
            <article key={product.id} className="products-table__row">
              <span>
                <strong>{product.name}</strong>
                <small>{product.barcode || 'Sin codigo de barras'}</small>
              </span>
              <span>{product.category}</span>
              <span>{productTypeLabels[product.type]}</span>
              <span>
                <strong>{formatCurrency(product.salePrice)}</strong>
                <small>Costo: {formatCurrency(product.costPrice)}</small>
              </span>
              <span>
                <strong>{formatQuantity(product.currentStock, product.unitMeasure)}</strong>
                <small>
                  Minimo: {formatQuantity(product.minStock, product.unitMeasure)}
                </small>
              </span>
              <span className="products-table__actions">
                <Button variant="secondary" onClick={() => onEdit(product)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => onDelete(product.id)}>
                  Eliminar
                </Button>
              </span>
            </article>
          ))
        ) : (
          <article className="products-empty">
            <strong>No se encontraron productos.</strong>
            <p>Prueba con otro filtro o crea un producto nuevo.</p>
          </article>
        )}
      </div>
    </section>
  )
}
