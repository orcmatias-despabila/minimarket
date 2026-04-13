import { useMemo, useState } from 'react'
import type { Dispatch } from 'react'
import type { InventoryMovement, Product } from '../../../types/domain'
import { InventoryHistoryTable } from '../components/InventoryHistoryTable'
import {
  InventoryMovementForm,
  type InventoryFormValues,
} from '../components/InventoryMovementForm'
import { InventoryStockTable } from '../components/InventoryStockTable'
import type { InventoryAction } from '../state/inventoryReducer'
import {
  createInventoryMovement,
  type InventoryMovementType,
} from '../state/movementFactory'
import type { ProductsAction } from '../../products/state/productsReducer'

export interface InventoryPageProps {
  products: Product[]
  movements: InventoryMovement[]
  inventoryDispatch: Dispatch<InventoryAction>
  productsDispatch: Dispatch<ProductsAction>
}

type InventoryFormErrors = Partial<Record<keyof InventoryFormValues, string>>

const defaultDateTime = () => new Date().toISOString().slice(0, 16)

const emptyMovementForm = (): InventoryFormValues => ({
  productId: '',
  type: 'stock_in',
  quantity: '',
  createdAt: defaultDateTime(),
  reason: '',
  associatedCost: '',
})

const validateMovement = (
  values: InventoryFormValues,
  selectedProduct: Product | undefined,
): InventoryFormErrors => {
  const errors: InventoryFormErrors = {}
  const parsedQuantity = Number(values.quantity)

  if (!values.productId) {
    errors.productId = 'Debes seleccionar un producto.'
  }

  if (!values.reason.trim()) {
    errors.reason = 'El motivo es obligatorio para dejar trazabilidad.'
  }

  if (!values.createdAt) {
    errors.createdAt = 'Debes indicar fecha y hora.'
  }

  if (!values.quantity.trim() || Number.isNaN(parsedQuantity) || parsedQuantity === 0) {
    errors.quantity = 'Ingresa una cantidad valida distinta de 0.'
  }

  if (
    values.type !== 'manual_adjustment' &&
    (!values.quantity.trim() || parsedQuantity < 0)
  ) {
    errors.quantity = 'Para este movimiento usa una cantidad positiva.'
  }

  if (
    selectedProduct &&
    (values.type === 'waste' || values.type === 'sale_output') &&
    parsedQuantity > selectedProduct.currentStock
  ) {
    errors.quantity = 'No puedes descontar mas stock del disponible.'
  }

  if (
    selectedProduct &&
    values.type === 'manual_adjustment' &&
    selectedProduct.currentStock + parsedQuantity < 0
  ) {
    errors.quantity = 'El ajuste dejaria el stock en negativo.'
  }

  if (
    values.associatedCost.trim() &&
    (Number.isNaN(Number(values.associatedCost)) || Number(values.associatedCost) < 0)
  ) {
    errors.associatedCost = 'El costo asociado debe ser mayor o igual a 0.'
  }

  return errors
}

const resolveSignedQuantity = (
  type: InventoryMovementType,
  rawQuantity: number,
): number => {
  if (type === 'stock_in') return Math.abs(rawQuantity)
  if (type === 'waste' || type === 'sale_output') return Math.abs(rawQuantity) * -1
  return rawQuantity
}

export function InventoryPage({
  products,
  movements,
  inventoryDispatch,
  productsDispatch,
}: InventoryPageProps) {
  const [search, setSearch] = useState('')
  const [formValues, setFormValues] = useState<InventoryFormValues>(emptyMovementForm)
  const [formErrors, setFormErrors] = useState<InventoryFormErrors>({})

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products

    return products.filter((product) =>
      product.name.toLowerCase().includes(term),
    )
  }, [products, search])

  const handleFieldChange = <K extends keyof InventoryFormValues>(
    field: K,
    value: InventoryFormValues[K],
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

  const handleSubmit = () => {
    const selectedProduct = products.find(
      (product) => product.id === formValues.productId,
    )
    const errors = validateMovement(formValues, selectedProduct)
    setFormErrors(errors)

    if (Object.keys(errors).length > 0 || !selectedProduct) {
      return
    }

    const quantity = resolveSignedQuantity(
      formValues.type,
      Number(formValues.quantity),
    )

    const movement = createInventoryMovement({
      product: selectedProduct,
      type: formValues.type,
      quantity,
      reason: formValues.reason.trim(),
      createdAt: new Date(formValues.createdAt).toISOString(),
      associatedCost: formValues.associatedCost.trim()
        ? Number(formValues.associatedCost)
        : undefined,
    })

    inventoryDispatch({ type: 'record_movement', payload: movement })
    productsDispatch({ type: 'apply_inventory_movement', payload: movement })

    setFormValues(emptyMovementForm())
    setFormErrors({})
  }

  const getUnitMeasure = (productId: string) =>
    products.find((product) => product.id === productId)?.unitMeasure ?? 'unit'

  return (
    <section className="inventory-module">
      <div className="inventory-module__grid">
        <InventoryStockTable
          products={filteredProducts}
          search={search}
          onSearchChange={setSearch}
        />

        <InventoryMovementForm
          products={products}
          values={formValues}
          errors={formErrors}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
        />
      </div>

      <InventoryHistoryTable
        movements={movements}
        getUnitMeasure={getUnitMeasure}
      />
    </section>
  )
}
