import { useMemo, useState } from 'react'
import type { Dispatch } from 'react'
import { formatQuantity } from '../../../lib/format'
import type {
  InventoryMovement,
  Product,
  Sale,
  WeightedDailyControl,
} from '../../../types/domain'
import { ReportsDashboard } from '../components/ReportsDashboard'
import {
  WeightedControlForm,
  type WeightedControlFormValues,
} from '../components/WeightedControlForm'
import { WeightedControlTable } from '../components/WeightedControlTable'
import type {
  WeightedControlAction,
  WeightedControlState,
} from '../state/weightedControlReducer'

export interface ReportsPageProps {
  products: Product[]
  sales: Sale[]
  movements: InventoryMovement[]
  weightedControls: WeightedControlState['items']
  weightedDispatch: Dispatch<WeightedControlAction>
}

type WeightedControlErrors = Partial<Record<keyof WeightedControlFormValues, string>>

const todayDate = () => new Date().toISOString().slice(0, 10)

const emptyForm = (): WeightedControlFormValues => ({
  productId: '',
  controlDate: todayDate(),
  enteredQuantity: '',
  soldQuantity: '',
  leftoverQuantity: '',
  wasteQuantity: '',
  notes: '',
})

const validateForm = (values: WeightedControlFormValues) => {
  const errors: WeightedControlErrors = {}
  const numericFields: Array<keyof WeightedControlFormValues> = [
    'enteredQuantity',
    'soldQuantity',
    'leftoverQuantity',
    'wasteQuantity',
  ]

  if (!values.productId) {
    errors.productId = 'Debes seleccionar un producto por peso.'
  }

  if (!values.controlDate) {
    errors.controlDate = 'Debes indicar una fecha.'
  }

  numericFields.forEach((field) => {
    const value = Number(values[field])
    if (values[field] === '' || Number.isNaN(value) || value < 0) {
      errors[field] = 'Ingresa un valor valido mayor o igual a 0.'
    }
  })

  return errors
}

const buildControl = (
  values: WeightedControlFormValues,
  product: Product,
): WeightedDailyControl => ({
  id: crypto.randomUUID(),
  productId: product.id,
  productName: product.name,
  controlDate: values.controlDate,
  enteredQuantity: Number(values.enteredQuantity),
  soldQuantity: Number(values.soldQuantity),
  leftoverQuantity: Number(values.leftoverQuantity),
  wasteQuantity: Number(values.wasteQuantity),
  costPrice: product.costPrice,
  salePrice: product.salePrice,
  notes: values.notes.trim() || undefined,
})

export function ReportsPage({
  products,
  sales,
  movements,
  weightedControls,
  weightedDispatch,
}: ReportsPageProps) {
  const [formValues, setFormValues] = useState<WeightedControlFormValues>(emptyForm)
  const [errors, setErrors] = useState<WeightedControlErrors>({})

  const weightedProducts = useMemo(
    () => products.filter((product) => product.type === 'manual_weight'),
    [products],
  )

  const today = new Date().toISOString().slice(0, 10)
  const month = new Date().toISOString().slice(0, 7)

  const reportMetrics = useMemo(() => {
    const salesToday = sales
      .filter((sale) => sale.createdAt.slice(0, 10) === today)
      .reduce((sum, sale) => sum + sale.grandTotal, 0)

    const salesMonth = sales
      .filter((sale) => sale.createdAt.slice(0, 7) === month)
      .reduce((sum, sale) => sum + sale.grandTotal, 0)

    const profitToday = sales
      .filter((sale) => sale.createdAt.slice(0, 10) === today)
      .reduce(
        (sum, sale) =>
          sum +
          sale.items.reduce(
            (acc, item) => acc + (item.unitPrice - item.costPrice) * item.quantity,
            0,
          ),
        0,
      )

    const profitMonth = sales
      .filter((sale) => sale.createdAt.slice(0, 7) === month)
      .reduce(
        (sum, sale) =>
          sum +
          sale.items.reduce(
            (acc, item) => acc + (item.unitPrice - item.costPrice) * item.quantity,
            0,
          ),
        0,
      )

    const accumulatedWaste = movements
      .filter((movement) => movement.type === 'waste')
      .reduce((sum, movement) => {
        const product = products.find((item) => item.id === movement.productId)
        if (!product) return sum
        return sum + Math.abs(movement.quantity) * product.costPrice
      }, 0)

    const weightedWaste = weightedControls.reduce(
      (sum, control) => sum + control.wasteQuantity * control.costPrice,
      0,
    )

    const topProducts = Object.values(
      sales
        .flatMap((sale) => sale.items)
        .reduce<Record<string, { productName: string; quantity: number; revenue: number }>>(
          (acc, item) => {
            const current = acc[item.productId] ?? {
              productName: item.productName,
              quantity: 0,
              revenue: 0,
            }
            acc[item.productId] = {
              productName: item.productName,
              quantity: current.quantity + item.quantity,
              revenue: current.revenue + item.subtotal,
            }
            return acc
          },
          {},
        ),
    )
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, 5)

    const lowStockProducts = products
      .filter((product) => product.currentStock <= product.minStock)
      .map((product) => ({
        id: product.id,
        name: product.name,
        currentStock: formatQuantity(product.currentStock, product.unitMeasure),
      }))

    const salesByPayment = Object.entries(
      sales.reduce<Record<string, number>>((acc, sale) => {
        acc[sale.paymentMethod] = (acc[sale.paymentMethod] ?? 0) + sale.grandTotal
        return acc
      }, {}),
    ).map(([method, total]) => ({
      method:
        {
          cash: 'Efectivo',
          debit: 'Debito',
          credit: 'Credito',
          transfer: 'Transferencia',
        }[method] ?? method,
      total,
    }))

    return {
      salesToday,
      salesMonth,
      profitToday: profitToday - weightedControls
        .filter((control) => control.controlDate === today)
        .reduce((sum, control) => sum + control.wasteQuantity * control.costPrice, 0),
      profitMonth: profitMonth - weightedControls
        .filter((control) => control.controlDate.slice(0, 7) === month)
        .reduce((sum, control) => sum + control.wasteQuantity * control.costPrice, 0),
      accumulatedWaste: accumulatedWaste + weightedWaste,
      topProducts,
      lowStockProducts,
      salesByPayment,
    }
  }, [month, movements, products, sales, today, weightedControls])

  const handleFieldChange = <K extends keyof WeightedControlFormValues>(
    field: K,
    value: WeightedControlFormValues[K],
  ) => {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }))

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }))
  }

  const handleSubmit = () => {
    const nextErrors = validateForm(formValues)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const product = weightedProducts.find(
      (item) => item.id === formValues.productId,
    )
    if (!product) {
      setErrors({
        productId: 'El producto seleccionado ya no esta disponible.',
      })
      return
    }

    weightedDispatch({
      type: 'create',
      payload: buildControl(formValues, product),
    })

    setFormValues(emptyForm())
    setErrors({})
  }

  return (
    <section className="reports-module">
      <ReportsDashboard
        salesToday={reportMetrics.salesToday}
        salesMonth={reportMetrics.salesMonth}
        profitToday={reportMetrics.profitToday}
        profitMonth={reportMetrics.profitMonth}
        accumulatedWaste={reportMetrics.accumulatedWaste}
        salesByPayment={reportMetrics.salesByPayment}
        topProducts={reportMetrics.topProducts}
        lowStockProducts={reportMetrics.lowStockProducts}
      />

      <div className="reports-module__grid">
        <WeightedControlForm
          products={weightedProducts}
          values={formValues}
          errors={errors}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
        />

        <section className="surface-card weighted-summary-card">
          <div className="inventory-section__header">
            <div>
              <p className="section-kicker">Enfoque operativo</p>
              <h3>Utilidad real del dia</h3>
              <p>
                Usa este control para pan, fruta, verdura, queso, cecina y cualquier
                producto vendido por peso donde la merma afecta la utilidad real.
              </p>
            </div>
          </div>

          <ul className="feature-list">
            <li>Registra cuanto entro, cuanto se vendio, cuanto sobro y cuanto fue merma.</li>
            <li>Calcula ingreso por ventas, costo del vendido y costo real de la perdida.</li>
            <li>Permite medir ganancia bruta y ganancia real descontando merma.</li>
            <li>Sirve igual para pan del dia, fruta, verdura y granel.</li>
          </ul>
        </section>
      </div>

      <WeightedControlTable
        items={weightedControls}
        products={weightedProducts}
        onRemove={(controlId) =>
          weightedDispatch({ type: 'remove', payload: { controlId } })
        }
      />
    </section>
  )
}
