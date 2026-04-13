import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { SelectField } from '../../../components/ui/SelectField'
import type { Product } from '../../../types/domain'
import type { InventoryMovementType } from '../state/movementFactory'

export interface InventoryFormValues {
  productId: string
  type: InventoryMovementType
  quantity: string
  createdAt: string
  reason: string
  associatedCost: string
}

interface InventoryMovementFormProps {
  products: Product[]
  values: InventoryFormValues
  errors: Partial<Record<keyof InventoryFormValues, string>>
  onChange: <K extends keyof InventoryFormValues>(
    field: K,
    value: InventoryFormValues[K],
  ) => void
  onSubmit: () => void
}

const movementOptions = [
  { label: 'Ingreso de stock', value: 'stock_in' },
  { label: 'Ajuste manual', value: 'manual_adjustment' },
  { label: 'Merma', value: 'waste' },
  { label: 'Salida por venta', value: 'sale_output' },
]

export function InventoryMovementForm({
  products,
  values,
  errors,
  onChange,
  onSubmit,
}: InventoryMovementFormProps) {
  return (
    <section className="surface-card inventory-section">
      <div className="inventory-section__header">
        <div>
          <p className="section-kicker">Reposicion y ajustes</p>
          <h3>Registrar movimiento</h3>
          <p>
            Ingresa mercaderia, ajusta manualmente, registra merma y deja lista
            la misma via para futuras salidas por venta automatizadas.
          </p>
        </div>
      </div>

      <div className="products-form__grid">
        <SelectField
          label="Producto"
          value={values.productId}
          onChange={(event) => onChange('productId', event.target.value)}
          options={[
            { label: 'Selecciona un producto', value: '' },
            ...products.map((product) => ({
              label: product.name,
              value: product.id,
            })),
          ]}
          hint={errors.productId}
        />

        <SelectField
          label="Tipo de movimiento"
          value={values.type}
          onChange={(event) =>
            onChange('type', event.target.value as InventoryMovementType)
          }
          options={movementOptions}
          hint={errors.type}
        />

        <Field
          label="Cantidad"
          type="number"
          step="0.01"
          value={values.quantity}
          onChange={(event) => onChange('quantity', event.target.value)}
          hint={
            errors.quantity ??
            'Usa valor positivo. En ajuste manual puedes usar valor negativo para descontar.'
          }
        />

        <Field
          label="Fecha y hora"
          type="datetime-local"
          value={values.createdAt}
          onChange={(event) => onChange('createdAt', event.target.value)}
          hint={errors.createdAt}
        />

        <Field
          label="Costo de compra asociado"
          type="number"
          min="0"
          step="0.01"
          value={values.associatedCost}
          onChange={(event) => onChange('associatedCost', event.target.value)}
          hint={
            errors.associatedCost ??
            'Usalo en ingresos de stock o cuando quieras actualizar el costo de reposicion.'
          }
        />

        <Field
          label="Motivo"
          value={values.reason}
          onChange={(event) => onChange('reason', event.target.value)}
          hint={errors.reason}
          placeholder="Ej: compra semanal, ajuste por conteo, merma por vencimiento"
        />
      </div>

      <Button onClick={onSubmit}>Guardar movimiento</Button>
    </section>
  )
}
