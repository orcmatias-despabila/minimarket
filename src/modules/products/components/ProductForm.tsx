import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { SelectField } from '../../../components/ui/SelectField'
import { TextAreaField } from '../../../components/ui/TextAreaField'
import type { ProductKind, UnitMeasure } from '../../../types/domain'
import type { ProductFormValues } from '../state/productsReducer'

interface ProductFormProps {
  values: ProductFormValues
  errors: Partial<Record<keyof ProductFormValues, string>>
  editingProductName?: string
  onChange: <K extends keyof ProductFormValues>(
    field: K,
    value: ProductFormValues[K],
  ) => void
  onSubmit: () => void
  onCancelEdit: () => void
}

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

export function ProductForm({
  values,
  errors,
  editingProductName,
  onChange,
  onSubmit,
  onCancelEdit,
}: ProductFormProps) {
  const isEditing = Boolean(editingProductName)

  return (
    <section className="surface-card products-form">
      <div className="products-form__header">
        <div>
          <p className="section-kicker">Formulario rapido</p>
          <h3>{isEditing ? 'Editar producto' : 'Nuevo producto'}</h3>
          <p>
            {isEditing
              ? `Estas editando ${editingProductName}.`
              : 'Completa los datos esenciales para agregar productos en pocos segundos.'}
          </p>
        </div>
      </div>

      <div className="products-form__grid">
        <Field
          label="Nombre"
          value={values.name}
          onChange={(event) => onChange('name', event.target.value)}
          hint={errors.name}
          placeholder="Ej: Bebida Cola 1.5L"
        />

        <Field
          label="Categoria"
          value={values.category}
          onChange={(event) => onChange('category', event.target.value)}
          hint={errors.category}
          placeholder="Ej: Bebidas"
        />

        <SelectField
          label="Tipo de producto"
          value={values.type}
          onChange={(event) => onChange('type', event.target.value as ProductKind)}
          options={productTypeOptions}
          hint={errors.type}
        />

        <Field
          label="Codigo de barras opcional"
          value={values.barcode}
          onChange={(event) => onChange('barcode', event.target.value)}
          hint={errors.barcode ?? 'Solo es obligatorio para productos de tipo codigo de barras.'}
          placeholder="Ej: 7801234500012"
        />

        <Field
          label="Precio de costo"
          type="number"
          min="0"
          step="1"
          value={values.costPrice}
          onChange={(event) => onChange('costPrice', event.target.value)}
          hint={errors.costPrice}
        />

        <Field
          label="Precio de venta"
          type="number"
          min="0"
          step="1"
          value={values.salePrice}
          onChange={(event) => onChange('salePrice', event.target.value)}
          hint={errors.salePrice}
        />

        <Field
          label="Stock actual"
          type="number"
          min="0"
          step="0.01"
          value={values.currentStock}
          onChange={(event) => onChange('currentStock', event.target.value)}
          hint={errors.currentStock}
        />

        <Field
          label="Stock minimo"
          type="number"
          min="0"
          step="0.01"
          value={values.minStock}
          onChange={(event) => onChange('minStock', event.target.value)}
          hint={errors.minStock}
        />

        <SelectField
          label="Unidad de control"
          value={values.unitMeasure}
          onChange={(event) =>
            onChange('unitMeasure', event.target.value as UnitMeasure)
          }
          options={unitOptions}
          hint={errors.unitMeasure}
        />

        <Field
          label="Proveedor opcional"
          value={values.supplier}
          onChange={(event) => onChange('supplier', event.target.value)}
          placeholder="Ej: Distribuidora Sur"
        />
      </div>

      <TextAreaField
        label="Observaciones opcionales"
        value={values.notes}
        onChange={(event) => onChange('notes', event.target.value)}
        rows={4}
        placeholder="Notas internas, recomendaciones o detalles del producto."
      />

      <div className="products-form__actions">
        <Button onClick={onSubmit}>{isEditing ? 'Guardar cambios' : 'Crear producto'}</Button>
        {isEditing ? (
          <Button variant="secondary" onClick={onCancelEdit}>
            Cancelar edicion
          </Button>
        ) : null}
      </div>
    </section>
  )
}
