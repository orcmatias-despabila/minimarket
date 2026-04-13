import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { formatCurrency, formatDateTime, formatQuantity } from '../../lib/format'
import type { InventoryMovement, Product } from '../../types/domain'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'
import { productCatalogService } from '../services/productCatalogService'
import { webInventoryService } from '../services/inventory.service'

export function InventoryPage() {
  const { business, hasPermission } = useWebWorkspace()
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [isHydrating, setIsHydrating] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all')

  useEffect(() => {
    const loadInventory = async () => {
      if (!business?.id) {
        setProducts([])
        setMovements([])
        setIsHydrating(false)
        return
      }

      setIsHydrating(true)
      setSyncError(null)

      try {
        const [productItems, movementItems] = await Promise.all([
          productCatalogService.listByBusiness(business.id),
          webInventoryService.listByBusiness(business.id),
        ])
        setProducts(productItems)
        setMovements(movementItems)
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : 'No pudimos sincronizar inventario.')
      } finally {
        setIsHydrating(false)
      }
    }

    void loadInventory()
  }, [business?.id])

  const categories = useMemo(
    () => ['Todos', ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  )

  const lowStock = useMemo(
    () => products.filter((product) => product.currentStock <= product.minStock),
    [products],
  )

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'Todos' || product.category === activeCategory
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.brand?.toLowerCase().includes(term) ||
        product.barcode?.includes(term)
      const matchesStock = stockFilter === 'low' ? product.currentStock <= product.minStock : true

      return matchesCategory && matchesSearch && matchesStock
    })
  }, [activeCategory, products, search, stockFilter])

  const canEditInventory = hasPermission('inventory:write') || hasPermission('products:write')

  return (
    <section className="inventory-web">
      <div className="dashboard-kpis">
        <article className="surface-card dashboard-kpi">
          <span>Productos</span>
          <strong>{products.length}</strong>
          <p>Catalogo sincronizado para el negocio actual.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Stock bajo</span>
          <strong>{lowStock.length}</strong>
          <p>Productos bajo minimo configurado.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Movimientos</span>
          <strong>{movements.length}</strong>
          <p>Ultimos movimientos registrados.</p>
        </article>
        <article className="surface-card dashboard-kpi">
          <span>Estado</span>
          <strong>{isHydrating ? 'Sync' : 'Listo'}</strong>
          <p>{syncError ? 'Hay un problema de sincronizacion.' : 'Inventario actualizado.'}</p>
        </article>
      </div>

      <div className="inventory-web__grid">
        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Buscador y filtros</p>
              <h3>Catalogo de inventario</h3>
              <p>Revisa stock actual, alertas y salta rapido a editar el producto.</p>
            </div>
          </div>

          {isHydrating ? <p>Sincronizando inventario...</p> : null}
          {syncError ? <p className="form-error">{syncError}</p> : null}

          <div className="inventory-web__filters">
            <Field
              label="Buscar producto"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, marca, categoria o codigo"
            />
            <SelectField
              label="Categoria"
              value={activeCategory}
              onChange={(event) => setActiveCategory(event.target.value)}
              options={categories.map((category) => ({ label: category, value: category }))}
            />
            <SelectField
              label="Stock"
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value as 'all' | 'low')}
              options={[
                { label: 'Todos', value: 'all' },
                { label: 'Solo stock bajo', value: 'low' },
              ]}
            />
          </div>

          <div className="inventory-web__table">
            <div className="inventory-web__row inventory-web__row--head">
              <span>Producto</span>
              <span>Categoria</span>
              <span>Precio</span>
              <span>Stock</span>
              <span>Codigo</span>
              <span>Acciones</span>
            </div>

            {filteredProducts.length ? (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`inventory-web__row ${
                    product.currentStock <= product.minStock ? 'inventory-web__row--alert' : ''
                  }`}
                >
                  <span>
                    <strong>{product.name}</strong>
                    <small>
                      {product.brand ? `${product.brand} - ` : ''}
                      {product.formatContent ? `${product.formatContent} - ` : ''}
                      {product.type}
                    </small>
                  </span>
                  <span>{product.category}</span>
                  <span>{formatCurrency(product.salePrice)}</span>
                  <span>
                    <strong>{formatQuantity(product.currentStock, product.unitMeasure)}</strong>
                    <small>Min {formatQuantity(product.minStock, product.unitMeasure)}</small>
                  </span>
                  <span>{product.barcode || 'Sin codigo'}</span>
                  <span className="products-web__actions">
                    {canEditInventory ? (
                      <Link
                        to={`/products?productId=${encodeURIComponent(product.id)}`}
                        className="dashboard-link-card__action inventory-web__action-link"
                      >
                        Editar
                      </Link>
                    ) : (
                      <Button variant="secondary" disabled>
                        Sin acceso
                      </Button>
                    )}
                  </span>
                </div>
              ))
            ) : (
              <article className="products-empty">
                <strong>No hay productos que coincidan con esos filtros.</strong>
                <p>Ajusta la busqueda o revisa si el negocio tiene productos cargados.</p>
              </article>
            )}
          </div>
        </section>

        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Historial reciente</p>
              <h3>Movimientos de inventario</h3>
              <p>Incluye ingresos y ajustes registrados desde los flujos actuales.</p>
            </div>
          </div>

          <div className="inventory-web__movements">
            {movements.length ? (
              movements.map((movement) => (
                <article key={movement.id} className="inventory-web__movement-card">
                  <div>
                    <strong>{movement.productName}</strong>
                    <p>
                      {movement.type} - {formatDateTime(movement.createdAt)}
                    </p>
                    <p>{movement.reason}</p>
                  </div>
                  <div className="inventory-web__movement-side">
                    <strong
                      className={movement.quantity < 0 ? 'text-alert' : 'text-ok'}
                    >
                      {movement.quantity > 0 ? '+' : ''}
                      {movement.quantity}
                    </strong>
                    {typeof movement.associatedCost === 'number' ? (
                      <small>{formatCurrency(movement.associatedCost)}</small>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <article className="products-empty">
                <strong>Aun no hay movimientos registrados.</strong>
                <p>Los ingresos y ajustes apareceran aqui.</p>
              </article>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}

