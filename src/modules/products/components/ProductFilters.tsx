import { Field } from '../../../components/ui/Field'
import { SelectField } from '../../../components/ui/SelectField'
import type { ProductKind } from '../../../types/domain'

interface ProductFiltersProps {
  search: string
  selectedCategory: string
  selectedType: '' | ProductKind
  categoryOptions: string[]
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onTypeChange: (value: '' | ProductKind) => void
}

const typeOptions = [
  { label: 'Todos los tipos', value: '' },
  { label: 'Con codigo de barras', value: 'barcode' },
  { label: 'Manual por unidad', value: 'manual_unit' },
  { label: 'Manual por peso', value: 'manual_weight' },
]

export function ProductFilters({
  search,
  selectedCategory,
  selectedType,
  categoryOptions,
  onSearchChange,
  onCategoryChange,
  onTypeChange,
}: ProductFiltersProps) {
  return (
    <section className="surface-card products-toolbar">
      <div className="products-toolbar__grid">
        <Field
          label="Buscar por nombre"
          placeholder="Ej: bebida, pan, hielo"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />

        <SelectField
          label="Filtrar por categoria"
          value={selectedCategory}
          onChange={(event) => onCategoryChange(event.target.value)}
          options={[
            { label: 'Todas las categorias', value: '' },
            ...categoryOptions.map((category) => ({
              label: category,
              value: category,
            })),
          ]}
        />

        <SelectField
          label="Filtrar por tipo"
          value={selectedType}
          onChange={(event) => onTypeChange(event.target.value as '' | ProductKind)}
          options={typeOptions}
        />
      </div>
    </section>
  )
}
