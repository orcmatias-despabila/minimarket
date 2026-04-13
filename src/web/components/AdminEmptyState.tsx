import { Button } from '../../components/ui/Button'

interface AdminEmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  tone?: 'neutral' | 'search'
  compact?: boolean
}

export function AdminEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  tone = 'neutral',
  compact = false,
}: AdminEmptyStateProps) {
  return (
    <article
      className={`admin-empty-state admin-empty-state--${tone} ${
        compact ? 'admin-empty-state--compact' : ''
      }`.trim()}
    >
      <div className="admin-empty-state__icon" aria-hidden="true">
        {tone === 'search' ? 'Filtrar' : 'Vacio'}
      </div>
      <div className="admin-empty-state__content">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </article>
  )
}
