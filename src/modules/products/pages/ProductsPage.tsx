import { useMemo, useState } from 'react'
import type { Dispatch } from 'react'
import type { Product, ProductKind } from '../../../types/domain'
import { ProductFilters } from '../components/ProductFilters'
import { ProductForm } from '../components/ProductForm'
import { ProductsTable } from '../components/ProductsTable'
import {
  emptyProductForm,
  toProductFormValues,
  type ProductFormValues,
  type ProductsAction,
  type ProductsState,
} from '../state/productsReducer'

export interface ProductsPageProps {
  state: ProductsState
  dispatch: Dispatch<ProductsAction>
  draftBarcode?: string | null
}

type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>

const parseNumber = (value: string) => Number(value)

const validateProductForm = (
  values: ProductFormValues,
  products: Product[],
  editingId: string | null,
): ProductFormErrors => {
  const errors: ProductFormErrors = {}

  if (!values.name.trim()) {
    errors.name = 'El nombre es obligatorio.'
  }

  if (!values.category.trim()) {
    errors.category = 'La categoria es obligatoria.'
  }

  if (values.type === 'barcode' && !values.barcode.trim()) {
    errors.barcode = 'Debes ingresar el codigo de barras para este tipo de producto.'
  }

  if (
    values.barcode.trim() &&
    products.some(
      (product) =>
        product.barcode === values.barcode.trim() && product.id !== editingId,
    )
  ) {
    errors.barcode = 'Ya existe otro producto con ese codigo de barras.'
  }

  if (!values.costPrice.trim() || parseNumber(values.costPrice) < 0) {
    errors.costPrice = 'Ingresa un costo valido mayor o igual a 0.'
  }

  if (!values.salePrice.trim() || parseNumber(values.salePrice) <= 0) {
    errors.salePrice = 'Ingresa un precio de venta mayor a 0.'
  }

  if (!values.currentStock.trim() || parseNumber(values.currentStock) < 0) {
    errors.currentStock = 'El stock actual no puede ser negativo.'
  }

  if (!values.minStock.trim() || parseNumber(values.minStock) < 0) {
    errors.minStock = 'El stock minimo no puede ser negativo.'
  }

  return errors
}

const buildProductFromForm = (
  values: ProductFormValues,
  editingId: string | null,
): Product => ({
  id: editingId ?? crypto.randomUUID(),
  name: values.name.trim(),
  category: values.category.trim(),
  type: values.type,
  barcode: values.barcode.trim() || undefined,
  costPrice: parseNumber(values.costPrice),
  salePrice: parseNumber(values.salePrice),
  currentStock: parseNumber(values.currentStock),
  minStock: parseNumber(values.minStock),
  unitMeasure: values.unitMeasure,
  supplier: values.supplier.trim() || undefined,
  notes: values.notes.trim() || undefined,
})

export function ProductsPage({
  state,
  dispatch,
  draftBarcode,
}: ProductsPageProps) {
  const [formValues, setFormValues] = useState<ProductFormValues>(() =>
    draftBarcode
      ? {
          ...emptyProductForm(),
          barcode: draftBarcode,
          type: 'barcode',
        }
      : emptyProductForm(),
  )
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedType, setSelectedType] = useState<'' | ProductKind>('')
  const [scannerPrefillCode, setScannerPrefillCode] = useState<string | null>(
    draftBarcode ?? null,
  )

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(state.items.map((product) => product.category))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [state.items],
  )

  const filteredProducts = useMemo(() => {
    return state.items.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(search.trim().toLowerCase())
      const matchesCategory = selectedCategory
        ? product.category === selectedCategory
        : true
      const matchesType = selectedType ? product.type === selectedType : true

      return matchesSearch && matchesCategory && matchesType
    })
  }, [search, selectedCategory, selectedType, state.items])

  const handleFieldChange = <K extends keyof ProductFormValues>(
    field: K,
    value: ProductFormValues[K],
  ) => {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }))

    setFormErrors((current) => ({
      ...current,
      [field]: undefined,
    }))
  }

  const resetForm = () => {
    setFormValues(emptyProductForm())
    setFormErrors({})
    setEditingId(null)
    setScannerPrefillCode(null)
  }

  const handleSubmit = () => {
    const errors = validateProductForm(formValues, state.items, editingId)
    setFormErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    const nextProduct = buildProductFromForm(formValues, editingId)

    if (editingId) {
      dispatch({ type: 'update', payload: nextProduct })
    } else {
      dispatch({ type: 'create', payload: nextProduct })
    }

    resetForm()
  }

  const handleEdit = (product: Product) => {
    setEditingId(product.id)
    setFormValues(toProductFormValues(product))
    setFormErrors({})
  }

  const handleDelete = (productId: string) => {
    if (!window.confirm('Se eliminara este producto del catalogo.')) {
      return
    }

    dispatch({ type: 'remove', payload: { productId } })

    if (editingId === productId) {
      resetForm()
    }
  }

  const editingProductName = editingId
    ? state.items.find((product) => product.id === editingId)?.name
    : undefined

  return (
    <section className="products-module">
      {scannerPrefillCode ? (
        <section className="surface-card sales-missing-code">
          <div>
            <p className="section-kicker">Nuevo desde escaneo</p>
            <h3>Codigo preparado para alta rapida</h3>
            <p>
              Se precargo el codigo <strong>{scannerPrefillCode}</strong> para crear el
              producto sin volver a escanear.
            </p>
          </div>
        </section>
      ) : null}

      <ProductFilters
        search={search}
        selectedCategory={selectedCategory}
        selectedType={selectedType}
        categoryOptions={categoryOptions}
        onSearchChange={setSearch}
        onCategoryChange={setSelectedCategory}
        onTypeChange={setSelectedType}
      />

      <div className="products-module__grid">
        <ProductForm
          values={formValues}
          errors={formErrors}
          editingProductName={editingProductName}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
          onCancelEdit={resetForm}
        />

        <ProductsTable
          products={filteredProducts}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </section>
  )
}
