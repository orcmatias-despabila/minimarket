import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { SelectField } from '../../../components/ui/SelectField'
import { TextAreaField } from '../../../components/ui/TextAreaField'
import type { Product } from '../../../types/domain'

export interface WeightedControlFormValues {
  productId: string
  controlDate: string
  enteredQuantity: string
  soldQuantity: string
  leftoverQuantity: string
  wasteQuantity: string
  notes: string
}

interface WeightedControlFormProps {
  products: Product[]
  values: WeightedControlFormValues
  errors: Partial<Record<keyof WeightedControlFormValues, string>>
  onChange: <K extends keyof WeightedControlFormValues>(
    field: K,
    value: WeightedControlFormValues[K],
  ) => void
  onSubmit: () => void
}

export function WeightedControlForm({
  products,
  values,
  errors,
  onChange,
  onSubmit,
}: WeightedControlFormProps) {
  return (
    <section className="surface-card weighted-control-form">
      <div className="inventory-section__header">
        <div>
          <p className="section-kicker">Control diario</p>
          <h3>Registrar producto por peso</h3>
          <p>
            Registra ingreso, venta, sobrante y merma para pan, fruta, verdura
            y productos a granel.
          </p>
        </div>
      </div>

      <div className="products-form__grid">
        <SelectField
          label="Producto por peso"
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

        <Field
          label="Fecha del control"
          type="date"
          value={values.controlDate}
          onChange={(event) => onChange('controlDate', event.target.value)}
          hint={errors.controlDate}
        />

        <Field
          label="Cuanto entro al dia"
          type="number"
          min="0"
          step="0.01"
          value={values.enteredQuantity}
          onChange={(event) => onChange('enteredQuantity', event.target.value)}
          hint={errors.enteredQuantity}
        />

        <Field
          label="Cuanto se vendio"
          type="number"
          min="0"
          step="0.01"
          value={values.soldQuantity}
          onChange={(event) => onChange('soldQuantity', event.target.value)}
          hint={errors.soldQuantity}
        />

        <Field
          label="Cuanto sobro"
          type="number"
          min="0"
          step="0.01"
          value={values.leftoverQuantity}
          onChange={(event) => onChange('leftoverQuantity', event.target.value)}
          hint={errors.leftoverQuantity}
        />

        <Field
          label="Cuanto fue merma"
          type="number"
          min="0"
          step="0.01"
          value={values.wasteQuantity}
          onChange={(event) => onChange('wasteQuantity', event.target.value)}
          hint={errors.wasteQuantity}
        />
      </div>

      <TextAreaField
        label="Observaciones"
        rows={3}
        value={values.notes}
        onChange={(event) => onChange('notes', event.target.value)}
      />

      <Button onClick={onSubmit}>Guardar control diario</Button>
    </section>
  )
}
