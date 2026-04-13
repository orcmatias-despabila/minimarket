import type { PropsWithChildren, ReactNode } from 'react'
import { Button } from '../../components/ui/Button'

interface ActiveFilter {
  label: string
  value: string
}

interface AdminFilterToolbarProps {
  title?: string
  description?: string
  actions?: ReactNode
  activeFilters?: ActiveFilter[]
  onClearFilters?: () => void
}

export function AdminFilterToolbar({
  title,
  description,
  actions,
  activeFilters = [],
  onClearFilters,
  children,
}: PropsWithChildren<AdminFilterToolbarProps>) {
  const hasActiveFilters = activeFilters.length > 0

  return (
    <section className="admin-filter-toolbar">
      <div className="admin-filter-toolbar__header">
        <div>
          {title ? <h4>{title}</h4> : null}
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="admin-filter-toolbar__actions">{actions}</div> : null}
      </div>

      <div className="admin-filter-toolbar__filters">{children}</div>

      {hasActiveFilters || onClearFilters ? (
        <div className="admin-filter-toolbar__summary">
          {hasActiveFilters ? (
            <div className="admin-filter-toolbar__chips">
              {activeFilters.map((filter) => (
                <span
                  key={`${filter.label}-${filter.value}`}
                  className="admin-filter-toolbar__chip"
                >
                  <strong>{filter.label}:</strong> {filter.value}
                </span>
              ))}
            </div>
          ) : (
            <span className="admin-filter-toolbar__empty">Sin filtros activos</span>
          )}

          {onClearFilters ? (
            <Button variant="secondary" onClick={onClearFilters}>
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
