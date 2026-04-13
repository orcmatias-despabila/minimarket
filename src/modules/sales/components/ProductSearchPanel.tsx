import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { formatCurrency, formatQuantity } from '../../../lib/format'
import type { Product } from '../../../types/domain'

interface ProductSearchPanelProps {
  search: string
  products: Product[]
  onSearchChange: (value: string) => void
  onAddProduct: (product: Product, quantity: number) => void
}

const getDefaultAmount = (product: Product) => {
  if (product.type === 'manual_weight') {
    if (product.unitMeasure === 'kg') return 0.5
    if (product.unitMeasure === 'g') return 250
    if (product.unitMeasure === 'l') return 1
  }

  return 1
}

const getStepValue = (product: Product) => {
  if (product.type === 'manual_weight') {
    if (product.unitMeasure === 'kg') return '0.1'
    if (product.unitMeasure === 'g') return '10'
    if (product.unitMeasure === 'l') return '0.1'
  }

  return '1'
}

const getInputLabel = (product: Product) => {
  if (product.type === 'manual_weight') {
    return product.unitMeasure === 'kg' || product.unitMeasure === 'g'
      ? 'Peso'
      : 'Cantidad'
  }

  return 'Cantidad'
}

export function ProductSearchPanel({
  search,
  products,
  onSearchChange,
  onAddProduct,
}: ProductSearchPanelProps) {
  const [amounts, setAmounts] = useState<Record<string, string>>({})

  const resolvedAmounts = useMemo(
    () =>
      Object.fromEntries(
        products.map((product) => [
          product.id,
          amounts[product.id] ?? String(getDefaultAmount(product)),
        ]),
      ),
    [amounts, products],
  )

  return (
    <section className="surface-card sales-search">
      <div className="inventory-section__header">
        <div>
          <p className="section-kicker">Busqueda manual</p>
          <h3>Agregar productos</h3>
          <p>Busca por nombre y agrega rapido al carrito.</p>
        </div>
      </div>

      <Field
        label="Buscar producto"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Ej: bebida, pan, hielo"
      />

      <div className="sales-product-list">
        {products.length ? (
          products.map((product) => (
            <article key={product.id} className="sales-product-item">
              <div>
                <strong>{product.name}</strong>
                <p>
                  {product.category} - {formatCurrency(product.salePrice)} -{' '}
                  {formatQuantity(product.currentStock, product.unitMeasure)}
                </p>
                <p>
                  {product.type === 'manual_weight'
                    ? 'Venta manual por peso'
                    : product.type === 'manual_unit'
                      ? 'Venta manual por unidad'
                      : 'Venta por codigo de barras'}
                </p>
              </div>
              <div className="sales-product-item__actions">
                <Field
                  label={getInputLabel(product)}
                  type="number"
                  min="0"
                  step={getStepValue(product)}
                  value={resolvedAmounts[product.id]}
                  onChange={(event) =>
                    setAmounts((current) => ({
                      ...current,
                      [product.id]: event.target.value,
                    }))
                  }
                />
                <div className="sales-product-item__meta">
                  <strong>
                    {formatCurrency(
                      Number(resolvedAmounts[product.id] || getDefaultAmount(product)) *
                        product.salePrice,
                    )}
                  </strong>
                  <Button
                    onClick={() =>
                      onAddProduct(
                        product,
                        Number(resolvedAmounts[product.id] || getDefaultAmount(product)),
                      )
                    }
                    disabled={
                      product.currentStock <= 0 ||
                      Number(resolvedAmounts[product.id] || 0) <= 0
                    }
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="products-empty">
            <strong>No se encontraron productos.</strong>
            <p>Prueba con otro nombre o escanea el codigo.</p>
          </article>
        )}
      </div>
    </section>
  )
}
