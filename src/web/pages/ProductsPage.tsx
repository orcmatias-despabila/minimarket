import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { TextAreaField } from '../../components/ui/TextAreaField'
import { formatCurrency } from '../../lib/format'
import { createInventoryMovement } from '../../modules/inventory/state/movementFactory'
import {
  emptyProductForm,
  toProductFormValues,
  type ProductFormValues,
} from '../../modules/products/state/productsReducer'
import type { Product, ProductKind, UnitMeasure } from '../../types/domain'
import { useWebAuth } from '../auth/AuthProvider'
import { productCatalogService } from '../services/productCatalogService'
import { inventoryMovementService } from '../services/inventoryMovementService'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

type FieldErrors = Partial<
  Record<'barcode' | 'name' | 'category' | 'costPrice' | 'salePrice' | 'currentStock', string>
>
type LookupStatus = 'idle' | 'loading' | 'success' | 'error'
type SubmitStatus = 'idle' | 'success' | 'error'

const parseNumber = (value: string) => Number(value.replace(',', '.'))

const productTypeOptions: Array<{ label: string; value: ProductKind }> = [
  { label: 'Con codigo de barras', value: 'barcode' },
  { label: 'Manual por unidad', value: 'manual_unit' },
  { label: 'Manual por peso', value: 'manual_weight' },
]

const unitOptions: Array<{ label: string; value: UnitMeasure }> = [
  { label: 'Unidad', value: 'unit' },
  { label: 'Kilo', value: 'kg' },
  { label: 'Gramo', value: 'g' },
  { label: 'Litro', value: 'l' },
]

export function ProductsPage() {
  const { user } = useWebAuth()
  const { business, hasPermission } = useWebWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [isHydrating, setIsHydrating] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
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
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedType, setSelectedType] = useState<'' | ProductKind>('')
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name')
  const canManageProducts = hasPermission('products:write')
  const canManageInventory = hasPermission('inventory:write')

  useEffect(() => {
    const loadProducts = async () => {
      if (!business?.id) {
        setProducts([])
        setIsHydrating(false)
        return
      }

      setIsHydrating(true)
      setSyncError(null)
      try {
        const items = await productCatalogService.listByBusiness(business.id)
        setProducts(items)
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : 'No pudimos cargar productos.')
      } finally {
        setIsHydrating(false)
      }
    }

    void loadProducts()
  }, [business?.id])

  const applyProductToForm = (product: Product) => {
    setForm(toProductFormValues(product))
    setLookupCode(product.barcode ?? '')
    setActiveProductId(product.id)
    setGlobalImageUrl(product.imageUrl ?? '')
  }

  useEffect(() => {
    const productId = searchParams.get('productId')
    const barcode = searchParams.get('barcode')

    if (productId) {
      const product = products.find((item) => item.id === productId)
      if (product) {
        applyProductToForm(product)
        setLookupStatus('success')
        setLookupMessage(
          'Producto encontrado. Puedes actualizar los datos o agregar mas stock.',
        )
        setSearchParams({}, { replace: true })
      }
      return
    }

    if (barcode) {
      setLookupCode(barcode)
      void handleLookup(barcode)
      setSearchParams({}, { replace: true })
    }
  }, [products, searchParams, setSearchParams])

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [products],
  )

  const lowStock = useMemo(
    () => products.filter((product) => product.currentStock <= product.minStock),
    [products],
  )

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    const sorted = [...products].filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.brand?.toLowerCase().includes(term) ||
        product.barcode?.includes(term)

      const matchesCategory = selectedCategory ? product.category === selectedCategory : true
      const matchesType = selectedType ? product.type === selectedType : true

      return matchesSearch && matchesCategory && matchesType
    })

    sorted.sort((left, right) => {
      if (sortBy === 'stock') return left.currentStock - right.currentStock
      if (sortBy === 'price') return left.salePrice - right.salePrice
      return left.name.localeCompare(right.name)
    })

    return sorted
  }, [products, search, selectedCategory, selectedType, sortBy])

  const activeProduct = useMemo(
    () =>
      products.find(
        (product) =>
          product.id === activeProductId ||
          (product.barcode && product.barcode === form.barcode.trim()),
      ) ?? null,
    [activeProductId, form.barcode, products],
  )

  const resetMessages = () => {
    setFieldErrors({})
    setLookupMessage(null)
    setSubmitMessage(null)
    setSubmitStatus('idle')
    setLookupStatus('idle')
  }

  const clearForm = () => {
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
  }

  const syncProductIntoStore = (product: Product) => {
    setProducts((current) => {
      const existing = current.find(
        (item) =>
          item.id === product.id ||
          (item.barcode && product.barcode && item.barcode === product.barcode),
      )

      if (existing) {
        return current.map((item) =>
          item.id === existing.id ? { ...product, id: existing.id } : item,
        )
      }

      return [product, ...current]
    })
  }

  const handleLookup = async (barcode: string) => {
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
      const result = await productCatalogService.findByBarcode(normalized, products, business?.id)

      if (result.source === 'local' && result.product) {
        applyProductToForm(result.product)
        setLookupStatus('success')
        setLookupMessage(
          'Producto encontrado. Puedes actualizar los datos o agregar mas stock.',
        )
        setStockToAdd('')
        return
      }

      if (result.source === 'global' && result.draft) {
        setActiveProductId(null)
        setForm({
          ...emptyProductForm(),
          barcode: result.draft.barcode,
          name: result.draft.name,
          brand: result.draft.brand,
          formatContent: result.draft.quantity,
          category:
            result.draft.categories
              .split(',')
              .map((item) => item.trim())
              .find(Boolean) ?? '',
          type: 'barcode',
          unitMeasure: 'unit',
        })
        setLookupCode(result.draft.barcode)
        setGlobalImageUrl(result.draft.imageUrl)
        setLookupStatus('success')
        setLookupMessage(
          'Producto encontrado en base global. Completa precios y stock para guardarlo.',
        )
        return
      }

      setActiveProductId(null)
      setGlobalImageUrl('')
      setForm({
        ...emptyProductForm(),
        barcode: normalized,
        type: 'barcode',
        unitMeasure: 'unit',
      })
      setLookupCode(normalized)
      setLookupStatus('success')
      setLookupMessage('Codigo no registrado. Completa la ficha para crear el producto.')
    } catch (error) {
      setLookupStatus('error')
      setGlobalImageUrl('')
      setLookupMessage(
        error instanceof Error ? error.message : 'No pudimos consultar el codigo ahora.',
      )
    } finally {
      setIsLookupLoading(false)
    }
  }

  const validateForm = () => {
    const nextErrors: FieldErrors = {}

    if (form.type === 'barcode' && !form.barcode.trim()) {
      nextErrors.barcode = 'El codigo de barras es obligatorio.'
    }
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
        barcode: form.type === 'barcode' ? form.barcode.trim() : '',
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
      setSubmitStatus('success')
      setSubmitMessage('Producto guardado correctamente.')
      clearForm()
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
        barcode: form.type === 'barcode' ? form.barcode.trim() : '',
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

      syncProductIntoStore(result.product)
      const movement = createInventoryMovement({
        product: result.product,
        type: 'stock_in',
        quantity: delta,
        reason: 'Ingreso manual desde pantalla Ingresar',
        createdAt: new Date().toISOString(),
        businessId: business?.id,
        createdByUserId: user?.id,
        associatedCost: parseNumber(form.costPrice || String(activeProduct.costPrice)),
      })

      await inventoryMovementService.record({
        movement,
        businessId: business?.id,
        actorUserId: user?.id,
      })

      applyProductToForm(result.product)
      setStockToAdd('')
      setSubmitStatus('success')
      setSubmitMessage('Stock agregado correctamente.')
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
    <section className="products-web">
      <div className="products-web__grid">
        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Busqueda por codigo</p>
              <h3>Alta y edicion rapida</h3>
              <p>
                Busca por codigo para reutilizar el comportamiento de mobile: local,
                base global o alta nueva.
              </p>
            </div>
          </div>

          <div className="products-web__lookup">
            <Field
              label="Codigo de barras"
              value={lookupCode}
              onChange={(event) => {
                setLookupCode(event.target.value)
                setForm((current) => ({ ...current, barcode: event.target.value }))
              }}
              placeholder="Escanea o escribe un codigo"
              hint={fieldErrors.barcode}
            />
            <Button
              onClick={() => {
                void handleLookup(lookupCode)
              }}
              disabled={isLookupLoading}
            >
              {isLookupLoading ? 'Buscando...' : 'Buscar codigo'}
            </Button>
          </div>

          {lookupStatus === 'loading' ? (
            <p className="products-web__message products-web__message--loading">
              Buscando producto...
            </p>
          ) : null}
          {lookupMessage ? (
            <p
              className={`products-web__message ${
                lookupStatus === 'error'
                  ? 'products-web__message--error'
                  : 'products-web__message--success'
              }`}
            >
              {lookupMessage}
            </p>
          ) : null}
          {submitMessage ? (
            <p
              className={`products-web__message ${
                submitStatus === 'error'
                  ? 'products-web__message--error'
                  : 'products-web__message--success'
              }`}
            >
              {submitMessage}
            </p>
          ) : null}

          {globalImageUrl ? (
            <div className="products-web__image">
              <img src={globalImageUrl} alt="Producto encontrado" />
              <span>Imagen encontrada en base global</span>
            </div>
          ) : null}

          <div className="products-web__form-grid">
            <SelectField
              label="Tipo de producto"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as ProductKind,
                  barcode: event.target.value === 'barcode' ? current.barcode : '',
                }))
              }
              options={productTypeOptions}
            />
            <SelectField
              label="Unidad"
              value={form.unitMeasure}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  unitMeasure: event.target.value as UnitMeasure,
                }))
              }
              options={unitOptions}
            />
            <Field
              label="Nombre"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              hint={fieldErrors.name}
            />
            <Field
              label="Marca"
              value={form.brand}
              onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
            />
            <Field
              label="Formato / contenido"
              value={form.formatContent}
              onChange={(event) =>
                setForm((current) => ({ ...current, formatContent: event.target.value }))
              }
            />
            <Field
              label="Categoria"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value }))
              }
              hint={fieldErrors.category}
            />
            <Field
              label="Precio de compra"
              type="number"
              value={form.costPrice}
              onChange={(event) =>
                setForm((current) => ({ ...current, costPrice: event.target.value }))
              }
              hint={fieldErrors.costPrice}
            />
            <Field
              label="Precio de venta"
              type="number"
              value={form.salePrice}
              onChange={(event) =>
                setForm((current) => ({ ...current, salePrice: event.target.value }))
              }
              hint={fieldErrors.salePrice}
            />
            <Field
              label="Stock actual"
              type="number"
              value={form.currentStock}
              onChange={(event) =>
                setForm((current) => ({ ...current, currentStock: event.target.value }))
              }
              hint={fieldErrors.currentStock}
            />
            <Field
              label="Stock minimo"
              type="number"
              value={form.minStock}
              onChange={(event) =>
                setForm((current) => ({ ...current, minStock: event.target.value }))
              }
            />
            <Field
              label="Proveedor"
              value={form.supplier}
              onChange={(event) =>
                setForm((current) => ({ ...current, supplier: event.target.value }))
              }
            />
          </div>

          <TextAreaField
            label="Observaciones"
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            rows={3}
          />

          {activeProduct ? (
            <div className="products-web__stock-helper">
              <div>
                <strong>Stock actual: {activeProduct.currentStock}</strong>
                <p>
                  Precio actual: {formatCurrency(Number(form.salePrice || activeProduct.salePrice))}
                </p>
              </div>
              <div className="products-web__stock-actions">
                <Field
                  label="Agregar stock"
                  type="number"
                  value={stockToAdd}
                  onChange={(event) => setStockToAdd(event.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    void addStock()
                  }}
                  disabled={isSaving || !canManageInventory}
                >
                  {isSaving ? 'Agregando...' : 'Agregar stock'}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="products-form__actions">
            <Button
              onClick={() => {
                void saveProduct()
              }}
              disabled={isSaving || !canManageProducts}
            >
              {isSaving ? 'Guardando...' : activeProduct ? 'Actualizar producto' : 'Crear producto'}
            </Button>
            <Button variant="secondary" onClick={clearForm} disabled={isSaving}>
              Limpiar formulario
            </Button>
          </div>
        </section>

        <section className="surface-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Catalogo</p>
              <h3>Productos cargados</h3>
              <p>Tabla de escritorio con filtros, stock bajo y acceso a edicion.</p>
            </div>
          </div>

          {isHydrating ? <p>Sincronizando productos...</p> : null}
          {syncError ? <p className="form-error">{syncError}</p> : null}

          <div className="products-web__filters">
            <Field
              label="Buscar"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, marca, categoria o codigo"
            />
            <SelectField
              label="Categoria"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              options={[
                { label: 'Todas', value: '' },
                ...categoryOptions.map((item) => ({ label: item, value: item })),
              ]}
            />
            <SelectField
              label="Tipo"
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value as '' | ProductKind)}
              options={[
                { label: 'Todos', value: '' },
                ...productTypeOptions.map((option) => ({
                  label: option.label,
                  value: option.value,
                })),
              ]}
            />
            <SelectField
              label="Orden"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as 'name' | 'stock' | 'price')}
              options={[
                { label: 'Nombre', value: 'name' },
                { label: 'Stock', value: 'stock' },
                { label: 'Precio', value: 'price' },
              ]}
            />
          </div>

          <div className="products-web__summary">
            <span>Total productos: {products.length}</span>
            <span>Stock bajo: {lowStock.length}</span>
            <span>Resultados: {filteredProducts.length}</span>
          </div>

          <div className="products-web__table">
            <div className="products-web__row products-web__row--head">
              <span>Producto</span>
              <span>Tipo</span>
              <span>Categoria</span>
              <span>Precios</span>
              <span>Stock</span>
              <span>Acciones</span>
            </div>

            {filteredProducts.length ? (
              filteredProducts.map((product) => (
                <div key={product.id} className="products-web__row">
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.barcode || 'Sin codigo'}</small>
                  </span>
                  <span>{product.type}</span>
                  <span>{product.category}</span>
                  <span>
                    <strong>{formatCurrency(product.salePrice)}</strong>
                    <small>Costo {formatCurrency(product.costPrice)}</small>
                  </span>
                  <span>
                    <strong
                      className={product.currentStock <= product.minStock ? 'text-alert' : ''}
                    >
                      {product.currentStock}
                    </strong>
                    <small>Min {product.minStock}</small>
                  </span>
                  <span className="products-web__actions">
                    <Button variant="secondary" onClick={() => applyProductToForm(product)}>
                      Editar
                    </Button>
                  </span>
                </div>
              ))
            ) : (
              <article className="products-empty">
                <strong>No hay productos que coincidan con esos filtros.</strong>
                <p>Ajusta la busqueda o crea un nuevo producto desde el formulario.</p>
              </article>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
